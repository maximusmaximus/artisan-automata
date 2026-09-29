# Security

This pipeline generates public web apps that may request OAuth. Treat every generated app as internet-facing.

## Google Drive

Allowed scope:

```text
https://www.googleapis.com/auth/drive.file
```

Forbidden scopes:

```text
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.metadata
https://www.googleapis.com/auth/drive.metadata.readonly
```

`drive.file` can only touch files the app created. That is the point.

On first save, create an app folder named `GOOGLE_DRIVE_APP_FOLDER_NAME` (default `ArtisanAutomata`) and store `{slug}.json` + `{slug}.png` inside it.

Sharing to `/explore` sets the Drive file permission to `anyoneWithLink` / reader and writes a pointer into the app database. Unshare or moderate by deleting the pointer. **Never delete the user's Drive file from an admin panel.**

## Auth

- Google is the save provider. X is optional identity / social handle.
- X-only sessions stay on Core storage (`localStorage` + hash) until Google is linked.
- Store Drive refresh tokens encrypted in the auth session or a server-only table. Never `console.log` tokens. Never put them in `RUN.md` or the ledger.
- `AUTH_SECRET` must be a long random value. Generate with `openssl rand -base64 32`.

## Admin

Admin is an **allowlist**:

```text
ADMIN_USER_IDS=1234567890
ADMIN_EMAILS=you@example.com
```

Do not implement “first authenticated user becomes ADMIN.” On a public URL that is a privilege-escalation race.

Hidden admin routes must still check the allowlist server-side. Obscurity is not authorization.

## Secrets

Never commit:

- `.env`, `.env.local`
- OAuth client secrets
- refresh tokens
- user Drive JSON contents that were not explicitly published
- API keys

Generated apps must ship `.env.example` with empty values and a README section that names every variable.

## Client surface

- No hidden network exfiltration.
- No credential harvesting forms unrelated to documented auth.
- Fullscreen and microphone require a user gesture and a visible control.
- User-supplied strings rendered into OG images or DOM must be escaped.
- Rate-limit public `/api/og` and any Drive-fetching route.

## Moderation

Studio admins may:

- remove a creation pointer from `/explore`
- mark a slug as unlisted
- append a `ModerationEvent`

Studio admins may not:

- impersonate a user
- download private Drive files
- wipe a user's app folder
