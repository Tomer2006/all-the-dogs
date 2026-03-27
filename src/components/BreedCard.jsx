import { useState } from "react";

function getFallbackImage(index) {
  return "/images/dog-placeholder.svg";
}

function formatWeightRange(breed) {
  if (breed.kgMin == null || breed.kgMax == null) {
    return "KG range unavailable in current web sources";
  }

  if (breed.kgMin === breed.kgMax) {
    return `${breed.kgMin} kg`;
  }

  return `${breed.kgMin}-${breed.kgMax} kg`;
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
      <p className="pb-4 text-center text-sm font-medium text-ink/70">
        {formatWeightRange(breed)}
      </p>
    </article>
  );
}
