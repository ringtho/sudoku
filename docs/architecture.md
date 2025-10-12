# Multiplayer Sudoku App – Architecture Overview

## Vision
Create a delightful multiplayer Sudoku experience that feels responsive, collaborative, and welcoming. Players authenticate with Google, land in a lobby to find or create game rooms, and then co-edit Sudoku boards in real time with presence indicators, turn guidance, and guardrails that respect Sudoku rules.

## Core Capabilities
- **Authentication** – Google OAuth via Firebase Authentication.
- **Lobby & Rooms** – Firestore collections for lobby discovery, room metadata, and per-room membership tracking.
- **Realtime Board State** – Firestore document mirroring the Sudoku puzzle, metadata (difficulty, createdBy), and per-cell history.
- **Presence** – Lightweight heartbeat documents inside each room to show who is online, cursors, and locked cells.
- **Game Logic** – Deterministic Sudoku generator/solver in-browser; conflict validation on both client and server rules.
- **UX Enhancements** – Responsive design, keyboard navigation, cell highlighting, error hints, timers, scoreboards, and celebratory states.

## High-Level Architecture
```
app/
 ├─ root.tsx                     // Root layout & providers
 ├─ routes/
 │   ├─ home.tsx                 // Marketing landing page
 │   ├─ login.tsx                // Google sign-in page/redirect
 │   ├─ lobby.tsx                // Room discovery & creation
 │   ├─ room.$roomId.tsx         // Live board experience
 │   └─ settings.tsx             // Profile & preferences
 ├─ components/
 │   ├─ sudoku/Board.tsx         // Visual 9x9 grid
 │   ├─ sudoku/Cell.tsx          // Single cell interactions
 │   ├─ sudoku/NumberPad.tsx     // Quick-select keypad
 │   ├─ layout/AppShell.tsx      // Shared nav + layout chrome
 │   └─ ui/*                     // Button, Card, Modal primitives
 ├─ contexts/
 │   ├─ AuthContext.tsx          // Firebase auth state
 │   ├─ LobbyContext.tsx         // Lobby data & operations
 │   └─ RoomContext.tsx          // Current room + board state
 ├─ libs/
 │   ├─ firebase.ts              // Firebase initialization
 │   └─ sudoku.ts                // Generator, solver, validators
 ├─ hooks/
 │   ├─ useSudokuActions.ts      // Logic for cell edits & validation
 │   └─ usePresence.ts           // Track collaborator cursors/locks
 ├─ styles/                      // Tailwind extensions as needed
 └─ utils/                       // Common helpers
```

## Data Model (Firestore)
```
users/{uid}
  displayName
  photoUrl
  createdAt

rooms/{roomId}
  name
  ownerUid
  difficulty
  status: "waiting" | "active" | "completed"
  createdAt
  puzzle: string   // 81-char puzzle seed
  solution: string // 81-char solution
  board: number[]  // Current state

rooms/{roomId}/members/{uid}
  displayName
  joinedAt
  color
  cursorIndex
  lastActive

rooms/{roomId}/events/{eventId}
  type: "move" | "chat" | "system"
  payload
  createdAt
  actorUid
```

## Application State Flow
1. **Bootstrapping**
   - `root.tsx` mounts `FirebaseProvider`, `AuthProvider`, and passes session info through context.
   - Routes that require auth use route loaders (React Router) to redirect unauthenticated users.

2. **Lobby Interactions**
   - Lobby fetches `rooms` collection with query constraints (open rooms, active rooms).
   - Creating a room triggers Sudoku generator, writes puzzle/board, and adds creator to members subcollection.

3. **Joining Rooms**
   - On join, add/update `members/{uid}` doc with presence info.
   - Subscribe (`onSnapshot`) to room doc for board state, and to members to render avatars & cursors.

4. **Playing Sudoku**
   - `useSudokuActions` validates moves locally, optimistic update UI, then writes to Firestore board state.
   - Conflict resolution strategy: last write wins, but invalid moves revert with toast + highlight.
   - Optional: implement transaction or Cloud Function for authoritative validation (future work).

5. **Presence & Activity**
   - `usePresence` updates `lastActive` via `onDisconnect` equivalent using Firestore TTL (or periodic updates).
   - Maintain cell lock map to prevent simultaneous edits (short-lived Firestore doc or local heuristics).

## Styling & UX
- Tailwind CSS + design tokens in `app/app.css`.
- Dark mode support via `prefers-color-scheme` with manual toggle persisted in local storage.
- Responsive grid using CSS variables; ensure accessibility (contrast, focus states, ARIA labels).
- Animations via Tailwind transitions + keyframes for success states.

## Implementation Roadmap
1. **Foundation**
   - Install Firebase SDK, configure env vars, create `FirebaseProvider`.
   - Replace welcome screen with new landing page & navigation shell.
   - Build auth guard and login route.
2. **Lobby & Rooms**
   - Data hooks for listing rooms, creating/joining, and presence updates.
   - UI cards for rooms, modals for creation & difficulty selection.
3. **Sudoku Engine**
   - Implement generator/solver utilities with tests.
   - Build board UI (cells, number pad, candidate notes, error states).
4. **Realtime Collaboration**
   - Wire Firestore subscriptions for board, members, events.
   - Presence avatars, typing indicators, undo/redo log.
5. **Polish**
   - Animations, toasts, sound cues, share links, end-of-game summary, responsive improvements.
- Continuous: add unit tests for sudoku logic, integration tests for lobby flows (Playwright or Cypress).

## Environment & Configuration
- Expected env vars:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_MEASUREMENT_ID` (optional)
- Provide `.env.example` with placeholders and update README with setup instructions.

## Future Enhancements
- Cloud Functions for rule validation and advanced cheating prevention.
- Matchmaking, ELO-style rankings, and achievements.
- Voice chat integration or emoji reactions.
- Mobile-native wrapper via Capacitor or React Native Web compatibility.

