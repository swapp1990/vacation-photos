import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "out");
const MARKER = "<!--vp-defer-hydration-->";
const LOADER =
  '<script>(function(){var s=SRCS,done=0,l=0,pt=0;function go(){if(done)return;done=1;s.forEach(function(u){var e=document.createElement("script");e.src=u;e.async=false;document.body.appendChild(e);});}function chk(){if(l&&pt)setTimeout(go,0);}addEventListener("load",function(){l=1;chk();});try{new PerformanceObserver(function(li){if(li.getEntriesByName("first-contentful-paint").length){pt=1;chk();}}).observe({type:"paint",buffered:true});}catch(e){pt=1;}setTimeout(go,4000);})();</script>';

async function walkHtml(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkHtml(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function leftoverChunkScripts(html) {
  const leftover = [];
  const re = /<script\s+src="(\/_next\/static\/chunks\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    if (!m[1].includes("polyfills")) leftover.push(m[1]);
  }
  return leftover;
}

function transform(html) {
  if (html.includes(MARKER)) return { html, moved: 0, skipped: true };

  const srcs = [];
  html = html.replace(/<script\b([^>]*)>\s*<\/script>/gi, (full, attrs) => {
    const m = attrs.match(/\bsrc=(["'])(\/_next\/static\/chunks\/[^"']+)\1/i);
    if (!m) return full;
    const src = m[2];
    if (src.includes("polyfills")) return full;
    srcs.push(src);
    return "";
  });

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const preload = /\brel=(["'])preload\1/i.test(tag);
    const asScript = /\bas=(["'])script\1/i.test(tag);
    const chunk = /\bhref=(["'])\/_next\/static\/chunks\//i.test(tag);
    if (preload && asScript && chunk) return "";
    return tag;
  });

  if (srcs.length > 0) {
    const loader = LOADER.replace("SRCS", JSON.stringify(srcs));
    const insert = `${MARKER}${loader}`;
    const idx = html.lastIndexOf("</body>");
    if (idx === -1) {
      throw new Error("no </body> to insert loader");
    }
    html = html.slice(0, idx) + insert + html.slice(idx);
  }

  return { html, moved: srcs.length, skipped: false };
}

async function main() {
  const files = await walkHtml(outDir);
  let indexMoved = 0;
  const leftoverFiles = [];

  for (const file of files) {
    const rel = path.relative(outDir, file).split(path.sep).join("/");
    const original = await fs.readFile(file, "utf8");
    const { html, moved, skipped } = transform(original);
    if (!skipped && html !== original) await fs.writeFile(file, html);
    console.log(rel, skipped ? "skipped" : moved);
    if (rel === "index.html") indexMoved = skipped ? 1 : moved;
    const leftover = leftoverChunkScripts(skipped ? original : html);
    if (leftover.length) leftoverFiles.push(`${rel}: ${leftover.join(", ")}`);
  }

  if (indexMoved === 0) {
    console.error("out/index.html ended up with zero moved scripts");
    process.exit(1);
  }
  if (leftoverFiles.length) {
    console.error("non-polyfills chunk script tags remain:");
    for (const line of leftoverFiles) console.error(line);
    process.exit(1);
  }
}

main();
