import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, List, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import InsightCard from '../components/InsightCard';
import { getRecentWorkouts } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const theme = useTheme();
  const { user, profile } = useAuth();
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user?.uid]);

  const loadData = async () => {
    try {
      const workouts = await getRecentWorkouts(user.uid, 7);
      setRecentWorkouts(workouts);

      // Build chart data from workouts
      if (workouts.length > 0) {
        const labels = [];
        const volumes = [];

        workouts.forEach((w) => {
          const date = w.date?.toDate ? w.date.toDate() : new Date(w.date);
          const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
          labels.push(dayLabel);

          // Calculate volume: sum of (sets * average reps) for each exercise
          let volume = 0;
          (w.exercises || []).forEach((ex) => {
            const repsStr = String(ex.reps);
            let avgReps;
            if (repsStr.includes('-')) {
              const parts = repsStr.split('-').map(Number);
              avgReps = (parts[0] + parts[1]) / 2;
            } else if (repsStr.toLowerCase().includes('fail')) {
              avgReps = 12; // Estimate for "to failure"
            } else {
              avgReps = parseInt(repsStr) || 0;
            }
            volume += (ex.sets || 0) * avgReps;
          });
          volumes.push(volume);
        });

        setChartData({
          labels,
          datasets: [{ data: volumes }],
        });
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

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
          Agent analysis from your recent training
        </Text>
      </View>

      {/* Volume Chart */}
      {chartData && (
        <View style={styles.chartSection}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Training Volume (7 Days)
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
        message={buildAgentInsight(recentWorkouts, profile)}
      />

      <InsightCard
        title="Next Bias"
        icon="target"
        message={buildNextBias(recentWorkouts, profile)}
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
            recentWorkouts.slice(0, 5).map((w, index) => (
              <React.Fragment key={w.id}>
                <List.Item
                  title={formatDate(w.date)}
                  titleStyle={{ color: theme.colors.text, fontWeight: '600' }}
                  description={`${w.exercises?.length || 0} exercises • ${w.status}`}
                  descriptionStyle={{ color: theme.colors.placeholder }}
                  left={() => (
                    <View style={[styles.workoutIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={{ fontSize: 18 }}>
                        {w.status === 'completed' ? '✓' : '•'}
                      </Text>
                    </View>
                  )}
                  right={() => (
                    <Text variant="bodySmall" style={{ color: theme.colors.placeholder, alignSelf: 'center' }}>
                      {calculateVolume(w.exercises)} vol
                    </Text>
                  )}
                />
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

function buildAgentInsight(workouts, profile) {
  if (!workouts.length) {
    return `Once your first session is logged, IronAgent will compare volume, constraints, and goal fit for ${profile?.goal || 'your current goal'}.`;
  }

  const completed = workouts.filter((workout) => workout.status === 'completed').length;
  const totalVolume = workouts.reduce((sum, workout) => sum + calculateVolume(workout.exercises), 0);
  const avgVolume = Math.round(totalVolume / workouts.length);
  return `${completed} completed sessions are in the recent window. Average planned volume is ${avgVolume}, so the next agent adjustment should preserve momentum while respecting ${formatList(profile?.constraints) || 'your recovery signals'}.`;
}

function buildNextBias(workouts, profile) {
  const equipment = formatList(profile?.equipment) || 'available equipment';
  if (!workouts.length) {
    return `The first generated plan will bias toward ${profile?.goal || 'your goal'} using ${equipment}.`;
  }

  const lastWorkout = workouts[workouts.length - 1];
  const exerciseNames = (lastWorkout.exercises || []).slice(0, 2).map((exercise) => exercise.name).join(', ');
  return `Recent work included ${exerciseNames || 'your current plan'}. IronAgent should bias the next session toward balanced stimulus, controlled fatigue, and ${equipment}.`;
}

function formatList(value) {
  if (!Array.isArray(value) || value.length === 0) return '';
  return value.join(', ');
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
});
