import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { PaperProvider, Text, ActivityIndicator } from 'react-native-paper';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import theme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { initAnonymousAuth } from './src/config/firebase';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00E5FF',
    background: '#0A0E1A',
    card: '#141B2D',
    text: '#EAEAEA',
    border: '#1E2740',
    notification: '#00E5FF',
  },
};

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initAuth() {
      try {
        await initAnonymousAuth();
        setAuthReady(true);
      } catch (err) {
        console.error('Auth init failed:', err);
        setError(err.message);
      }
    }
    initAuth();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
      <NavigationContainer theme={navigationTheme}>
        {authReady ? (
          <AppNavigator />
        ) : error ? (
          <View style={styles.splash}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text variant="titleMedium" style={styles.errorText}>
              Connection Error
            </Text>
            <Text variant="bodySmall" style={styles.errorSubtext}>
              {error}
            </Text>
          </View>
        ) : (
          <View style={styles.splash}>
            <Text style={styles.splashEmoji}>🏋️</Text>
            <Text variant="headlineMedium" style={styles.splashTitle}>
              IronAgent
            </Text>
            <Text variant="bodyMedium" style={styles.splashSubtitle}>
              Your AI Personal Trainer
            </Text>
            <ActivityIndicator
              size="small"
              color="#00E5FF"
              style={{ marginTop: 24 }}
            />
          </View>
        )}
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  splashTitle: {
    color: '#00E5FF',
    fontWeight: '900',
  },
  splashSubtitle: {
    color: '#8892A4',
    marginTop: 4,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF5252',
    fontWeight: '700',
  },
  errorSubtext: {
    color: '#8892A4',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
