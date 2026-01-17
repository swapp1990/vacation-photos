const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Copy native files and update bridging header
function withCloudKitFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = 'VacationPhotos';
      const targetDir = path.join(projectRoot, 'ios', projectName);
      const sourceDir = path.join(projectRoot, 'native-modules', 'ios');

      // Copy CloudKitManager.swift
      const swiftSource = path.join(sourceDir, 'CloudKitManager.swift');
      const swiftTarget = path.join(targetDir, 'CloudKitManager.swift');
      if (fs.existsSync(swiftSource)) {
        fs.copyFileSync(swiftSource, swiftTarget);
        console.log('[withCloudKit] Copied CloudKitManager.swift');
      } else {
        console.log('[withCloudKit] WARNING: CloudKitManager.swift not found at', swiftSource);
      }

      // Copy CloudKitBridge.m
      const bridgeSource = path.join(sourceDir, 'CloudKitBridge.m');
      const bridgeTarget = path.join(targetDir, 'CloudKitBridge.m');
      if (fs.existsSync(bridgeSource)) {
        fs.copyFileSync(bridgeSource, bridgeTarget);
        console.log('[withCloudKit] Copied CloudKitBridge.m');
      } else {
        console.log('[withCloudKit] WARNING: CloudKitBridge.m not found at', bridgeSource);
      }

      // Copy AppGroupStorage.swift
      const appGroupSwiftSource = path.join(sourceDir, 'AppGroupStorage.swift');
      const appGroupSwiftTarget = path.join(targetDir, 'AppGroupStorage.swift');
      if (fs.existsSync(appGroupSwiftSource)) {
        fs.copyFileSync(appGroupSwiftSource, appGroupSwiftTarget);
        console.log('[withCloudKit] Copied AppGroupStorage.swift');
      }

      // Copy AppGroupStorageBridge.m
      const appGroupBridgeSource = path.join(sourceDir, 'AppGroupStorageBridge.m');
      const appGroupBridgeTarget = path.join(targetDir, 'AppGroupStorageBridge.m');
      if (fs.existsSync(appGroupBridgeSource)) {
        fs.copyFileSync(appGroupBridgeSource, appGroupBridgeTarget);
        console.log('[withCloudKit] Copied AppGroupStorageBridge.m');
      }

      // Update bridging header
      const bridgingHeaderPath = path.join(targetDir, `${projectName}-Bridging-Header.h`);
      const bridgingHeaderContent = `//
// Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
`;
      fs.writeFileSync(bridgingHeaderPath, bridgingHeaderContent);
      console.log('[withCloudKit] Updated bridging header');

      return config;
    },
  ]);
}

// Add native files to Xcode project
function withCloudKitXcode(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName;

    // Get the main target
    const targets = xcodeProject.pbxNativeTargetSection();
    let mainTargetUuid = null;

    for (const key in targets) {
      if (targets[key].name === projectName) {
        mainTargetUuid = key;
        break;
      }
    }

    if (!mainTargetUuid) {
      console.log('[withCloudKit] Could not find main target');
      return config;
    }

    const groupKey = xcodeProject.findPBXGroupKey({ name: projectName });

    // Add Swift file
    try {
      xcodeProject.addSourceFile(
        `${projectName}/CloudKitManager.swift`,
        { target: mainTargetUuid },
        groupKey
      );
      console.log('[withCloudKit] Added CloudKitManager.swift to Xcode project');
    } catch (e) {
      console.log('[withCloudKit] CloudKitManager.swift may already exist');
    }

    // Add Bridge file
    try {
      xcodeProject.addSourceFile(
        `${projectName}/CloudKitBridge.m`,
        { target: mainTargetUuid },
        groupKey
      );
      console.log('[withCloudKit] Added CloudKitBridge.m to Xcode project');
    } catch (e) {
      console.log('[withCloudKit] CloudKitBridge.m may already exist');
    }

    // Add AppGroupStorage files
    try {
      xcodeProject.addSourceFile(
        `${projectName}/AppGroupStorage.swift`,
        { target: mainTargetUuid },
        groupKey
      );
      console.log('[withCloudKit] Added AppGroupStorage.swift to Xcode project');
    } catch (e) {
      console.log('[withCloudKit] AppGroupStorage.swift may already exist');
    }

    try {
      xcodeProject.addSourceFile(
        `${projectName}/AppGroupStorageBridge.m`,
        { target: mainTargetUuid },
        groupKey
      );
      console.log('[withCloudKit] Added AppGroupStorageBridge.m to Xcode project');
    } catch (e) {
      console.log('[withCloudKit] AppGroupStorageBridge.m may already exist');
    }

    return config;
  });
}

function withCloudKitNativeFiles(config) {
  // First copy files and update bridging header
  config = withCloudKitFiles(config);
  // Then add to Xcode project
  config = withCloudKitXcode(config);
  return config;
}

module.exports = withCloudKitNativeFiles;
