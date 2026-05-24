import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Use React Native persistence for auth state
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export async function initAnonymousAuth() {
  try {
    const cred = await signInAnonymously(auth);
    console.log('Anonymous auth successful, uid:', cred.user.uid);
    return cred.user;
  } catch (error) {
    console.error('Anonymous auth failed:', error);
    throw error;
  }
}
