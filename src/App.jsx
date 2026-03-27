import { useState } from "react";
import BreedCard from "./components/BreedCard";
import { dogBreeds } from "./data/dogBreeds";

const alphabet = [
  "All",
  ...new Set(dogBreeds.map((breed) => breed.name.charAt(0).toUpperCase())),
];
const knownMaxKg = Math.ceil(
  Math.max(...dogBreeds.map((breed) => breed.kgMax ?? 0), 0),
);
const knownMinKg = Math.floor(
  Math.min(
    ...dogBreeds
      .map((breed) => breed.kgMin)
      .filter((value) => value !== null && value !== undefined),
  ),
);

export default function App() {
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState("All");
  const [minKg, setMinKg] = useState(knownMinKg);
  const [maxKg, setMaxKg] = useState(knownMaxKg);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleBreeds = dogBreeds.filter((breed) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      breed.name.toLowerCase().includes(normalizedQuery);

    const matchesLetter =
      activeLetter === "All" || breed.name.startsWith(activeLetter);

    const hasActiveWeightFilter = minKg !== knownMinKg || maxKg !== knownMaxKg;
    const hasKnownWeight =
      breed.kgMin !== null &&
      breed.kgMin !== undefined &&
      breed.kgMax !== null &&
      breed.kgMax !== undefined;
    const matchesWeight =
      !hasActiveWeightFilter ||
      (hasKnownWeight && breed.kgMin >= minKg && breed.kgMax <= maxKg);

    return matchesQuery && matchesLetter && matchesWeight;
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

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-ink shadow-sm">
                {dogBreeds.length} breeds
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.25rem] border border-white/10 bg-white/5 p-5 shadow-soft backdrop-blur-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-bark">
                Browse breeds
              </p>
              <h2 className="mt-2 font-display text-3xl text-ink">
                Filter or jump by letter
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
                    <div className="mb-2 flex items-center justify-between text-sm font-medium text-ink/70">
                      <span>Minimum size</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ink shadow-sm">
                        {minKg} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      min={knownMinKg}
                      max={maxKg}
                      step="1"
                      value={minKg}
                      onChange={(event) => setMinKg(Number(event.target.value))}
                      className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white accent-moss"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 flex items-center justify-between text-sm font-medium text-ink/70">
                      <span>Maximum size</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ink shadow-sm">
                        {maxKg} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      min={minKg}
                      max={knownMaxKg}
                      step="1"
                      value={maxKg}
                      onChange={(event) => setMaxKg(Number(event.target.value))}
                      className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white accent-bark"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {alphabet.map((letter) => {
              const isActive = activeLetter === letter;

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setActiveLetter(letter)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-bark text-paper"
                      : "border border-white/10 bg-paper/70 text-ink hover:border-bark/40 hover:text-bark"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-ink/65">
              Showing <span className="font-semibold text-ink">{visibleBreeds.length}</span>{" "}
              breeds
            </p>
            {activeLetter !== "All" || query || minKg !== knownMinKg || maxKg !== knownMaxKg ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveLetter("All");
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
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleBreeds.map((breed, index) => (
                <BreedCard key={breed.name} breed={breed} index={index} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-paper/70 px-6 py-12 text-center">
              <p className="font-display text-2xl text-ink">No breeds found</p>
              <p className="mt-2 text-ink/65">
                Try a different name or switch back to the full list.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
