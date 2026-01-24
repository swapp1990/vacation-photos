#!/usr/bin/env node
/**
 * Pre-build version check and sync script
 *
 * Verifies that App Clip version matches the main app version.
 * Run this before `eas build` to catch version mismatches early.
 *
 * Usage:
 *   node scripts/check-versions.js          # Check only
 *   node scripts/check-versions.js --fix    # Check and fix mismatches
 *
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const shouldFix = process.argv.includes('--fix');

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

function extractMarketingVersions(pbxprojContent) {
  // Extract all MARKETING_VERSION values
  const versions = [];
  const lines = pbxprojContent.split('\n');

  for (const line of lines) {
    const match = line.match(/MARKETING_VERSION = ([^;]+);/);
    if (match) {
      versions.push(match[1].trim());
    }
  }

  return [...new Set(versions)]; // Return unique values
}

function fixMarketingVersion(targetVersion) {
  const pbxprojPath = path.join(projectRoot, 'ios/VacationPhotos.xcodeproj/project.pbxproj');
  let content = fs.readFileSync(pbxprojPath, 'utf8');
  content = content.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${targetVersion};`);
  fs.writeFileSync(pbxprojPath, content);
}

function readMainAppInfoPlist() {
  const plistPath = path.join(projectRoot, 'ios/VacationPhotos/Info.plist');
  const content = fs.readFileSync(plistPath, 'utf8');
  const versionMatch = content.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
  const shortVersionMatch = content.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
  return {
    buildNumber: versionMatch ? versionMatch[1] : null,
    version: shortVersionMatch ? shortVersionMatch[1] : null
  };
}

function readAppClipInfoPlist() {
  const plistPath = path.join(projectRoot, 'ios/VacationPhotosClip/Info.plist');
  if (!fs.existsSync(plistPath)) return null;
  const content = fs.readFileSync(plistPath, 'utf8');
  const versionMatch = content.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
  const shortVersionMatch = content.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
  return {
    buildNumber: versionMatch ? versionMatch[1] : null,
    version: shortVersionMatch ? shortVersionMatch[1] : null
  };
}

function fixMainAppInfoPlist(targetVersion, targetBuildNumber) {
  const plistPath = path.join(projectRoot, 'ios/VacationPhotos/Info.plist');
  let content = fs.readFileSync(plistPath, 'utf8');
  content = content.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)\d+(<\/string>)/,
    `$1${targetBuildNumber}$2`
  );
  content = content.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${targetVersion}$2`
  );
  fs.writeFileSync(plistPath, content);
}

function fixAppClipInfoPlist(targetVersion, targetBuildNumber) {
  const plistPath = path.join(projectRoot, 'ios/VacationPhotosClip/Info.plist');
  if (!fs.existsSync(plistPath)) return;
  let content = fs.readFileSync(plistPath, 'utf8');
  content = content.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)\d+(<\/string>)/,
    `$1${targetBuildNumber}$2`
  );
  content = content.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${targetVersion}$2`
  );
  fs.writeFileSync(plistPath, content);
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

  // Check main app Info.plist
  const mainAppPlist = readMainAppInfoPlist();
  const mainAppBuildMatch = mainAppPlist.buildNumber === mainAppBuildNumber;
  const mainAppVersionMatch = mainAppPlist.version === mainAppVersion;
  console.log('📄 Main App (Info.plist):');
  console.log(`   CFBundleShortVersionString: ${mainAppPlist.version} ${mainAppVersionMatch ? '✅' : '❌'}`);
  console.log(`   CFBundleVersion: ${mainAppPlist.buildNumber} ${mainAppBuildMatch ? '✅' : '❌'}`);
  if (!mainAppBuildMatch || !mainAppVersionMatch) hasError = true;
  console.log('');

  // Check App Clip Info.plist
  const appClipPlist = readAppClipInfoPlist();
  if (appClipPlist) {
    const appClipBuildMatch = appClipPlist.buildNumber === mainAppBuildNumber;
    const appClipVersionMatch = appClipPlist.version === mainAppVersion;
    console.log('📎 App Clip (Info.plist):');
    console.log(`   CFBundleShortVersionString: ${appClipPlist.version} ${appClipVersionMatch ? '✅' : '❌'}`);
    console.log(`   CFBundleVersion: ${appClipPlist.buildNumber} ${appClipBuildMatch ? '✅' : '❌'}`);
    if (!appClipBuildMatch || !appClipVersionMatch) hasError = true;
    console.log('');
  }

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

  // Check MARKETING_VERSION in project.pbxproj
  const marketingVersions = extractMarketingVersions(pbxprojContent);
  console.log('📋 MARKETING_VERSION (project.pbxproj):');
  for (const version of marketingVersions) {
    const match = version === mainAppVersion;
    const icon = match ? '✅' : '❌';
    console.log(`   ${version} ${icon}`);
    if (!match) hasError = true;
  }
  console.log('');

  // Summary
  if (hasError) {
    console.log('❌ VERSION MISMATCH DETECTED!');
    console.log('');

    if (shouldFix) {
      console.log('🔧 Fixing version mismatch...');
      fixMainAppInfoPlist(mainAppVersion, mainAppBuildNumber);
      fixAppClipInfoPlist(mainAppVersion, mainAppBuildNumber);
      fixVersionMismatch(mainAppBuildNumber);
      fixMarketingVersion(mainAppVersion);
      console.log(`✅ Fixed! All versions updated to ${mainAppVersion} (build ${mainAppBuildNumber})`);
      console.log('');
      process.exit(0);
    } else {
      console.log('The App Clip version does not match the main app.');
      console.log('This will cause the build to fail.');
      console.log('');
      console.log('To fix, run: node scripts/check-versions.js --fix');
      console.log('');
      process.exit(1);
    }
  } else {
    console.log('✅ All versions match! Ready to build.');
    process.exit(0);
  }
}

function fixVersionMismatch(targetVersion) {
  const pbxprojPath = path.join(projectRoot, 'ios/VacationPhotos.xcodeproj/project.pbxproj');
  let content = fs.readFileSync(pbxprojPath, 'utf8');

  // Find and replace CURRENT_PROJECT_VERSION for App Clip configs
  // We need to be careful to only update App Clip configs, not main app or test configs
  const lines = content.split('\n');
  let inAppClipConfig = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track brace depth to know when we exit a config block
    if (inAppClipConfig) {
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      if (line.includes('CURRENT_PROJECT_VERSION')) {
        lines[i] = line.replace(/CURRENT_PROJECT_VERSION = \d+/, `CURRENT_PROJECT_VERSION = ${targetVersion}`);
      }

      if (braceCount <= 0) {
        inAppClipConfig = false;
      }
    }

    // Detect start of App Clip build configuration
    if (line.includes('com.swapp1990.vacationphotos.Clip')) {
      inAppClipConfig = true;
      braceCount = 1;
      // Look backwards to find and fix CURRENT_PROJECT_VERSION in this block
      for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
        if (lines[j].includes('CURRENT_PROJECT_VERSION')) {
          lines[j] = lines[j].replace(/CURRENT_PROJECT_VERSION = \d+/, `CURRENT_PROJECT_VERSION = ${targetVersion}`);
          break;
        }
        if (lines[j].includes('buildSettings = {')) {
          break;
        }
      }
    }
  }

  fs.writeFileSync(pbxprojPath, lines.join('\n'));
}

main();
