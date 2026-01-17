#!/usr/bin/env ruby
# Script to add App Clip target to Xcode project
# Uses the xcodeproj gem

require 'xcodeproj'
require 'fileutils'

# Get the script directory
SCRIPT_DIR = File.dirname(File.expand_path(__FILE__))
PROJECT_ROOT = File.expand_path('..', SCRIPT_DIR)

# Configuration
PROJECT_PATH = File.join(PROJECT_ROOT, 'ios/VacationPhotos.xcodeproj')
MAIN_TARGET_NAME = 'VacationPhotos'
APP_CLIP_TARGET_NAME = 'VacationPhotosClip'
APP_CLIP_BUNDLE_ID = 'com.swapp1990.vacationphotos.Clip'
MAIN_BUNDLE_ID = 'com.swapp1990.vacationphotos'
APP_GROUP_ID = 'group.com.swapp1990.vacationphotos'
ASSOCIATED_DOMAIN = 'swapp1990.github.io'
TEAM_ID = 'RA5M8S58U3'
APP_CLIP_DIR = File.join(PROJECT_ROOT, 'ios/VacationPhotosClip')

puts "Project root: #{PROJECT_ROOT}"
puts "Opening project: #{PROJECT_PATH}"
puts "App Clip files dir: #{APP_CLIP_DIR}"
project = Xcodeproj::Project.open(PROJECT_PATH)

# Find the main target
main_target = project.targets.find { |t| t.name == MAIN_TARGET_NAME }
unless main_target
  puts "Error: Could not find main target '#{MAIN_TARGET_NAME}'"
  exit 1
end

puts "Found main target: #{main_target.name}"

# Check if App Clip target already exists
existing_target = project.targets.find { |t| t.name == APP_CLIP_TARGET_NAME }
if existing_target
  puts "App Clip target '#{APP_CLIP_TARGET_NAME}' already exists. Configuring it..."
  app_clip_target = existing_target
else
  # Create App Clip target
  puts "Creating App Clip target: #{APP_CLIP_TARGET_NAME}"

  # Create the native target for App Clip
  app_clip_target = project.new_target(
    :application,
    APP_CLIP_TARGET_NAME,
    :ios,
    '14.0'
  )

  # Set the product type to App Clip
  app_clip_target.product_type = 'com.apple.product-type.application.on-demand-install-capable'
end

# Create or get the App Clip group
app_clip_group = project.main_group.find_subpath(APP_CLIP_TARGET_NAME, true)
app_clip_group.set_source_tree('<group>')
app_clip_group.set_path(APP_CLIP_TARGET_NAME)

# Clear existing children to avoid duplicates
puts "Clearing existing file references..."
app_clip_group.clear

# Add source files to the target
app_clip_dir = APP_CLIP_DIR
source_files = [
  'AppClipAppDelegate.h',
  'AppClipAppDelegate.m',
  'main.m'
]

puts "Adding source files..."
source_files.each do |filename|
  file_path = File.join(app_clip_dir, filename)
  if File.exist?(file_path)
    file_ref = app_clip_group.new_file(file_path)
    if filename.end_with?('.m')
      # Check if already in source build phase
      already_added = app_clip_target.source_build_phase.files.any? { |f|
        f.file_ref && f.file_ref.path && f.file_ref.path.end_with?(filename)
      }
      unless already_added
        app_clip_target.source_build_phase.add_file_reference(file_ref)
      end
    end
    puts "  Added: #{filename}"
  else
    puts "  Warning: File not found: #{file_path}"
  end
end

# Add Info.plist
info_plist_path = File.join(app_clip_dir, 'Info.plist')
if File.exist?(info_plist_path)
  info_plist_ref = app_clip_group.new_file(info_plist_path)
  puts "  Added: Info.plist"
end

# Add entitlements
entitlements_path = File.join(app_clip_dir, "#{APP_CLIP_TARGET_NAME}.entitlements")
if File.exist?(entitlements_path)
  entitlements_ref = app_clip_group.new_file(entitlements_path)
  puts "  Added: #{APP_CLIP_TARGET_NAME}.entitlements"
end

# Configure build settings
app_clip_target.build_configurations.each do |config|
  settings = config.build_settings

  # Basic settings
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = APP_CLIP_BUNDLE_ID
  settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  settings['INFOPLIST_FILE'] = "#{APP_CLIP_TARGET_NAME}/Info.plist"
  settings['CODE_SIGN_ENTITLEMENTS'] = "#{APP_CLIP_TARGET_NAME}/#{APP_CLIP_TARGET_NAME}.entitlements"
  settings['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  settings['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
  settings['SWIFT_VERSION'] = '5.0'
  settings['CLANG_ENABLE_MODULES'] = 'YES'
  settings['DEVELOPMENT_TEAM'] = TEAM_ID
  settings['CODE_SIGN_STYLE'] = 'Automatic'

  # React Native specific settings
  settings['HEADER_SEARCH_PATHS'] = [
    '$(inherited)',
    '"$(SRCROOT)/../node_modules/react-native/React/**"',
    '"$(SRCROOT)/../node_modules/react-native/Libraries/**"',
  ]

  # Other linker flags for React Native
  settings['OTHER_LDFLAGS'] = ['$(inherited)', '-ObjC', '-lc++']

  # Framework search paths
  settings['FRAMEWORK_SEARCH_PATHS'] = [
    '$(inherited)',
    '"$(SRCROOT)/../node_modules/react-native/Libraries"',
  ]

  puts "  Configured build settings for: #{config.name}"
end

# Add App Clip as embedded binary in main target
puts "Adding App Clip as embedded extension..."

# Create embed app clips build phase if it doesn't exist
embed_phase = main_target.build_phases.find { |phase|
  phase.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) &&
  phase.name == 'Embed App Clips'
}

unless embed_phase
  embed_phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
  embed_phase.name = 'Embed App Clips'
  embed_phase.dst_subfolder_spec = '16' # Products Directory with App Clips
  embed_phase.dst_path = '$(CONTENTS_FOLDER_PATH)/AppClips'
  main_target.build_phases << embed_phase
end

# Add the App Clip product to the embed phase
app_clip_product = app_clip_target.product_reference
if app_clip_product
  build_file = embed_phase.add_file_reference(app_clip_product)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

# Add target dependency
begin
  main_target.add_dependency(app_clip_target)
  puts "Added target dependency"
rescue => e
  puts "Warning: Could not add target dependency: #{e.message}"
  puts "You may need to add this manually in Xcode."
end

# Save the project
puts "Saving project..."
project.save

puts ""
puts "=" * 60
puts "App Clip target '#{APP_CLIP_TARGET_NAME}' has been added!"
puts "=" * 60
puts ""
puts "Next steps:"
puts "1. Open Xcode and select the #{APP_CLIP_TARGET_NAME} target"
puts "2. Go to Signing & Capabilities"
puts "3. Select your Team for code signing"
puts "4. Add 'App Groups' capability and select: #{APP_GROUP_ID}"
puts "5. Add 'Associated Domains' capability and add:"
puts "   - applinks:#{ASSOCIATED_DOMAIN}"
puts "   - appclips:#{ASSOCIATED_DOMAIN}"
puts ""
puts "Note: You may need to run 'pod install' after this."
