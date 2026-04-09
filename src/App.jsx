import { useState } from "react";
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

export default function App() {
  const [query, setQuery] = useState("");
  const [minKg, setMinKg] = useState(knownMinKg);
  const [maxKg, setMaxKg] = useState(knownMaxKg);
  const sliderSpan = knownMaxKg - knownMinKg;
  const minPercent = ((minKg - knownMinKg) / sliderSpan) * 100;
  const maxPercent = ((maxKg - knownMinKg) / sliderSpan) * 100;

  const updateMinKg = (nextValue) => {
    const safeMin = clamp(nextValue, knownMinKg, knownMaxKg);
    setMinKg(safeMin);
    setMaxKg((currentMax) => Math.max(currentMax, safeMin));
  };

  const updateMaxKg = (nextValue) => {
    const safeMax = clamp(nextValue, knownMinKg, knownMaxKg);
    setMaxKg(safeMax);
    setMinKg((currentMin) => Math.min(currentMin, safeMax));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visibleBreeds = dogBreeds.filter((breed) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      breed.name.toLowerCase().includes(normalizedQuery);

    const hasActiveWeightFilter = minKg !== knownMinKg || maxKg !== knownMaxKg;
    const hasKnownWeight =
      breed.kgMin !== null &&
      breed.kgMin !== undefined &&
      breed.kgMax !== null &&
      breed.kgMax !== undefined;
    // Treat 0 as the "smallest bucket", so 1kg breeds remain visible.
    const normalizedMaxKg = maxKg === 0 ? 1 : maxKg;
    const matchesWeight =
      !hasActiveWeightFilter ||
      (hasKnownWeight && breed.kgMax >= minKg && breed.kgMin <= normalizedMaxKg);

    return matchesQuery && matchesWeight;
  });

  return (
    <div className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-10 lg:py-10">
      <main className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-glow bg-cream px-6 py-8 shadow-soft sm:px-10 sm:py-12">
          <div className="absolute -right-14 top-0 h-40 w-40 rounded-full bg-clay/20 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-moss/15 blur-2xl" />

          <div className="relative max-w-3xl">
            <h1 className="max-w-2xl font-display text-5xl leading-tight text-ink sm:text-6xl">
              All the Dogs
            </h1>

            <label className="mt-8 block max-w-2xl">
              <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.22em] text-bark">
                Search breeds
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the breed list first... Beagle, Akita, Corgi, Husky"
                className="w-full rounded-[1.75rem] border border-white/10 bg-paper/80 px-6 py-5 text-lg text-ink outline-none transition placeholder:text-ink/35 focus:border-clay focus:ring-2 focus:ring-clay/20"
              />
            </label>

          </div>
        </section>

        <section className="rounded-[2.25rem] border border-white/10 bg-white/5 p-5 shadow-soft backdrop-blur-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-bark">
                Browse breeds
              </p>
              <h2 className="mt-2 font-display text-3xl text-ink">
                Filter breeds
              </h2>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-paper/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-bark">
                  Size filter
                </p>
                <h3 className="mt-1 font-display text-2xl text-ink">
                  Show breeds from {minKg} kg to {maxKg} kg
                </h3>
              </div>

              <div className="w-full max-w-xl">
                <div className="grid gap-4">
                  <label className="block">
                    <div className="weight-field">
                      <div>
                        <p className="weight-field__label">Minimum size</p>
                        <p className="weight-field__hint">Smallest breed size to include</p>
                      </div>
                      <div className="weight-number-wrap focus-within:border-moss focus-within:ring-2 focus-within:ring-moss/20">
                        <input
                          type="number"
                          min={knownMinKg}
                          max={knownMaxKg}
                          step="1"
                          value={minKg}
                          onChange={(event) => updateMinKg(Number(event.target.value))}
                          className="weight-number-input w-16 text-right"
                        />
                        <span className="weight-number-unit">kg</span>
                      </div>
                    </div>
                  </label>

                  <label className="block">
                    <div className="weight-field">
                      <div>
                        <p className="weight-field__label">Maximum size</p>
                        <p className="weight-field__hint">Largest breed size to include</p>
                      </div>
                      <div className="weight-number-wrap focus-within:border-bark focus-within:ring-2 focus-within:ring-bark/20">
                        <input
                          type="number"
                          min={knownMinKg}
                          max={knownMaxKg}
                          step="1"
                          value={maxKg}
                          onChange={(event) => updateMaxKg(Number(event.target.value))}
                          className="weight-number-input w-16 text-right"
                        />
                        <span className="weight-number-unit">kg</span>
                      </div>
                    </div>
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
                      onChange={(event) => updateMinKg(Number(event.target.value))}
                      className="dual-range-slider__input dual-range-slider__input--min"
                    />
                    <input
                      type="range"
                      min={knownMinKg}
                      max={knownMaxKg}
                      step="1"
                      aria-label="Maximum size"
                      value={maxKg}
                      onChange={(event) => updateMaxKg(Number(event.target.value))}
                      className="dual-range-slider__input dual-range-slider__input--max"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-ink/65">
              Showing <span className="font-semibold text-ink">{visibleBreeds.length}</span>{" "}
              breeds
            </p>
            {query || minKg !== knownMinKg || maxKg !== knownMaxKg ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setMinKg(knownMinKg);
                  setMaxKg(knownMaxKg);
                }}
                className="text-sm font-semibold text-bark transition hover:text-ink"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {visibleBreeds.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleBreeds.map((breed, index) => (
                <BreedCard key={breed.name} breed={breed} index={index} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-paper/70 px-6 py-12 text-center">
              <p className="font-display text-2xl text-ink">No breeds found</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
