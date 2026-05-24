import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const refreshProfile = useCallback(async (activeUser = user) => {
    if (!activeUser) {
      setProfile(null);
      return null;
    }

    const nextProfile = await getUserProfile(activeUser.uid);
    setProfile(nextProfile);
    return nextProfile;
  }, [user]);

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

  const signInWithGoogle = useCallback(() => {
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
