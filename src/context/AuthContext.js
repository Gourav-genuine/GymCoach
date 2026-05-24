import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth, validateAppConfig } from '../config/firebase';
import { getUserProfile } from '../services/profileService';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'missing-google-web-client-id',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'missing-google-ios-client-id',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'missing-google-android-client-id',
  });

  const refreshProfile = useCallback(async (activeUser = auth.currentUser) => {
    if (!activeUser) {
      setProfile(null);
      return null;
    }

    const nextProfile = await getUserProfile(activeUser.uid);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    try {
      validateAppConfig();
    } catch (error) {
      setConfigError(error.message);
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        await refreshProfile(nextUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [refreshProfile]);

  useEffect(() => {
    async function completeGoogleSignIn() {
      if (response?.type !== 'success') return;

      const idToken = response.params?.id_token;
      if (!idToken) {
        throw new Error('Google did not return an ID token.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    }

    completeGoogleSignIn().catch((error) => {
      setConfigError(error.message);
    });
  }, [response]);

  const signInWithEmail = useCallback((email, password) => (
    signInWithEmailAndPassword(auth, email.trim(), password)
  ), []);

  const createAccountWithEmail = useCallback((email, password) => (
    createUserWithEmailAndPassword(auth, email.trim(), password)
  ), []);

  const continueAsGuest = useCallback(() => signInAnonymously(auth), []);

  const signInWithGoogle = useCallback(() => {
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      throw new Error('Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
    }
    if (!request) {
      throw new Error('Google sign-in is not ready yet.');
    }
    return promptAsync();
  }, [promptAsync, request]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    configError,
    refreshProfile,
    signInWithEmail,
    createAccountWithEmail,
    continueAsGuest,
    signInWithGoogle,
    signOut: () => signOut(auth),
  }), [
    user,
    profile,
    loading,
    configError,
    refreshProfile,
    signInWithEmail,
    createAccountWithEmail,
    continueAsGuest,
    signInWithGoogle,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
