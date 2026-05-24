const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Tool definition for workout modification
const modifyWorkoutPlanDeclaration = {
  name: "modify_workout_plan",
  description:
    "Modifies the user's current workout array based on physical complaints, fatigue, or equipment availability. Call this whenever the user reports any issue that requires changing their workout plan.",
  parameters: {
    type: "OBJECT",
    properties: {
      exercises_to_remove: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "IDs of exercises to delete from the current plan.",
      },
      exercises_to_add: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Name of the new exercise" },
            sets: { type: "NUMBER", description: "Number of sets" },
            reps: { type: "STRING", description: "Rep range, e.g. '8-10' or 'to failure'" },
            reasoning: { type: "STRING", description: "Why this exercise was chosen as a replacement" },
          },
          required: ["name", "sets", "reps", "reasoning"],
        },
        description: "New exercises to add as replacements.",
      },
      agent_message: {
        type: "STRING",
        description:
          "A brief, motivating, trainer-like message explaining the changes to the user. Be encouraging and reference specific muscles or recovery concerns.",
      },
    },
    required: ["exercises_to_remove", "exercises_to_add", "agent_message"],
  },
};

const SYSTEM_INSTRUCTION = `You are IronAgent, an elite personal trainer AI. You have full control over the user's workout plan.

Your responsibilities:
- When users report pain, fatigue, bad sleep, soreness, or equipment issues, you MUST call the modify_workout_plan function to adjust their session.
- Always explain your reasoning in a brief, motivating, trainer-like tone.
- Prioritize safety — NEVER keep an exercise that could aggravate a reported injury or pain.
- Replace removed exercises with biomechanically similar but SAFER alternatives.
- When lower back issues are reported, swap free-weight exercises for machine or cable alternatives.
- When forearm/grip issues are reported, prefer exercises with neutral grips or straps-friendly movements.
- Keep the overall training volume similar — match sets and rep ranges of replaced exercises.
- Be specific about WHY each replacement is better for the user's current condition.

You must ALWAYS call the modify_workout_plan function when the user reports any physical complaint. Never just give text advice without modifying the plan.`;

/**
 * Get today's workout for a user.
 */
async function getTodaysWorkout(uid) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const snapshot = await db
    .collection("daily_workouts")
    .where("uid", "==", uid)
    .where("date", ">=", admin.firestore.Timestamp.fromDate(startOfDay))
    .where("date", "<", admin.firestore.Timestamp.fromDate(endOfDay))
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Get a specific workout and ensure it belongs to the requested user.
 */
async function getWorkoutById(uid, workoutId) {
  if (!workoutId) {
    return null;
  }

  const doc = await db.collection("daily_workouts").doc(workoutId).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  if (data.uid !== uid) {
    return null;
  }

  return { id: doc.id, ...data };
}

/**
 * Main Cloud Function: processWorkoutFeedback
 * Accepts { uid, workout_id, user_message } and uses Gemini to modify the workout plan.
 */
exports.processWorkoutFeedback = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { uid, workout_id, user_message } = req.body;

    if (!uid || !user_message) {
      res.status(400).json({ error: "Missing uid or user_message" });
      return;
    }

    try {
      // 1. Prefer the active workout doc from the client; fall back for older clients.
      const workout = (await getWorkoutById(uid, workout_id)) || (await getTodaysWorkout(uid));
      if (!workout) {
        res.status(404).json({ error: "No workout found" });
        return;
      }

      // 2. Build context for LLM
      const exerciseContext = workout.exercises
        .map(
          (ex, i) =>
            `${i + 1}. [ID: ${ex.id}] ${ex.name} — ${ex.sets} sets × ${ex.reps} reps`
        )
        .join("\n");

      const userPrompt = `Current workout plan:\n${exerciseContext}\n\nUser says: "${user_message}"`;

      // 3. Call Gemini with function calling
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [modifyWorkoutPlanDeclaration] }],
      });

      const result = await model.generateContent(userPrompt);
      const response = result.response;

      // 4. Extract function call from response
      let functionCall = null;
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.functionCall) {
            functionCall = part.functionCall;
            break;
          }
        }
        if (functionCall) break;
      }

      if (!functionCall || functionCall.name !== "modify_workout_plan") {
        // If Gemini didn't call the function, return a generic message
        const textResponse =
          response.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I hear you! Let me know more about how you're feeling so I can adjust your workout.";
        res.status(200).json({
          success: true,
          agent_message: textResponse,
          modified: false,
        });
        return;
      }

      // 5. Parse function call arguments
      const args = functionCall.args;
      const exercisesToRemove = args.exercises_to_remove || [];
      const exercisesToAdd = args.exercises_to_add || [];
      const agentMessage = args.agent_message || "Workout updated!";

      // 6. Update exercises array
      let updatedExercises = workout.exercises.filter(
        (ex) => !exercisesToRemove.includes(ex.id)
      );

      // Add new exercises with generated UUIDs
      const newExercises = exercisesToAdd.map((ex) => ({
        id: uuidv4(),
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        reasoning: ex.reasoning,
      }));

      updatedExercises = [...updatedExercises, ...newExercises];

      // 7. Write back to Firestore
      await db.collection("daily_workouts").doc(workout.id).update({
        exercises: updatedExercises,
      });

      console.log(
        `Workout ${workout.id} updated: removed ${exercisesToRemove.length}, added ${newExercises.length} exercises`
      );

      // 8. Return agent message to client
      res.status(200).json({
        success: true,
        agent_message: agentMessage,
        modified: true,
        removed_count: exercisesToRemove.length,
        added_count: newExercises.length,
      });
    } catch (error) {
      console.error("processWorkoutFeedback error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }
);
