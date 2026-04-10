# All the Dogs

A photo-first dog breed directory built with React. Browse hundreds of breeds, search by name, and narrow the list with a weight (kg) range filter. Each card shows a breed photo, typical weight range, and life span.

## Tech stack

- [React](https://react.dev/) 18
- [Vite](https://vitejs.dev/) 5
- [Tailwind CSS](https://tailwindcss.com/) 3

## Project layout

| Path | Purpose |
|------|---------|
| `src/App.jsx` | Search, weight filter, and breed grid |
| `src/components/BreedCard.jsx` | Breed card UI (image, weight, life span) |
| `src/data/dogBreeds.js` | Breed records (name, image path, kg range, life span fields) |
| `src/data/manualWeightOverrides.js` | Hand-tuned weight data where sources disagree |
| `src/data/manualImageOverrides.js` | Hand-picked image URLs for specific breeds |
| `public/images/breeds/` | Local WebP images referenced by `dogBreeds.js` |

## Data maintenance scripts

These scripts use Node and may fetch from the network. Run them when you intentionally refresh breed data or assets (not required for a normal `dev` / `build`).

| Command | What it does |
|---------|----------------|
| `npm run generate:breeds` | Regenerates `dogBreeds.js` from Wikipedia’s list of dog breeds and related sources (images, weights, structure). |
| `npm run sync:lifespans` | Updates life span fields in `dogBreeds.js` from CSV-backed ranges while preserving other fields. |
| `npm run localize:images` | Downloads/processes breed images into `public/images/breeds/` (uses [sharp](https://sharp.pixelplumbing.com/)) and updates paths in `dogBreeds.js`. |

