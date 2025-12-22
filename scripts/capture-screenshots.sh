#!/bin/bash

# App Store Screenshot Capture Script

OUTPUT_DIR="./screenshots/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "📱 App Store Screenshot Capture"
echo "================================"
echo "Screenshots will be saved to: $OUTPUT_DIR"
echo ""

# Device list
IPHONE_NAME="iPhone 14 Pro Max"
IPAD_NAME="iPad Pro (12.9-inch) (6th generation)"

get_udid() {
    xcrun simctl list devices available | grep "$1" | head -1 | grep -oE '[A-F0-9-]{36}'
}

# Start iPhone
echo "📱 Starting iPhone 14 Pro Max..."
IPHONE_UDID=$(get_udid "$IPHONE_NAME")

if [ -z "$IPHONE_UDID" ]; then
    echo "❌ iPhone 14 Pro Max not found"
    exit 1
fi

xcrun simctl boot "$IPHONE_UDID" 2>/dev/null || true
open -a Simulator
sleep 3

echo "📲 Opening Expo Go..."
xcrun simctl openurl booted exp://localhost:8081
sleep 5

echo ""
echo "✅ iPhone ready!"
echo ""
echo "Commands: ENTER=capture, n=next device, q=quit"
echo ""

COUNT=1

while true; do
    read -p ">> " input

    if [ "$input" = "q" ]; then
        break
    fi

    if [ "$input" = "n" ]; then
        echo ""
        echo "📱 Switching to iPad..."
        xcrun simctl shutdown "$IPHONE_UDID" 2>/dev/null || true

        IPAD_UDID=$(get_udid "$IPAD_NAME")
        if [ -z "$IPAD_UDID" ]; then
            echo "❌ iPad Pro not found"
            break
        fi

        xcrun simctl boot "$IPAD_UDID" 2>/dev/null || true
        sleep 3
        xcrun simctl openurl booted exp://localhost:8081
        sleep 5
        echo "✅ iPad ready!"
        echo ""
        continue
    fi

    # ENTER pressed - capture screenshot
    FILENAME="${OUTPUT_DIR}/screenshot_${COUNT}.png"
    xcrun simctl io booted screenshot "$FILENAME"
    echo "✅ Captured: screenshot_${COUNT}.png"
    COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Done! Screenshots saved to: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
