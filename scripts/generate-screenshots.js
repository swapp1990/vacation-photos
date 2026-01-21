#!/usr/bin/env node

/**
 * App Store Screenshot Generator
 *
 * Generates professional App Store preview images using:
 * - Puppeteer for rendering HTML mock screens
 * - Sharp for compositing final images with device frames and text
 *
 * Usage:
 *   node scripts/generate-screenshots.js              # Generate all screenshots
 *   node scripts/generate-screenshots.js --id 01-hero # Generate specific screenshot
 *   node scripts/generate-screenshots.js --preview    # Generate smaller previews
 *   node scripts/generate-screenshots.js --list       # List available screenshots
 *
 * Requirements:
 *   - Node.js 18+
 *   - Sample photos in assets/screenshots/sample-photos/
 *   - iPhone device frame in assets/screenshots/frames/
 */

const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const config = require('./screenshot-config');

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  id: null,
  preview: false,
  list: false,
  dimension: config.defaultDimension,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id' && args[i + 1]) {
    flags.id = args[++i];
  } else if (args[i] === '--preview') {
    flags.preview = true;
  } else if (args[i] === '--list' || args[i] === '--list-templates') {
    flags.list = true;
  } else if (args[i] === '--dimension' && args[i + 1]) {
    flags.dimension = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    flags.help = true;
  }
}

if (flags.help) {
  console.log(`
App Store Screenshot Generator

Usage:
  node scripts/generate-screenshots.js [options]

Options:
  --id <id>           Generate only the screenshot with this ID
  --preview           Generate smaller preview images (50% size)
  --list              List all available screenshots
  --dimension <size>  Output dimension (6.9inch, 6.5inch) [default: 6.9inch]
  --help, -h          Show this help message

Examples:
  node scripts/generate-screenshots.js
  node scripts/generate-screenshots.js --id 01-hero
  node scripts/generate-screenshots.js --preview
  node scripts/generate-screenshots.js --dimension 6.5inch
`);
  process.exit(0);
}

if (flags.list) {
  console.log('\nAvailable Screenshots:\n');
  config.screenshots.forEach((s) => {
    console.log(`  ${s.id}`);
    console.log(`    Template: ${s.template}`);
    console.log(`    Headline: "${s.headline}"`);
    if (s.subtext) console.log(`    Subtext: "${s.subtext}"`);
    console.log();
  });
  process.exit(0);
}

// Get dimension config
const dim = config.dimensions[flags.dimension];
if (!dim) {
  console.error(`Unknown dimension: ${flags.dimension}`);
  console.error(`Available: ${Object.keys(config.dimensions).join(', ')}`);
  process.exit(1);
}

// Scale factor for preview mode
const scale = flags.preview ? 0.5 : 1;

/**
 * Load and prepare base CSS
 */
function loadBaseCSS() {
  const cssPath = path.join(config.paths.templates, 'base.css');
  return fs.readFileSync(cssPath, 'utf-8');
}

/**
 * Get sample photo path
 */
function getSamplePhotoPath(trip, photoName) {
  return path.join(config.paths.samplePhotos, trip, photoName);
}

/**
 * Get photo as base64 data URL for embedding in HTML
 */
async function getPhotoDataUrl(photoPath) {
  if (!fs.existsSync(photoPath)) {
    // Return a placeholder gradient if photo doesn't exist
    return 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366F1"/>
            <stop offset="100%" style="stop-color:#8B5CF6"/>
          </linearGradient>
        </defs>
        <rect fill="url(#g)" width="400" height="400"/>
        <text x="200" y="200" fill="white" font-family="sans-serif" font-size="24" text-anchor="middle" dominant-baseline="middle">Photo</text>
      </svg>
    `);
  }

  const buffer = fs.readFileSync(photoPath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(photoPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Process template with mock data
 */
async function processTemplate(templateName, mockData, screenshotConfig) {
  const templatePath = path.join(config.paths.templates, `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Inject base CSS
  const baseCSS = loadBaseCSS();
  html = html.replace('{{BASE_CSS}}', baseCSS);

  // Process based on template type
  if (templateName === 'feed-screen') {
    html = await processFeedScreen(html, mockData);
  } else if (templateName === 'cluster-detail') {
    html = await processClusterDetail(html, mockData);
  } else if (templateName === 'share-modal') {
    html = await processShareModal(html, mockData);
  } else if (templateName === 'shared-vacation') {
    html = await processSharedVacation(html, mockData);
  } else if (templateName === 'onboarding') {
    html = await processOnboarding(html, mockData);
  }

  return html;
}

/**
 * Process onboarding template
 */
async function processOnboarding(html, mockData) {
  // Use the actual app splash screen image
  const splashPath = path.join(__dirname, '..', 'assets', 'vacation-splash.png');
  const backgroundPhoto = await getPhotoDataUrl(splashPath);

  html = html.replace('{{backgroundImage}}', backgroundPhoto);

  return html;
}

/**
 * Process feed-screen template
 */
async function processFeedScreen(html, mockData) {
  // Replace stats in header subtitle
  html = html.replace('{{tripCount}}', mockData.tripCount || '');
  html = html.replace('{{photoCount}}', mockData.photoCount || '');

  // Process clusters - build cluster cards matching ClusterCard component exactly
  let clustersHtml = '';
  for (const cluster of mockData.clusters || []) {
    const tripPhotos = config.samplePhotos[cluster.trip]?.photos || [];

    // Get main photo and side thumbs (matching ClusterCard collage layout)
    const mainPhoto = await getPhotoDataUrl(getSamplePhotoPath(cluster.trip, tripPhotos[0]));
    const sidePhotos = [];
    for (let i = 1; i < 4 && i < tripPhotos.length; i++) {
      sidePhotos.push(await getPhotoDataUrl(getSamplePhotoPath(cluster.trip, tripPhotos[i])));
    }

    const remaining = cluster.photoCount - 4;
    const showMoreOverlay = remaining > 0 && sidePhotos.length >= 3;

    clustersHtml += `
      <div class="cluster-card">
        <div class="collage-wrapper">
          <div class="cluster-collage">
            <div class="cluster-main-photo" style="background-image: url('${mainPhoto}')"></div>
            <div class="cluster-side-photos">
              ${sidePhotos.map((p, i) => `
                <div class="cluster-side-photo" style="background-image: url('${p}')">
                  ${showMoreOverlay && i === 2 ? `<div class="cluster-more-overlay"><span class="cluster-more-text">+${remaining}</span></div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div class="distance-badge">
            <span class="distance-badge-emoji">✈️</span>
            <span class="distance-badge-text">2,847 mi</span>
          </div>
        </div>
        <div class="cluster-info">
          <div class="cluster-top-row">
            <span class="cluster-location">${cluster.location}</span>
            <div class="share-button">
              <svg viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
            </div>
          </div>
          <div class="cluster-meta">
            <span class="cluster-meta-text">${cluster.photoCount} photos</span>
            <span class="cluster-meta-dot">·</span>
            <span class="cluster-meta-text">${cluster.dates}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Replace the cluster-list placeholder
  html = html.replace('<!-- Clusters will be injected here -->', clustersHtml);

  return html;
}

/**
 * Process cluster-detail template
 */
async function processClusterDetail(html, mockData) {
  const tripPhotos = config.samplePhotos[mockData.trip]?.photos || [];

  // Basic info replacements
  html = html.replace('{{location}}', mockData.location);
  html = html.replace('{{dates}}', mockData.dates);
  html = html.replace('{{photoCount}}', mockData.photoCount);

  // Process days - build day sections matching the trip detail view
  let daysHtml = '';
  let photoIndex = 0;
  for (const day of mockData.days || []) {
    const dayPhotos = [];
    // Use the photos defined in the day config, or fall back to 6 photos from the trip
    const photosToUse = day.photos || tripPhotos.slice(0, 6);
    for (let i = 0; i < photosToUse.length; i++) {
      dayPhotos.push(await getPhotoDataUrl(getSamplePhotoPath(mockData.trip, photosToUse[i])));
    }

    daysHtml += `
      <div class="day-section-header">
        <div class="day-section-title-row">
          <span class="day-section-title">${day.label}</span>
          <span class="day-section-subtitle">${dayPhotos.length} photos</span>
        </div>
      </div>
      <div class="photo-grid">
        ${dayPhotos.map((p) => `<div class="photo-item" style="background-image: url('${p}')"></div>`).join('')}
      </div>
    `;
  }

  html = html.replace('<!-- Days will be injected here -->', daysHtml);

  return html;
}

/**
 * Process share-modal template
 */
async function processShareModal(html, mockData) {
  const tripPhotos = config.samplePhotos[mockData.trip]?.photos || [];

  // Basic info replacements
  html = html.replace('{{location}}', mockData.location);
  html = html.replace('{{dates}}', mockData.dates);
  html = html.replace('{{photoCount}}', mockData.photoCount);

  // Build photo preview scroll (8 photos)
  let previewHtml = '';
  for (let i = 0; i < 8 && i < tripPhotos.length; i++) {
    const photoUrl = await getPhotoDataUrl(getSamplePhotoPath(mockData.trip, tripPhotos[i]));
    const isLast = i === 7 || i === tripPhotos.length - 1;
    const remaining = mockData.photoCount - 8;

    previewHtml += `
      <div class="preview-photo-wrapper">
        <div class="preview-photo" style="background-image: url('${photoUrl}')"></div>
        ${isLast && remaining > 0 ? `<div class="preview-more-overlay"><span class="preview-more-text">+${remaining}</span></div>` : ''}
      </div>
    `;
  }

  html = html.replace('<!-- Photos will be injected here -->', previewHtml);

  return html;
}

/**
 * Process shared-vacation template
 */
async function processSharedVacation(html, mockData) {
  const tripPhotos = config.samplePhotos[mockData.trip]?.photos || [];

  // Basic info replacements
  html = html.replace('{{location}}', mockData.location);
  html = html.replace('{{dates}}', mockData.dates);
  html = html.replace('{{photoCount}}', mockData.photoCount);
  html = html.replace('{{sharedBy}}', mockData.sharedBy);
  html = html.replace('{{sharedByInitial}}', mockData.sharedBy?.[0] || 'S');

  // Build photo grid (show 9 photos in 3x3 grid)
  let photosHtml = '';
  for (let i = 0; i < 9 && i < tripPhotos.length; i++) {
    const photoUrl = await getPhotoDataUrl(getSamplePhotoPath(mockData.trip, tripPhotos[i]));
    photosHtml += `<div class="photo-item" style="background-image: url('${photoUrl}')"></div>`;
  }

  html = html.replace('<!-- Photos will be injected here -->', photosHtml);

  return html;
}

/**
 * Render HTML to PNG using Puppeteer
 * Uses logical viewport dimensions (CSS pixels) with deviceScaleFactor for high-res output
 * Always renders at full resolution - scaling is applied later
 */
async function renderHtmlToPng(browser, html, viewportWidth, viewportHeight, deviceScaleFactor) {
  const page = await browser.newPage();

  // Use logical viewport (CSS pixels) with device scale factor
  // This makes CSS render at proper mobile sizes while outputting high-res
  await page.setViewport({
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: deviceScaleFactor,
  });

  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Wait for images to load
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        )
    );
  });

  const buffer = await page.screenshot({ type: 'png' });
  await page.close();

  return buffer;
}

/**
 * Create gradient background (at full resolution)
 */
async function createBackground(width, height, background) {
  if (background.type === 'solid') {
    return sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: hexToRgba(background.color),
      },
    })
      .png()
      .toBuffer();
  }

  // Gradient background
  const colors = background.colors || ['#6366F1', '#8B5CF6'];

  // Create gradient SVG
  const svgGradient = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
    </svg>
  `;

  return sharp(Buffer.from(svgGradient)).png().toBuffer();
}

/**
 * Create device frame with rounded corners (at full resolution)
 */
async function createDeviceFrame(screenBuffer, screenWidth, screenHeight, cornerRadius) {
  // Create mask with rounded corners
  const mask = Buffer.from(`
    <svg width="${screenWidth}" height="${screenHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${screenWidth}" height="${screenHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>
  `);

  // Resize screen buffer to exact dimensions (should already be correct from Puppeteer)
  const resizedScreen = await sharp(screenBuffer)
    .resize(screenWidth, screenHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  // Apply rounded corner mask
  return sharp(resizedScreen)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/**
 * Add device bezel/frame (at full resolution)
 */
async function addDeviceBezel(screenBuffer, width, height, cornerRadius) {
  const bezelWidth = 12; // 4 * 3 for @3x - must fit within background

  // Create bezel frame SVG
  const bezelSvg = `
    <svg width="${width + bezelWidth * 2}" height="${height + bezelWidth * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2D2D2D"/>
          <stop offset="50%" style="stop-color:#1A1A1A"/>
          <stop offset="100%" style="stop-color:#0D0D0D"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width + bezelWidth * 2}" height="${height + bezelWidth * 2}"
        rx="${cornerRadius + bezelWidth}" ry="${cornerRadius + bezelWidth}"
        fill="url(#bezel)"/>
    </svg>
  `;

  const bezelBuffer = await sharp(Buffer.from(bezelSvg)).png().toBuffer();

  // Composite screen onto bezel
  return sharp(bezelBuffer)
    .composite([
      {
        input: screenBuffer,
        top: bezelWidth,
        left: bezelWidth,
      },
    ])
    .png()
    .toBuffer();
}

/**
 * Add headline text overlay (at full resolution)
 */
async function addTextOverlay(backgroundBuffer, headline, subtext, position, textColor, width, height) {
  // Font sizes optimized for 1320px width - larger for impact like popular apps
  const headlineFontSize = 96; // 32pt at @3x - bold and impactful
  const subtextFontSize = 48; // 16pt at @3x
  const padding = 90; // Space from edge

  // Calculate text positions
  let headlineY, subtextY;
  if (position === 'top') {
    headlineY = padding + headlineFontSize;
    subtextY = headlineY + subtextFontSize + 24;
  } else {
    headlineY = height - padding - (subtext ? subtextFontSize + 36 : 0);
    subtextY = height - padding;
  }

  // Create text SVG with modern App Store styling
  // Popular apps use: bold weights, tight letter-spacing, subtle shadows
  let textSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <style>
        .headline {
          font-family: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
          font-weight: 800;
          font-size: ${headlineFontSize}px;
          fill: ${textColor};
          letter-spacing: -0.02em;
        }
        .subtext {
          font-family: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
          font-weight: 600;
          font-size: ${subtextFontSize}px;
          fill: ${textColor};
          opacity: 0.95;
          letter-spacing: 0.02em;
        }
      </style>
      <text x="${width / 2}" y="${headlineY}" text-anchor="middle" class="headline" filter="url(#textShadow)">${headline}</text>
      ${subtext ? `<text x="${width / 2}" y="${subtextY}" text-anchor="middle" class="subtext" filter="url(#textShadow)">${subtext}</text>` : ''}
    </svg>
  `;

  const textBuffer = await sharp(Buffer.from(textSvg)).png().toBuffer();

  return sharp(backgroundBuffer)
    .composite([{ input: textBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Convert hex color to RGBA object
 */
function hexToRgba(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        alpha: 1,
      }
    : { r: 0, g: 0, b: 0, alpha: 1 };
}

/**
 * Generate a single screenshot
 */
async function generateScreenshot(browser, screenshotConfig) {
  console.log(`\n  Generating: ${screenshotConfig.id}`);
  console.log(`    Template: ${screenshotConfig.template}`);
  console.log(`    Headline: "${screenshotConfig.headline || '(none)'}"`);

  // 1. Process template with mock data
  console.log('    Processing template...');
  const html = await processTemplate(screenshotConfig.template, screenshotConfig.mockData, screenshotConfig);

  // 2. Render HTML to PNG using logical viewport dimensions
  console.log('    Rendering mock screen...');
  const screenBuffer = await renderHtmlToPng(
    browser,
    html,
    dim.viewportWidth,
    dim.viewportHeight,
    dim.deviceScaleFactor
  );

  // 3. Apply rounded corners and create device frame
  console.log('    Creating device frame...');
  const framedScreen = await createDeviceFrame(screenBuffer, dim.screenWidth, dim.screenHeight, dim.cornerRadius);
  const deviceBuffer = await addDeviceBezel(framedScreen, dim.screenWidth, dim.screenHeight, dim.cornerRadius);

  // 4. Create background (or use solid dark for no-background screenshots)
  console.log('    Creating background...');
  const bgConfig = screenshotConfig.background || { type: 'solid', color: '#000000' };
  const backgroundBuffer = await createBackground(dim.width, dim.height, bgConfig);

  // 5. Calculate device position (centered, with room for text)
  const bezelWidth = 12; // Must match addDeviceBezel
  const deviceWidth = dim.screenWidth + bezelWidth * 2;
  const deviceHeight = dim.screenHeight + bezelWidth * 2;
  const deviceX = Math.round((dim.width - deviceWidth) / 2);

  let deviceY;
  if (!screenshotConfig.headline) {
    // No headline - center the device vertically
    deviceY = Math.round((dim.height - deviceHeight) / 2);
  } else if (screenshotConfig.textPosition === 'top') {
    // Text on top, device lower - leave room for headline (80 padding + 84 font + margin)
    deviceY = 240;
  } else {
    // Text on bottom, device higher
    deviceY = 24;
  }

  // 6. Composite device onto background
  console.log('    Compositing final image...');
  let finalBuffer = await sharp(backgroundBuffer)
    .composite([{ input: deviceBuffer, top: deviceY, left: deviceX }])
    .png()
    .toBuffer();

  // 6.5. Add gradient overlay for bottom text to ensure readability
  if (screenshotConfig.textPosition === 'bottom') {
    const gradientHeight = 400;
    const gradientSvg = `
      <svg width="${dim.width}" height="${dim.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0" />
            <stop offset="100%" style="stop-color:rgba(0,0,0,0.7);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect x="0" y="${dim.height - gradientHeight}" width="${dim.width}" height="${gradientHeight}" fill="url(#bottomGrad)"/>
      </svg>
    `;
    const gradientBuffer = await sharp(Buffer.from(gradientSvg)).png().toBuffer();
    finalBuffer = await sharp(finalBuffer)
      .composite([{ input: gradientBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  // 7. Add text overlay (only if headline is provided)
  if (screenshotConfig.headline) {
    console.log('    Adding text overlay...');
    finalBuffer = await addTextOverlay(
      finalBuffer,
      screenshotConfig.headline,
      screenshotConfig.subtext,
      screenshotConfig.textPosition,
      screenshotConfig.textColor,
      dim.width,
      dim.height
    );
  }

  // 8. Apply preview scaling if needed (resize to 50%)
  if (flags.preview) {
    console.log('    Applying preview scaling...');
    finalBuffer = await sharp(finalBuffer)
      .resize(Math.round(dim.width / 2), Math.round(dim.height / 2))
      .png()
      .toBuffer();
  }

  // 9. Save output
  const outputDir = path.join(config.paths.output, flags.dimension);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${screenshotConfig.id}${flags.preview ? '-preview' : ''}.png`);
  await sharp(finalBuffer).png().toFile(outputPath);

  console.log(`    Saved: ${outputPath}`);

  return outputPath;
}

/**
 * Main function
 */
async function main() {
  console.log('\n========================================');
  console.log('  App Store Screenshot Generator');
  console.log('========================================');
  console.log(`\nOutput dimension: ${flags.dimension} (${dim.name})`);
  console.log(`Preview mode: ${flags.preview ? 'Yes (50% size)' : 'No (full size)'}`);

  // Filter screenshots if --id provided
  let screenshots = config.screenshots;
  if (flags.id) {
    screenshots = screenshots.filter((s) => s.id === flags.id);
    if (screenshots.length === 0) {
      console.error(`\nScreenshot not found: ${flags.id}`);
      console.error(`Available: ${config.screenshots.map((s) => s.id).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`\nGenerating ${screenshots.length} screenshot(s)...`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];
  for (const screenshot of screenshots) {
    try {
      const outputPath = await generateScreenshot(browser, screenshot);
      results.push({ id: screenshot.id, success: true, path: outputPath });
    } catch (error) {
      console.error(`    Error: ${error.message}`);
      results.push({ id: screenshot.id, success: false, error: error.message });
    }
  }

  await browser.close();

  // Summary
  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================\n');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`  Generated: ${successful.length}/${results.length}`);

  if (failed.length > 0) {
    console.log('\n  Failed:');
    failed.forEach((r) => console.log(`    - ${r.id}: ${r.error}`));
  }

  console.log(`\n  Output directory: ${path.join(config.paths.output, flags.dimension)}`);
  console.log();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
