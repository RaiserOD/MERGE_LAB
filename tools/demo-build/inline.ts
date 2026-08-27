import { readFile, writeFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

/**
 * Folds the demo build into one self-contained HTML file.
 *
 * The hosted build cannot be opened as a local file: its asset paths are
 * absolute, its module script is blocked by CORS under file://, and its CSP
 * pins script-src to 'self', which matches nothing when the origin is null.
 * Inlining removes all three problems at once — there is nothing left to
 * fetch.
 */
const DIST = "demo-dist";
const html = await readFile(path.join(DIST, "index.html"), "utf8");

const assets = await readdir(path.join(DIST, "assets"));
const jsName = assets.find((f) => f.endsWith(".js"));
if (!jsName) throw new Error("no bundle in demo-dist/assets");
const js = await readFile(path.join(DIST, "assets", jsName), "utf8");

// `</script>` inside the bundle would close the tag early.
const safeJs = js.replaceAll("</script>", "<\\/script>");

let out = html
  // A function replacer, not a string: the minified bundle is full of `$`
  // sequences and String.replace would eat them as substitution patterns
  // ($&, $\', $`), corrupting the very code being inlined.
  .replace(
    /<script type="module"[^>]*><\/script>/,
    () => `<script type="module">\n${safeJs}\n</script>`,
  )
  .replace(/<link rel="modulepreload"[^>]*>/g, "")
  .replace(/<link rel="manifest"[^>]*>/g, "")
  .replace(/<link rel="icon"[^>]*>/g, "");

// The shipped CSP is correct for a hosted page and wrong for a local file:
// 'self' is null under file://, so it would block the inlined script. The
// real policy stays in index.html; this only affects the demo artifact.
out = out.replace(
  /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
  `<!--
      No CSP here on purpose. This is the standalone demo artifact, opened
      from file:// where 'self' matches nothing, so the shipped policy would
      block its own inlined script. The real Content-Security-Policy lives in
      index.html and is unchanged — see SECURITY.md.
    -->`,
);

if (/<script[^>]+src=/.test(out)) {
  throw new Error("a <script src> survived inlining — the demo would need a server");
}
if (out.includes("assets/")) {
  throw new Error("an asset reference survived inlining");
}

await writeFile(path.join(DIST, "MergeLab-demo.html"), out, "utf8");
await rm(path.join(DIST, "assets"), { recursive: true, force: true });
await rm(path.join(DIST, "index.html"), { force: true });

const kb = (Buffer.byteLength(out, "utf8") / 1024).toFixed(0);
console.log(`demo-dist/MergeLab-demo.html  ${kb} KB  (single file, no server needed)`);
