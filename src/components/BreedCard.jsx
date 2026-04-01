import { useState } from "react";

function getFallbackImage(index) {
  return "/images/dog-placeholder.svg";
}

function formatWeightRange(breed) {
  if (breed.kgMin == null || breed.kgMax == null) {
    return "Weight range unavailable";
  }

  if (breed.kgMin === breed.kgMax) {
    return `${breed.kgMin} kg`;
  }

  return `${breed.kgMin}-${breed.kgMax} kg`;
}

function formatLifeSpanRange(min, max) {
  if (min == null || max == null) {
    return "Unavailable";
  }

  if (min === max) {
    return `${min} years`;
  }

  return `${min}-${max} years`;
}

export default function BreedCard({ breed, index }) {
  const fallbackImage = getFallbackImage(index);
  const [imageSrc, setImageSrc] = useState(breed.image ?? fallbackImage);

  function handleImageError() {
    if (imageSrc !== fallbackImage) {
      setImageSrc(fallbackImage);
    }
  }

  return (
    <article className="group mx-auto w-full max-w-[22rem] rounded-[1.6rem] border border-white/10 bg-white/5 p-2.5 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-bark/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.45)] sm:max-w-none sm:rounded-[2rem] sm:p-3">
      <div className="overflow-hidden rounded-[1.2rem] bg-cream sm:rounded-[1.5rem]">
        <img
          src={imageSrc}
          alt={breed.name}
          loading="lazy"
          onError={handleImageError}
          className="h-56 w-full object-cover transition duration-700 group-hover:scale-105 sm:h-72 lg:h-80"
        />
      </div>
      <h2 className="px-2 pb-2 pt-3 text-center font-display text-lg font-semibold tracking-tight text-ink sm:px-3 sm:pb-3 sm:pt-4 sm:text-xl">
        {breed.name}
      </h2>
      <div className="px-2 pb-2 sm:px-3 sm:pb-4">
        <div className="mx-auto w-fit max-w-full rounded-[1rem] border border-white/10 bg-paper/55 px-3 py-3 text-sm text-ink/75 sm:rounded-[1.25rem] sm:px-4">
          <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-2 text-left">
            <div className="flex min-w-[7.5rem] flex-col whitespace-nowrap">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bark">
                Weight
              </p>
              <p className="mt-1 font-medium text-ink">{formatWeightRange(breed)}</p>
            </div>
            <div className="flex min-w-[7.5rem] flex-col whitespace-nowrap">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bark">
                Life span
              </p>
              <p className="mt-1 font-medium text-ink">
                {formatLifeSpanRange(breed.maleLifeSpanMin, breed.maleLifeSpanMax)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
