/**
 * Copy into a generated app as lib/pipeline.ts and import from app/layout.tsx.
 * These constants are the aggregatable reference back to the pipeline repo.
 */
export const ARTISAN_AUTOMATA = {
  kind: "artisan-automata-app",
  generator: "artisan-automata",
  pipeline: "https://github.com/maximusmaximus/artisan-automata",
  pipelineRepo: "maximusmaximus/artisan-automata",
  project: "ArtisanAutomata",
} as const;

export const GENERATOR_META =
  "Artisan-Automata https://github.com/maximusmaximus/artisan-automata";
