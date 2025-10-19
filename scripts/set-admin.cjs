const admin = require("firebase-admin");

const uid = process.argv[2];
const explicitProjectId = process.argv[3];

if (!uid) {
  console.error("Usage: node scripts/set-admin.cjs <uid> [projectId]");
  process.exit(1);
}

const inferProjectId = () => {
  if (explicitProjectId) return explicitProjectId;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const config = JSON.parse(process.env.FIREBASE_CONFIG);
      if (config.projectId) return config.projectId;
    } catch (error) {
      console.warn("Warning: Failed to parse FIREBASE_CONFIG env", error);
    }
  }
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.VITE_FIREBASE_PROJECT_ID) return process.env.VITE_FIREBASE_PROJECT_ID;
  return null;
};

const projectId = inferProjectId();

if (!projectId) {
  console.error(
    "Unable to determine Firebase project ID. Pass it explicitly: node scripts/set-admin.cjs <uid> <projectId>",
  );
  process.exit(1);
}

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || projectId;
process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || projectId;

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});

admin
  .auth()
  .setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ admin claim granted to ${uid} on project ${projectId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to set admin claim", error);
    process.exit(1);
  });
