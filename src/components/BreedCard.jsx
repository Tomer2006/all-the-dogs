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
    <article className="group rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-bark/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.45)]">
      <div className="overflow-hidden rounded-[1.5rem] bg-cream">
        <img
          src={imageSrc}
          alt={breed.name}
          loading="lazy"
          onError={handleImageError}
          className="h-72 w-full object-cover transition duration-700 group-hover:scale-105 sm:h-80"
        />
      </div>
      <h2 className="px-3 pb-3 pt-4 text-center font-display text-xl font-semibold tracking-tight text-ink">
        {breed.name}
      </h2>
      <div className="px-3 pb-4">
        <p className="text-center text-sm font-medium text-ink/70">{formatWeightRange(breed)}</p>
        <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-paper/55 px-4 py-3 text-sm text-ink/75">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bark">
            Life span
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                Male
              </p>
              <p className="mt-1 font-medium text-ink">
                {formatLifeSpanRange(breed.maleLifeSpanMin, breed.maleLifeSpanMax)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
                Female
              </p>
              <p className="mt-1 font-medium text-ink">
                {formatLifeSpanRange(
                  breed.femaleLifeSpanMin,
                  breed.femaleLifeSpanMax,
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
