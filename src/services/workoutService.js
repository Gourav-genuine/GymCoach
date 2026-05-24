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
import { auth, db } from '../config/firebase';

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

function replaceFunctionName(functionUrl, nextName) {
  try {
    const url = new URL(functionUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return functionUrl;
    parts[parts.length - 1] = nextName;
    url.pathname = `/${parts.join('/')}`;
    return url.toString();
  } catch (error) {
    return functionUrl.replace(/\/?[^/]*$/, `/${nextName}`);
  }
}

function getFunctionUrl(kind = 'feedback') {
  const feedbackUrl = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL;
  const generateUrl = process.env.EXPO_PUBLIC_GENERATE_WORKOUT_FUNCTION_URL;
  if (!feedbackUrl) {
    throw new Error('Cloud Function URL not configured. Set EXPO_PUBLIC_CLOUD_FUNCTION_URL in .env');
  }

  if (kind === 'generate') {
    return generateUrl ||
      replaceFunctionName(feedbackUrl, 'generateTodaysWorkout');
  }

  if (kind === 'exerciseCompletion') {
    return process.env.EXPO_PUBLIC_EXERCISE_COMPLETION_FUNCTION_URL ||
      (generateUrl && replaceFunctionName(generateUrl, 'updateExerciseCompletion')) ||
      replaceFunctionName(feedbackUrl, 'updateExerciseCompletion');
  }

  if (kind === 'completeWorkout') {
    return process.env.EXPO_PUBLIC_COMPLETE_WORKOUT_FUNCTION_URL ||
      (generateUrl && replaceFunctionName(generateUrl, 'completeWorkout')) ||
      replaceFunctionName(feedbackUrl, 'completeWorkout');
  }

  if (kind === 'resetWorkout') {
    return process.env.EXPO_PUBLIC_RESET_WORKOUT_FUNCTION_URL ||
      (generateUrl && replaceFunctionName(generateUrl, 'resetTodaysWorkout')) ||
      replaceFunctionName(feedbackUrl, 'resetTodaysWorkout');
  }

  return feedbackUrl;
}

async function getAuthHeaders() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('You must be signed in to use IronAgent.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function formatFunctionError(error, fallbackMessage) {
  const status = error.response?.status;
  const responseMessage = error.response?.data?.message || error.response?.data?.error;
  const statusPrefix = status ? ` (${status})` : '';
  const message = responseMessage
    ? `${fallbackMessage}${statusPrefix}: ${responseMessage}`
    : error.message || fallbackMessage;

  const normalized = new Error(message);
  normalized.status = status;
  normalized.response = error.response;
  normalized.cause = error;
  return normalized;
}

/**
 * Fetch recent workouts for the dashboard chart.
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

export function subscribeToRecentWorkouts(uid, days = 7, callback, onError) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const q = query(
    collection(db, 'daily_workouts'),
    where('uid', '==', uid),
    where('date', '>=', Timestamp.fromDate(startDate)),
    orderBy('date', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error('Recent workouts snapshot error:', error);
    if (onError) onError(error);
  });
}

/**
 * Send user feedback to the Cloud Function for AI processing.
 * Returns the agent's response message.
 */
export async function sendFeedback(uid, userMessage, workoutId) {
  const functionUrl = getFunctionUrl('feedback');

  try {
    const response = await axios.post(functionUrl, {
      uid,
      workout_id: workoutId,
      user_message: userMessage,
    }, {
      headers: await getAuthHeaders(),
      timeout: 30000, // 30s timeout for LLM processing
    });

    return response.data;
  } catch (error) {
    throw formatFunctionError(error, 'IronAgent feedback request failed');
  }
}

export async function generateTodaysWorkout(uid) {
  const functionUrl = getFunctionUrl('generate');

  try {
    const response = await axios.post(functionUrl, { uid }, {
      headers: await getAuthHeaders(),
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    throw formatFunctionError(error, 'IronAgent workout generation failed');
  }
}

export async function updateExerciseCompletion(uid, workoutId, exerciseId, completed) {
  const functionUrl = getFunctionUrl('exerciseCompletion');

  try {
    const response = await axios.post(functionUrl, {
      uid,
      workout_id: workoutId,
      exercise_id: exerciseId,
      completed,
    }, {
      headers: await getAuthHeaders(),
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    throw formatFunctionError(error, 'Exercise completion update failed');
  }
}

export async function completeWorkout(uid, workoutId) {
  const functionUrl = getFunctionUrl('completeWorkout');

  try {
    const response = await axios.post(functionUrl, {
      uid,
      workout_id: workoutId,
    }, {
      headers: await getAuthHeaders(),
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    throw formatFunctionError(error, 'Workout completion failed');
  }
}

export async function resetTodaysWorkout(uid) {
  const functionUrl = getFunctionUrl('resetWorkout');

  try {
    const response = await axios.post(functionUrl, { uid }, {
      headers: await getAuthHeaders(),
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    throw formatFunctionError(error, 'Workout reset failed');
  }
}
