import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const theme = useTheme();
  const { signInWithEmail, createAccountWithEmail, signInWithGoogle, continueAsGuest, configError } = useAuth();
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isSignIn = mode === 'sign-in';

  const handleEmailAuth = async () => {
    setError('');
    setBusy(true);
    try {
      if (isSignIn) {
        await signInWithEmail(email, password);
      } else {
        await createAccountWithEmail(email, password);
      }
    } catch (authError) {
      setError(authError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(authError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGuestAuth = async () => {
    setError('');
    setBusy(true);
    try {
      await continueAsGuest();
    } catch (authError) {
      setError(authError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <Text variant="headlineLarge" style={[styles.brand, { color: theme.colors.text }]}>
          IronAgent
        </Text>
        <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.placeholder }]}>
          Professional training intelligence that builds, tracks, and pivots your session in real time.
        </Text>
      </View>

      <Surface style={[styles.panel, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Button
          mode="contained"
          icon="flash"
          onPress={handleGuestAuth}
          loading={busy}
          disabled={busy}
          style={styles.guestButton}
        >
          Try instantly
        </Button>

        <View style={styles.dividerRow}>
          <Divider style={styles.divider} />
          <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>or use an account</Text>
          <Divider style={styles.divider} />
        </View>

        <Text variant="titleLarge" style={[styles.panelTitle, { color: theme.colors.text }]}>
          {isSignIn ? 'Sign in' : 'Create account'}
        </Text>
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textColor={theme.colors.text}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textColor={theme.colors.text}
          style={styles.input}
        />
        <Button
          mode="contained"
          onPress={handleEmailAuth}
          loading={busy}
          disabled={busy || !email.trim() || password.length < 6}
          style={styles.primaryButton}
        >
          {isSignIn ? 'Sign in' : 'Create account'}
        </Button>

        <View style={styles.dividerRow}>
          <Divider style={styles.divider} />
          <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>or</Text>
          <Divider style={styles.divider} />
        </View>

        <Button mode="outlined" icon="google" onPress={handleGoogleAuth} disabled={busy}>
          Continue with Google
        </Button>

        <Button
          mode="text"
          onPress={() => {
            setMode(isSignIn ? 'create' : 'sign-in');
            setError('');
          }}
          style={styles.switchButton}
        >
          {isSignIn ? 'Need an account?' : 'Already have an account?'}
        </Button>

        <HelperText type="error" visible={Boolean(error || configError)}>
          {error || configError}
        </HelperText>
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  hero: {
    marginBottom: 28,
  },
  brand: {
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 24,
  },
  panel: {
    borderRadius: 8,
    padding: 18,
  },
  guestButton: {
    marginBottom: 2,
  },
  panelTitle: {
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  divider: {
    flex: 1,
  },
  switchButton: {
    marginTop: 8,
  },
});
