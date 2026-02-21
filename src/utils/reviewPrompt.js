/**
 * In-App Review Prompt
 *
 * Tracks "positive moments" (trip viewed, vacation shared) across unique
 * sessions. Triggers the native App Store review prompt after 3 unique
 * sessions with positive moments. No minimum-days gate — can prompt on
 * day one if user has 3 separate sessions. 90-day cooldown after prompt.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { track, Events } from './analytics';

const SESSION_COUNT_KEY = '_review_session_count';
const CURRENT_SESSION_KEY = '_review_session_recorded';
const LAST_PROMPT_KEY = '_review_last_prompt';
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const PROMPT_THRESHOLD = 3; // 3 unique sessions with positive moments

/**
 * Record a positive moment and potentially trigger a review prompt.
 * Only counts once per app session (unique sessions).
 * Call this after trip viewed or vacation shared.
 */
export async function recordPositiveMoment() {
  try {
    // Check cooldown
    const lastPrompt = await AsyncStorage.getItem(LAST_PROMPT_KEY);
    if (lastPrompt) {
      const elapsed = Date.now() - parseInt(lastPrompt, 10);
      if (elapsed < COOLDOWN_MS) {
        return; // Still in cooldown
      }
    }

    // Only count once per session
    const alreadyRecorded = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
    if (alreadyRecorded === 'true') {
      return; // Already counted this session
    }

    // Mark this session as recorded
    await AsyncStorage.setItem(CURRENT_SESSION_KEY, 'true');

    // Increment unique session counter
    const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
    const count = (parseInt(raw, 10) || 0) + 1;
    await AsyncStorage.setItem(SESSION_COUNT_KEY, String(count));

    if (count >= PROMPT_THRESHOLD) {
      await triggerReviewPrompt();
    }
  } catch (e) {
    // Never crash the app for review logic
    console.warn('[ReviewPrompt] Error:', e);
  }
}

/**
 * Call on app startup to reset the per-session flag.
 */
export async function resetSessionFlag() {
  try {
    await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
  } catch (e) {
    // Ignore
  }
}

async function triggerReviewPrompt() {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      console.log('[ReviewPrompt] StoreReview not available on this device');
      return;
    }

    await StoreReview.requestReview();

    // Record prompt time and reset counter
    await AsyncStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
    await AsyncStorage.setItem(SESSION_COUNT_KEY, '0');

    track(Events.REVIEW_PROMPTED);
    console.log('[ReviewPrompt] Review prompt shown');
  } catch (e) {
    console.warn('[ReviewPrompt] Failed to request review:', e);
  }
}
