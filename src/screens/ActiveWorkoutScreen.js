import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text, Snackbar, Chip, useTheme, Appbar } from 'react-native-paper';
import ExerciseCard from '../components/ExerciseCard';
import AgentChatInput from '../components/AgentChatInput';
import AgentThinkingOverlay from '../components/AgentThinkingOverlay';
import { subscribeToTodaysWorkout, sendFeedback } from '../services/workoutService';
import { auth } from '../config/firebase';

// Hardcoded demo UID matching the seed script
const DEMO_UID = 'demo-user-001';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentThinking, setAgentThinking] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [prevExerciseCount, setPrevExerciseCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToTodaysWorkout(DEMO_UID, (data) => {
      // Animate layout changes when exercises change
      if (data && data.exercises) {
        if (prevExerciseCount > 0 && data.exercises.length !== prevExerciseCount) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setPrevExerciseCount(data.exercises.length);
      }

      setWorkout(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSendFeedback = useCallback(async (message) => {

    setAgentThinking(true);
    try {
      const result = await sendFeedback(DEMO_UID, message, workout?.id);
      if (result.agent_message) {
        setSnackbar({ visible: true, message: result.agent_message });
      }
    } catch (error) {
      console.error('Feedback error:', error);
      setSnackbar({
        visible: true,
        message: '⚠️ Failed to reach IronAgent. Please try again.',
      });
    } finally {
      setAgentThinking(false);
    }
  }, [workout?.id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress': return '#00E5FF';
      case 'completed': return '#76FF03';
      case 'pending': return '#FFA726';
      default: return '#8892A4';
    }
  };

  const renderExercise = ({ item, index }) => (
    <ExerciseCard exercise={item} index={index} />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.workoutInfo}>
        <Text variant="headlineSmall" style={[styles.workoutTitle, { color: theme.colors.text }]}>
          🏋️ Today's Session
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
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.loadingEmoji}>🏋️</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.placeholder, marginTop: 12 }}>
          Loading your workout...
        </Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.loadingEmoji}>📋</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.text, marginTop: 12 }}>
          No workout scheduled
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.placeholder, marginTop: 4 }}>
          Check back later or ask IronAgent to create one
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated={false}>
        <Appbar.Content
          title="IronAgent"
          titleStyle={{ color: theme.colors.primary, fontWeight: '800', fontSize: 22 }}
        />
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
  loadingEmoji: {
    fontSize: 48,
  },
});
