#!/usr/bin/env node
/**
 * Pre-build version check script
 *
 * Verifies that App Clip version matches the main app version.
 * Run this before `eas build` to catch version mismatches early.
 *
 * Usage: node scripts/check-versions.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

function readAppJson() {
  const appJsonPath = path.join(projectRoot, 'app.json');
  const content = fs.readFileSync(appJsonPath, 'utf8');
  return JSON.parse(content);
}

function readProjectPbxproj() {
  const pbxprojPath = path.join(projectRoot, 'ios/VacationPhotos.xcodeproj/project.pbxproj');
  return fs.readFileSync(pbxprojPath, 'utf8');
}

function extractAppClipVersions(pbxprojContent) {
  // Find build configurations for the App Clip (identified by bundle ID)
  const versions = [];

  // Split into build configuration blocks
  // Look for blocks that contain the App Clip bundle ID
  const configRegex = /\/\* (Debug|Release) \*\/ = \{[\s\S]*?buildSettings = \{([\s\S]*?)\};[\s\S]*?name = (Debug|Release);/g;

  let match;
  while ((match = configRegex.exec(pbxprojContent)) !== null) {
    const configName = match[1];
    const buildSettings = match[2];

    // Check if this is an App Clip configuration
    if (buildSettings.includes('com.swapp1990.vacationphotos.Clip')) {
      const versionMatch = buildSettings.match(/CURRENT_PROJECT_VERSION = (\d+)/);
      if (versionMatch) {
        versions.push({ config: configName, version: versionMatch[1] });
      }
    }
  }

  return versions;
}

function main() {
  console.log('🔍 Checking version alignment...\n');

  let hasError = false;

  // Read app.json
  const appJson = readAppJson();
  const mainAppVersion = appJson.expo.version;
  const mainAppBuildNumber = appJson.expo.ios.buildNumber;

  console.log('📱 Main App (app.json):');
  console.log(`   Version: ${mainAppVersion}`);
  console.log(`   Build Number: ${mainAppBuildNumber}`);
  console.log('');

  // Read project.pbxproj
  const pbxprojContent = readProjectPbxproj();
  const appClipVersions = extractAppClipVersions(pbxprojContent);

  console.log('📎 App Clip (project.pbxproj):');
  for (const { config, version } of appClipVersions) {
    const match = version === mainAppBuildNumber;
    const icon = match ? '✅' : '❌';
    console.log(`   ${config}: CURRENT_PROJECT_VERSION = ${version} ${icon}`);
    if (!match) hasError = true;
  }
  console.log('');

  // Summary
  if (hasError) {
    console.log('❌ VERSION MISMATCH DETECTED!');
    console.log('');
    console.log('The App Clip version does not match the main app.');
    console.log('This will cause the build to fail.');
    console.log('');
    console.log('To fix, either:');
    console.log('1. Run `npx expo prebuild --clean` to regenerate native code');
    console.log('2. Or manually update CURRENT_PROJECT_VERSION in project.pbxproj');
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ All versions match! Ready to build.');
    process.exit(0);
  }
}

main();
