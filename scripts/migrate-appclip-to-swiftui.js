#!/usr/bin/env node
/**
 * Migrates App Clip from React Native to SwiftUI in the Xcode project
 */

const fs = require('fs');
const path = require('path');

const projectPath = path.join(__dirname, '../ios/VacationPhotos.xcodeproj/project.pbxproj');

let content = fs.readFileSync(projectPath, 'utf8');

// Generate UUIDs for new files (using simple random hex)
function generateUUID() {
    return Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 16).toString(16).toUpperCase()
    ).join('');
}

const uuids = {
    appFile: generateUUID(),
    appRef: generateUUID(),
    contentViewFile: generateUUID(),
    contentViewRef: generateUUID(),
    sharedVacationViewFile: generateUUID(),
    sharedVacationViewRef: generateUUID(),
    modelsFile: generateUUID(),
    modelsRef: generateUUID(),
    viewModelFile: generateUUID(),
    viewModelRef: generateUUID(),
};

// Remove old React Native source file references from Sources build phase
// Find the App Clip Sources build phase and replace its files
content = content.replace(
    /B4C9EC56CA36B3D4B23F982F \/\* AppClipAppDelegate\.m in Sources \*\/,/g,
    ''
);
content = content.replace(
    /121D68FC3AB7D7059384F03E \/\* main\.m in Sources \*\/,/g,
    ''
);

// Add new Swift file build references in PBXBuildFile section
const buildFileSection = `/* Begin PBXBuildFile section */`;
const newBuildFiles = `/* Begin PBXBuildFile section */
		${uuids.appFile} /* VacationPhotosClipApp.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${uuids.appRef} /* VacationPhotosClipApp.swift */; };
		${uuids.contentViewFile} /* ContentView.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${uuids.contentViewRef} /* ContentView.swift */; };
		${uuids.sharedVacationViewFile} /* SharedVacationView.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${uuids.sharedVacationViewRef} /* SharedVacationView.swift */; };
		${uuids.modelsFile} /* Models.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${uuids.modelsRef} /* Models.swift */; };
		${uuids.viewModelFile} /* SharedVacationViewModel.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${uuids.viewModelRef} /* SharedVacationViewModel.swift */; };`;

content = content.replace(buildFileSection, newBuildFiles);

// Add new Swift file references in PBXFileReference section
const fileRefSection = `/* End PBXFileReference section */`;
const newFileRefs = `		${uuids.appRef} /* VacationPhotosClipApp.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = VacationPhotosClipApp.swift; sourceTree = "<group>"; };
		${uuids.contentViewRef} /* ContentView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ContentView.swift; sourceTree = "<group>"; };
		${uuids.sharedVacationViewRef} /* SharedVacationView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SharedVacationView.swift; sourceTree = "<group>"; };
		${uuids.modelsRef} /* Models.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = Models.swift; sourceTree = "<group>"; };
		${uuids.viewModelRef} /* SharedVacationViewModel.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SharedVacationViewModel.swift; sourceTree = "<group>"; };
/* End PBXFileReference section */`;

content = content.replace(fileRefSection, newFileRefs);

// Update the VacationPhotosClip group to include new Swift files
// Find the group B0E7DB982F1B913000472158 and update its children
const oldGroupPattern = /B0E7DB982F1B913000472158 \/\* VacationPhotosClip \*\/ = \{[\s\S]*?children = \(([\s\S]*?)\);/;
const match = content.match(oldGroupPattern);
if (match) {
    const newChildren = `
				${uuids.appRef} /* VacationPhotosClipApp.swift */,
				${uuids.contentViewRef} /* ContentView.swift */,
				${uuids.sharedVacationViewRef} /* SharedVacationView.swift */,
				${uuids.modelsRef} /* Models.swift */,
				${uuids.viewModelRef} /* SharedVacationViewModel.swift */,
				044EF959E12C3D43B9112E0A /* Info.plist */,
				550D3C66F68D6FE457E629BF /* VacationPhotosClip.entitlements */,
				B0E7DBC82F1B913200472159 /* Images.xcassets */,
			`;
    content = content.replace(
        oldGroupPattern,
        `B0E7DB982F1B913000472158 /* VacationPhotosClip */ = {
			isa = PBXGroup;
			children = (${newChildren});`
    );
}

// Update Sources build phase for App Clip to use new Swift files
const oldSourcesPhase = /B0E7DB932F1B913000472158 \/\* Sources \*\/ = \{[\s\S]*?files = \(([\s\S]*?)\);/;
const sourcesMatch = content.match(oldSourcesPhase);
if (sourcesMatch) {
    const newSourceFiles = `
				${uuids.appFile} /* VacationPhotosClipApp.swift in Sources */,
				${uuids.contentViewFile} /* ContentView.swift in Sources */,
				${uuids.sharedVacationViewFile} /* SharedVacationView.swift in Sources */,
				${uuids.modelsFile} /* Models.swift in Sources */,
				${uuids.viewModelFile} /* SharedVacationViewModel.swift in Sources */,
			`;
    content = content.replace(
        oldSourcesPhase,
        `B0E7DB932F1B913000472158 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (${newSourceFiles});`
    );
}

// Remove the version sync build phase (no longer needed for SwiftUI)
content = content.replace(
    /B0E7DBC92F1B913200472160 \/\* Sync Version from Main App \*\/,\s*/g,
    ''
);

// Remove framework search paths and header search paths (not needed for SwiftUI)
// Update build settings to remove React Native dependencies
content = content.replace(
    /FRAMEWORK_SEARCH_PATHS = \(\s*"\$\(inherited\)",\s*"\\"\$\(SRCROOT\)\/\.\.\/node_modules\/react-native\/Libraries\\"",\s*\);/g,
    'FRAMEWORK_SEARCH_PATHS = "$(inherited)";'
);

content = content.replace(
    /HEADER_SEARCH_PATHS = \(\s*"\$\(inherited\)",\s*"\\"\$\(SRCROOT\)\/\.\.\/node_modules\/react-native\/React\/\*\*\\"",\s*"\\"\$\(SRCROOT\)\/\.\.\/node_modules\/react-native\/Libraries\/\*\*\\"",\s*\);/g,
    'HEADER_SEARCH_PATHS = "$(inherited)";'
);

// Remove OTHER_LDFLAGS for App Clip (no need for -ObjC and -lc++)
content = content.replace(
    /OTHER_LDFLAGS = \(\s*"\$\(inherited\)",\s*"-ObjC",\s*"-lc\+\+",\s*\);\s*([\s\S]*?PRODUCT_BUNDLE_IDENTIFIER = com\.swapp1990\.vacationphotos\.Clip)/g,
    'OTHER_LDFLAGS = "$(inherited)";\n\t\t\t\t$1'
);

fs.writeFileSync(projectPath, content);
console.log('Migration complete! Project updated for SwiftUI App Clip.');
console.log('Generated UUIDs:', uuids);
