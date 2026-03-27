import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");
const docsIndexPath = path.join(docsDir, "index.html");
const redirectBlockPattern =
  /\s*<!-- github-pages-root-redirect:start -->[\s\S]*?<!-- github-pages-root-redirect:end -->\s*/;
const builtRedirectScriptPattern =
  /\s*<script>\s*if \(location\.hostname\.endsWith\("github\.io"\)\) \{\s*const docsUrl = new URL\("\.\/docs\/", location\.href\);\s*if \(location\.pathname !== docsUrl\.pathname\) \{\s*location\.replace\(docsUrl\);\s*\}\s*\}\s*<\/script>\s*/;

async function copyIntoRoot(name) {
  const source = path.join(docsDir, name);
  const destination = path.join(rootDir, name);

  await rm(destination, { force: true, recursive: true });
  await cp(source, destination, { recursive: true });
}

await mkdir(docsDir, { recursive: true });
const docsIndex = await readFile(docsIndexPath, "utf8");
await writeFile(
  docsIndexPath,
  docsIndex
    .replace(redirectBlockPattern, "\n    ")
    .replace(builtRedirectScriptPattern, "\n    "),
  "utf8",
);
await copyIntoRoot("assets");
await copyIntoRoot("images");
