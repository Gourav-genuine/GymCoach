import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile } from '../services/profileService';

const steps = [
  {
    key: 'goal',
    title: 'What should I optimize for?',
    helper: 'Pick the training outcome you care about most right now.',
    options: ['Build muscle', 'Strength', 'Fat loss', 'General fitness'],
  },
  {
    key: 'experience',
    title: 'How trained are you?',
    helper: 'This sets exercise complexity and progression speed.',
    options: ['Beginner', 'Intermediate', 'Advanced'],
  },
  {
    key: 'equipment',
    title: 'What equipment can I use?',
    helper: 'Select everything available in a normal session.',
    options: ['Full gym', 'Dumbbells', 'Barbell', 'Machines', 'Cables', 'Bodyweight only'],
    multi: true,
  },
  {
    key: 'constraints',
    title: 'Any limits I should respect?',
    helper: 'Choose common restrictions or add details below.',
    options: ['Lower back', 'Knees', 'Shoulders', 'Forearms/grip', 'Low energy', 'No restrictions'],
    multi: true,
  },
  {
    key: 'sessionLength',
    title: 'How long should workouts be?',
    helper: 'I will build sessions to fit this window.',
    options: ['30 min', '45 min', '60 min', '90-120 min high volume'],
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { user, refreshProfile, signOut } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [customNotes, setCustomNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const step = steps[stepIndex];
  const currentAnswer = answers[step.key] || (step.multi ? [] : '');
  const canContinue = step.multi ? currentAnswer.length > 0 : Boolean(currentAnswer);
  const isLast = stepIndex === steps.length - 1;

  const agentSummary = useMemo(() => {
    const goal = answers.goal || 'your goal';
    const experience = answers.experience || 'your level';
    return `I will coach for ${goal.toString().toLowerCase()}, calibrate to ${experience.toString().toLowerCase()}, and adapt around your equipment and recovery signals.`;
  }, [answers]);

  const toggleAnswer = (option) => {
    setAnswers((prev) => {
      if (!step.multi) {
        return { ...prev, [step.key]: option };
      }
      const selected = prev[step.key] || [];
      const withoutNoRestrictions = option === 'No restrictions'
        ? []
        : selected.filter((item) => item !== 'No restrictions');
      const base = option === 'No restrictions' ? selected : withoutNoRestrictions;
      const exists = base.includes(option);
      return {
        ...prev,
        [step.key]: exists ? base.filter((item) => item !== option) : [...base, option],
      };
    });
  };

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await saveUserProfile(user.uid, {
        goal: answers.goal,
        experience: answers.experience,
        equipment: answers.equipment || [],
        constraints: answers.constraints || [],
        sessionLength: answers.sessionLength,
        customNotes,
        agentSummary,
        createdAt: new Date().toISOString(),
      });
      await refreshProfile(user);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setStepIndex((index) => index + 1);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
          Set up your agent
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.placeholder }]}>
          Answer with quick selections, then add anything you want IronAgent to know.
        </Text>
      </View>

      <Surface style={[styles.agentPanel, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
          IronAgent
        </Text>
        <Text variant="bodyMedium" style={[styles.agentText, { color: theme.colors.text }]}>
          {step.title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
          {step.helper}
        </Text>
      </Surface>

      <View style={styles.chipGrid}>
        {step.options.map((option) => {
          const selected = Array.isArray(currentAnswer)
            ? currentAnswer.includes(option)
            : currentAnswer === option;
          return (
            <Chip
              key={option}
              selected={selected}
              onPress={() => toggleAnswer(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.colors.selectedOption : theme.colors.optionSurface,
                  borderColor: selected ? theme.colors.selectedOption : theme.colors.optionBorder,
                },
              ]}
              selectedColor={selected ? theme.colors.onSelectedOption : theme.colors.text}
              textStyle={{
                color: selected ? theme.colors.onSelectedOption : theme.colors.text,
                fontWeight: '700',
              }}
            >
              {option}
            </Chip>
          );
        })}
      </View>

      {isLast && (
        <TextInput
          mode="outlined"
          label="Anything else?"
          value={customNotes}
          onChangeText={setCustomNotes}
          multiline
          numberOfLines={4}
          textColor={theme.colors.text}
          style={styles.notes}
        />
      )}

      <Surface style={[styles.summary, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
        <Text variant="bodyMedium" style={{ color: theme.colors.text }}>
          {agentSummary}
        </Text>
      </Surface>

      {Boolean(error) && (
        <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          mode="text"
          onPress={() => setStepIndex((index) => Math.max(0, index - 1))}
          disabled={stepIndex === 0 || busy}
        >
          Back
        </Button>
        <Button mode="contained" onPress={next} disabled={!canContinue || busy} loading={busy}>
          {isLast ? 'Start coaching' : 'Continue'}
        </Button>
      </View>

      <Button mode="text" onPress={signOut} disabled={busy}>
        Sign out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 72,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 22,
  },
  agentPanel: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
  },
  agentText: {
    marginTop: 8,
    marginBottom: 6,
    fontWeight: '700',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
  },
  notes: {
    marginTop: 18,
  },
  summary: {
    borderRadius: 8,
    padding: 14,
    marginTop: 22,
  },
  error: {
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
});
