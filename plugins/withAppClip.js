/**
 * Expo Config Plugin for iOS App Clip
 *
 * This plugin adds an App Clip target to the iOS Xcode project.
 * App Clips are lightweight versions of apps that load instantly.
 */
const { withXcodeProject, withDangerousMod, withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_CLIP_TARGET_NAME = 'VacationPhotosClip';
const APP_CLIP_BUNDLE_ID = 'com.swapp1990.vacationphotos.Clip';
const APP_GROUP_ID = 'group.com.swapp1990.vacationphotos';
const ASSOCIATED_DOMAIN = 'swapp1990.github.io';

/**
 * Add Associated Domains to main app entitlements
 */
function withAssociatedDomains(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.associated-domains'] = [
      `applinks:${ASSOCIATED_DOMAIN}`,
      `appclips:${ASSOCIATED_DOMAIN}`,
    ];
    // Add App Group for sharing data with App Clip
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP_ID];
    console.log('[withAppClip] Added Associated Domains and App Group to main app');
    return config;
  });
}

/**
 * Create/update App Clip entitlements (SwiftUI App Clip - no source files needed)
 */
function withAppClipFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, 'ios');
      const appClipPath = path.join(iosPath, APP_CLIP_TARGET_NAME);

      // Get version info from config to match parent app
      const version = config.version || '1.0.0';
      const buildNumber = config.ios?.buildNumber || '1';

      // Create App Clip directory if it doesn't exist
      if (!fs.existsSync(appClipPath)) {
        fs.mkdirSync(appClipPath, { recursive: true });
      }

      // Create/update App Clip entitlements
      const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:${ASSOCIATED_DOMAIN}</string>
        <string>appclips:${ASSOCIATED_DOMAIN}</string>
    </array>
    <key>com.apple.developer.parent-application-identifiers</key>
    <array>
        <string>$(AppIdentifierPrefix)com.swapp1990.vacationphotos</string>
    </array>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP_ID}</string>
    </array>
</dict>
</plist>`;
      fs.writeFileSync(
        path.join(appClipPath, `${APP_CLIP_TARGET_NAME}.entitlements`),
        entitlementsContent
      );
      console.log('[withAppClip] Updated App Clip entitlements');

      // Update version in Info.plist if it exists (don't overwrite SwiftUI config)
      const infoPlistPath = path.join(appClipPath, 'Info.plist');
      if (fs.existsSync(infoPlistPath)) {
        let infoPlist = fs.readFileSync(infoPlistPath, 'utf8');
        // Update version strings
        infoPlist = infoPlist.replace(
          /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
          `$1${version}$2`
        );
        infoPlist = infoPlist.replace(
          /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
          `$1${buildNumber}$2`
        );
        fs.writeFileSync(infoPlistPath, infoPlist);
        console.log(`[withAppClip] Updated App Clip Info.plist (version: ${version}, build: ${buildNumber})`);
      }

      // Note: SwiftUI source files are maintained manually in ios/VacationPhotosClip/

      return config;
    },
  ]);
}

/**
 * Sync App Clip version with main app in Xcode project settings
 */
function withAppClipVersionSync(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const buildNumber = config.ios?.buildNumber || '1';
    const version = config.version || '1.0.0';

    // Find VacationPhotosClip target and update its build configurations
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (buildConfig.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER === 'com.swapp1990.vacationphotos.Clip') {
        // Update version settings to match main app
        buildConfig.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
        buildConfig.buildSettings.MARKETING_VERSION = version;
        console.log(`[withAppClip] Synced App Clip ${buildConfig.name} config: version=${version}, build=${buildNumber}`);
      }
    }

    return config;
  });
}

/**
 * Log instructions for manual App Clip target setup
 *
 * Note: The xcode npm package doesn't support 'app_clip' target type.
 * The App Clip files are created, but the target must be added manually in Xcode.
 */
function withAppClipTarget(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    // Check if App Clip target already exists
    const targets = xcodeProject.pbxNativeTargetSection();
    for (const key in targets) {
      if (targets[key].name === APP_CLIP_TARGET_NAME) {
        console.log('[withAppClip] App Clip target already exists');
        return config;
      }
    }

    // Create App Clip group to organize files
    try {
      const appClipGroup = xcodeProject.addPbxGroup(
        [
          'AppClipAppDelegate.h',
          'AppClipAppDelegate.m',
          'main.m',
          'Info.plist',
          `${APP_CLIP_TARGET_NAME}.entitlements`,
        ],
        APP_CLIP_TARGET_NAME,
        APP_CLIP_TARGET_NAME
      );

      // Add group to main project
      const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
      xcodeProject.addToPbxGroup(appClipGroup.uuid, mainGroup);

      console.log('[withAppClip] Added App Clip file group to project');
    } catch (e) {
      console.log('[withAppClip] App Clip group may already exist');
    }

    // Log manual setup instructions
    console.log('');
    console.log('='.repeat(60));
    console.log('[withAppClip] MANUAL SETUP REQUIRED');
    console.log('='.repeat(60));
    console.log('');
    console.log('App Clip files have been created in ios/VacationPhotosClip/');
    console.log('');
    console.log('To complete App Clip setup, open the project in Xcode and:');
    console.log('');
    console.log('1. File > New > Target > App Clip');
    console.log('2. Name it "VacationPhotosClip"');
    console.log('3. Bundle ID: com.swapp1990.vacationphotos.Clip');
    console.log('4. Delete the auto-generated files and use the ones in');
    console.log('   ios/VacationPhotosClip/ directory');
    console.log('5. Add App Group capability with:');
    console.log('   group.com.swapp1990.vacationphotos');
    console.log('6. Add Associated Domains capability with:');
    console.log('   applinks:vacationphotos.app');
    console.log('   appclips:vacationphotos.app');
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    return config;
  });
}

/**
 * Main plugin function
 */
function withAppClip(config, props = {}) {
  // Step 1: Add Associated Domains to main app
  config = withAssociatedDomains(config);

  // Step 2: Create App Clip files
  config = withAppClipFiles(config);

  // Step 3: Add App Clip target to Xcode project
  config = withAppClipTarget(config);

  // Step 4: Sync App Clip version with main app (reads from app.json)
  config = withAppClipVersionSync(config);

  return config;
}

module.exports = withAppClip;
