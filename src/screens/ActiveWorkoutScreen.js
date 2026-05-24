import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Text, Snackbar, Chip, useTheme, Appbar, ActivityIndicator } from 'react-native-paper';
import ExerciseCard from '../components/ExerciseCard';
import AgentChatInput from '../components/AgentChatInput';
import AgentThinkingOverlay from '../components/AgentThinkingOverlay';
import { generateTodaysWorkout, subscribeToTodaysWorkout, sendFeedback } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentThinking, setAgentThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
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
        console.error('Workout generation error:', error);
        setSnackbar({
          visible: true,
          message: 'IronAgent could not generate today’s workout. Try again in a moment.',
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
      console.error('Feedback error:', error);
      setSnackbar({
        visible: true,
        message: 'Failed to reach IronAgent. Please try again.',
      });
    } finally {
      setAgentThinking(false);
    }
  }, [user?.uid, workout?.id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress': return theme.colors.primary;
      case 'completed': return '#7FA987';
      case 'pending': return '#D0A85C';
      default: return theme.colors.placeholder;
    }
  };

  const renderExercise = ({ item, index }) => (
    <ExerciseCard exercise={item} index={index} />
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
              {workout.exercises?.length || 0} exercises
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
        <Appbar.Action icon="logout" iconColor={theme.colors.placeholder} onPress={signOut} />
      </Appbar.Header>

      <FlatList
        data={workout.exercises || []}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <AgentChatInput onSend={handleSendFeedback} disabled={agentThinking} />

      <AgentThinkingOverlay visible={agentThinking} />

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
    paddingBottom: 20,
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
});
