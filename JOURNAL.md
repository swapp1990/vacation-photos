# Development Journal

## 2026-01-13: Cluster merging and performance improvements

- Added distance badge on cluster cards showing miles from home with travel emoji (car/train/plane/globe/rocket)
- Implemented parallel photo processing (batch size 15) for ~10x faster initial loading
- Added visual progress bar with percentage during photo scanning
- Parallelized cluster geocoding for faster location name resolution
- Fixed bug where same-location trips with overlapping dates weren't merging into one cluster

## 2026-01-13: Handle iCloud photos gracefully when device storage is low

### Problem
Photos stored in iCloud were failing to load when the device has low storage. iOS keeps small thumbnails locally but needs to download larger versions from iCloud. When storage is insufficient, iOS returns `CloudPhotoLibraryErrorDomain error 1005` and the photos appear blank.

### Root Cause
- iPhone set to "Optimize iPhone Storage" keeps only thumbnails locally
- Larger photo requests require iCloud download
- Low device storage prevents iOS from downloading photos from iCloud
- This caused hero images and grid photos to appear blank for some clusters (e.g., Lakehead, Mount Shasta) while clusters with locally-stored photos (e.g., Burlingame) worked fine

### Solution
- Added `loadError` state tracking to `PhotoThumbnail` and `CollagePhoto` components
- When image loading fails via `onError`, display a cloud icon placeholder instead of blank space
- Added `icloudPlaceholder` and `icloudIcon` styles for graceful degradation

### Also Fixed
- Load more photos pagination: Reduced batch size from 1000 to 300 to prevent skipping photos
- Added location selection screen for setting home location
