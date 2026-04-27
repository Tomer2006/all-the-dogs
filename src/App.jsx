import { useMemo, useState } from "react";
import BreedCard from "./components/BreedCard";
import { dogBreeds } from "./data/dogBreeds";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const knownMaxKg = Math.ceil(
  Math.max(...dogBreeds.map((breed) => breed.kgMax ?? 0), 0),
);
const knownMinKg = Math.min(
  0,
  Math.floor(
    Math.min(
      ...dogBreeds
        .map((breed) => breed.kgMin)
        .filter((value) => value !== null && value !== undefined),
    ),
  ),
);

const sizePresets = [
  { label: "Toy", min: 0, max: 8 },
  { label: "Small", min: 8, max: 16 },
  { label: "Medium", min: 16, max: 32 },
  { label: "Large", min: 32, max: 55 },
  { label: "Giant", min: 55, max: knownMaxKg },
];

function getSafeNumber(value, fallback) {
  if (value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [minKg, setMinKg] = useState(knownMinKg);
  const [maxKg, setMaxKg] = useState(knownMaxKg);
  const sliderSpan = knownMaxKg - knownMinKg || 1;
  const minPercent = ((minKg - knownMinKg) / sliderSpan) * 100;
  const maxPercent = ((maxKg - knownMinKg) / sliderSpan) * 100;
  const hasActiveFilters =
    query.trim().length > 0 || minKg !== knownMinKg || maxKg !== knownMaxKg;

  const updateMinKg = (nextValue) => {
    const safeMin = clamp(getSafeNumber(nextValue, minKg), knownMinKg, knownMaxKg);
    setMinKg(safeMin);
    setMaxKg((currentMax) => Math.max(currentMax, safeMin));
  };

  const updateMaxKg = (nextValue) => {
    const safeMax = clamp(getSafeNumber(nextValue, maxKg), knownMinKg, knownMaxKg);
    setMaxKg(safeMax);
    setMinKg((currentMin) => Math.min(currentMin, safeMax));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visibleBreeds = useMemo(
    () =>
      dogBreeds.filter((breed) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          breed.name.toLowerCase().includes(normalizedQuery);

        const hasActiveWeightFilter =
          minKg !== knownMinKg || maxKg !== knownMaxKg;
        const hasKnownWeight =
          breed.kgMin !== null &&
          breed.kgMin !== undefined &&
          breed.kgMax !== null &&
          breed.kgMax !== undefined;
        const normalizedMaxKg = maxKg === 0 ? 1 : maxKg;
        const matchesWeight =
          !hasActiveWeightFilter ||
          (hasKnownWeight &&
            breed.kgMax >= minKg &&
            breed.kgMin <= normalizedMaxKg);

        return matchesQuery && matchesWeight;
      }),
    [maxKg, minKg, normalizedQuery],
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-7 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-soft">
          <div className="flex flex-col gap-6 p-5 sm:p-8 lg:p-10">
            <div>
              <p className="eyebrow">Breed directory</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
                All the Dogs
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Browse {dogBreeds.length} dog breeds with fast search, clearer
                size filters, local photos, weights, and life span ranges.
              </p>
            </div>

            <label className="block max-w-3xl">
              <span className="mb-2 block text-sm font-semibold text-ink">
                Search by breed name
              </span>
              <div className="search-field">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-bark"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try Beagle, Akita, Corgi, Husky"
                  className="min-w-0 flex-1 bg-transparent py-4 text-base text-ink outline-none placeholder:text-muted/75"
                />
              </div>
            </label>

            <div className="grid max-w-3xl gap-3 text-sm text-muted sm:grid-cols-2">
              <div className="stat-tile">
                <span className="stat-tile__value">{dogBreeds.length}</span>
                breeds
              </div>
              <div className="stat-tile">
                <span className="stat-tile__value">{knownMaxKg} kg</span>
                largest listed size
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-lg border border-line bg-panel p-4 shadow-soft lg:sticky lg:top-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Filters</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                  Find your size
                </h2>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setMinKg(knownMinKg);
                    setMaxKg(knownMaxKg);
                  }}
                  className="text-button"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {sizePresets.map((preset) => {
                const isActive = minKg === preset.min && maxKg === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setMinKg(preset.min);
                      setMaxKg(preset.max);
                    }}
                    className="preset-button"
                  >
                    {preset.label}
                    <span>
                      {preset.min}-{preset.max} kg
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-lg border border-line bg-paper/55 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Weight range</p>
                <p className="text-sm text-muted">
                  <span className="font-semibold text-ink">{minKg}</span> to{" "}
                  <span className="font-semibold text-ink">{maxKg}</span> kg
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="weight-field">
                  <span>
                    <span className="weight-field__label">Minimum</span>
                    <span className="weight-field__hint">Smallest breed size</span>
                  </span>
                  <span className="weight-number-wrap focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/25">
                    <input
                      type="number"
                      min={knownMinKg}
                      max={knownMaxKg}
                      step="1"
                      value={minKg}
                      onChange={(event) => updateMinKg(event.target.value)}
                      className="weight-number-input"
                    />
                    <span className="weight-number-unit">kg</span>
                  </span>
                </label>

                <label className="weight-field">
                  <span>
                    <span className="weight-field__label">Maximum</span>
                    <span className="weight-field__hint">Largest breed size</span>
                  </span>
                  <span className="weight-number-wrap focus-within:border-bark focus-within:ring-2 focus-within:ring-bark/25">
                    <input
                      type="number"
                      min={knownMinKg}
                      max={knownMaxKg}
                      step="1"
                      value={maxKg}
                      onChange={(event) => updateMaxKg(event.target.value)}
                      className="weight-number-input"
                    />
                    <span className="weight-number-unit">kg</span>
                  </span>
                </label>

                <div className="dual-range-slider">
                  <div className="dual-range-slider__track" />
                  <div
                    className="dual-range-slider__fill"
                    style={{
                      left: `${minPercent}%`,
                      width: `${Math.max(maxPercent - minPercent, 0)}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={knownMinKg}
                    max={knownMaxKg}
                    step="1"
                    aria-label="Minimum size"
                    value={minKg}
                    onChange={(event) => updateMinKg(event.target.value)}
                    className="dual-range-slider__input dual-range-slider__input--min"
                  />
                  <input
                    type="range"
                    min={knownMinKg}
                    max={knownMaxKg}
                    step="1"
                    aria-label="Maximum size"
                    value={maxKg}
                    onChange={(event) => updateMaxKg(event.target.value)}
                    className="dual-range-slider__input dual-range-slider__input--max"
                  />
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-line bg-panel p-4 shadow-soft sm:p-5">
            <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Results</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                  {visibleBreeds.length} matching breeds
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted">
                Showing breeds that match{" "}
                {normalizedQuery ? (
                  <span className="font-semibold text-ink">"{query.trim()}"</span>
                ) : (
                  <span className="font-semibold text-ink">any name</span>
                )}{" "}
                from {minKg} to {maxKg} kg.
              </p>
            </div>

            {visibleBreeds.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {visibleBreeds.map((breed, index) => (
                  <BreedCard key={breed.name} breed={breed} index={index} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-line bg-paper/45 px-6 py-14 text-center">
                <p className="font-display text-3xl font-semibold text-ink">
                  No breeds found
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
                  Try a broader size range or a shorter breed name. The filters are
                  picky now, but at least they are honest.
                </p>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
