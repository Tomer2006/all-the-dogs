import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
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
  const baseName = slugify(entry.name);
  const localFileName = `${baseName}.webp`;
  const localPath = path.join(breedsDir, localFileName);
  const existingLocalPath =
    entry.image?.startsWith("/images/breeds/")
      ? path.join(projectRoot, "public", ...entry.image.split("/").filter(Boolean))
      : null;
  const sourceUrl = sourceUrlFor(entry);

  try {
    await access(localPath);

    return {
      ...entry,
      image: `/images/breeds/${localFileName}`,
    };
  } catch {
    // File does not exist yet, continue to download.
  }

  if (existingLocalPath && existingLocalPath !== localPath) {
    try {
      await access(existingLocalPath);
      await sharp(existingLocalPath)
        .rotate()
        .webp({ quality: 82 })
        .toFile(localPath);

      return {
        ...entry,
        image: `/images/breeds/${localFileName}`,
      };
    } catch {
      // Local source file is missing or unreadable, fall through to remote source.
    }
  }

  if (!sourceUrl) {
    return {
      ...entry,
      image: entry.image || placeholderPath,
    };
  }

  const tempExtension = extensionFromUrl(sourceUrl) ?? "img";
  const tempPath = path.join(breedsDir, `${baseName}.download.${tempExtension}`);

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
    tempPath,
    sourceUrl,
  ]);

  try {
    await sharp(tempPath)
      .rotate()
      .webp({ quality: 82 })
      .toFile(localPath);

    return {
      ...entry,
      image: `/images/breeds/${localFileName}`,
    };
  } finally {
    await rm(tempPath, { force: true });
  }
}

async function removeStaleBreedFiles(localized) {
  const expectedFiles = new Set(
    localized
      .map((entry) => entry.image)
      .filter((image) => image?.startsWith("/images/breeds/"))
      .map((image) => image.replace("/images/breeds/", "")),
  );

  const files = await readdir(breedsDir);

  await Promise.all(
    files
      .filter((file) => !expectedFiles.has(file))
      .map((file) => rm(path.join(breedsDir, file), { force: true })),
  );
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
  await removeStaleBreedFiles(localized);

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
