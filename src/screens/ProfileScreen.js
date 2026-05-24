import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Chip,
  Dialog,
  Divider,
  List,
  Portal,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile } from '../services/profileService';
import { resetTodaysWorkout } from '../services/workoutService';

const goals = ['Build muscle', 'Strength', 'Fat loss', 'General fitness'];
const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
const equipmentOptions = ['Full gym', 'Dumbbells', 'Barbell', 'Machines', 'Cables', 'Bodyweight only'];
const constraintOptions = ['Lower back', 'Knees', 'Shoulders', 'Forearms/grip', 'Low energy', 'No restrictions'];
const sessionLengths = ['30 min', '45 min', '60 min', '90-120 min high volume'];

const defaultSettings = {
  goal: '',
  experience: '',
  equipment: [],
  constraints: [],
  sessionLength: '',
  customNotes: '',
};

export default function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    setSettings({
      goal: profile?.goal || '',
      experience: profile?.experience || '',
      equipment: Array.isArray(profile?.equipment) ? profile.equipment : [],
      constraints: Array.isArray(profile?.constraints) ? profile.constraints : [],
      sessionLength: profile?.sessionLength || '',
      customNotes: profile?.customNotes || '',
    });
  }, [profile]);

  const agentSummary = useMemo(() => {
    const goal = settings.goal || 'your goal';
    const experience = settings.experience || 'your level';
    return `I will coach for ${goal.toLowerCase()}, calibrate to ${experience.toLowerCase()}, and adapt around your equipment and recovery signals.`;
  }, [settings.experience, settings.goal]);

  const setSingle = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const toggleArrayValue = (key, value) => {
    setSettings((current) => {
      const selected = current[key] || [];
      if (key === 'constraints') {
        if (value === 'No restrictions') {
          return { ...current, [key]: selected.includes(value) ? [] : [value] };
        }
        const withoutNoRestrictions = selected.filter((item) => item !== 'No restrictions');
        return {
          ...current,
          [key]: withoutNoRestrictions.includes(value)
            ? withoutNoRestrictions.filter((item) => item !== value)
            : [...withoutNoRestrictions, value],
        };
      }

      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setSaving(true);
    try {
      await saveUserProfile(user.uid, {
        ...settings,
        agentSummary,
      });
      await refreshProfile(user);
      setSnackbar({ visible: true, message: 'Profile settings saved.' });
    } catch (error) {
      setSnackbar({ visible: true, message: error.message || 'Could not save profile settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetWorkout = async () => {
    if (!user?.uid) return;

    setResetting(true);
    try {
      const result = await resetTodaysWorkout(user.uid);
      setResetDialogVisible(false);
      setSnackbar({
        visible: true,
        message: result.agent_message || 'Today\'s workout was reset.',
      });
      navigation.navigate('Workout');
    } catch (error) {
      setSnackbar({ visible: true, message: error.message || 'Could not reset today\'s workout.' });
    } finally {
      setResetting(false);
    }
  };

  const renderSingleChoice = (title, helper, options, key) => (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <Text variant="bodySmall" style={[styles.helper, { color: theme.colors.placeholder }]}>
        {helper}
      </Text>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const selected = settings[key] === option;
          return (
            <Chip
              key={option}
              selected={selected}
              onPress={() => setSingle(key, option)}
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
    </Surface>
  );

  const renderMultiChoice = (title, helper, options, key) => (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <Text variant="bodySmall" style={[styles.helper, { color: theme.colors.placeholder }]}>
        {helper}
      </Text>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const selected = settings[key]?.includes(option);
          return (
            <Chip
              key={option}
              selected={selected}
              onPress={() => toggleArrayValue(key, option)}
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
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated={false}>
        <Appbar.Content
          title="Profile"
          titleStyle={{ color: theme.colors.text, fontWeight: '800', fontSize: 22 }}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={[styles.accountCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={styles.avatar}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onPrimary }}>
              {(user?.email || 'G').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.accountText}>
            <Text variant="titleMedium" style={[styles.accountTitle, { color: theme.colors.text }]}>
              {user?.isAnonymous ? 'Guest athlete' : user?.email || 'IronAgent athlete'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
              {settings.goal || 'No goal selected'} / {settings.experience || 'No level selected'}
            </Text>
          </View>
        </Surface>

        {renderSingleChoice('Training goal', 'Choose what future sessions should optimize for.', goals, 'goal')}
        {renderSingleChoice('Experience', 'Sets exercise complexity and progression speed.', experienceLevels, 'experience')}
        {renderMultiChoice('Equipment', 'Select what you can reliably use in a normal session.', equipmentOptions, 'equipment')}
        {renderMultiChoice('Constraints', 'Tell IronAgent what to avoid or monitor closely.', constraintOptions, 'constraints')}
        {renderSingleChoice('Session length', 'Keep generated workouts inside this time window.', sessionLengths, 'sessionLength')}

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Coaching notes
          </Text>
          <TextInput
            mode="outlined"
            label="Anything IronAgent should remember?"
            value={settings.customNotes}
            onChangeText={(value) => setSingle('customNotes', value)}
            multiline
            numberOfLines={4}
            textColor={theme.colors.text}
            style={styles.notes}
          />
          <Surface style={[styles.summary, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <Text variant="bodySmall" style={{ color: theme.colors.text }}>
              {agentSummary}
            </Text>
          </Surface>
          <Button mode="contained" icon="content-save" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveButton}>
            Save settings
          </Button>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <List.Item
            title="Reset today's workout"
            description="Clear the current plan and generate a fresh one from your saved settings."
            titleStyle={{ color: theme.colors.text, fontWeight: '700' }}
            descriptionStyle={{ color: theme.colors.placeholder }}
            left={(props) => <List.Icon {...props} icon="restart" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.placeholder} />}
            onPress={() => setResetDialogVisible(true)}
          />
          <Divider style={{ backgroundColor: theme.colors.surfaceVariant }} />
          <List.Item
            title="Sign out"
            description={user?.isAnonymous ? 'Leave this guest session.' : 'Return to the sign-in screen.'}
            titleStyle={{ color: theme.colors.text, fontWeight: '700' }}
            descriptionStyle={{ color: theme.colors.placeholder }}
            left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
            onPress={signOut}
          />
        </Surface>
      </ScrollView>

      <Portal>
        <Dialog
          visible={resetDialogVisible}
          onDismiss={() => setResetDialogVisible(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>Reset today?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.placeholder }}>
              This clears today's current workout. When you return to Workout, IronAgent will build a new plan from your latest profile settings.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetDialogVisible(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button onPress={handleResetWorkout} loading={resetting} disabled={resetting}>
              Reset
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={5000}
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  accountCard: {
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D7C7A1',
  },
  accountText: {
    flex: 1,
    marginLeft: 14,
  },
  accountTitle: {
    fontWeight: '800',
  },
  section: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: '800',
  },
  helper: {
    marginTop: 4,
    lineHeight: 18,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
  },
  notes: {
    marginTop: 14,
  },
  summary: {
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  saveButton: {
    marginTop: 14,
  },
});
