/**
 * App Store Screenshot Configuration
 *
 * This file defines the configuration for generating App Store preview images.
 * Each screenshot is composed of:
 * - A mock screen rendered from an HTML template
 * - A device frame (iPhone)
 * - Background gradient/color
 * - Headline text
 */

const path = require('path');

// Base paths
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'screenshots');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

module.exports = {
  // App branding colors (matching src/styles/theme.js)
  brand: {
    primaryColor: '#6366F1', // Indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    accentColor: '#F59E0B', // Amber
    accentLight: '#FCD34D',
    backgroundColor: '#F8FAFC',
    surface: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    success: '#10B981',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  },

  // Output dimensions for different device sizes
  dimensions: {
    // iPhone 6.9" (15 Pro Max) - Required
    '6.9inch': {
      width: 1320,
      height: 2868,
      screenWidth: 1290,
      screenHeight: 2796,
      // Logical viewport (CSS pixels) - this is what CSS sees
      viewportWidth: 430,
      viewportHeight: 932,
      deviceScaleFactor: 3,
      cornerRadius: 110,
      name: 'iPhone 15 Pro Max',
    },
    // iPhone 6.5" (11 Pro Max) - Secondary
    '6.5inch': {
      width: 1242,
      height: 2688,
      screenWidth: 1218,  // Leave room for 12px bezels (1242 - 24 = 1218)
      screenHeight: 2664, // Leave room for 12px bezels (2688 - 24 = 2664)
      // Logical viewport (CSS pixels)
      viewportWidth: 414,
      viewportHeight: 896,
      deviceScaleFactor: 3,
      cornerRadius: 100,
      name: 'iPhone 11 Pro Max',
    },
  },

  // Default dimension to generate
  defaultDimension: '6.9inch',

  // Paths
  paths: {
    assets: ASSETS_DIR,
    templates: TEMPLATES_DIR,
    samplePhotos: path.join(ASSETS_DIR, 'sample-photos'),
    frames: path.join(ASSETS_DIR, 'frames'),
    output: path.join(ASSETS_DIR, 'output'),
  },

  // Sample photos organized by trip
  // These will be used in the mock screens
  samplePhotos: {
    hawaii: {
      name: 'Maui, Hawaii',
      photos: ['beach1.jpg', 'sunset1.jpg', 'palm1.jpg', 'ocean1.jpg', 'snorkel1.jpg', 'dinner1.jpg'],
    },
    italy: {
      name: 'Rome, Italy',
      photos: ['rome1.jpg', 'colosseum1.jpg', 'vatican1.jpg', 'pasta1.jpg', 'fountain1.jpg'],
    },
    japan: {
      name: 'Tokyo, Japan',
      photos: ['temple1.jpg', 'cherry1.jpg', 'street1.jpg', 'food1.jpg', 'tower1.jpg'],
    },
  },

  // Screenshot definitions
  screenshots: [
    {
      id: '00-onboarding',
      template: 'onboarding',
      headline: null, // No headline text
      subtext: null,
      background: null, // No background - screen fills entire frame
      textPosition: null,
      textColor: null,
      mockData: {
        backgroundTrip: 'hawaii', // Use hawaii beach photo as background
      },
    },
    {
      id: '01-hero',
      template: 'feed-screen',
      headline: 'Find your hidden vacations',
      subtext: null,
      background: {
        type: 'gradient',
        colors: ['#6366F1', '#8B5CF6'],
        angle: 180,
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
            featured: true,
          },
          {
            location: 'Rome, Italy',
            dates: 'Jun 3-10, 2023',
            photoCount: 189,
            trip: 'italy',
            featured: false,
          },
        ],
      },
    },
    {
      id: '02-discovery',
      template: 'feed-screen',
      headline: 'Auto-organized by trip',
      subtext: 'No folders. No tagging. Just magic.',
      background: {
        type: 'gradient',
        colors: ['#8B5CF6', '#EC4899'],
        angle: 180,
      },
      textPosition: 'bottom',
      textColor: '#FFFFFF',
      mockData: {
        showStats: true,
        tripCount: 8,
        photoCount: '1,523',
        clusters: [
          {
            location: 'Tokyo, Japan',
            dates: 'Apr 1-8, 2024',
            photoCount: 312,
            trip: 'japan',
            featured: true,
          },
          {
            location: 'Maui, Hawaii',
            dates: 'Mar 15-22, 2024',
            photoCount: 247,
            trip: 'hawaii',
            featured: false,
          },
        ],
      },
    },
    {
      id: '03-detail',
      template: 'cluster-detail',
      headline: 'Relive every moment',
      subtext: null,
      background: {
        type: 'solid',
        color: '#1E293B',
      },
      textPosition: 'top',
      textColor: '#FFFFFF',
      mockData: {
        location: 'Maui, Hawaii',
        dates: 'March 15-22, 2024',
        photoCount: 247,
        trip: 'hawaii',
        days: [
          { label: 'Day 1 - Arrival', photos: ['beach1.jpg', 'sunset1.jpg', 'palm1.jpg'] },
          { label: 'Day 2 - Beach Day', photos: ['ocean1.jpg', 'snorkel1.jpg', 'dinner1.jpg'] },
        ],
      },
    },
    {
      id: '04-share',
      template: 'share-modal',
      headline: 'Share without the hassle',
      subtext: 'No accounts needed',
      background: {
        type: 'gradient',
        colors: ['#F59E0B', '#EF4444'],
        angle: 180,
      },
      textPosition: 'bottom',
      textColor: '#FFFFFF',
      mockData: {
        location: 'Maui, Hawaii',
        dates: 'March 15-22, 2024',
        photoCount: 247,
        trip: 'hawaii',
        shareMethod: 'link',
      },
    },
    {
      id: '05-receive',
      template: 'shared-vacation',
      headline: 'Tap a link, see their trip',
      subtext: null,
      background: {
        type: 'gradient',
        colors: ['#10B981', '#3B82F6'],
        angle: 180,
      },
      textPosition: 'top',
      textColor: '#FFFFFF',
      mockData: {
        location: 'Maui, Hawaii',
        sharedBy: 'Sarah',
        dates: 'March 15-22, 2024',
        photoCount: 247,
        trip: 'hawaii',
      },
    },
  ],
};
