# App Store Preview Image Generation

A guide to programmatically generating professional App Store screenshots using HTML templates and image compositing.

## Overview

This approach generates App Store preview images through a two-stage process:
1. **Render mock screens** using Puppeteer to convert HTML templates to PNG
2. **Composite final images** using Sharp to add device frames, backgrounds, and text

This method provides complete control over the visual output without needing simulator captures.

## Why This Approach?

- **Pixel-perfect control**: Design exactly what appears in each screenshot
- **Reproducible**: Regenerate anytime with consistent results
- **Configurable**: Change text, photos, or layouts via configuration
- **Multi-device support**: Generate for different screen sizes from same templates
- **No simulator needed**: Works in CI/CD pipelines

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  HTML Template  │ ──▶ │    Puppeteer    │ ──▶ │   Screen PNG    │
│  + Sample Data  │     │    Renderer     │     │  (device size)  │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  Final Preview  │ ◀── │  Sharp Composer │ ◀────────────┘
│   (App Store)   │     │ + Frame + Text  │
└─────────────────┘     └─────────────────┘
```

## Dependencies

```json
{
  "puppeteer": "^22.x",
  "sharp": "^0.33.x"
}
```

## Device Dimensions

App Store requires specific dimensions for different devices:

```javascript
const dimensions = {
  // iPhone 6.9" (15 Pro Max) - Required for new submissions
  '6.9inch': {
    width: 1320,           // Final image width
    height: 2868,          // Final image height
    screenWidth: 1290,     // Screen area inside frame
    screenHeight: 2796,
    viewportWidth: 430,    // CSS viewport (for Puppeteer)
    viewportHeight: 932,
    deviceScaleFactor: 3,  // Retina scaling
    cornerRadius: 110,
  },
  // iPhone 6.5" (11 Pro Max)
  '6.5inch': {
    width: 1242,
    height: 2688,
    screenWidth: 1218,     // Account for device frame bezels
    screenHeight: 2664,
    viewportWidth: 414,
    viewportHeight: 896,
    deviceScaleFactor: 3,
    cornerRadius: 100,
  },
};
```

**Key insight**: The `viewportWidth/Height` is what CSS sees. Puppeteer renders at this size, then scales by `deviceScaleFactor` to produce the final `screenWidth/Height` pixel dimensions.

## Stage 1: HTML Templates

Create HTML files that replicate your app's UI. These are static mockups, not the actual app.

### Base CSS Pattern

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
  background: #F8FAFC;
  overflow: hidden;
}

/* iOS status bar simulation */
.status-bar {
  height: 54px;
  padding: 14px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Dynamic Island placeholder */
.dynamic-island {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 126px;
  height: 37px;
  background: #000;
  border-radius: 24px;
}

/* Safe area spacing */
.safe-area-top { height: 59px; }
.safe-area-bottom { height: 34px; }
```

### Template with Placeholders

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Base styles */
    {{BASE_CSS}}

    /* Screen-specific styles */
    .cluster-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
    }

    .photo-item {
      aspect-ratio: 1;
      background-size: cover;
      background-position: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="dynamic-island"></div>
    <div class="status-bar">
      <span class="time">9:41</span>
      <!-- Battery, signal icons -->
    </div>

    <div class="safe-area-top"></div>

    <div class="header">
      <h1>{{title}}</h1>
      <p>{{subtitle}}</p>
    </div>

    <div class="cluster-card">
      <div class="photo-grid">
        <!-- Photos injected here -->
      </div>
      <div class="location">{{location}}</div>
      <div class="dates">{{dates}}</div>
    </div>

    <div class="safe-area-bottom"></div>
  </div>
</body>
</html>
```

### Injecting Photos as Data URLs

Convert images to base64 data URLs for embedding directly in HTML:

```javascript
const fs = require('fs');
const path = require('path');

async function getPhotoDataUrl(photoPath) {
  const buffer = fs.readFileSync(photoPath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(photoPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

// Usage in template processing
async function processTemplate(html, mockData) {
  const photoGrid = [];
  for (const photoFile of mockData.photos) {
    const photoPath = path.join(SAMPLE_PHOTOS_DIR, mockData.trip, photoFile);
    const dataUrl = await getPhotoDataUrl(photoPath);
    photoGrid.push(`<div class="photo-item" style="background-image: url('${dataUrl}')"></div>`);
  }
  html = html.replace('<!-- Photos injected here -->', photoGrid.join('\n'));
  return html;
}
```

## Stage 2: Puppeteer Rendering

Render HTML templates to PNG at device resolution:

```javascript
const puppeteer = require('puppeteer');

async function renderMockScreen(html, dimensions) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set viewport to CSS dimensions with device scale factor
  await page.setViewport({
    width: dimensions.viewportWidth,
    height: dimensions.viewportHeight,
    deviceScaleFactor: dimensions.deviceScaleFactor,
  });

  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Capture at full rendered size
  const screenshot = await page.screenshot({
    type: 'png',
    clip: {
      x: 0,
      y: 0,
      width: dimensions.viewportWidth,
      height: dimensions.viewportHeight,
    },
  });

  await browser.close();

  // Screenshot is now screenWidth × screenHeight pixels
  // (viewportWidth × deviceScaleFactor) × (viewportHeight × deviceScaleFactor)
  return screenshot;
}
```

## Stage 3: Image Compositing

Combine rendered screen with device frame, background, and text:

```javascript
const sharp = require('sharp');

async function compositeScreenshot(screenBuffer, config, dimensions) {
  const { width, height, screenWidth, screenHeight, cornerRadius } = dimensions;

  // 1. Create background (gradient or solid color)
  const background = await createBackground(width, height, config.background);

  // 2. Round corners on the screen capture
  const roundedScreen = await roundCorners(screenBuffer, screenWidth, screenHeight, cornerRadius);

  // 3. Add subtle shadow behind device
  const shadow = await createShadow(screenWidth, screenHeight, cornerRadius);

  // 4. Calculate positioning
  const deviceX = Math.round((width - screenWidth) / 2);
  const deviceY = config.textPosition === 'top' ? 450 : 200;

  // 5. Composite layers
  let result = await sharp(background)
    .composite([
      { input: shadow, left: deviceX + 15, top: deviceY + 20 },
      { input: roundedScreen, left: deviceX, top: deviceY },
    ])
    .png()
    .toBuffer();

  // 6. Add headline text
  if (config.headline) {
    result = await addTextOverlay(result, config, dimensions, deviceY);
  }

  return result;
}
```

### Creating Gradient Backgrounds

```javascript
async function createBackground(width, height, bgConfig) {
  if (bgConfig.type === 'gradient') {
    const [color1, color2] = bgConfig.colors;
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${color1}"/>
            <stop offset="100%" style="stop-color:${color2}"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
      </svg>
    `;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  // Solid color
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: bgConfig.color,
    },
  }).png().toBuffer();
}
```

### Rounding Corners

```javascript
async function roundCorners(imageBuffer, width, height, radius) {
  const mask = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>
  `);

  return sharp(imageBuffer)
    .resize(width, height, { fit: 'cover' })
    .composite([{
      input: await sharp(mask).png().toBuffer(),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();
}
```

### Adding Text Overlays

```javascript
async function addTextOverlay(imageBuffer, config, dimensions, deviceY) {
  const { width, screenHeight } = dimensions;
  const textColor = config.textColor || '#FFFFFF';

  // Position text above or below device
  const textY = config.textPosition === 'top'
    ? 120
    : deviceY + screenHeight + 80;

  // Create text SVG
  const textSvg = `
    <svg width="${width}" height="300" xmlns="http://www.w3.org/2000/svg">
      <style>
        .headline {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display";
          font-size: 72px;
          font-weight: 700;
          fill: ${textColor};
        }
        .subtext {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display";
          font-size: 42px;
          font-weight: 500;
          fill: ${textColor};
          opacity: 0.9;
        }
      </style>
      <text x="50%" y="80" text-anchor="middle" class="headline">${config.headline}</text>
      ${config.subtext ? `<text x="50%" y="150" text-anchor="middle" class="subtext">${config.subtext}</text>` : ''}
    </svg>
  `;

  return sharp(imageBuffer)
    .composite([{
      input: Buffer.from(textSvg),
      top: textY,
      left: 0,
    }])
    .png()
    .toBuffer();
}
```

## Configuration Structure

Define all screenshots in a central configuration file:

```javascript
// screenshot-config.js
module.exports = {
  brand: {
    primaryColor: '#6366F1',
    accentColor: '#F59E0B',
    backgroundColor: '#F8FAFC',
    textPrimary: '#1E293B',
  },

  samplePhotos: {
    hawaii: {
      name: 'Maui, Hawaii',
      photos: ['beach1.jpg', 'sunset1.jpg', 'palm1.jpg', 'ocean1.jpg'],
    },
    italy: {
      name: 'Rome, Italy',
      photos: ['rome1.jpg', 'colosseum1.jpg', 'vatican1.jpg'],
    },
  },

  screenshots: [
    {
      id: '01-hero',
      template: 'feed-screen',
      headline: 'Find your hidden vacations',
      subtext: null,
      background: {
        type: 'gradient',
        colors: ['#6366F1', '#8B5CF6'],
      },
      textPosition: 'top',
      textColor: '#FFFFFF',
      mockData: {
        showStats: true,
        tripCount: 12,
        photoCount: '2,847',
        clusters: [
          {
            location: 'Maui, Hawaii',
            dates: 'Mar 15-22, 2024',
            photoCount: 247,
            trip: 'hawaii',
          },
        ],
      },
    },
    // Additional screenshots...
  ],
};
```

## Main Generator Script

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const config = require('./screenshot-config');

async function generateAllScreenshots(targetDimension = '6.5inch') {
  const dim = config.dimensions[targetDimension];
  const outputDir = path.join(config.paths.output, targetDimension);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: true });

  for (const screenshot of config.screenshots) {
    console.log(`Generating ${screenshot.id}...`);

    // 1. Load and process template
    const templatePath = path.join(config.paths.templates, `${screenshot.template}.html`);
    let html = fs.readFileSync(templatePath, 'utf8');
    html = await processTemplate(html, screenshot.mockData);

    // 2. Render with Puppeteer
    const page = await browser.newPage();
    await page.setViewport({
      width: dim.viewportWidth,
      height: dim.viewportHeight,
      deviceScaleFactor: dim.deviceScaleFactor,
    });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const screenBuffer = await page.screenshot({ type: 'png' });
    await page.close();

    // 3. Composite final image
    const finalBuffer = await compositeScreenshot(screenBuffer, screenshot, dim);

    // 4. Save output
    const outputPath = path.join(outputDir, `${screenshot.id}.png`);
    await sharp(finalBuffer).toFile(outputPath);

    console.log(`  ✓ Saved ${outputPath}`);
  }

  await browser.close();
  console.log('\nDone!');
}

generateAllScreenshots().catch(console.error);
```

## Tips & Best Practices

### 1. Match Your App's Styles
Copy styles directly from your app's stylesheet to ensure the mockups look authentic.

### 2. Use High-Quality Sample Photos
Screenshots are marketing material. Use your best photos or high-quality stock images.

### 3. Keep Headlines Short
3-5 words maximum. Focus on benefits, not features.

### 4. Test Different Text Positions
Some screenshots look better with text above the device, others below.

### 5. Consider the Thumbnail
The first screenshot appears as a small thumbnail in search results. Make sure the headline is readable.

### 6. Bezel Calculations
When using device frames, account for the bezel width:
```javascript
screenWidth = frameWidth - (bezelWidth * 2)
```

### 7. Shadow Adds Depth
A subtle shadow behind the device makes it pop against the background.

### 8. Verify Dimensions
App Store Connect will reject images with wrong dimensions. Always verify:
```javascript
const metadata = await sharp(outputPath).metadata();
console.log(`${metadata.width} × ${metadata.height}`);
```

## File Structure

```
project/
├── scripts/
│   ├── generate-screenshots.js
│   ├── screenshot-config.js
│   └── templates/
│       ├── feed-screen.html
│       ├── cluster-detail.html
│       ├── share-modal.html
│       └── shared-vacation.html
└── assets/
    └── screenshots/
        ├── sample-photos/
        │   ├── hawaii/
        │   └── italy/
        └── output/
            ├── 6.5inch/
            └── 6.9inch/
```

## Troubleshooting

**"Image to composite must have same dimensions or smaller"**
- The screen capture is larger than the background
- Check bezel calculations and ensure screenWidth < width

**Blurry text in screenshots**
- Increase `deviceScaleFactor` in Puppeteer viewport
- Use vector fonts (system fonts) rather than web fonts

**Photos not appearing**
- Verify data URLs are being generated correctly
- Check file paths to sample photos
- Ensure `waitUntil: 'networkidle0'` in Puppeteer

**Wrong aspect ratio**
- Verify viewportWidth/viewportHeight match device specs
- Check that templates don't have fixed height containers
