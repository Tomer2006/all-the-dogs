import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dogBreeds } from "../src/data/dogBreeds.js";
import {
  buildSexedLifeSpanFields,
  escapeForJs,
  fetchCsvLifeSpanRanges,
  getLifeSpanRangeForBreed,
} from "./lib/lifeSpanRanges.mjs";

async function main() {
  const csvRanges = await fetchCsvLifeSpanRanges();
  const outputLines = [
    "export const dogBreeds = [",
    ...dogBreeds.map((breed) => {
      const lifeSpanRange = getLifeSpanRangeForBreed(breed, csvRanges);
      const sexedFields = buildSexedLifeSpanFields(lifeSpanRange);

      return [
        "  {",
        `    name: "${escapeForJs(breed.name)}",`,
        `    image: ${breed.image ? `"${escapeForJs(breed.image)}"` : "null"},`,
        `    kgMin: ${breed.kgMin ?? "null"},`,
        `    kgMax: ${breed.kgMax ?? "null"},`,
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

  console.log(`Updated lifespan fields for ${dogBreeds.length} breeds.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
