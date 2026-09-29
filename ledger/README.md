# Novelty ledger

This folder is how scheduled Grok runs avoid repeating themselves.

## Files

- `prior-runs.md` — one table row per generated app
- `runs/<YYYY-MM-DD>-<slug>.md` — concept brief + sources

## Rules

- Append after every successful generation.
- Never store secrets, tokens, emails, or Drive file bodies.
- If a run is aborted before an app exists, do not add a row.

## Agent checklist

1. Read `prior-runs.md` before naming.
2. Reject colliding names and mechanic ids.
3. After publish, append the row and the run file **back on this pipeline repo**.
