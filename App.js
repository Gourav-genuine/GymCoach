import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { PaperProvider, Text, ActivityIndicator } from 'react-native-paper';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import theme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D7C7A1',
    background: '#111111',
    card: '#1A1A1A',
    text: '#F4EEE2',
    border: '#26231F',
    notification: '#D7C7A1',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
      <NavigationContainer theme={navigationTheme}>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </NavigationContainer>
    </PaperProvider>
  );
}

function AppGate() {
  const { user, profile, loading, configError } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text variant="headlineMedium" style={styles.splashTitle}>
          IronAgent
        </Text>
        <Text variant="bodyMedium" style={styles.splashSubtitle}>
          Preparing your coaching environment
        </Text>
        <ActivityIndicator
          size="small"
          color="#D7C7A1"
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!profile?.onboardingComplete) {
    return <OnboardingScreen />;
  }

  if (configError) {
    return (
      <View style={styles.splash}>
        <Text variant="titleMedium" style={styles.errorText}>
          Configuration Error
        </Text>
        <Text variant="bodySmall" style={styles.errorSubtext}>
          {configError}
        </Text>
      </View>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    color: '#F4EEE2',
    fontWeight: '900',
  },
  splashSubtitle: {
    color: '#9B9386',
    marginTop: 4,
  },
  errorText: {
    color: '#E57373',
    fontWeight: '700',
  },
  errorSubtext: {
    color: '#8892A4',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
