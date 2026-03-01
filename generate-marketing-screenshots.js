#!/usr/bin/env node
/**
 * Generate App Store marketing screenshots for Vacation Photos
 * Custom compositor with multi-line headline support
 */

const sharp = require('/Users/swapnilsawant/projects/ios-screenshot-gen/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_DIR = path.join(__dirname, 'screenshots', 'marketing');

const SIZES = {
  '6.9inch': { width: 1320, height: 2868, deviceScale: 0.72, cornerRadius: 72 },
  '6.5inch': { width: 1242, height: 2688, deviceScale: 0.72, cornerRadius: 68 },
};

// 6 screenshots for App Store — each uses a distinct screen or gradient
const SCREENSHOTS = [
  {
    name: '01-auto-organized',
    rawFile: 'screen-main.png',
    lines: ['Your vacations,', 'auto-organized'],
    subtext: 'No folders. No tagging. Just magic.',
    gradient: ['#7C3AED', '#5B21B6'],
  },
  {
    name: '02-finds-trips',
    rawFile: 'screen-main.png',
    lines: ['Finds trips hiding', 'in your camera roll'],
    subtext: null,
    gradient: ['#6D28D9', '#4C1D95'],
  },
  {
    name: '03-sorted-destination',
    rawFile: 'screen-detail-hawaii.png',
    lines: ['Every photo, sorted', 'by destination'],
    subtext: null,
    gradient: ['#7C3AED', '#5B21B6'],
  },
  {
    name: '04-share-trip',
    rawFile: 'screen-share.png',
    lines: ['Share a trip', 'with one link'],
    subtext: null,
    gradient: ['#8B5CF6', '#6D28D9'],
  },
  {
    name: '05-private',
    rawFile: 'screen-main.png',
    lines: ['100% private.', 'Nothing leaves', 'your phone.'],
    subtext: null,
    gradient: ['#5B21B6', '#3B0764'],
  },
  {
    name: '06-thousands-photos',
    rawFile: 'screen-detail-tokyo.png',
    lines: ['Works with', 'thousands of photos'],
    subtext: null,
    gradient: ['#7C3AED', '#4C1D95'],
  },
];

function lightenColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighten = (c) => Math.min(255, Math.round(c + (255 - c) * factor));
  return '#' + [lighten(r), lighten(g), lighten(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

async function createGradientBackground(width, height, colors) {
  const midColor = lightenColor(colors[0], 0.15);
  const accentColor = lightenColor(colors[0], 0.3);

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${midColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
        <radialGradient id="accentGlow" cx="50%" cy="25%" r="60%" fx="50%" fy="25%">
          <stop offset="0%" style="stop-color:${accentColor};stop-opacity:0.35" />
          <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#mainGrad)"/>
      <rect width="100%" height="100%" fill="url(#accentGlow)"/>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function createDeviceMockup(screenBuffer, deviceWidth, deviceHeight, cornerRadius) {
  const borderWidth = 4;
  const shadowPad = 60;
  const totalWidth = deviceWidth + borderWidth * 2 + shadowPad * 2;
  const totalHeight = deviceHeight + borderWidth * 2 + shadowPad * 2;

  const resizedScreen = await sharp(screenBuffer)
    .resize(deviceWidth, deviceHeight, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const mask = Buffer.from(`
    <svg width="${deviceWidth}" height="${deviceHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${deviceWidth}" height="${deviceHeight}"
        rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>
  `);

  const maskedScreen = await sharp(resizedScreen)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const containerSvg = `
    <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="deviceShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="28" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      <rect x="${shadowPad}" y="${shadowPad}"
        width="${deviceWidth + borderWidth * 2}" height="${deviceHeight + borderWidth * 2}"
        rx="${cornerRadius + borderWidth}" ry="${cornerRadius + borderWidth}"
        fill="rgba(0,0,0,0.12)"
        filter="url(#deviceShadow)"/>
      <rect x="${shadowPad}" y="${shadowPad}"
        width="${deviceWidth + borderWidth * 2}" height="${deviceHeight + borderWidth * 2}"
        rx="${cornerRadius + borderWidth}" ry="${cornerRadius + borderWidth}"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    </svg>
  `;

  const containerBuffer = await sharp(Buffer.from(containerSvg)).png().toBuffer();

  return {
    buffer: await sharp(containerBuffer)
      .composite([{
        input: maskedScreen,
        top: shadowPad + borderWidth,
        left: shadowPad + borderWidth,
      }])
      .png()
      .toBuffer(),
    totalWidth,
    totalHeight,
    shadowPad,
    borderWidth,
  };
}

async function addMultilineText(backgroundBuffer, lines, subtext, width, height, textAreaHeight) {
  const headlineFontSize = 108;
  const lineHeight = 130;
  const subtextFontSize = 50;

  const escapeXml = (text) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Calculate vertical centering in text area
  const totalHeadlineHeight = lines.length * lineHeight;
  const totalBlockHeight = totalHeadlineHeight + (subtext ? subtextFontSize + 40 : 0);
  const startY = Math.round((textAreaHeight - totalBlockHeight) / 2) + headlineFontSize * 0.8;
  const baseY = Math.max(100 + headlineFontSize * 0.8, startY);

  // Build headline tspans
  const tspans = lines.map((line, i) => {
    const y = baseY + i * lineHeight;
    return `<tspan x="${width / 2}" y="${y}">${escapeXml(line)}</tspan>`;
  }).join('\n');

  // Subtext position
  const subtextY = baseY + (lines.length - 1) * lineHeight + subtextFontSize + 50;

  const textSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.25)"/>
        </filter>
      </defs>
      <style>
        .headline {
          font-family: 'SF Pro Display', -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 800;
          font-size: ${headlineFontSize}px;
          fill: #FFFFFF;
          letter-spacing: -0.03em;
        }
        .subtext {
          font-family: 'SF Pro Display', -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 500;
          font-size: ${subtextFontSize}px;
          fill: #FFFFFF;
          opacity: 0.85;
        }
      </style>
      <text text-anchor="middle" class="headline" filter="url(#textShadow)">
        ${tspans}
      </text>
      ${subtext ? `<text x="${width / 2}" y="${subtextY}" text-anchor="middle" class="subtext" filter="url(#textShadow)">${escapeXml(subtext)}</text>` : ''}
    </svg>
  `;

  const textBuffer = await sharp(Buffer.from(textSvg)).png().toBuffer();
  return sharp(backgroundBuffer)
    .composite([{ input: textBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

async function generateScreenshot(config, size) {
  const dim = SIZES[size];
  const rawPath = path.join(SCREENSHOTS_DIR, config.rawFile);
  const screenBuffer = fs.readFileSync(rawPath);

  // Device dimensions
  const deviceWidth = Math.round(dim.width * dim.deviceScale);
  const deviceHeight = Math.min(
    Math.round(deviceWidth * (2796 / 1290)),
    Math.round(dim.height * 0.78)
  );

  // Create components
  const device = await createDeviceMockup(screenBuffer, deviceWidth, deviceHeight, dim.cornerRadius);
  const background = await createGradientBackground(dim.width, dim.height, config.gradient);

  // Position device below text area
  const textAreaHeight = Math.round(dim.height * 0.22);
  const deviceX = Math.round((dim.width - device.totalWidth) / 2);
  const deviceY = textAreaHeight - device.shadowPad;

  // Composite device onto background
  let result = await sharp(background)
    .composite([{ input: device.buffer, top: deviceY, left: deviceX }])
    .png()
    .toBuffer();

  // Add text
  result = await addMultilineText(result, config.lines, config.subtext, dim.width, dim.height, textAreaHeight);

  // Save
  const outputPath = path.join(OUTPUT_DIR, size, `${config.name}.png`);
  await sharp(result).png().toFile(outputPath);
  return outputPath;
}

async function main() {
  for (const size of Object.keys(SIZES)) {
    const dir = path.join(OUTPUT_DIR, size);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  for (const config of SCREENSHOTS) {
    const rawPath = path.join(SCREENSHOTS_DIR, config.rawFile);
    if (!fs.existsSync(rawPath)) {
      console.error(`  SKIP: ${config.rawFile} not found`);
      continue;
    }

    for (const size of Object.keys(SIZES)) {
      console.log(`  ${size}/${config.name} — "${config.lines.join(' ')}"`);
      await generateScreenshot(config, size);
    }
  }

  console.log(`\nDone! Screenshots in: ${OUTPUT_DIR}`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
