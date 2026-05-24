const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");

const modifyWorkoutPlanDeclaration = {
  name: "modify_workout_plan",
  description:
    "Modifies the user's current workout array based on pain, fatigue, time, equipment availability, or coaching needs.",
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
            name: { type: "STRING" },
            sets: { type: "NUMBER" },
            reps: { type: "STRING" },
            reasoning: { type: "STRING" },
          },
          required: ["name", "sets", "reps", "reasoning"],
        },
      },
      agent_message: {
        type: "STRING",
      },
    },
    required: ["exercises_to_remove", "exercises_to_add", "agent_message"],
  },
};

const createWorkoutPlanDeclaration = {
  name: "create_workout_plan",
  description: "Creates today's complete workout from the user's profile and recent training history.",
  parameters: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      focus: { type: "STRING" },
      agent_summary: { type: "STRING" },
      generation_reason: { type: "STRING" },
      exercises: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            sets: { type: "NUMBER" },
            reps: { type: "STRING" },
            reasoning: { type: "STRING" },
          },
          required: ["name", "sets", "reps", "reasoning"],
        },
      },
      agent_message: { type: "STRING" },
    },
    required: ["title", "focus", "agent_summary", "generation_reason", "exercises", "agent_message"],
  },
};

const MODIFY_SYSTEM_INSTRUCTION = `You are IronAgent, an autonomous personal training agent.

You may create, remove, reorder, and replace exercises to keep the user training productively and safely.
Choose the action based on severity:
- Mild discomfort, low energy, time limits, or equipment issues: modify the workout.
- Moderate pain, fatigue, or soreness: reduce risky loading, swap movements, and add a caution.
- Severe, sharp, radiating, numbness, chest pain, dizziness, or suspected injury: stop the session and avoid risky alternatives.

When modifying, preserve the training intent and explain the adjustment briefly.`;

const GENERATE_SYSTEM_INSTRUCTION = `You are IronAgent, an autonomous personal training agent.

Create today's workout using the user's profile, available equipment, constraints, and recent history.
The plan must be practical for the requested session length, specific, and safe. Include 4-6 exercises unless the session length is short.
Each exercise needs sets, reps, and a concise coaching reason.`;

function classifySeverity(message = "") {
  const text = message.toLowerCase();
  const severe = [
    "sharp pain",
    "shooting pain",
    "radiating",
    "numb",
    "tingling",
    "dizzy",
    "chest pain",
    "can't move",
    "cannot move",
    "injury",
    "torn",
  ];
  const moderate = ["pain", "hurt", "stiff", "sore", "terrible sleep", "exhausted", "fatigue"];

  if (severe.some((term) => text.includes(term))) return "severe";
  if (moderate.some((term) => text.includes(term))) return "moderate";
  return "mild";
}

function extractFunctionCall(response, expectedName) {
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.functionCall?.name === expectedName) {
        return part.functionCall;
      }
    }
  }
  return null;
}

function normalizeExercise(exercise) {
  return {
    id: uuidv4(),
    name: String(exercise.name || "Accessory Movement").slice(0, 80),
    sets: Number(exercise.sets) || 3,
    reps: String(exercise.reps || "8-12").slice(0, 30),
    reasoning: String(exercise.reasoning || "Selected to match today's training goal.").slice(0, 240),
    completedSets: [],
  };
}

function fallbackWorkout(profile = {}) {
  const equipment = Array.isArray(profile.equipment) ? profile.equipment.join(", ") : "available equipment";
  return {
    title: "Adaptive Strength Session",
    focus: profile.goal || "General fitness",
    agent_summary: `Built around ${profile.goal || "your goal"} using ${equipment}.`,
    generation_reason: "Fallback plan generated because the AI provider did not return a structured plan.",
    exercises: [
      normalizeExercise({ name: "Goblet Squat", sets: 3, reps: "8-12", reasoning: "Lower-body compound with controllable loading." }),
      normalizeExercise({ name: "Dumbbell Bench Press", sets: 3, reps: "8-12", reasoning: "Stable press pattern for chest and triceps." }),
      normalizeExercise({ name: "Seated Cable Row", sets: 3, reps: "10-12", reasoning: "Back volume with low setup complexity." }),
      normalizeExercise({ name: "Romanian Deadlift", sets: 3, reps: "8-10", reasoning: "Posterior-chain work with moderate volume." }),
    ],
    agent_message: "I built a balanced session from your profile. Tell me how you feel and I will adjust it.",
  };
}

class GeminiAgentProvider {
  getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw Object.assign(new Error("GEMINI_API_KEY is not configured for Cloud Functions."), {
        status: 500,
      });
    }

    return new GoogleGenerativeAI(apiKey);
  }

  async generateWorkout({ profile, recentWorkouts }) {
    const model = this.getClient().getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: GENERATE_SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [createWorkoutPlanDeclaration] }],
    });

    const prompt = [
      `User profile: ${JSON.stringify(profile || {})}`,
      `Recent workouts: ${JSON.stringify((recentWorkouts || []).slice(0, 5))}`,
      "Create today's workout now.",
    ].join("\n\n");

    const result = await model.generateContent(prompt);
    const functionCall = extractFunctionCall(result.response, "create_workout_plan");
    if (!functionCall) {
      return fallbackWorkout(profile);
    }

    const args = functionCall.args || {};
    return {
      title: args.title,
      focus: args.focus,
      agent_summary: args.agent_summary,
      generation_reason: args.generation_reason,
      exercises: (args.exercises || []).map(normalizeExercise).slice(0, 8),
      agent_message: args.agent_message,
    };
  }

  async modifyWorkout({ workout, userMessage }) {
    const severity = classifySeverity(userMessage);

    if (severity === "severe") {
      return {
        severity,
        modified: false,
        stopSession: true,
        exercisesToRemove: [],
        newExercises: [],
        updatedExercises: workout.exercises || [],
        agentMessage:
          "That sounds potentially serious. Stop this session for now, avoid loading the painful area, and consider professional medical guidance before training through it.",
      };
    }

    const exerciseContext = (workout.exercises || [])
      .map((ex, i) => `${i + 1}. [ID: ${ex.id}] ${ex.name} - ${ex.sets} sets x ${ex.reps} reps`)
      .join("\n");

    const model = this.getClient().getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: MODIFY_SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [modifyWorkoutPlanDeclaration] }],
    });

    const result = await model.generateContent(
      `Severity: ${severity}\n\nCurrent workout plan:\n${exerciseContext}\n\nUser says: "${userMessage}"`
    );
    const functionCall = extractFunctionCall(result.response, "modify_workout_plan");

    if (!functionCall) {
      return {
        severity,
        modified: false,
        stopSession: false,
        exercisesToRemove: [],
        newExercises: [],
        updatedExercises: workout.exercises || [],
        agentMessage:
          "I hear you. Keep the next sets conservative and tell me where you feel the limitation so I can adjust the plan more precisely.",
      };
    }

    const args = functionCall.args || {};
    const existingIds = new Set((workout.exercises || []).map((exercise) => exercise.id));
    const exercisesToRemove = (args.exercises_to_remove || []).filter((id) => existingIds.has(id));
    const newExercises = (args.exercises_to_add || []).map(normalizeExercise);
    const updatedExercises = [
      ...(workout.exercises || []).filter((exercise) => !exercisesToRemove.includes(exercise.id)),
      ...newExercises,
    ];

    return {
      severity,
      modified: exercisesToRemove.length > 0 || newExercises.length > 0,
      stopSession: false,
      exercisesToRemove,
      newExercises,
      updatedExercises,
      agentMessage: args.agent_message || "Workout updated.",
    };
  }
}

module.exports = {
  classifySeverity,
  createAgentProvider() {
    return new GeminiAgentProvider();
  },
};
