/**
 * In-App Review Prompt
 *
 * Tracks "positive moments" (trip viewed, vacation shared) and triggers
 * the native App Store review prompt after the 2nd positive moment.
 * Enforces a 90-day cooldown between prompts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { track, Events } from './analytics';

const POSITIVE_MOMENT_COUNT_KEY = '_review_positive_count';
const LAST_PROMPT_KEY = '_review_last_prompt';
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const PROMPT_THRESHOLD = 2; // Show after 2nd positive moment

/**
 * Record a positive moment and potentially trigger a review prompt.
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

    // Increment counter
    const raw = await AsyncStorage.getItem(POSITIVE_MOMENT_COUNT_KEY);
    const count = (parseInt(raw, 10) || 0) + 1;
    await AsyncStorage.setItem(POSITIVE_MOMENT_COUNT_KEY, String(count));

    if (count >= PROMPT_THRESHOLD) {
      await triggerReviewPrompt();
    }
  } catch (e) {
    // Never crash the app for review logic
    console.warn('[ReviewPrompt] Error:', e);
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
    await AsyncStorage.setItem(POSITIVE_MOMENT_COUNT_KEY, '0');

    track(Events.REVIEW_PROMPTED);
    console.log('[ReviewPrompt] Review prompt shown');
  } catch (e) {
    console.warn('[ReviewPrompt] Failed to request review:', e);
  }
}
