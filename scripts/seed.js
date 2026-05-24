/**
 * Seed script for IronAgent demo.
 * Uses Firestore REST API with gcloud access token for authentication.
 *
 * Usage:
 *   node scripts/seed.js
 */

const https = require("https");
const { execSync } = require("child_process");

const PROJECT_ID = "gymai-a07c0";
const DEMO_UID = "demo-user-001";

// Get access token from gcloud
function getAccessToken() {
  const token = execSync("gcloud auth print-access-token", { encoding: "utf-8" }).trim();
  return token;
}

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const exerciseTemplates = {
  back_biceps: [
    { name: "Barbell Deadlift", sets: 5, reps: "5", reasoning: "Heavy compound — the king of back exercises for maximum posterior chain recruitment." },
    { name: "Barbell Bent-Over Rows", sets: 4, reps: "8-10", reasoning: "Horizontal pull to build thickness across the lats and rhomboids." },
    { name: "Pull-ups", sets: 4, reps: "To failure", reasoning: "Vertical pull for lat width. Bodyweight to failure maximizes motor unit recruitment." },
    { name: "Heavy Dumbbell Hammer Curls", sets: 4, reps: "10", reasoning: "Targets brachioradialis and biceps long head for forearm and arm mass." },
  ],
  chest_triceps: [
    { name: "Barbell Bench Press", sets: 5, reps: "5", reasoning: "The primary chest compound for building pressing strength and pec mass." },
    { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", reasoning: "Upper chest focus at 30-45° angle for balanced pectoral development." },
    { name: "Cable Flyes", sets: 3, reps: "12-15", reasoning: "Constant tension isolation for chest squeeze and mind-muscle connection." },
    { name: "Tricep Rope Pushdowns", sets: 4, reps: "12", reasoning: "Lateral head emphasis with rope split for tricep definition." },
  ],
  legs: [
    { name: "Barbell Back Squat", sets: 5, reps: "5", reasoning: "King of leg exercises — full quad, glute, and core recruitment." },
    { name: "Romanian Deadlift", sets: 4, reps: "8-10", reasoning: "Hamstring and glute dominant hinge for posterior chain balance." },
    { name: "Leg Press", sets: 4, reps: "12", reasoning: "High-volume quad work without spinal loading." },
    { name: "Standing Calf Raises", sets: 4, reps: "15", reasoning: "Direct gastrocnemius work with full stretch and contraction." },
  ],
  shoulders: [
    { name: "Overhead Press", sets: 5, reps: "5", reasoning: "Primary shoulder compound for deltoid strength and size." },
    { name: "Dumbbell Lateral Raises", sets: 4, reps: "12-15", reasoning: "Medial delt isolation for shoulder width and capped look." },
    { name: "Face Pulls", sets: 4, reps: "15", reasoning: "Rear delt and rotator cuff health — essential for shoulder longevity." },
    { name: "Arnold Press", sets: 3, reps: "10", reasoning: "Rotational press hitting all three delt heads in one movement." },
  ],
};

const workoutTypes = ["back_biceps", "chest_triceps", "legs", "shoulders", "back_biceps", "chest_triceps", "back_biceps"];

function makeRequest(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed.error || parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function toFirestoreValue(val) {
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "boolean") return { booleanValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object" && val !== null) {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function buildFirestoreDoc(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

async function seed() {
  console.log("🌱 Starting IronAgent seed...\n");
  
  console.log("🔑 Getting access token from gcloud...");
  const token = getAccessToken();
  console.log("   ✅ Token acquired\n");

  // 1. Create demo user
  console.log("👤 Creating demo user...");
  const userDoc = buildFirestoreDoc({
    uid: DEMO_UID,
    current_status: "Fresh start, feeling good",
    goal: "Hypertrophy",
  });

  await makeRequest(
    "PATCH",
    `${FIRESTORE_BASE}/users/${DEMO_UID}`,
    userDoc,
    token
  );
  console.log("   ✅ User created: " + DEMO_UID);

  // 2. Seed 7 days of workouts
  console.log("\n📋 Seeding 7 days of workouts...");
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const workoutType = workoutTypes[6 - i];
    const isToday = i === 0;
    const status = isToday ? "in-progress" : "completed";

    const exercises = exerciseTemplates[workoutType].map((ex, idx) => ({
      id: `ex-${String(6 - i + 1).padStart(2, "0")}-${String(idx + 1).padStart(2, "0")}`,
      name: ex.name,
      sets: ex.sets + (i % 2 === 0 ? 0 : 1),
      reps: ex.reps,
      reasoning: ex.reasoning,
    }));

    const workoutDoc = buildFirestoreDoc({
      uid: DEMO_UID,
      date: date,
      status: status,
      exercises: exercises,
    });

    await makeRequest(
      "POST",
      `${FIRESTORE_BASE}/daily_workouts`,
      workoutDoc,
      token
    );

    const dayName = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    console.log(`   ✅ ${dayName} — ${workoutType.replace(/_/g, " & ")} (${exercises.length} exercises, ${status})`);
  }

  console.log("\n🎉 Seed complete! Your demo is ready.");
  console.log("\n📌 Demo user UID: " + DEMO_UID);
  console.log("📌 Today's workout: Back & Biceps (in-progress)");
  console.log("\n💡 Test with: \"I slept terribly. My lower back is stiff and my forearms are fried.\"");
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error.message);
  process.exit(1);
});
