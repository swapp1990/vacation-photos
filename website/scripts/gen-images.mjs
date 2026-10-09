import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const imagesDir = path.join(root, "public", "images");
const optDir = path.join(imagesDir, "opt");
const publicDir = path.join(root, "public");

const WEBP = { quality: 78, effort: 6 };
const SRC_ASPECT = 2796 / 1290;
const SHOTS = ["screenshot-main", "screenshot-trip", "screenshot-photo"];
const SHOT_WIDTHS = [200, 320, 400, 640, 960];

async function main() {
  await fs.mkdir(optDir, { recursive: true });

  for (const name of SHOTS) {
    const src = path.join(imagesDir, `${name}.png`);
    for (const width of SHOT_WIDTHS) {
      const height = Math.round(width * SRC_ASPECT);
      const dest = path.join(optDir, `${name}-${width}.webp`);
      await sharp(src).resize(width, height).webp(WEBP).toFile(dest);
      console.log("wrote", path.relative(root, dest), `${width}x${height}`);
    }
  }

  const iconSrc = path.join(imagesDir, "app-icon.png");
  const iconOuts = [
    [path.join(optDir, "app-icon-64.webp"), 64, "webp"],
    [path.join(optDir, "app-icon-128.webp"), 128, "webp"],
    [path.join(imagesDir, "icon-32.png"), 32, "png"],
    [path.join(imagesDir, "icon-192.png"), 192, "png"],
    [path.join(publicDir, "apple-touch-icon.png"), 180, "png"],
  ];
  for (const [dest, size, format] of iconOuts) {
    const pipeline = sharp(iconSrc).resize(size, size);
    if (format === "webp") {
      await pipeline.webp(WEBP).toFile(dest);
    } else {
      await pipeline.png({ compressionLevel: 9 }).toFile(dest);
    }
    console.log("wrote", path.relative(root, dest));
  }

  const faviconDest = path.join(publicDir, "favicon.ico");
  const png32 = await sharp(iconSrc).resize(32, 32).png().toBuffer();
  await fs.writeFile(faviconDest, pngToIco(png32));
  console.log("wrote", path.relative(root, faviconDest));

  await writeOgImage(iconSrc);
}

function pngToIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);
  entry.writeUInt8(32, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, pngBuffer]);
}

async function writeOgImage(iconSrc) {
  const width = 1200;
  const height = 630;
  const iconSize = 160;
  const shotH = 560;
  const shotW = Math.round(shotH * (1290 / 2796));
  const iconRadius = 36;
  const shotRadius = 40;

  const iconMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}"><rect width="${iconSize}" height="${iconSize}" rx="${iconRadius}" ry="${iconRadius}"/></svg>`
  );
  const iconBuf = await sharp(iconSrc)
    .resize(iconSize, iconSize)
    .composite([{ input: iconMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const shotMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="${shotRadius}" ry="${shotRadius}"/></svg>`
  );
  const shotBuf = await sharp(path.join(imagesDir, "screenshot-main.png"))
    .resize(shotW, shotH)
    .composite([{ input: shotMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="180">
  <text x="0" y="52" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" fill="#f1f5f9">Vacation Photos</text>
  <text x="0" y="100" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#94a3b8">Your vacation photos, organized by trip</text>
</svg>`);

  const dest = path.join(imagesDir, "og-image.png");
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#0f172a",
    },
  })
    .composite([
      { input: iconBuf, left: 72, top: 150 },
      { input: textSvg, left: 72, top: 340 },
      {
        input: shotBuf,
        left: width - 64 - shotW,
        top: Math.round((height - shotH) / 2),
      },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toFile(dest);

  const stat = await fs.stat(dest);
  const kb = Math.round(stat.size / 1024);
  console.log("wrote", path.relative(root, dest), `${kb} KB`);
  if (stat.size > 300 * 1024) {
    throw new Error(`og-image.png is ${kb} KB; must stay under 300 KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
