/**
 * App Clip Main Component
 *
 * This is a simplified version of the main app that:
 * 1. Parses the shareId from the Universal Link
 * 2. Displays the shared vacation photos
 * 3. Prompts users to install the full app
 */
import React, { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import SharedVacationClipViewer from './SharedVacationClipViewer';

export default function App() {
  const [shareId, setShareId] = useState(null);

  useEffect(() => {
    // Get the initial URL that launched the App Clip
    const getInitialUrl = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const extractedShareId = parseShareId(url);
          if (extractedShareId) {
            setShareId(extractedShareId);
          }
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    getInitialUrl();

    // Also listen for any new URLs while the App Clip is open
    const subscription = Linking.addEventListener('url', (event) => {
      const extractedShareId = parseShareId(event.url);
      if (extractedShareId) {
        setShareId(extractedShareId);
      }
    });

    return () => subscription.remove();
  }, []);

  return <SharedVacationClipViewer shareId={shareId} />;
}

/**
 * Parse shareId from App Clip URL
 * Supported formats:
 * - Default App Clip link: https://appclip.apple.com/id?p=...&token={shareId}
 * - Legacy GitHub Pages: https://swapp1990.github.io/share/{shareId}
 */
function parseShareId(url) {
  if (!url) return null;

  try {
    // Match default App Clip link format: https://appclip.apple.com/id?p=...&token={shareId}
    const appClipMatch = url.match(/appclip\.apple\.com.*[?&]token=([a-zA-Z0-9-]+)/);
    if (appClipMatch) {
      return appClipMatch[1];
    }

    // Match GitHub Pages Universal Link format (backward compatibility)
    const universalMatch = url.match(/github\.io\/share\/([a-zA-Z0-9-]+)/);
    if (universalMatch) {
      return universalMatch[1];
    }

    // Also try custom domain format as fallback
    const customDomainMatch = url.match(/\/share\/([a-zA-Z0-9-]+)/);
    if (customDomainMatch) {
      return customDomainMatch[1];
    }

    // Also try query param format as fallback
    const queryMatch = url.match(/[?&]shareId=([a-zA-Z0-9-]+)/);
    if (queryMatch) {
      return queryMatch[1];
    }

    return null;
  } catch (e) {
    console.error('Error parsing share URL:', e);
    return null;
  }
}
