import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, List, Divider, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import InsightCard from '../components/InsightCard';
import { getRecentWorkouts } from '../services/workoutService';

// Hardcoded demo UID matching the seed script
const DEMO_UID = 'demo-user-001';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const theme = useTheme();
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const workouts = await getRecentWorkouts(DEMO_UID, 7);
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
    color: (opacity = 1) => `rgba(0, 229, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(136, 146, 164, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#00E5FF',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(136, 146, 164, 0.15)',
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
        <Text style={{ fontSize: 48 }}>📊</Text>
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
          📊 Insights
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.placeholder }}>
          Your training analytics & AI recommendations
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
        title="Recovery Analysis"
        icon="🧠"
        message="Volume maintained, but lower-back recovery is lagging. Suggesting machine focus for the next 48 hours. Your bicep endurance has improved 12% this week — keep the hammer curls going."
      />

      <InsightCard
        title="Training Tip"
        icon="💡"
        message="Consider adding a 5-minute foam rolling session before your next back workout. This can reduce lower-back stiffness by up to 30% and improve your deadlift range of motion."
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
                        {w.status === 'completed' ? '✅' : '🏋️'}
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
