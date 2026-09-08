/**
 * Re-applies the mechanical half of the GuroHub rebrand: the OmniGet -> GuroHub
 * string swap and the extra keys in the i18n locale files.
 *
 * The rebrand lives as ONE commit on top of `upstream/main` (tonhowtf/omniget).
 * When you rebase onto a new upstream, ~all of the conflicts land in
 * `src/lib/i18n/*.json`, because every name swap collides with an upstream
 * string edit. This script makes those trivial to resolve.
 *
 * Sync recipe:
 *
 *   git fetch upstream
 *   git rebase upstream/main
 *   # when it stops on i18n conflicts:
 *   git checkout --theirs src/lib/i18n/*.json && git add src/lib/i18n/*.json
 *   node scripts/apply-rebrand.mjs
 *   pnpm generate:i18n-keys        # refresh src/lib/i18n/keys.ts
 *   git add -A && git rebase --continue
 *   # hand-resolve any remaining structural conflicts (see REBRAND.md)
 *   pnpm check && git push --force origin main
 *
 * Idempotent: running it on an already-branded tree changes nothing.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const swap = (s) =>
  s
    .replaceAll("OmniGet", "GuroHub")
    .replaceAll("Omniget", "GuroHub")
    .replaceAll("omniget", "gurohub")
    .replaceAll("OMNIGET", "GUROHUB");

function walk(node) {
  if (typeof node === "string") return swap(node);
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === "object")
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
  return node;
}

const i18nDir = "src/lib/i18n";
for (const f of readdirSync(i18nDir).filter((n) => n.endsWith(".json"))) {
  const p = join(i18nDir, f);
  const raw = readFileSync(p, "utf8");
  const crlf = raw.includes("\r\n");
  const j = walk(JSON.parse(raw));

  j.home ??= {};
  if (!j.home.greeting_morning) {
    j.home = {
      greeting_morning: "Good morning, {{name}}",
      greeting_afternoon: "Good afternoon, {{name}}",
      greeting_evening: "Good evening, {{name}}",
      ...j.home,
    };
  }
  j.auth = { log_out: "Log Out", loading: "Loading GuroHub...", ...(j.auth ?? {}) };

  let out = JSON.stringify(j, null, 2) + "\n";
  if (crlf) out = out.replaceAll("\n", "\r\n");
  writeFileSync(p, out, "utf8");
}

console.log(`branded ${i18nDir}/*.json — now run: pnpm generate:i18n-keys`);
