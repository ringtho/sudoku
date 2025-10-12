# Sudoku Together

Multiplayer Sudoku for date nights, game nights, and friendly rivalries. Authenticate with Google, discover or create rooms, and co-edit puzzles with real-time presence.

## Features

- 🔐 Google sign-in powered by Firebase Authentication.
- 🧩 Realtime Sudoku boards synced via Firestore (with offline persistence in production).
- 🫶 Presence indicators, cell selection, and number pad interactions.
- 🏡 Lobby view to browse and join rooms.
- 🎨 Tailwind-powered UI with dark mode toggle and responsive layouts.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project (web app).
2. Enable **Authentication** → **Sign-in method** → **Google**.
3. Enable **Firestore Database** in production mode.
4. Copy your config values into a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update `.env` with your Firebase keys:

```
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_MEASUREMENT_ID="..."
```

> Tip: when running locally (e.g., `localhost:5173`), add that origin to Firebase's authorized domains.

### 3. Apply security rules (recommended)

If you have the Firebase CLI installed:

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

The repo ships with opinionated rules in `firestore.rules` that restrict writes to authenticated room members.

### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:5173` and sign in with Google.

## Project Structure

- `app/root.tsx` – global providers, layout shell, dark mode toggle.
- `app/routes/*` – React Router file-based routes (home, lobby, rooms, room detail).
- `app/contexts/AuthContext.tsx` – wraps Firebase auth state and actions.
- `app/libs/firebase.ts` – Firebase initialization helper.
- `app/libs/rooms.ts` – Firestore helpers for rooms, members, and presence.
- `app/hooks/useSudokuGame.ts` – local Sudoku engine, notes, conflicts, keyboard handling.
- `app/components/sudoku/*` – board, cells, number pad, and overall game panel.
- `docs/architecture.md` – high-level blueprint and roadmap.

## Commands

```bash
npm run dev        # Start the dev server
npm run build      # Production bundle
npm run start      # Serve the production build
npm run typecheck  # Generate route types & run TypeScript
```

## Deployment

Build the app first:

```bash
npm run build
```

The output lives in `build/`. You can deploy the server bundle with Node (`npm run start`) or host the client bundle separately if you implement a custom backend.

Docker users can build/run using the provided `Dockerfile`.

## Roadmap

- Firestore security rules & validation functions.
- Realtime chat, reactions, and celebration effects.
- Difficulty selector + Sudoku generator tuning.
- Mobile-first polish & accessibility upgrades.

Built with ❤️ using React Router, Vite, and Firebase.
