import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, List, Divider, useTheme, ActivityIndicator, Chip, Icon } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import InsightCard from '../components/InsightCard';
import { subscribeToRecentWorkouts } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const theme = useTheme();
  const { user, profile } = useAuth();
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user?.uid) return undefined;

    setLoading(true);
    const unsubscribe = subscribeToRecentWorkouts(
      user.uid,
      7,
      (workouts) => {
        setRecentWorkouts(workouts);
        setErrorMessage('');
        setLoading(false);
      },
      () => {
        setErrorMessage('Insights could not refresh. Check your connection and Firestore index deployment.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const stats = useMemo(() => buildStats(recentWorkouts), [recentWorkouts]);
  const chartData = useMemo(() => buildChartData(recentWorkouts), [recentWorkouts]);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surfaceVariant,
    decimalCount: 0,
    color: (opacity = 1) => `rgba(215, 199, 161, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(155, 147, 134, ${opacity})`,
    style: { borderRadius: 8 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(155, 147, 134, 0.15)',
    },
  };

  const formatDate = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="bodyLarge" style={{ color: theme.colors.placeholder, marginTop: 12 }}>
          Loading insights...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
          Insights
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.placeholder }}>
          Live analysis from your recent training
        </Text>
      </View>

      {errorMessage ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '18' }]}>
          <Icon source="alert-circle-outline" size={20} color={theme.colors.error} />
          <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <View style={styles.statGrid}>
        <MetricTile
          label="Completed"
          value={stats.completedSessions}
          detail={`${recentWorkouts.length} logged`}
          icon="check-circle-outline"
        />
        <MetricTile
          label="Avg completion"
          value={`${stats.averageCompletion}%`}
          detail={`${stats.completedExercises}/${stats.totalExercises} exercises`}
          icon="percent-outline"
        />
        <MetricTile
          label="Total volume"
          value={stats.totalVolume}
          detail={`${stats.averageVolume} avg`}
          icon="chart-bar"
        />
        <MetricTile
          label="Latest"
          value={formatStatus(stats.latestWorkout?.status)}
          detail={stats.latestWorkout ? formatDate(stats.latestWorkout.date) : 'No session'}
          icon="calendar-check-outline"
        />
      </View>

      {/* Volume Chart */}
      {chartData && (
        <View style={styles.chartSection}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Volume Trend
          </Text>
          <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
            <LineChart
              data={chartData}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero
            />
          </Card>
        </View>
      )}

      {/* Agent Insight */}
      <InsightCard
        title="Agent Read"
        icon="brain"
        message={buildAgentInsight(recentWorkouts, profile, stats)}
      />

      <InsightCard
        title="Next Bias"
        icon="target"
        message={buildNextBias(recentWorkouts, profile, stats)}
      />

      {/* Recent Workouts */}
      <View style={styles.recentSection}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Recent Workouts
        </Text>
        <Card style={[styles.recentCard, { backgroundColor: theme.colors.surface }]}>
          {recentWorkouts.length === 0 ? (
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.placeholder, textAlign: 'center', paddingVertical: 20 }}>
                No recent workouts found
              </Text>
            </Card.Content>
          ) : (
            [...recentWorkouts].reverse().slice(0, 5).map((w, index) => (
              <React.Fragment key={w.id}>
                <WorkoutRow workout={w} formatDate={formatDate} />
                {index < Math.min(recentWorkouts.length, 5) - 1 && (
                  <Divider style={{ backgroundColor: theme.colors.surfaceVariant, marginHorizontal: 16 }} />
                )}
              </React.Fragment>
            ))
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

function MetricTile({ label, value, detail, icon }) {
  const theme = useTheme();

  return (
    <View style={styles.metricShell}>
      <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.metricContent}>
          <View style={[styles.metricIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Icon source={icon} size={18} color={theme.colors.primary} />
          </View>
          <Text variant="headlineSmall" numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: theme.colors.text }]}>
            {value}
          </Text>
          <Text variant="labelMedium" style={[styles.metricLabel, { color: theme.colors.placeholder }]}>
            {label}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.placeholder }}>
            {detail}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

function WorkoutRow({ workout, formatDate }) {
  const theme = useTheme();
  const completedCount = getCompletedExerciseCount(workout);
  const totalExercises = workout.exercises?.length || 0;
  const completionRate = getCompletionRate(workout);
  const trainerNote = workout.completionSummary?.trainerNote;

  return (
    <List.Item
      title={() => (
        <View style={styles.workoutTitleRow}>
          <Text variant="titleSmall" style={{ color: theme.colors.text, fontWeight: '700' }}>
            {formatDate(workout.date)}
          </Text>
          <Chip
            compact
            mode="flat"
            style={[styles.statusChip, { backgroundColor: getStatusColor(workout.status, theme) + '20' }]}
            textStyle={{ color: getStatusColor(workout.status, theme), fontSize: 11, fontWeight: '700' }}
          >
            {formatStatus(workout.status)}
          </Chip>
        </View>
      )}
      description={() => (
        <View style={styles.workoutDescription}>
          <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
            {completedCount}/{totalExercises} exercises • {completionRate}% complete • {calculateWorkoutVolume(workout)} volume
          </Text>
          {trainerNote ? (
            <Text variant="bodySmall" numberOfLines={2} style={[styles.trainerNote, { color: theme.colors.text }]}>
              {trainerNote}
            </Text>
          ) : null}
        </View>
      )}
      left={() => (
        <View style={[styles.workoutIcon, { backgroundColor: getStatusColor(workout.status, theme) + '20' }]}>
          <Icon
            source={workout.status === 'completed' ? 'check' : 'progress-clock'}
            size={20}
            color={getStatusColor(workout.status, theme)}
          />
        </View>
      )}
    />
  );
}

function buildChartData(workouts) {
  if (!workouts.length) return null;

  return {
    labels: workouts.map((workout) => {
      const date = workout.date?.toDate ? workout.date.toDate() : new Date(workout.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }),
    datasets: [{ data: workouts.map(calculateWorkoutVolume) }],
  };
}

function buildStats(workouts) {
  const totalVolume = workouts.reduce((sum, workout) => sum + calculateWorkoutVolume(workout), 0);
  const completedExercises = workouts.reduce((sum, workout) => sum + getCompletedExerciseCount(workout), 0);
  const totalExercises = workouts.reduce((sum, workout) => sum + (workout.exercises?.length || 0), 0);
  const completedSessions = workouts.filter((workout) => workout.status === 'completed').length;
  const latestWorkout = workouts[workouts.length - 1] || null;

  return {
    totalVolume,
    completedExercises,
    totalExercises,
    completedSessions,
    latestWorkout,
    averageVolume: workouts.length ? Math.round(totalVolume / workouts.length) : 0,
    averageCompletion: totalExercises ? Math.round((completedExercises / totalExercises) * 100) : 0,
  };
}

function calculateVolume(exercises = []) {
  let total = 0;
  exercises.forEach((ex) => {
    const repsStr = String(ex.reps);
    let avgReps;
    if (repsStr.includes('-')) {
      const parts = repsStr.split('-').map(Number);
      avgReps = (parts[0] + parts[1]) / 2;
    } else if (repsStr.toLowerCase().includes('fail')) {
      avgReps = 12;
    } else {
      avgReps = parseInt(repsStr) || 0;
    }
    total += (ex.sets || 0) * avgReps;
  });
  return total;
}

function calculateWorkoutVolume(workout) {
  if (typeof workout?.totalVolume === 'number') return workout.totalVolume;
  if (typeof workout?.completionSummary?.totalVolume === 'number') {
    return workout.completionSummary.totalVolume;
  }
  return calculateVolume(workout?.exercises || []);
}

function getCompletedExerciseCount(workout) {
  if (typeof workout?.completionSummary?.completedExerciseCount === 'number') {
    return workout.completionSummary.completedExerciseCount;
  }
  return (workout?.exercises || []).filter((exercise) => exercise.completed).length;
}

function getCompletionRate(workout) {
  if (typeof workout?.completionSummary?.completionRate === 'number') {
    return workout.completionSummary.completionRate;
  }

  const totalExercises = workout?.exercises?.length || 0;
  if (!totalExercises) return 0;
  return Math.round((getCompletedExerciseCount(workout) / totalExercises) * 100);
}

function buildAgentInsight(workouts, profile, stats) {
  if (!workouts.length) {
    return `Once your first session is logged, IronAgent will compare volume, constraints, and goal fit for ${profile?.goal || 'your current goal'}.`;
  }

  const latestCompletedNote = [...workouts]
    .reverse()
    .find((workout) => workout.completionSummary?.trainerNote)?.completionSummary?.trainerNote;
  if (latestCompletedNote) {
    return latestCompletedNote;
  }

  return `${stats.completedSessions} completed sessions are in the recent window with ${stats.averageCompletion}% average exercise completion. Average planned volume is ${stats.averageVolume}, so the next adjustment should preserve momentum while respecting ${formatList(profile?.constraints) || 'your recovery signals'}.`;
}

function buildNextBias(workouts, profile, stats) {
  const equipment = formatList(profile?.equipment) || 'available equipment';
  if (!workouts.length) {
    return `The first generated plan will bias toward ${profile?.goal || 'your goal'} using ${equipment}.`;
  }

  const lastWorkout = stats.latestWorkout;
  const exerciseNames = (lastWorkout.exercises || []).slice(0, 2).map((exercise) => exercise.name).join(', ');
  return `Recent work included ${exerciseNames || 'your current plan'}. IronAgent should bias the next session toward balanced stimulus, controlled fatigue, and ${equipment}.`;
}

function formatList(value) {
  if (!Array.isArray(value) || value.length === 0) return '';
  return value.join(', ');
}

function formatStatus(status) {
  if (!status) return 'No data';
  return status.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusColor(status, theme) {
  switch (status) {
    case 'completed': return theme.colors.accent;
    case 'ready-to-complete': return theme.colors.primary;
    case 'stopped': return theme.colors.error;
    case 'in-progress': return '#D0A85C';
    default: return theme.colors.placeholder;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    lineHeight: 18,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  metricShell: {
    width: '50%',
    padding: 4,
  },
  metricCard: {
    borderRadius: 8,
  },
  metricContent: {
    minHeight: 132,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontWeight: '800',
  },
  metricLabel: {
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  chartSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 16,
  },
  recentSection: {
    marginTop: 8,
  },
  recentCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusChip: {
    height: 24,
  },
  workoutDescription: {
    gap: 6,
  },
  trainerNote: {
    lineHeight: 18,
  },
});
