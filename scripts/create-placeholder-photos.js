#!/usr/bin/env node

/**
 * Create Placeholder Photos
 *
 * Generates placeholder vacation photos for testing the screenshot generator.
 * Replace these with real photos for production use.
 *
 * Usage: node scripts/create-placeholder-photos.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SAMPLE_PHOTOS_DIR = path.join(__dirname, '..', 'assets', 'screenshots', 'sample-photos');

// Photo templates with gradients and scene-appropriate colors
const photoTemplates = {
  hawaii: {
    name: 'Maui, Hawaii',
    photos: [
      { name: 'beach1.jpg', colors: ['#0891B2', '#06B6D4', '#22D3EE'], icon: 'beach', label: 'Beach' },
      { name: 'sunset1.jpg', colors: ['#F97316', '#FB923C', '#FDBA74'], icon: 'sunset', label: 'Sunset' },
      { name: 'palm1.jpg', colors: ['#16A34A', '#22C55E', '#4ADE80'], icon: 'palm', label: 'Palm Trees' },
      { name: 'ocean1.jpg', colors: ['#0284C7', '#0EA5E9', '#38BDF8'], icon: 'ocean', label: 'Ocean' },
      { name: 'snorkel1.jpg', colors: ['#0891B2', '#14B8A6', '#2DD4BF'], icon: 'dive', label: 'Snorkeling' },
      { name: 'dinner1.jpg', colors: ['#DC2626', '#F87171', '#FCA5A5'], icon: 'food', label: 'Dinner' },
    ],
  },
  italy: {
    name: 'Rome, Italy',
    photos: [
      { name: 'rome1.jpg', colors: ['#D97706', '#F59E0B', '#FBBF24'], icon: 'city', label: 'Rome' },
      { name: 'colosseum1.jpg', colors: ['#92400E', '#B45309', '#D97706'], icon: 'landmark', label: 'Colosseum' },
      { name: 'vatican1.jpg', colors: ['#4338CA', '#6366F1', '#818CF8'], icon: 'church', label: 'Vatican' },
      { name: 'pasta1.jpg', colors: ['#B91C1C', '#DC2626', '#F87171'], icon: 'food', label: 'Pasta' },
      { name: 'fountain1.jpg', colors: ['#0E7490', '#0891B2', '#22D3EE'], icon: 'fountain', label: 'Fountain' },
    ],
  },
  japan: {
    name: 'Tokyo, Japan',
    photos: [
      { name: 'temple1.jpg', colors: ['#DC2626', '#EF4444', '#F87171'], icon: 'temple', label: 'Temple' },
      { name: 'cherry1.jpg', colors: ['#EC4899', '#F472B6', '#F9A8D4'], icon: 'cherry', label: 'Cherry Blossoms' },
      { name: 'street1.jpg', colors: ['#4338CA', '#6366F1', '#A78BFA'], icon: 'street', label: 'Street' },
      { name: 'food1.jpg', colors: ['#DC2626', '#F97316', '#FBBF24'], icon: 'food', label: 'Food' },
      { name: 'tower1.jpg', colors: ['#1E293B', '#334155', '#475569'], icon: 'tower', label: 'Tower' },
    ],
  },
};

// SVG icons for different scene types
const icons = {
  beach: `<path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9H15C14.5 9 14 8.5 14 8S14.5 7 15 7H21C21.5 7 22 7.5 22 8S21.5 9 21 9ZM21 11H3C2.5 11 2 10.5 2 10S2.5 9 3 9H9C9.5 9 10 9.5 10 10S9.5 11 9 11H3ZM21 13H3C2.5 13 2 12.5 2 12S2.5 11 3 11H21C21.5 11 22 11.5 22 12S21.5 13 21 13ZM6 18L3 22H21L18 18H6Z"/>`,
  sunset: `<circle cx="12" cy="12" r="5"/><path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"/>`,
  palm: `<path d="M12 2C12 2 7 8 7 12C7 16 9 20 12 22C15 20 17 16 17 12C17 8 12 2 12 2ZM12 4C13 6 15 9 15 12C15 15 13 18 12 20C11 18 9 15 9 12C9 9 11 6 12 4Z"/>`,
  ocean: `<path d="M2 12C2 12 4 8 7 8S12 12 12 12 10 16 7 16 2 12 2 12ZM12 12C12 12 14 8 17 8S22 12 22 12 20 16 17 16 12 12 12 12ZM2 18C2 18 4 14 7 14S12 18 12 18 10 22 7 22 2 18 2 18ZM12 18C12 18 14 14 17 14S22 18 22 18 20 22 17 22 12 18 12 18Z"/>`,
  dive: `<circle cx="12" cy="7" r="3"/><path d="M12 10C9 10 6 12 6 15V17H18V15C18 12 15 10 12 10ZM10 20L8 22H16L14 20"/>`,
  food: `<path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/>`,
  city: `<path d="M15 11V5L12 2L9 5V7H3V21H21V11H15ZM7 19H5V17H7V19ZM7 15H5V13H7V15ZM7 11H5V9H7V11ZM13 19H11V17H13V19ZM13 15H11V13H13V15ZM13 11H11V9H13V11ZM13 7H11V5H13V7ZM19 19H17V17H19V19ZM19 15H17V13H19V15Z"/>`,
  landmark: `<path d="M6 19V10H18V19H20V21H4V19H6ZM8 12V19H10V12H8ZM14 12V19H16V12H14ZM11 12V14H13V12H11ZM11 16V19H13V16H11ZM4 8L12 2L20 8H4Z"/>`,
  church: `<path d="M12 2L8 6H11V9H8V11H11V14H6V21H18V14H13V11H16V9H13V6H16L12 2ZM8 16H10V19H8V16ZM14 16H16V19H14V16Z"/>`,
  fountain: `<path d="M12 2V8M12 8C10 8 8 10 8 12H16C16 10 14 8 12 8ZM8 12V16C8 18 10 20 12 20S16 18 16 16V12M6 22H18"/>`,
  temple: `<path d="M12 2L2 8H22L12 2ZM4 10V18H6V10H4ZM8 10V18H10V10H8ZM14 10V18H16V10H14ZM18 10V18H20V10H18ZM2 20V22H22V20H2Z"/>`,
  cherry: `<circle cx="8" cy="8" r="3" fill="currentColor"/><circle cx="14" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="3" fill="currentColor"/><path d="M10 10C10 10 12 14 12 18M8 8V20M16 12V20"/>`,
  street: `<path d="M4 4V20H20V4H4ZM6 6H18V8H6V6ZM6 10H10V14H6V10ZM12 10H18V18H12V10ZM6 16H10V18H6V16Z"/>`,
  tower: `<path d="M10 2H14V6H16V10H14V22H10V10H8V6H10V2ZM12 4V6H12V4ZM10 8H14V10H10V8ZM11 12H13V20H11V12Z"/>`,
};

/**
 * Create a placeholder photo SVG
 */
function createPlaceholderSvg(colors, iconType, label, width = 1200, height = 1600) {
  const icon = icons[iconType] || icons.beach;

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]}"/>
          <stop offset="50%" style="stop-color:${colors[1]}"/>
          <stop offset="100%" style="stop-color:${colors[2] || colors[1]}"/>
        </linearGradient>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" in2="noise" mode="soft-light"/>
        </filter>
      </defs>

      <!-- Background gradient -->
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Subtle pattern overlay -->
      <rect width="100%" height="100%" fill="url(#bg)" filter="url(#noise)" opacity="0.3"/>

      <!-- Decorative circles -->
      <circle cx="${width * 0.2}" cy="${height * 0.3}" r="${width * 0.15}" fill="white" opacity="0.1"/>
      <circle cx="${width * 0.8}" cy="${height * 0.7}" r="${width * 0.2}" fill="white" opacity="0.08"/>
      <circle cx="${width * 0.5}" cy="${height * 0.5}" r="${width * 0.1}" fill="white" opacity="0.12"/>

      <!-- Icon -->
      <g transform="translate(${width / 2 - 48}, ${height / 2 - 60}) scale(4)" fill="white" opacity="0.5">
        ${icon}
      </g>

      <!-- Label -->
      <text x="${width / 2}" y="${height * 0.75}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
        font-size="48" font-weight="600" fill="white" opacity="0.7">
        ${label}
      </text>

      <!-- "PLACEHOLDER" text -->
      <text x="${width / 2}" y="${height * 0.85}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
        font-size="24" font-weight="500" fill="white" opacity="0.4">
        Replace with real photo
      </text>
    </svg>
  `;
}

/**
 * Create all placeholder photos
 */
async function createPlaceholderPhotos() {
  console.log('\n========================================');
  console.log('  Creating Placeholder Photos');
  console.log('========================================\n');

  let created = 0;
  let skipped = 0;

  for (const [trip, data] of Object.entries(photoTemplates)) {
    const tripDir = path.join(SAMPLE_PHOTOS_DIR, trip);

    // Create trip directory if it doesn't exist
    if (!fs.existsSync(tripDir)) {
      fs.mkdirSync(tripDir, { recursive: true });
    }

    console.log(`  ${data.name}:`);

    for (const photo of data.photos) {
      const photoPath = path.join(tripDir, photo.name);

      // Skip if photo already exists
      if (fs.existsSync(photoPath)) {
        console.log(`    - ${photo.name} (exists, skipping)`);
        skipped++;
        continue;
      }

      // Create placeholder SVG
      const svg = createPlaceholderSvg(photo.colors, photo.icon, photo.label);

      // Convert to JPEG using sharp
      await sharp(Buffer.from(svg))
        .jpeg({ quality: 90 })
        .toFile(photoPath);

      console.log(`    - ${photo.name} (created)`);
      created++;
    }

    console.log();
  }

  console.log('========================================');
  console.log(`  Created: ${created} photos`);
  console.log(`  Skipped: ${skipped} (already exist)`);
  console.log('========================================\n');

  console.log('  To replace with real photos, put your images in:');
  console.log(`  ${SAMPLE_PHOTOS_DIR}/\n`);
  console.log('  Organize by trip folder (hawaii/, italy/, japan/)');
  console.log('  and use the same filenames as the placeholders.\n');
}

createPlaceholderPhotos().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
