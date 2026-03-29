import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { manualWeightOverrides } from "../src/data/manualWeightOverrides.js";
import {
  buildSexedLifeSpanFields,
  escapeForJs,
  fetchCsvLifeSpanRanges,
  getLifeSpanRangeForBreed,
} from "./lib/lifeSpanRanges.mjs";

const LIST_URL = "https://en.wikipedia.org/wiki/List_of_dog_breeds";
const IMAGE_BATCH_SIZE = 40;
const CONTENT_BATCH_SIZE = 25;
const PETGUIDE_CONCURRENCY = 8;
const PETLUR_CONCURRENCY = 8;
const SEARCH_CONCURRENCY = 6;

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "");
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function resolveRedirect(title, redirects) {
  let current = title;
  const seen = new Set();

  while (redirects.has(current) && !seen.has(current)) {
    seen.add(current);
    current = redirects.get(current);
  }

  return current;
}

function roundKg(value) {
  return Math.round(value * 10) / 10;
}

function convertToKg(value, unit) {
  if (unit === "kg") {
    return roundKg(value);
  }

  if (unit === "lb") {
    return roundKg(value * 0.45359237);
  }

  return null;
}

function parseTemplateWeightValues(value) {
  const matches = value.matchAll(/\{\{\s*(?:convert|cvt)\s*\|([^{}]+)\}\}/gi);
  const weights = [];

  for (const match of matches) {
    const parts = match[1].split("|").map((part) => part.trim());
    const unitIndex = parts.findIndex((part) => /^(kg|lb|lbs?)$/i.test(part));

    if (unitIndex === -1) {
      continue;
    }

    const unit = parts[unitIndex].toLowerCase().startsWith("lb") ? "lb" : "kg";
    const numericParts = parts
      .slice(0, unitIndex)
      .map((part) => part.replace(",", "."))
      .filter((part) => /^-?\d+(?:\.\d+)?$/.test(part))
      .map(Number);

    for (const number of numericParts) {
      const kg = convertToKg(number, unit);

      if (kg !== null) {
        weights.push(kg);
      }
    }
  }

  return weights;
}

function parseTextWeightValues(value) {
  const weights = [];
  const normalized = decodeHtml(value)
    .replace(/<ref[\s\S]*?<\/ref>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{[^{}]+\}\}/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/\bto\b/gi, "-")
    .replace(/\s+/g, " ");
  const rangePattern =
    /(\d+(?:\.\d+)?)\s*(?:-|and)\s*(\d+(?:\.\d+)?)\s*(kg|lb|lbs?)\b/gi;
  const singlePattern = /(\d+(?:\.\d+)?)\s*(kg|lb|lbs?)\b/gi;

  for (const match of normalized.matchAll(rangePattern)) {
    const unit = match[3].toLowerCase().startsWith("lb") ? "lb" : "kg";

    for (const number of [Number(match[1]), Number(match[2])]) {
      const kg = convertToKg(number, unit);

      if (kg !== null) {
        weights.push(kg);
      }
    }
  }

  for (const match of normalized.matchAll(singlePattern)) {
    const unit = match[2].toLowerCase().startsWith("lb") ? "lb" : "kg";
    const kg = convertToKg(Number(match[1]), unit);

    if (kg !== null) {
      weights.push(kg);
    }
  }

  return weights;
}

function buildWeightRange(values) {
  const uniqueValues = [...new Set(values)]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (uniqueValues.length === 0) {
    return null;
  }

  return {
    kgMin: uniqueValues[0],
    kgMax: uniqueValues[uniqueValues.length - 1],
  };
}

function extractWeightFieldValues(content) {
  const lines = content.split("\n");
  const values = [];
  let currentField = null;
  let buffer = [];

  function flushBuffer() {
    if (currentField && buffer.length > 0) {
      values.push(buffer.join(" ").trim());
    }

    currentField = null;
    buffer = [];
  }

  for (const line of lines) {
    const fieldMatch = line.match(/^\|\s*(weight|maleweight|femaleweight)\s*=\s*(.*)$/i);

    if (fieldMatch) {
      flushBuffer();
      currentField = fieldMatch[1].toLowerCase();
      buffer.push(fieldMatch[2].trim());
      continue;
    }

    if (currentField) {
      if (/^\|/.test(line) || /^\}\}/.test(line)) {
        flushBuffer();
      } else {
        buffer.push(line.trim());
      }
    }
  }

  flushBuffer();

  return values.filter(Boolean);
}

function extractWeightRangeFromContent(content) {
  if (!content || !/\{\{\s*infobox dog breed/i.test(content)) {
    return null;
  }

  const values = [];
  const fieldValues = extractWeightFieldValues(content);

  for (const fieldValue of fieldValues) {
    values.push(...parseTemplateWeightValues(fieldValue));
    values.push(...parseTextWeightValues(fieldValue));
  }

  if (values.length === 0) {
    const leadSection = content.split(/\n==/)[0];
    values.push(...parseTemplateWeightValues(leadSection));
    values.push(...parseTextWeightValues(leadSection));
  }

  return buildWeightRange(values);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "all-the-dogs/1.0 (local project generator)",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "all-the-dogs/1.0 (local project generator)",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.json();
}

async function fetchPageContents(titles) {
  const contents = new Map();

  for (let index = 0; index < titles.length; index += CONTENT_BATCH_SIZE) {
    const batch = titles.slice(index, index + CONTENT_BATCH_SIZE);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      redirects: "1",
      titles: batch.join("|"),
    });
    const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
    const data = await fetchJson(url);
    const redirects = new Map();

    for (const item of data.query?.normalized ?? []) {
      redirects.set(item.from, item.to);
    }

    for (const item of data.query?.redirects ?? []) {
      redirects.set(item.from, item.to);
    }

    for (const page of data.query?.pages ?? []) {
      if (!page.title) {
        continue;
      }

      const content = page.revisions?.[0]?.slots?.main?.content ?? "";
      contents.set(page.title, content);

      for (const requestedTitle of batch) {
        if (resolveRedirect(requestedTitle, redirects) === page.title) {
          contents.set(requestedTitle, content);
        }
      }
    }
  }

  return contents;
}

function extractBreedEntries(html) {
  const extantMarker = 'id="Extant_breeds,_varieties_and_types"';
  const extinctMarker =
    'id="Extinct_and_critically_endangered_breeds,_varieties_and_types"';
  const extantIndex = html.indexOf(extantMarker);
  const extinctIndex = html.indexOf(extinctMarker);

  if (extantIndex === -1 || extinctIndex === -1 || extinctIndex <= extantIndex) {
    throw new Error("Could not locate the expected Wikipedia sections.");
  }

  const sectionHtml = html.slice(extantIndex, extinctIndex);
  const itemPattern =
    /<li><a href="\/wiki\/([^"#?]+)"[^>]*>(.*?)<\/a>(?:<sup[\s\S]*?<\/sup>)?<\/li>/g;
  const entries = [];
  const seenNames = new Set();

  for (const match of sectionHtml.matchAll(itemPattern)) {
    const page = decodeURIComponent(match[1]).replaceAll("_", " ");
    const name = decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim();

    if (!name || seenNames.has(name)) {
      continue;
    }

    seenNames.add(name);
    entries.push({ name, page });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchImages(entries) {
  const images = new Map();

  for (let index = 0; index < entries.length; index += IMAGE_BATCH_SIZE) {
    const batch = entries.slice(index, index + IMAGE_BATCH_SIZE);
    const titles = batch.map((entry) => entry.page);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "640",
      redirects: "1",
      titles: titles.join("|"),
    });
    const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
    const data = await fetchJson(url);
    const redirects = new Map();

    for (const item of data.query?.normalized ?? []) {
      redirects.set(item.from, item.to);
    }

    for (const item of data.query?.redirects ?? []) {
      redirects.set(item.from, item.to);
    }

    for (const page of data.query?.pages ?? []) {
      if (!page.title || !page.thumbnail?.source) {
        continue;
      }

      for (const title of titles) {
        if (resolveRedirect(title, redirects) === page.title) {
          images.set(title, page.thumbnail.source);
        }
      }
    }
  }

  return images;
}

function parseMetricRange(value) {
  if (!value) {
    return null;
  }

  const values = [];

  for (const match of String(value).matchAll(/(\d+(?:\.\d+)?)/g)) {
    values.push(Number(match[1]));
  }

  return buildWeightRange(values);
}

async function fetchDogApiFallbackWeights() {
  const url =
    "https://gist.githubusercontent.com/arturschaefer/abf8f94bcff14ace1b88c7977d651a74/raw/breed_list.json";
  const breeds = await fetchJson(url);
  const weights = new Map();

  for (const breed of breeds) {
    const range = parseMetricRange(breed.weight?.metric);

    if (range) {
      weights.set(normalizeName(breed.name), range);
    }
  }

  return weights;
}

async function fetchCsvFallbackWeights() {
  const url =
    "https://gist.githubusercontent.com/tharun112/42df5b9d41b5323229b1396d04d1111a/raw/Dog_breed.csv";
  const csv = await fetchText(url);
  const lines = csv.trim().split(/\r?\n/);
  const rows = lines.slice(1);
  const weights = new Map();

  for (const row of rows) {
    const columns = row.split(",");

    if (columns.length < 11) {
      continue;
    }

    const name = columns[0]?.trim();
    const minMale = Number(columns[9]);
    const minFemale = Number(columns[10]);
    const maxMale = Number(columns[5]);
    const maxFemale = Number(columns[6]);
    const range = buildWeightRange(
      [minMale, minFemale, maxMale, maxFemale].map((value) =>
        convertToKg(value, "lb"),
      ),
    );

    if (name && range) {
      weights.set(normalizeName(name), range);
    }
  }

  return weights;
}

function parsePetGuideWeight(html) {
  const match = html.match(
    /<div class="hdr">Weight<\/div>\s*<div>([^<]+)<\/div>/i,
  );

  if (!match) {
    return null;
  }

  const values = [];
  const weightText = decodeHtml(match[1]).replace(/\s+/g, " ").trim();
  const unit = /\bkg\b/i.test(weightText) ? "kg" : /\blb\b/i.test(weightText) ? "lb" : null;

  if (!unit) {
    return null;
  }

  for (const numberMatch of weightText.matchAll(/(\d+(?:\.\d+)?)/g)) {
    const kg = convertToKg(Number(numberMatch[1]), unit);

    if (kg !== null) {
      values.push(kg);
    }
  }

  return buildWeightRange(values);
}

function parsePetlurWeight(html) {
  const match = html.match(
    /<th[^>]*>\s*Weight\s*<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
  );

  if (!match) {
    return null;
  }

  const values = [];
  const weightText = decodeHtml(match[1])
    .replace(/<[^>]+>/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/\bto\b/gi, "-")
    .replace(/\s+/g, " ")
    .trim();

  for (const kgMatch of weightText.matchAll(
    /(\d+(?:\.\d+)?)\s*(?:-|and)?\s*(\d+(?:\.\d+)?)?\s*kg\b/gi,
  )) {
    values.push(Number(kgMatch[1]));

    if (kgMatch[2]) {
      values.push(Number(kgMatch[2]));
    }
  }

  if (values.length === 0) {
    for (const lbMatch of weightText.matchAll(
      /(\d+(?:\.\d+)?)\s*(?:-|and)?\s*(\d+(?:\.\d+)?)?\s*(?:lb|lbs|pounds?)\b/gi,
    )) {
      values.push(convertToKg(Number(lbMatch[1]), "lb"));

      if (lbMatch[2]) {
        values.push(convertToKg(Number(lbMatch[2]), "lb"));
      }
    }
  }

  return buildWeightRange(values);
}

function parseSearchWeight(snippet) {
  const normalized = decodeHtml(snippet)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || /\b(age|puppy|month|growth chart)\b/i.test(normalized)) {
    return null;
  }

  const kgRange = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to|and)\s*(\d+(?:\.\d+)?)\s*kg\b/i,
  );

  if (kgRange) {
    return buildWeightRange([Number(kgRange[1]), Number(kgRange[2])]);
  }

  const kgSingleMatches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*kg\b/gi)].map(
    (match) => Number(match[1]),
  );

  if (kgSingleMatches.length > 0) {
    return buildWeightRange(kgSingleMatches);
  }

  const lbRange = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to|and)\s*(\d+(?:\.\d+)?)\s*lb\b/i,
  );

  if (lbRange) {
    return buildWeightRange(
      [Number(lbRange[1]), Number(lbRange[2])].map((value) =>
        convertToKg(value, "lb"),
      ),
    );
  }

  return null;
}

async function fetchSearchFallbackWeights(entries) {
  const weights = new Map();
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const currentIndex = index;
      index += 1;
      const entry = entries[currentIndex];
      const query = `${entry.name} dog breed weight kg`;
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      try {
        const response = await fetch(url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          },
        });

        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const snippets = [
          ...html.matchAll(
            /(?:class="result__snippet"|class="result-snippet")[^>]*>([\s\S]*?)<\/(?:a|div)>/gi,
          ),
        ]
          .map((match) => match[1])
          .slice(0, 5);

        for (const snippet of snippets) {
          const range = parseSearchWeight(snippet);

          if (range) {
            weights.set(entry.page, range);
            break;
          }
        }
      } catch {
        // Ignore failed search lookups and keep the breed unresolved.
      }
    }
  }

  await Promise.all(
    Array.from({ length: SEARCH_CONCURRENCY }, () => worker()),
  );

  return weights;
}

async function fetchPetGuideFallbackWeights(entries) {
  const weights = new Map();
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const currentIndex = index;
      index += 1;
      const entry = entries[currentIndex];
      const url = `https://www.petguide.com/breeds/dog/${slugify(entry.name)}/`;

      try {
        const response = await fetch(url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          },
        });

        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const range = parsePetGuideWeight(html);

        if (range) {
          weights.set(entry.page, range);
        }
      } catch {
        // Ignore failed fallback fetches and keep the breed unresolved.
      }
    }
  }

  await Promise.all(
    Array.from({ length: PETGUIDE_CONCURRENCY }, () => worker()),
  );

  return weights;
}

async function fetchPetlurFallbackWeights(entries) {
  const weights = new Map();
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const currentIndex = index;
      index += 1;
      const entry = entries[currentIndex];
      const url = `https://petlur.com/dog/breed/${slugify(entry.name)}`;

      try {
        const response = await fetch(url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          },
        });

        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const range = parsePetlurWeight(html);

        if (range) {
          weights.set(entry.page, range);
        }
      } catch {
        // Ignore failed fallback fetches and keep the breed unresolved.
      }
    }
  }

  await Promise.all(
    Array.from({ length: PETLUR_CONCURRENCY }, () => worker()),
  );

  return weights;
}

async function fetchWeightRanges(entries) {
  const candidateTitles = [
    ...new Set(
      entries.flatMap((entry) =>
        entry.page === `${entry.name} (dog)`
          ? [entry.page]
          : [entry.page, `${entry.name} (dog)`],
      ),
    ),
  ];
  const contents = await fetchPageContents(candidateTitles);
  const weightRanges = new Map();

  for (const entry of entries) {
    const candidates =
      entry.page === `${entry.name} (dog)`
        ? [entry.page]
        : [entry.page, `${entry.name} (dog)`];
    let weightRange = null;

    for (const candidate of candidates) {
      weightRange = extractWeightRangeFromContent(contents.get(candidate));

      if (weightRange) {
        break;
      }
    }

    weightRanges.set(entry.page, weightRange);
  }

  for (const entry of entries) {
    const manualOverride = manualWeightOverrides[entry.name];

    if (manualOverride) {
      weightRanges.set(entry.page, manualOverride);
    }
  }

  const dogApiWeights = await fetchDogApiFallbackWeights();
  const csvWeights = await fetchCsvFallbackWeights();
  const unresolvedEntries = entries.filter(
    (entry) => !weightRanges.get(entry.page),
  );

  for (const entry of unresolvedEntries) {
    const normalizedName = normalizeName(entry.name);
    const fallback =
      dogApiWeights.get(normalizedName) ?? csvWeights.get(normalizedName);

    if (fallback) {
      weightRanges.set(entry.page, fallback);
    }
  }

  const stillUnresolvedEntries = entries.filter(
    (entry) => !weightRanges.get(entry.page),
  );
  const searchWeights = await fetchSearchFallbackWeights(stillUnresolvedEntries);

  for (const entry of stillUnresolvedEntries) {
    const fallback = searchWeights.get(entry.page);

    if (fallback) {
      weightRanges.set(entry.page, fallback);
    }
  }

  const finalUnresolvedEntries = entries.filter(
    (entry) => !weightRanges.get(entry.page),
  );
  const petGuideWeights = await fetchPetGuideFallbackWeights(finalUnresolvedEntries);

  for (const entry of finalUnresolvedEntries) {
    const fallback = petGuideWeights.get(entry.page);

    if (fallback) {
      weightRanges.set(entry.page, fallback);
    }
  }

  const petlurUnresolvedEntries = entries.filter(
    (entry) => !weightRanges.get(entry.page),
  );
  const petlurWeights = await fetchPetlurFallbackWeights(petlurUnresolvedEntries);

  for (const entry of petlurUnresolvedEntries) {
    const fallback = petlurWeights.get(entry.page);

    if (fallback) {
      weightRanges.set(entry.page, fallback);
    }
  }

  return weightRanges;
}

async function main() {
  const html = await fetchText(LIST_URL);
  const entries = extractBreedEntries(html);
  const images = await fetchImages(entries);
  const weightRanges = await fetchWeightRanges(entries);
  const csvLifeSpanRanges = await fetchCsvLifeSpanRanges();
  const outputLines = [
    "export const dogBreeds = [",
    ...entries.map((entry) => {
      const image = images.get(entry.page) ?? null;
      const weightRange = weightRanges.get(entry.page);
      const lifeSpanRange = getLifeSpanRangeForBreed(
        {
          name: entry.name,
          kgMin: weightRange?.kgMin ?? null,
          kgMax: weightRange?.kgMax ?? null,
        },
        csvLifeSpanRanges,
      );
      const sexedFields = buildSexedLifeSpanFields(lifeSpanRange);

      return [
        "  {",
        `    name: "${escapeForJs(entry.name)}",`,
        `    image: ${image ? `"${escapeForJs(image)}"` : "null"},`,
        `    kgMin: ${weightRange ? weightRange.kgMin : "null"},`,
        `    kgMax: ${weightRange ? weightRange.kgMax : "null"},`,
        `    maleLifeSpanMin: ${sexedFields.maleLifeSpanMin},`,
        `    maleLifeSpanMax: ${sexedFields.maleLifeSpanMax},`,
        `    femaleLifeSpanMin: ${sexedFields.femaleLifeSpanMin},`,
        `    femaleLifeSpanMax: ${sexedFields.femaleLifeSpanMax},`,
        "  },",
      ].join("\n");
    }),
    "];",
    "",
  ];

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(__dirname, "../src/data/dogBreeds.js");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, outputLines.join("\n"), "utf8");

  console.log(`Generated ${entries.length} extant dog entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
