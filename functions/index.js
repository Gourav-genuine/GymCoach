const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { createAgentProvider } = require("./agentProvider");

admin.initializeApp();
const db = admin.firestore();
const agentProvider = createAgentProvider();
const geminiApiKey = defineSecret("GEMINI_API_KEY");

async function requireUser(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    throw Object.assign(new Error("Missing auth token"), { status: 401 });
  }

  const decoded = await admin.auth().verifyIdToken(match[1]);
  return decoded.uid;
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    start: admin.firestore.Timestamp.fromDate(start),
    end: admin.firestore.Timestamp.fromDate(end),
  };
}

async function getTodaysWorkout(uid) {
  const { start, end } = todayRange();
  const snapshot = await db
    .collection("daily_workouts")
    .where("uid", "==", uid)
    .where("date", ">=", start)
    .where("date", "<", end)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function getRecentWorkouts(uid) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 21);

  const snapshot = await db
    .collection("daily_workouts")
    .where("uid", "==", uid)
    .where("date", ">=", admin.firestore.Timestamp.fromDate(startDate))
    .orderBy("date", "desc")
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getWorkoutById(uid, workoutId) {
  if (!workoutId) return null;

  const doc = await db.collection("daily_workouts").doc(workoutId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (data.uid !== uid) return null;

  return { id: doc.id, ...data };
}

async function getUserProfile(uid) {
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : {};
}

async function writeAgentEvent(uid, event) {
  await db.collection("agent_events").add({
    uid,
    ...event,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function calculateExerciseVolume(exercise = {}) {
  const repsText = String(exercise.reps || "");
  let reps = parseInt(repsText, 10);
  if (repsText.includes("-")) {
    const parts = repsText.split("-").map((part) => parseInt(part, 10)).filter(Number.isFinite);
    reps = parts.length ? Math.round(parts.reduce((sum, value) => sum + value, 0) / parts.length) : 0;
  } else if (repsText.toLowerCase().includes("fail")) {
    reps = 12;
  }

  const sets = Number(exercise.sets) || 0;
  return sets * (Number.isFinite(reps) ? reps : 0);
}

function buildWorkoutSummary(workout, exercises) {
  const completedExercises = exercises.filter((exercise) => exercise.completed);
  const totalVolume = completedExercises.reduce(
    (sum, exercise) => sum + calculateExerciseVolume(exercise),
    0
  );
  const completionRate = exercises.length
    ? Math.round((completedExercises.length / exercises.length) * 100)
    : 0;
  const limitations = [
    workout.lastAgentSeverity === "moderate" ? "fatigue/pain signals" : "",
    workout.status === "stopped" ? "stopped session" : "",
  ].filter(Boolean);

  return {
    completedExerciseCount: completedExercises.length,
    totalExerciseCount: exercises.length,
    completionRate,
    totalVolume,
    trainerNote: limitations.length
      ? `Trainer's note: ${limitations.join(", ")} were detected today. The next session should preserve stimulus with lower-risk loading and tighter recovery checks.`
      : "Trainer's note: Session completed cleanly. The next plan can keep progressive volume while monitoring recovery signals.",
  };
}

function sendError(res, error) {
  const status = error.status || 500;
  console.error(error);
  res.status(status).json({
    error: status === 500 ? "Internal server error" : error.message,
    message: error.message,
  });
}

exports.generateTodaysWorkout = onRequest(
  { cors: true, region: "us-central1", secrets: [geminiApiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const uid = await requireUser(req);
      const existingWorkout = await getTodaysWorkout(uid);
      if (existingWorkout) {
        res.status(200).json({
          success: true,
          workout_id: existingWorkout.id,
          agent_message: existingWorkout.agentSummary || "Today's workout is already ready.",
          existing: true,
        });
        return;
      }

      const profile = await getUserProfile(uid);
      const recentWorkouts = await getRecentWorkouts(uid);
      const generated = await agentProvider.generateWorkout({ profile, recentWorkouts });

      const workoutRef = await db.collection("daily_workouts").add({
        uid,
        title: generated.title || "Today's Session",
        focus: generated.focus || profile.goal || "Adaptive training",
        date: admin.firestore.Timestamp.now(),
        status: "in-progress",
        source: "agent",
        version: 1,
        exercises: generated.exercises || [],
        agentSummary: generated.agent_summary || "Built by IronAgent from your profile.",
        generationReason: generated.generation_reason || "Daily autonomous workout generation.",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await writeAgentEvent(uid, {
        type: "generate_workout",
        workoutId: workoutRef.id,
        agentMessage: generated.agent_message,
        action: "created",
      });

      res.status(200).json({
        success: true,
        workout_id: workoutRef.id,
        agent_message: generated.agent_message || "Today's workout is ready.",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

exports.updateExerciseCompletion = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { workout_id, exercise_id, completed } = req.body || {};
    if (!workout_id || !exercise_id || typeof completed !== "boolean") {
      res.status(400).json({ error: "Missing workout_id, exercise_id, or completed" });
      return;
    }

    try {
      const uid = await requireUser(req);
      const workout = await getWorkoutById(uid, workout_id);
      if (!workout) {
        res.status(404).json({ error: "No workout found" });
        return;
      }

      let found = false;
      const exercises = (workout.exercises || []).map((exercise) => {
        if (exercise.id !== exercise_id) return exercise;
        found = true;
        const completedSets = completed
          ? Array.from({ length: Number(exercise.sets) || 0 }, (_, index) => index + 1)
          : [];
        return {
          ...exercise,
          completed,
          completedSets,
          completedAt: completed ? admin.firestore.Timestamp.now() : null,
        };
      });

      if (!found) {
        res.status(404).json({ error: "Exercise not found" });
        return;
      }

      const allCompleted = exercises.length > 0 && exercises.every((exercise) => exercise.completed);
      await db.collection("daily_workouts").doc(workout.id).update({
        exercises,
        status: allCompleted ? "ready-to-complete" : "in-progress",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        success: true,
        all_completed: allCompleted,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

exports.completeWorkout = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { workout_id } = req.body || {};
    if (!workout_id) {
      res.status(400).json({ error: "Missing workout_id" });
      return;
    }

    try {
      const uid = await requireUser(req);
      const workout = await getWorkoutById(uid, workout_id);
      if (!workout) {
        res.status(404).json({ error: "No workout found" });
        return;
      }

      const exercises = workout.exercises || [];
      const summary = buildWorkoutSummary(workout, exercises);

      await db.collection("daily_workouts").doc(workout.id).update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        completionSummary: summary,
        totalVolume: summary.totalVolume,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await writeAgentEvent(uid, {
        type: "complete_workout",
        workoutId: workout.id,
        action: "completed",
        summary,
      });

      res.status(200).json({
        success: true,
        summary,
        agent_message: summary.trainerNote,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

exports.processWorkoutFeedback = onRequest(
  { cors: true, region: "us-central1", secrets: [geminiApiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { workout_id, user_message } = req.body || {};

    if (!user_message) {
      res.status(400).json({ error: "Missing user_message" });
      return;
    }

    try {
      const uid = await requireUser(req);
      const workout = (await getWorkoutById(uid, workout_id)) || (await getTodaysWorkout(uid));
      if (!workout) {
        res.status(404).json({ error: "No workout found" });
        return;
      }

      const result = await agentProvider.modifyWorkout({ workout, userMessage: user_message });

      if (result.modified || result.stopSession) {
        await db.collection("daily_workouts").doc(workout.id).update({
          exercises: result.updatedExercises,
          status: result.stopSession ? "stopped" : workout.status || "in-progress",
          lastAgentSeverity: result.severity,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await writeAgentEvent(uid, {
        type: "modify_workout",
        workoutId: workout.id,
        userMessage: user_message,
        severity: result.severity,
        action: result.stopSession ? "stopped" : result.modified ? "modified" : "message_only",
        removedExerciseIds: result.exercisesToRemove,
        addedExercises: result.newExercises,
        agentMessage: result.agentMessage,
      });

      res.status(200).json({
        success: true,
        agent_message: result.agentMessage,
        modified: result.modified,
        stop_session: result.stopSession,
        severity: result.severity,
        removed_count: result.exercisesToRemove.length,
        added_count: result.newExercises.length,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);
