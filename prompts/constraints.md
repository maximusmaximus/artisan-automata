# Hard constraints

Non-negotiable for every Artisan-Automata run. If a later phase conflicts with this file, this file wins.

## Identity of the pipeline

- `artisan-automata` is the spec repo. Generated apps go elsewhere.
- Do not re-initialize this repository as the art app.
- Do not delete ledger history.

## Originality

- Each run must introduce a new `mechanicId` and a new app name.
- Inspiration from X is required when tools work; verbatim clones are forbidden.
- Credit sources in `RUN.md` and the ledger. Do not paste other people's code.

## Discovery

- Use Grok X tools only: `x_keyword_search`, `x_semantic_search`, `x_thread_fetch`, `x_user_search`.
- Do not scrape `x.com` / `twitter.com`.
- Do not invent posts. If tools fail, say first-principles in the run log.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS.
- Strict TypeScript. No `any` except at documented external-library edges.
- Atomic components. One file, one job.
- Responsive from ~320px to ultrawide using clamp(), Flex/Grid, and visualViewport.
- Pointer + touch listeners. 44px minimum hit targets for the I control and primary tools.

## Walkthrough

- Persistent I button, pinned top-left, z-index 9999.
- Clicking it toggles WalkthroughMode.
- While active, every interactive control shows a smaller i badge.
- Badge content explains the control and the underlying math or mapping when there is any.
- I key toggles. Esc closes. Focus the tip popover.

## Audio and fullscreen

- Web Audio API or Tone.js is required on Core unless the operator sets Audio: off.
- audioContext.resume() and requestFullscreen() only after a user gesture.
- Never autoplay sound. Never lock fullscreen on load.
- Persist a preferFullscreen flag if the user opts in.

## State

- Serialize the live instrument to JSON matching schemas/creation-state.schema.json.
- Serialize parameters and seeds, never raw audio buffers or GPU textures.
- Core share path: URL hash + localStorage.
- Cloud/Studio add Drive JSON + PNG thumbnail.

## Auth and Drive

- Google OAuth is the save provider. Scope: drive.file only.
- X OAuth is optional identity. X-only users keep Core storage until they link Google.
- Admin is ADMIN_USER_IDS / ADMIN_EMAILS. No first-user genesis.

## Output

- Write files to the target repo. Chat gets a brief, not a novel.
- No secrets in git, README, ledger, or OG image text.
- Degrade profile rather than fail the run when secrets are missing.

## Safety

- Follow CODE_OF_USE.md.
