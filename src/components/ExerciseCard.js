import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';

export default function ExerciseCard({ exercise, index }) {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.indexBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.indexText, { color: theme.colors.primary }]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>
            <Text variant="titleMedium" style={[styles.name, { color: theme.colors.text }]}>
              {exercise.name}
            </Text>
          </View>
          <View style={styles.chips}>
            <Chip
              mode="flat"
              compact
              style={[styles.chip, { backgroundColor: theme.colors.primary + '20' }]}
              textStyle={[styles.chipText, { color: theme.colors.primary }]}
            >
              {exercise.sets} sets
            </Chip>
            <Chip
              mode="flat"
              compact
              style={[styles.chip, { backgroundColor: '#76FF03' + '20' }]}
              textStyle={[styles.chipText, { color: '#76FF03' }]}
            >
              {exercise.reps} reps
            </Chip>
          </View>
        </View>
        <View style={[styles.reasoningContainer, { borderLeftColor: theme.colors.primary + '40' }]}>
          <Text variant="bodySmall" style={[styles.reasoning, { color: theme.colors.placeholder }]}>
            🤖 {exercise.reasoning}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    elevation: 4,
  },
  header: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  indexText: {
    fontSize: 14,
    fontWeight: '700',
  },
  name: {
    fontWeight: '700',
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 44,
  },
  chip: {
    height: 28,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasoningContainer: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    marginLeft: 44,
    marginTop: 4,
  },
  reasoning: {
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
