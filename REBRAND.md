# GuroHub rebrand — how it's structured & how to sync upstream

This repo is a **fork of [tonhowtf/omniget](https://github.com/tonhowtf/omniget)**.
The GuroHub rebrand is kept as a **single commit on top of `upstream/main`** so
that pulling new upstream work stays cheap. The internal code (Rust crates,
module names, the `omniget://` deep-link scheme) is **left untouched on purpose** —
only user-visible identity changes.

## One-time setup

```bash
git remote add upstream https://github.com/tonhowtf/omniget   # once
```

## Syncing with upstream (keeps the rebrand, keeps the UI)

```bash
git fetch upstream
git rebase upstream/main
```

`git rebase` replays the single rebrand commit on top of the new upstream. If it
stops with conflicts, they will almost always be in these buckets:

### 1. i18n files (`src/lib/i18n/*.json`) — the common case

Take upstream's version wholesale, then re-run the brand script:

```bash
git checkout --theirs src/lib/i18n/*.json
git add src/lib/i18n/*.json
node scripts/apply-rebrand.mjs      # OmniGet->GuroHub swap + greeting/auth keys
pnpm generate:i18n-keys             # refresh keys.ts
git add -A
git rebase --continue
```

### 2. Structural files — hand-merge (usually a one-line clash)

These carry real rebrand edits. When they conflict, keep upstream's structure and
re-apply the GuroHub bit:

| File | The GuroHub change to preserve |
|------|-------------------------------|
| `src-tauri/tauri.conf.json` | `productName` `GuroHub Video Downloader`, `identifier` `com.gurohub.videodownloader`, window `title`, updater `endpoints` -> `danestimbal/omniget_guro`, `createUpdaterArtifacts: false`. **Keep** `schemes: ["omniget"]`. |
| `package.json` | `"name": "gurohub-video-downloader"`, `firebase` dependency |
| `src/app.html` | `<title>GuroHub</title>` |
| `src/app.css` | `--accent: #D97706` (both themes), `--cta: #1C4ED8` / hover / press, `--on-cta: #FFFFFF` |
| `src/components/mascot/Mascot.svelte` | `emotionToSrc` returns `/guro_ai.gif`; circular `.mascot-img` (width == height, `border-radius: 50%`, `object-fit: cover`) |
| `src/components/home/HomeHero.svelte` | Firebase greeting + gradient `.hero-divider` (non-stage branch only) |
| `src/components/shell/AppToolbar.svelte` | Log Out button, `pageTitle || "GuroHub"` |
| `src/routes/+layout.svelte` | auth gate: `$isAuthLoading` loader, `LoginScreen` when not `premium_plus` |
| `src/routes/about/+page.svelte`, `about/project/+page.svelte` | `<h1>GuroHub`, Facebook link instead of GitHub/Discord, `/guro_ai.gif` logo |
| `README*.md` | cosmetic only — safe to accept `--theirs` and re-swap the H1 / hero by hand, or leave drifted |

New files that never conflict: `src/lib/firebase.ts`, `src/components/auth/LoginScreen.svelte`.

### 3. Assets — binary, `--theirs` then restore

```bash
git checkout --ours src-tauri/icons static/favicon.png static/guro_ai.gif
git rm -r --ignore-unmatch static/mascot static/loop.png
```

### 4. Study area — translated Portuguese, not a rebrand edit

Separately from the rebrand, upstream ships the whole **Study** feature
(`src/routes/study/**`, `src/lib/study-components/**`, `src/lib/study-music*/**`)
with large amounts of **hardcoded Portuguese** in the UI (not routed through
`$t()`). That has been translated to English across ~150 files, as its own
stack of `i18n(study): ...` commits on top of the rebrand commit.

This is **not** part of the GuroHub identity — it's a straight PT→EN string
swap of upstream's own text, done in place (button labels, toasts, dialog
titles, placeholders). It rebases cleanly most of the time since it doesn't
touch logic, but any Study file upstream edits will conflict here too. When
that happens: take upstream's version, then re-translate any hardcoded PT
strings it (re)introduced the same way — plain English replacement of the
literal, no `$t()` plumbing added. A repo-wide sanity check for stragglers:

```bash
grep -rnoE '"[A-Za-zÀ-ÿ][^"]{2,90}"|>[A-Za-zÀ-ÿ][^<>{}]{2,90}<' \
  src/routes/study/ src/lib/study-components/ src/lib/study-music/ src/lib/study-music-components/ \
  | grep -E 'ç|ã|õ|á[a-z]|é[a-z]|í[a-z]|ó[a-z]|ú[a-z]|ê|â' \
  | grep -viE 'pt-BR|Français|PT-BR|Español|Português'
```

Any output is a leftover hardcoded Portuguese string to translate.

## After the rebase

```bash
pnpm check
CARGO_TARGET_DIR=D:/gurohub-target pnpm exec tauri build --bundles nsis   # C: is short on space
git push --force origin main          # history was rewritten by the rebase — expected
```

`--force` is safe here because `origin/main` is only ever this fork's rebranded
mirror; nobody else pushes to it.
