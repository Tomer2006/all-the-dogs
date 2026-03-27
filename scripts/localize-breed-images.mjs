import { access, mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dogBreeds } from "../src/data/dogBreeds.js";
import { manualImageOverrides } from "../src/data/manualImageOverrides.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const breedsDir = path.join(projectRoot, "public", "images", "breeds");
const dataPath = path.join(projectRoot, "src", "data", "dogBreeds.js");
const placeholderPath = "/images/dog-placeholder.svg";
const CONCURRENCY = 1;

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function escapeForJs(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function extensionFromContentType(contentType) {
  if (!contentType) {
    return null;
  }

  if (contentType.includes("image/jpeg")) {
    return "jpg";
  }

  if (contentType.includes("image/png")) {
    return "png";
  }

  if (contentType.includes("image/webp")) {
    return "webp";
  }

  if (contentType.includes("image/svg+xml")) {
    return "svg";
  }

  if (contentType.includes("image/gif")) {
    return "gif";
  }

  return null;
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.([a-z0-9]+)$/);

    if (!match) {
      return null;
    }

    if (match[1] === "jpeg") {
      return "jpg";
    }

    return match[1];
  } catch {
    return null;
  }
}

async function downloadImage(entry) {
  const sourceUrl = sourceUrlFor(entry);

  if (!sourceUrl) {
    return {
      ...entry,
      image: entry.image || placeholderPath,
    };
  }

  const baseName = slugify(entry.name);
  const extension = extensionFromUrl(sourceUrl) ?? "jpg";
  const fileName = `${baseName}.${extension}`;
  const localPath = path.join(breedsDir, fileName);

  try {
    await access(localPath);

    return {
      ...entry,
      image: `/images/breeds/${fileName}`,
    };
  } catch {
    // File does not exist yet, continue to download.
  }

  await execFileAsync("curl.exe", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    "--connect-timeout",
    "20",
    "--max-time",
    "120",
    "--retry",
    "8",
    "--retry-all-errors",
    "--retry-delay",
    "2",
    "--output",
    localPath,
    sourceUrl,
  ]);

  return {
    ...entry,
    image: `/images/breeds/${fileName}`,
  };
}

async function main() {
  await mkdir(breedsDir, { recursive: true });

  const localized = new Array(dogBreeds.length);
  const failures = [];
  let index = 0;

  async function worker() {
    while (index < dogBreeds.length) {
      const currentIndex = index;
      index += 1;
      const entry = dogBreeds[currentIndex];

      try {
        localized[currentIndex] = await downloadImage(entry);
      } catch {
        failures.push(entry.name);
        localized[currentIndex] = {
          ...entry,
          image: placeholderPath,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const output = [
    "export const dogBreeds = [",
    ...localized.map((entry) =>
      [
        "  {",
        `    name: "${escapeForJs(entry.name)}",`,
        `    image: ${entry.image ? `"${escapeForJs(entry.image)}"` : "null"},`,
        `    kgMin: ${entry.kgMin ?? "null"},`,
        `    kgMax: ${entry.kgMax ?? "null"},`,
        "  },",
      ].join("\n"),
    ),
    "];",
    "",
  ].join("\n");

  await writeFile(dataPath, output, "utf8");

  console.log(
    `Localized ${localized.length - failures.length} images. Placeholder used for ${failures.length} breeds.`,
  );

  if (failures.length > 0) {
    console.log(`Failed breeds: ${failures.join(", ")}`);
  }
}

function sourceUrlFor(entry) {
  return (
    manualImageOverrides[entry.name] ??
    (entry.image && !entry.image.startsWith("/") ? entry.image : null)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
