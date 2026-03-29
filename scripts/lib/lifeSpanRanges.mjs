const CSV_URL =
  "https://gist.githubusercontent.com/tharun112/42df5b9d41b5323229b1396d04d1111a/raw/Dog_breed.csv";

export function normalizeBreedName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function escapeForJs(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export async function fetchCsvLifeSpanRanges() {
  const response = await fetch(CSV_URL, {
    headers: {
      "user-agent": "all-the-dogs/1.0 (local project generator)",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${CSV_URL}: ${response.status}`);
  }

  const csv = await response.text();
  const rows = csv.trim().split(/\r?\n/).slice(1);
  const ranges = new Map();

  for (const row of rows) {
    const columns = row.split(",");

    if (columns.length < 3) {
      continue;
    }

    const name = columns[0]?.trim();
    const min = Number(columns[1]);
    const max = Number(columns[2]);

    if (
      name &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min > 0 &&
      max >= min
    ) {
      ranges.set(normalizeBreedName(name), {
        lifeSpanMin: min,
        lifeSpanMax: max,
      });
    }
  }

  return ranges;
}

export function estimateLifeSpanRangeFromWeight(weightRange) {
  const upperWeight = weightRange?.kgMax;

  if (!Number.isFinite(upperWeight)) {
    return {
      lifeSpanMin: 10,
      lifeSpanMax: 13,
    };
  }

  if (upperWeight <= 7) {
    return { lifeSpanMin: 13, lifeSpanMax: 16 };
  }

  if (upperWeight <= 12) {
    return { lifeSpanMin: 12, lifeSpanMax: 15 };
  }

  if (upperWeight <= 25) {
    return { lifeSpanMin: 11, lifeSpanMax: 14 };
  }

  if (upperWeight <= 40) {
    return { lifeSpanMin: 10, lifeSpanMax: 13 };
  }

  if (upperWeight <= 55) {
    return { lifeSpanMin: 9, lifeSpanMax: 12 };
  }

  if (upperWeight <= 70) {
    return { lifeSpanMin: 8, lifeSpanMax: 11 };
  }

  return { lifeSpanMin: 7, lifeSpanMax: 10 };
}

export function buildSexedLifeSpanFields(range) {
  return {
    maleLifeSpanMin: range.lifeSpanMin,
    maleLifeSpanMax: range.lifeSpanMax,
    femaleLifeSpanMin: range.lifeSpanMin,
    femaleLifeSpanMax: range.lifeSpanMax,
  };
}

export function getLifeSpanRangeForBreed(breed, csvRanges) {
  const csvRange = csvRanges.get(normalizeBreedName(breed.name));

  if (csvRange) {
    return csvRange;
  }

  return estimateLifeSpanRangeFromWeight({
    kgMin: breed.kgMin,
    kgMax: breed.kgMax,
  });
}
