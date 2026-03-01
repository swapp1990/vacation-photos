#!/usr/bin/env node
/**
 * Render app screen mockups as HTML pages and capture them with Playwright.
 * Produces raw screenshots that can be fed into the marketing compositor.
 *
 * Usage: node render-screens.js
 * Requires: playwright (from ios-keyword-detective/.playwright-mcp/)
 */

const { chromium } = require('/Users/swapnilsawant/projects/ios-keyword-detective/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname);

// iPhone 17 Pro Max dimensions at 3x
const VIEWPORT = { width: 440, height: 956 };
const DEVICE_SCALE = 3;

// High-quality vacation photos from Unsplash (landscape/travel themed)
const PHOTOS = {
  hawaii: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop', // beach
    'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=400&h=400&fit=crop', // ocean
    'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=400&h=400&fit=crop', // palm trees
    'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=400&h=400&fit=crop', // sunset
    'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=400&fit=crop', // tropical
    'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=400&h=400&fit=crop', // surfing
    'https://images.unsplash.com/photo-1468413253725-0d5181091126?w=400&h=400&fit=crop', // hammock
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400&h=400&fit=crop', // beach scene
    'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=400&h=400&fit=crop', // waves
  ],
  tokyo: [
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=400&fit=crop', // tokyo tower
    'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=400&fit=crop', // shrine
    'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=400&h=400&fit=crop', // street
    'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=400&h=400&fit=crop', // temple
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=400&fit=crop', // city
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=400&fit=crop', // garden
    'https://images.unsplash.com/photo-1490761668535-35497054764d?w=400&h=400&fit=crop', // shibuya crossing
    'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400&h=400&fit=crop', // tokyo night
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400&h=400&fit=crop', // street 2
    'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=400&h=400&fit=crop', // japan lanterns
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400&h=400&fit=crop', // tokyo street food
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=400&fit=crop', // bamboo
  ],
  rome: [
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=400&fit=crop', // colosseum
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=400&h=400&fit=crop', // vatican
    'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400&h=400&fit=crop', // streets
    'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=400&h=400&fit=crop', // trevi
    'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=400&h=400&fit=crop', // piazza
    'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=400&h=400&fit=crop', // pasta
  ],
  banff: [
    'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=400&h=400&fit=crop', // mountain lake
    'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=400&h=400&fit=crop', // forest
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop', // mountains
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop', // lake sunrise
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop', // valley
  ],
};

const TRIPS = [
  { location: 'Maui, Hawaii', photos: PHOTOS.hawaii, days: 8, date: 'Mar 15 - Mar 22, 2024', distance: 2847 },
  { location: 'Tokyo, Japan', photos: PHOTOS.tokyo, days: 8, date: 'Apr 1 - Apr 8, 2024', distance: 5280 },
  { location: 'Rome, Italy', photos: PHOTOS.rome, days: 8, date: 'Jun 3 - Jun 10, 2023', distance: 4920 },
  { location: 'Banff, Canada', photos: PHOTOS.banff, days: 6, date: 'Aug 15 - Aug 20, 2023', distance: 1350 },
];

function getDistanceEmoji(miles) {
  if (miles < 100) return '🚗';
  if (miles < 500) return '🚂';
  if (miles < 1500) return '✈️';
  if (miles < 5000) return '🌍';
  return '🚀';
}

function tripCardHTML(trip) {
  const mainPhoto = trip.photos[0];
  const sidePhotos = trip.photos.slice(1, 4);
  const remaining = trip.photos.length - 4;

  return `
    <div class="trip-card">
      <div class="collage">
        <div class="main-photo">
          <img src="${mainPhoto}" alt="main" />
        </div>
        <div class="side-photos">
          ${sidePhotos.map((p, i) => `
            <div class="side-photo ${i === 2 ? 'last' : ''}">
              <img src="${p}" alt="side" />
              ${i === 2 && remaining > 0 ? `<div class="more-overlay">+${remaining}</div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="distance-badge">
          <span class="emoji">${getDistanceEmoji(trip.distance)}</span>
          <span class="text">${trip.distance.toLocaleString()} mi</span>
        </div>
      </div>
      <div class="trip-info">
        <div class="top-row">
          <span class="location">${trip.location}</span>
          <div class="share-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </div>
        </div>
        <div class="meta">
          <span>${trip.photos.length} photos</span>
          <span class="dot">·</span>
          <span>${trip.date}</span>
        </div>
      </div>
    </div>
  `;
}

function mainScreenHTML() {
  const totalPhotos = TRIPS.reduce((s, t) => s + t.photos.length, 0);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif; background: #F8F8F8; -webkit-font-smoothing: antialiased; }
    .status-bar { height: 54px; }
    .header { padding: 16px 20px 8px; }
    .header-row { display: flex; align-items: center; margin-bottom: 4px; }
    .app-icon { width: 40px; height: 40px; border-radius: 12px; background: #7C3AED; display: flex; align-items: center; justify-content: center; margin-right: 14px; }
    .app-icon svg { width: 22px; height: 22px; fill: white; }
    .app-title { font-size: 28px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.5px; }
    .app-subtitle { font-size: 14px; color: #8E8E93; margin-left: 54px; }
    .trip-list { padding: 8px 20px; }
    .trip-card { background: white; border-radius: 16px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .collage { display: flex; height: 180px; position: relative; }
    .main-photo { flex: 1; min-width: 0; }
    .main-photo img { width: 100%; height: 100%; object-fit: cover; }
    .side-photos { width: 33%; display: flex; flex-direction: column; }
    .side-photo { flex: 1; position: relative; border-left: 2px solid white; }
    .side-photo:not(.last) { border-bottom: 2px solid white; }
    .side-photo img { width: 100%; height: 100%; object-fit: cover; }
    .more-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 700; }
    .distance-badge { position: absolute; bottom: 8px; left: 8px; background: rgba(255,255,255,0.92); border-radius: 12px; padding: 3px 10px; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(8px); }
    .distance-badge .emoji { font-size: 13px; }
    .distance-badge .text { font-size: 12px; font-weight: 600; color: #333; }
    .trip-info { padding: 12px 14px; }
    .top-row { display: flex; justify-content: space-between; align-items: center; }
    .location { font-size: 17px; font-weight: 600; color: #1a1a2e; }
    .share-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
    .meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .meta span { font-size: 13px; color: #8E8E93; }
    .dot { color: #C7C7CC; }
    .home-indicator { position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%); width: 134px; height: 5px; background: #1a1a2e; border-radius: 3px; }
  </style></head><body>
    <div class="status-bar"></div>
    <div class="header">
      <div class="header-row">
        <div class="app-icon">
          <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </div>
        <span class="app-title">Vacations</span>
      </div>
      <div class="app-subtitle">${TRIPS.length} trips · ${totalPhotos} photos</div>
    </div>
    <div class="trip-list">
      ${TRIPS.map(t => tripCardHTML(t)).join('')}
    </div>
    <div class="home-indicator"></div>
  </body></html>`;
}

function tripDetailHTML(trip) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif; background: #F8F8F8; -webkit-font-smoothing: antialiased; }
    .status-bar { height: 54px; }
    .header { padding: 0 20px 12px; }
    .back { color: #7C3AED; font-size: 16px; margin-bottom: 4px; }
    .title { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .subtitle { font-size: 14px; color: #8E8E93; margin-top: 2px; }
    .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px; }
    .photo-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; }
    .home-indicator { position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%); width: 134px; height: 5px; background: #1a1a2e; border-radius: 3px; }
  </style></head><body>
    <div class="status-bar"></div>
    <div class="header">
      <div class="back">← Back</div>
      <div class="title">${trip.location}</div>
      <div class="subtitle">${trip.date} · ${trip.photos.length} photos</div>
    </div>
    <div class="photo-grid">
      ${trip.photos.map(p => `<img src="${p}" />`).join('')}
    </div>
    <div class="home-indicator"></div>
  </body></html>`;
}

function shareSheetHTML(trip) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif; background: #F8F8F8; -webkit-font-smoothing: antialiased; }
    .status-bar { height: 54px; }
    .header { padding: 0 20px 12px; }
    .back { color: #7C3AED; font-size: 16px; margin-bottom: 4px; }
    .title { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .subtitle { font-size: 14px; color: #8E8E93; margin-top: 2px; }
    .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px; }
    .photo-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; }
    /* Share sheet overlay */
    .share-overlay { position: fixed; bottom: 0; left: 0; right: 0; height: 55%; background: white; border-radius: 16px 16px 0 0; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); z-index: 10; padding: 16px; }
    .share-handle { width: 36px; height: 5px; background: #D1D1D6; border-radius: 3px; margin: 0 auto 16px; }
    .share-title { font-size: 14px; color: #8E8E93; text-align: center; margin-bottom: 12px; }
    .share-preview { display: flex; gap: 8px; margin-bottom: 20px; padding: 12px; background: #F2F2F7; border-radius: 12px; }
    .share-preview img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
    .share-preview-info { flex: 1; }
    .share-preview-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }
    .share-preview-sub { font-size: 13px; color: #8E8E93; margin-top: 2px; }
    .share-link { display: flex; align-items: center; gap: 8px; padding: 12px; background: #F2F2F7; border-radius: 12px; margin-bottom: 16px; }
    .share-link-icon { width: 32px; height: 32px; background: #7C3AED; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .share-link-icon svg { width: 18px; height: 18px; fill: white; }
    .share-link-text { font-size: 14px; color: #7C3AED; font-weight: 500; }
    .share-icons { display: flex; justify-content: space-around; margin-top: 16px; }
    .share-icon { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .share-icon-circle { width: 56px; height: 56px; border-radius: 28px; display: flex; align-items: center; justify-content: center; }
    .share-icon-label { font-size: 11px; color: #8E8E93; }
    .airdrop { background: #E8E8ED; }
    .messages { background: #34C759; }
    .mail { background: #007AFF; }
    .more { background: #E8E8ED; }
    .home-indicator { position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%); width: 134px; height: 5px; background: #1a1a2e; border-radius: 3px; z-index: 20; }
  </style></head><body>
    <div class="status-bar"></div>
    <div class="header">
      <div class="back">← Back</div>
      <div class="title">${trip.location}</div>
      <div class="subtitle">${trip.date} · ${trip.photos.length} photos</div>
    </div>
    <div class="photo-grid">
      ${trip.photos.slice(0, 6).map(p => `<img src="${p}" />`).join('')}
    </div>
    <div class="share-overlay">
      <div class="share-handle"></div>
      <div class="share-preview">
        <img src="${trip.photos[0]}" />
        <div class="share-preview-info">
          <div class="share-preview-title">${trip.location}</div>
          <div class="share-preview-sub">${trip.photos.length} photos · ${trip.days} days</div>
        </div>
      </div>
      <div class="share-link">
        <div class="share-link-icon">
          <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </div>
        <span class="share-link-text">Copy shareable link</span>
      </div>
      <div class="share-icons">
        <div class="share-icon">
          <div class="share-icon-circle airdrop"><svg width="24" height="24" viewBox="0 0 24 24" fill="#666"><circle cx="12" cy="12" r="10"/></svg></div>
          <span class="share-icon-label">AirDrop</span>
        </div>
        <div class="share-icon">
          <div class="share-icon-circle messages"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
          <span class="share-icon-label">Messages</span>
        </div>
        <div class="share-icon">
          <div class="share-icon-circle mail"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6" fill="none" stroke="white" stroke-width="2"/></svg></div>
          <span class="share-icon-label">Mail</span>
        </div>
        <div class="share-icon">
          <div class="share-icon-circle more"><svg width="24" height="24" viewBox="0 0 24 24" fill="#666"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></div>
          <span class="share-icon-label">More</span>
        </div>
      </div>
    </div>
    <div class="home-indicator"></div>
  </body></html>`;
}

const SCREENS = [
  { name: 'screen-main', html: () => mainScreenHTML() },
  { name: 'screen-detail-hawaii', html: () => tripDetailHTML(TRIPS[0]) },
  { name: 'screen-detail-tokyo', html: () => tripDetailHTML(TRIPS[1]) },
  { name: 'screen-share', html: () => shareSheetHTML(TRIPS[0]) },
];

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const screen of SCREENS) {
    console.log(`  Rendering: ${screen.name}`);
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE,
    });
    const page = await context.newPage();
    await page.setContent(screen.html(), { waitUntil: 'networkidle' });
    // Extra wait for images
    await page.waitForTimeout(3000);
    const outPath = path.join(OUTPUT_DIR, `${screen.name}.png`);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`    Saved: ${outPath}`);
    await context.close();
  }

  await browser.close();
  console.log('\nDone! Raw screen captures ready for marketing compositor.');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
