import { useState } from "react";

function getFallbackImage() {
  return "/images/dog-placeholder.svg";
}

function formatWeightRange(breed) {
  if (breed.kgMin == null || breed.kgMax == null) {
    return "Unavailable";
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

export default function BreedCard({ breed }) {
  const fallbackImage = getFallbackImage();
  const [imageSrc, setImageSrc] = useState(breed.image ?? fallbackImage);

  function handleImageError() {
    if (imageSrc !== fallbackImage) {
      setImageSrc(fallbackImage);
    }
  }

  return (
    <article className="group overflow-hidden rounded-lg border border-line bg-card shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-bark/45 hover:shadow-cardHover">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <img
          src={imageSrc}
          alt={breed.name}
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[3rem] font-display text-xl font-semibold leading-6 text-ink">
          {breed.name}
        </h3>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="metric-box">
            <dt>Weight</dt>
            <dd>{formatWeightRange(breed)}</dd>
          </div>
          <div className="metric-box">
            <dt>Life span</dt>
            <dd>{formatLifeSpanRange(breed.maleLifeSpanMin, breed.maleLifeSpanMax)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
