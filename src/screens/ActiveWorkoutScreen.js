import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import {
  Appbar,
  ActivityIndicator,
  Button,
  Chip,
  Dialog,
  Portal,
  ProgressBar,
  Surface,
  Text,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import ExerciseCard from '../components/ExerciseCard';
import AgentChatInput from '../components/AgentChatInput';
import AgentThinkingOverlay from '../components/AgentThinkingOverlay';
import {
  completeWorkout,
  generateTodaysWorkout,
  subscribeToTodaysWorkout,
  sendFeedback,
  updateExerciseCompletion,
} from '../services/workoutService';
import { useAuth } from '../context/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentThinking, setAgentThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [busyExerciseIds, setBusyExerciseIds] = useState({});
  const [completionSummary, setCompletionSummary] = useState(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const prevExerciseCount = useRef(0);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const unsubscribe = subscribeToTodaysWorkout(user.uid, (data) => {
      // Animate layout changes when exercises change
      if (data && data.exercises) {
        if (prevExerciseCount.current > 0 && data.exercises.length !== prevExerciseCount.current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        prevExerciseCount.current = data.exercises.length;
      }

      setWorkout(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    async function ensureWorkout() {
      if (loading || workout || generating || !user?.uid) return;

      setGenerating(true);
      setAgentThinking(true);
      try {
        const result = await generateTodaysWorkout(user.uid);
        setSnackbar({
          visible: true,
          message: result.agent_message || 'Your workout is ready.',
        });
      } catch (error) {
        console.warn('Workout generation error:', error.message);
        setSnackbar({
          visible: true,
          message: error.message || 'IronAgent could not generate today’s workout. Try again in a moment.',
        });
      } finally {
        setGenerating(false);
        setAgentThinking(false);
      }
    }

    ensureWorkout();
  }, [generating, loading, user?.uid, workout]);

  const handleSendFeedback = useCallback(async (message) => {

    setAgentThinking(true);
    try {
      const result = await sendFeedback(user.uid, message, workout?.id);
      if (result.agent_message) {
        setSnackbar({ visible: true, message: result.agent_message });
      }
    } catch (error) {
      console.warn('Feedback error:', error.message);
      setSnackbar({
        visible: true,
        message: error.message || 'Failed to reach IronAgent. Please try again.',
      });
    } finally {
      setAgentThinking(false);
    }
  }, [user?.uid, workout?.id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress': return theme.colors.primary;
      case 'ready-to-complete': return theme.colors.accent;
      case 'completed': return '#7FA987';
      case 'stopped': return theme.colors.error;
      case 'pending': return '#D0A85C';
      default: return theme.colors.placeholder;
    }
  };

  const exercises = workout?.exercises || [];
  const completedCount = exercises.filter((exercise) => exercise.completed).length;
  const completionRatio = exercises.length ? completedCount / exercises.length : 0;
  const isWorkoutCompleted = workout?.status === 'completed';

  const handleToggleComplete = useCallback(async (exercise, completed) => {
    if (!workout?.id || !user?.uid) return;

    setBusyExerciseIds((current) => ({ ...current, [exercise.id]: true }));
    try {
      await updateExerciseCompletion(user.uid, workout.id, exercise.id, completed);
    } catch (error) {
      console.warn('Exercise completion error:', error.message);
      setSnackbar({
        visible: true,
        message: error.message || 'Could not update exercise completion.',
      });
    } finally {
      setBusyExerciseIds((current) => ({ ...current, [exercise.id]: false }));
    }
  }, [user?.uid, workout?.id]);

  const handleCompleteWorkout = useCallback(async () => {
    if (!workout?.id || !user?.uid) return;

    setCompleting(true);
    try {
      const result = await completeWorkout(user.uid, workout.id);
      setCompletionSummary(result.summary);
      setSnackbar({
        visible: true,
        message: result.agent_message || 'Workout completed.',
      });
    } catch (error) {
      console.warn('Workout completion error:', error.message);
      setSnackbar({
        visible: true,
        message: error.message || 'Could not complete this workout.',
      });
    } finally {
      setCompleting(false);
    }
  }, [user?.uid, workout?.id]);

  const renderExercise = ({ item, index }) => (
    <ExerciseCard
      exercise={item}
      index={index}
      onToggleComplete={handleToggleComplete}
      busy={Boolean(busyExerciseIds[item.id])}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.workoutInfo}>
        <Text variant="headlineSmall" style={[styles.workoutTitle, { color: theme.colors.text }]}>
          Today's Session
        </Text>
        {workout && (
          <View style={styles.statusRow}>
            <Chip
              mode="flat"
              compact
              style={{
                backgroundColor: getStatusColor(workout.status) + '20',
              }}
              textStyle={{ color: getStatusColor(workout.status), fontSize: 12, fontWeight: '600' }}
            >
              {workout.status?.toUpperCase()}
            </Chip>
            <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
              {completedCount}/{workout.exercises?.length || 0} done
            </Text>
          </View>
        )}
        {workout && (
          <View style={styles.progressBlock}>
            <ProgressBar
              progress={completionRatio}
              color={theme.colors.accent}
              style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
              {completionRatio === 1 ? 'Ready to finish the session.' : 'Mark exercises as you complete them.'}
            </Text>
          </View>
        )}
        {workout?.agentSummary && (
          <View style={[styles.agentSummary, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              IronAgent plan
            </Text>
            <Text variant="bodySmall" style={[styles.agentSummaryText, { color: theme.colors.text }]}>
              {workout.agentSummary}
            </Text>
          </View>
        )}
        <View style={styles.quickActions}>
          {['Low energy', 'Short on time', 'Sore legs', 'No machines'].map((prompt) => (
            <Chip
              key={prompt}
              compact
              mode="outlined"
              onPress={() => handleSendFeedback(prompt)}
              disabled={agentThinking}
              style={styles.quickChip}
            >
              {prompt}
            </Chip>
          ))}
        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <Surface style={[styles.finishPanel, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <Text variant="titleMedium" style={[styles.finishTitle, { color: theme.colors.text }]}>
        Session closeout
      </Text>
      <Text variant="bodySmall" style={[styles.finishText, { color: theme.colors.placeholder }]}>
        Complete the workout to lock the session, calculate planned volume, and generate the trainer note for future adjustments.
      </Text>
      <Button
        mode="contained"
        icon="flag-checkered"
        onPress={handleCompleteWorkout}
        loading={completing}
        disabled={completing || isWorkoutCompleted || exercises.length === 0}
        style={styles.finishButton}
      >
        {isWorkoutCompleted ? 'Workout completed' : 'Complete workout'}
      </Button>
    </Surface>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="bodyLarge" style={{ color: theme.colors.placeholder, marginTop: 12 }}>
          Checking today’s plan...
        </Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={{ color: theme.colors.text, marginTop: 12 }}>
          IronAgent is building today’s session
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.placeholder, marginTop: 4 }}>
          Your profile and recent history are being used to create the plan.
        </Text>
        <AgentThinkingOverlay visible={agentThinking || generating} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated={false}>
        <Appbar.Content
          title="IronAgent"
          titleStyle={{ color: theme.colors.text, fontWeight: '800', fontSize: 22 }}
        />
      </Appbar.Header>

      <FlatList
        data={workout.exercises || []}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <AgentChatInput onSend={handleSendFeedback} disabled={agentThinking} />

      <AgentThinkingOverlay visible={agentThinking} />

      <Portal>
        <Dialog
          visible={Boolean(completionSummary)}
          onDismiss={() => setCompletionSummary(null)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>Session Summary</Dialog.Title>
          <Dialog.Content>
            <View style={styles.summaryMetricRow}>
              <View style={styles.summaryMetric}>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                  {completionSummary?.completionRate || 0}%
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
                  consistency
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                  {completionSummary?.totalVolume || 0}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
                  volume
                </Text>
              </View>
            </View>
            <Text variant="bodyMedium" style={[styles.summaryNote, { color: theme.colors.text }]}>
              {completionSummary?.trainerNote}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCompletionSummary(null)}>Done</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={6000}
        style={{ backgroundColor: theme.colors.surface }}
        action={{
          label: 'OK',
          textColor: theme.colors.primary,
          onPress: () => setSnackbar({ visible: false, message: '' }),
        }}
      >
        <Text style={{ color: theme.colors.text }}>{snackbar.message}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  workoutInfo: {},
  workoutTitle: {
    fontWeight: '800',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listContent: {
    paddingBottom: 28,
  },
  progressBlock: {
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 8,
  },
  agentSummary: {
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  agentSummaryText: {
    marginTop: 4,
    lineHeight: 18,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  quickChip: {
    borderRadius: 8,
  },
  finishPanel: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
  },
  finishTitle: {
    fontWeight: '800',
  },
  finishText: {
    marginTop: 6,
    lineHeight: 18,
  },
  finishButton: {
    marginTop: 14,
  },
  summaryMetricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryMetric: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#26231F',
  },
  summaryNote: {
    lineHeight: 21,
  },
});
