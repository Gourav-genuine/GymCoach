import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Checkbox, Text, Chip, Icon, useTheme } from 'react-native-paper';

export default function ExerciseCard({ exercise, index, onToggleComplete, busy }) {
  const theme = useTheme();
  const completed = Boolean(exercise.completed);
  const completedSets = exercise.completedSets?.length || 0;
  const repsText = String(exercise.reps || '').trim();
  let repsLabel = 'Reps';

  if (/as many reps as possible/i.test(repsText)) {
    repsLabel = 'AMRAP';
  } else if (/rep/i.test(repsText)) {
    repsLabel = repsText;
  } else if (repsText) {
    repsLabel = `${repsText} reps`;
  }

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: completed ? theme.colors.elevation.level2 : theme.colors.surface },
        completed && { borderColor: theme.colors.accent + '70' },
      ]}
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.indexBadge, { backgroundColor: completed ? theme.colors.accent + '25' : theme.colors.primary + '20' }]}>
              <Text style={[styles.indexText, { color: theme.colors.primary }]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>
            <Text
              variant="titleMedium"
              style={[
                styles.name,
                { color: completed ? theme.colors.placeholder : theme.colors.text },
                completed && styles.completedName,
              ]}
            >
              {exercise.name}
            </Text>
            <Checkbox
              status={completed ? 'checked' : 'unchecked'}
              onPress={() => onToggleComplete(exercise, !completed)}
              disabled={busy}
              color={theme.colors.accent}
              uncheckedColor={theme.colors.placeholder}
            />
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
              style={[styles.chip, styles.repsChip, { backgroundColor: theme.colors.accent + '20' }]}
              textStyle={[styles.chipText, { color: theme.colors.accent }]}
            >
              {repsLabel}
            </Chip>
            <Chip
              mode="flat"
              compact
              icon={completed ? 'check-circle' : 'timer-outline'}
              style={[styles.chip, { backgroundColor: completed ? theme.colors.accent + '20' : theme.colors.surfaceVariant }]}
              textStyle={[styles.chipText, { color: completed ? theme.colors.accent : theme.colors.placeholder }]}
            >
              {completed ? `${completedSets || exercise.sets} done` : 'Open'}
            </Chip>
          </View>
        </View>
        <View style={[styles.reasoningContainer, { borderLeftColor: theme.colors.primary + '40' }]}>
          <View style={styles.reasoningRow}>
            <Icon source="auto-fix" size={16} color={theme.colors.placeholder} />
            <Text variant="bodySmall" style={[styles.reasoning, { color: theme.colors.placeholder }]}>
              {exercise.reasoning}
            </Text>
          </View>
        </View>
        <Button
          mode={completed ? 'outlined' : 'contained-tonal'}
          icon={completed ? 'undo' : 'check'}
          onPress={() => onToggleComplete(exercise, !completed)}
          disabled={busy}
          compact
          style={styles.doneButton}
        >
          {completed ? 'Mark open' : 'Mark done'}
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
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
  completedName: {
    textDecorationLine: 'line-through',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 44,
  },
  chip: {
    height: 28,
  },
  repsChip: {
    maxWidth: '100%',
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
  reasoningRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  reasoning: {
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  doneButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
});
