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
 * Create App Clip source files and resources
 */
function withAppClipFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, 'ios');
      const appClipPath = path.join(iosPath, APP_CLIP_TARGET_NAME);

      // Create App Clip directory
      if (!fs.existsSync(appClipPath)) {
        fs.mkdirSync(appClipPath, { recursive: true });
      }

      // Create App Clip entitlements
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
      console.log('[withAppClip] Created App Clip entitlements');

      // Create App Clip Info.plist
      const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Vacation Photos</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>NSAppClip</key>
    <dict>
        <key>NSAppClipRequestEphemeralUserNotification</key>
        <false/>
        <key>NSAppClipRequestLocationConfirmation</key>
        <false/>
    </dict>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
        <key>UISceneConfigurations</key>
        <dict/>
    </dict>
    <key>UILaunchStoryboardName</key>
    <string>SplashScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
</dict>
</plist>`;
      fs.writeFileSync(
        path.join(appClipPath, 'Info.plist'),
        infoPlistContent
      );
      console.log('[withAppClip] Created App Clip Info.plist');

      // Create a placeholder AppDelegate for App Clip (React Native based)
      const appDelegateContent = `#import <Foundation/Foundation.h>
#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>

@interface AppClipAppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>
@property (nonatomic, strong) UIWindow *window;
@end
`;
      fs.writeFileSync(
        path.join(appClipPath, 'AppClipAppDelegate.h'),
        appDelegateContent
      );

      const appDelegateImplContent = `#import "AppClipAppDelegate.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>

@implementation AppClipAppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:@"VacationPhotosClip"
                                            initialProperties:nil];
  rootView.backgroundColor = [UIColor whiteColor];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"AppClip/index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
    continueUserActivity:(nonnull NSUserActivity *)userActivity
      restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

@end
`;
      fs.writeFileSync(
        path.join(appClipPath, 'AppClipAppDelegate.m'),
        appDelegateImplContent
      );
      console.log('[withAppClip] Created App Clip AppDelegate files');

      // Create main.m for App Clip
      const mainContent = `#import <UIKit/UIKit.h>
#import "AppClipAppDelegate.h"

int main(int argc, char * argv[]) {
  @autoreleasepool {
    return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppClipAppDelegate class]));
  }
}
`;
      fs.writeFileSync(
        path.join(appClipPath, 'main.m'),
        mainContent
      );
      console.log('[withAppClip] Created App Clip main.m');

      return config;
    },
  ]);
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

  return config;
}

module.exports = withAppClip;
