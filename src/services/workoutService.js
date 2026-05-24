import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import axios from 'axios';
import { db } from '../config/firebase';

/**
 * Get the start and end timestamps for today (midnight to midnight).
 */
function getTodayRange() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    start: Timestamp.fromDate(startOfDay),
    end: Timestamp.fromDate(endOfDay),
  };
}

/**
 * Query Firestore for today's workout for a given user.
 * Returns { id, ...data } or null.
 */
export async function getTodaysWorkout(uid) {
  try {
    const { start, end } = getTodayRange();
    const q = query(
      collection(db, 'daily_workouts'),
      where('uid', '==', uid),
      where('date', '>=', start),
      where('date', '<', end),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log('No workout found for today');
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error fetching today\'s workout:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates on a specific workout document.
 * Returns an unsubscribe function.
 */
export function subscribeToWorkout(workoutId, callback) {
  const ref = doc(db, 'daily_workouts', workoutId);

  return onSnapshot(ref, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('onSnapshot error:', error);
  });
}

/**
 * Subscribe to today's workout for a user using a query-based listener.
 * Returns an unsubscribe function.
 */
export function subscribeToTodaysWorkout(uid, callback) {
  const { start, end } = getTodayRange();
  const q = query(
    collection(db, 'daily_workouts'),
    where('uid', '==', uid),
    where('date', '>=', start),
    where('date', '<', end),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const doc = snapshot.docs[0];
      callback({ id: doc.id, ...doc.data() });
    }
  }, (error) => {
    console.error('onSnapshot query error:', error);
  });
}

/**
 * Fetch past completed workouts for the dashboard chart.
 */
export async function getRecentWorkouts(uid, days = 7) {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
    const q = query(
      collection(db, 'daily_workouts'),
      where('uid', '==', uid),
      where('date', '>=', Timestamp.fromDate(startDate)),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching recent workouts:', error);
    return [];
  }
}

/**
 * Send user feedback to the Cloud Function for AI processing.
 * Returns the agent's response message.
 */
export async function sendFeedback(uid, userMessage, workoutId) {
  const functionUrl = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL;

  if (!functionUrl) {
    throw new Error('Cloud Function URL not configured. Set EXPO_PUBLIC_CLOUD_FUNCTION_URL in .env');
  }

  try {
    const response = await axios.post(functionUrl, {
      uid,
      workout_id: workoutId,
      user_message: userMessage,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000, // 30s timeout for LLM processing
    });

    return response.data;
  } catch (error) {
    console.error('Error sending feedback:', error);
    throw error;
  }
}
