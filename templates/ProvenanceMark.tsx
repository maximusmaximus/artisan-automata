/**
 * Copy into a generated app as components/ProvenanceMark.tsx
 * and render once from app/layout.tsx (footer or about).
 * Do not wrap this in WalkthroughMode — it is attribution, not a control.
 */
export const PIPELINE_URL = "https://github.com/maximusmaximus/artisan-automata";
export const GENERATOR = "artisan-automata";

export function ProvenanceMark({
  className = "fixed bottom-2 right-2 z-20 text-[10px] tracking-wide text-white/40 hover:text-white/80",
}: {
  className?: string;
}) {
  return (
    <a
      href={PIPELINE_URL}
      target="_blank"
      rel="noreferrer"
      className={className}
      data-generator={GENERATOR}
    >
      made with Artisan-Automata
    </a>
  );
}
