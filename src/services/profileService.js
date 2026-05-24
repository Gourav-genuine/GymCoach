import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

export async function saveUserProfile(uid, profile) {
  const ref = doc(db, 'users', uid);
  const payload = {
    ...profile,
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });
  return payload;
}
