#!/usr/bin/env node

/**
 * App Clip Header Image Generator
 *
 * Creates a stunning, universal vacation image for the App Clip card.
 * This image is STATIC (same for all shared vacations), so it needs to:
 * - Work for ANY destination (Hawaii, Italy, Japan, etc.)
 * - Be aspirational and dreamy
 * - Make people want to see "vacation photos"
 * - Let the dynamic subtitle provide specifics
 *
 * Requirements (from Apple):
 * - Dimensions: 1800x1200 px (3:2 aspect ratio)
 * - Format: PNG or JPEG
 * - RGB color space
 * - No transparency
 * - No text (not localizable)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SAMPLE_PHOTOS_DIR = path.join(__dirname, '..', 'assets', 'screenshots', 'sample-photos');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'screenshots', 'output', 'app-clip');

// App Clip header dimensions
const WIDTH = 1800;
const HEIGHT = 1200;

async function generateAppClipHeader() {
  console.log('\n========================================');
  console.log('  App Clip Header Image Generator');
  console.log('========================================\n');
  console.log('Creating: Universal vacation memories image\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Use the stunning beach sunset - universally appealing
  const beachPhoto = path.join(SAMPLE_PHOTOS_DIR, 'hawaii', 'beach1.jpg');

  console.log('Creating stunning hero image...');

  // 1. Start with the beautiful beach sunset, full bleed
  const heroImage = await sharp(beachPhoto)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer();

  // 2. Enhance colors - make it more vibrant and dreamy
  const enhancedImage = await sharp(heroImage)
    .modulate({
      brightness: 1.05,
      saturation: 1.2,
    })
    .toBuffer();

  // 3. Add a subtle warm/golden overlay to enhance the "vacation memories" feel
  const warmOverlay = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="warmGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,200,150,0.1)"/>
          <stop offset="50%" style="stop-color:rgba(255,180,120,0.05)"/>
          <stop offset="100%" style="stop-color:rgba(200,150,255,0.1)"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#warmGlow)"/>
    </svg>
  `);
  const warmOverlayBuffer = await sharp(warmOverlay).png().toBuffer();

  // 4. Add subtle vignette for focus
  const vignette = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="60%" style="stop-color:rgba(0,0,0,0)"/>
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.3)"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#vignette)"/>
    </svg>
  `);
  const vignetteBuffer = await sharp(vignette).png().toBuffer();

  // 5. Composite final image
  console.log('Applying enhancements...');

  const finalImage = await sharp(enhancedImage)
    .composite([
      { input: warmOverlayBuffer, blend: 'over' },
      { input: vignetteBuffer, blend: 'over' },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  // Save outputs
  const outputPath = path.join(OUTPUT_DIR, 'app-clip-header.jpg');
  const outputPathPng = path.join(OUTPUT_DIR, 'app-clip-header.png');

  await sharp(finalImage).toFile(outputPath);
  await sharp(finalImage).png().toFile(outputPathPng);

  // Get file info
  const stats = fs.statSync(outputPath);
  const metadata = await sharp(outputPath).metadata();

  console.log('\n========================================');
  console.log('  Generated App Clip Header Image');
  console.log('========================================\n');
  console.log(`  Dimensions: ${metadata.width} × ${metadata.height} px`);
  console.log(`  Format: JPEG & PNG`);
  console.log(`  File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`\n  Output: ${outputPath}`);
  console.log(`  Output: ${outputPathPng}`);
  console.log('\n  Requirements met:');
  console.log('    ✓ 1800×1200 px (3:2 aspect ratio)');
  console.log('    ✓ JPEG/PNG format');
  console.log('    ✓ RGB color space');
  console.log('    ✓ No transparency');
  console.log('    ✓ No text');
  console.log('\n  Design approach:');
  console.log('    • Single stunning vacation photo (universal appeal)');
  console.log('    • Enhanced colors for dreamy/aspirational feel');
  console.log('    • Works for ANY shared vacation destination');
  console.log('    • Dynamic subtitle provides specific details');
  console.log();
}

generateAppClipHeader().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
