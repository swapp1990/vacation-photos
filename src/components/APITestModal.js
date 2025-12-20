import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Screen from './Screen';
import Button from './Button';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

const API_BASE_URL = 'https://dev.swapp1990.org/api';

export default function APITestModal({ visible, onClose }) {
  const [testStatus, setTestStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [story, setStory] = useState(null);
  const [error, setError] = useState(null);

  const runStoryTest = async () => {
    setTestStatus('creating');
    setProgress(0);
    setProgressMessage('Creating story job...');
    setStory(null);
    setError(null);

    try {
      const createResponse = await fetch(`${API_BASE_URL}/story_gen/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: 'generate',
          input_params: {
            premise: 'A traveler discovers a hidden photo album in an old bookstore that shows pictures of places they have never been, yet they appear in every photo.',
            genre: 'mystery',
            tone: 'engaging'
          }
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create job: ${createResponse.status}`);
      }

      const job = await createResponse.json();
      const jobId = job.id;
      setTestStatus('polling');
      setProgressMessage('Job created, waiting for processing...');

      while (true) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const statusResponse = await fetch(`${API_BASE_URL}/story_gen/jobs/${jobId}`);
        const jobStatus = await statusResponse.json();

        try {
          const progressResponse = await fetch(`${API_BASE_URL}/story_gen/jobs/${jobId}/progress`);
          const progressData = await progressResponse.json();
          setProgress(progressData.progress_percent || 0);
          setProgressMessage(progressData.progress_message || 'Processing...');
        } catch (e) {
          // Progress endpoint might not be available
        }

        if (jobStatus.status === 'completed') {
          setTestStatus('completed');
          setStory(jobStatus.output_artifacts?.story);
          setProgress(100);
          setProgressMessage('Story generated!');
          break;
        } else if (jobStatus.status === 'failed') {
          throw new Error(jobStatus.error?.message || 'Job failed');
        }
      }
    } catch (err) {
      setTestStatus('failed');
      setError(err.message);
      setProgressMessage('Failed');
    }
  };

  const resetTest = () => {
    setTestStatus('idle');
    setProgress(0);
    setProgressMessage('');
    setStory(null);
    setError(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen.Modal title="API Test" onClose={onClose}>
        <Text style={styles.subtitle}>Story Generation Test</Text>
        <Text style={styles.description}>
          This will call the story_gen API to generate a 3-paragraph story about a mysterious photo album.
        </Text>

        {testStatus === 'idle' && (
          <Button title="Generate Story" onPress={runStoryTest} size="large" />
        )}

        {(testStatus === 'creating' || testStatus === 'polling') && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.progressText}>{progressMessage}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
        )}

        {testStatus === 'completed' && story && (
          <View style={styles.resultContainer}>
            <Text style={styles.storyTitle}>{story.title}</Text>
            {story.paragraphs?.map((para, index) => (
              <Text key={index} style={styles.storyParagraph}>{para}</Text>
            ))}
            <Button title="Run Again" onPress={resetTest} style={styles.retryButton} />
          </View>
        )}

        {testStatus === 'failed' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Try Again" onPress={resetTest} />
          </View>
        )}
      </Screen.Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  progressText: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressPercent: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  resultContainer: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  storyTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  storyParagraph: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.headline,
    color: colors.error,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.subhead,
    color: colors.error,
    marginBottom: spacing.lg,
  },
});
