# 02 — Core State, Clock Engine, Storage & Wake Lock Specification

> **Target Folder:** `e:/- CODE/Chess/otb-chess-recorder/src/`

---

## 1. `src/types.ts`
Define all shared types cleanly:

```ts
export type ClockMode = 'stopwatch' | 'countdown';

export interface ClockConfig {
  mode: ClockMode;
  initialMinutes: number;    // Used when mode === 'countdown' (e.g., 10)
  incrementSeconds: number;  // Fischer increment per move in seconds (e.g., 0, 2, 3, 5)
}

export interface MoveRecord {
  ply: number;               // 1-indexed half-move (1 = White's 1st move, 2 = Black's 1st move)
  moveNumber: number;        // 1, 1, 2, 2, ...
  color: 'w' | 'b';
  san: string;               // Standard Algebraic Notation, e.g., "Nf3", "O-O", "e8=Q+"
  from: string;              // e.g., "g1"
  to: string;                // e.g., "f3"
  promotion?: 'q' | 'r' | 'b' | 'n';
  fenBefore: string;
  fenAfter: string;
  emtMs: number;             // Elapsed Move Time in milliseconds spent thinking on this move
  whiteClkMs: number;        // White's clock reading (ms) immediately after this move
  blackClkMs: number;        // Black's clock reading (ms) immediately after this move
  timestamp: number;         // Epoch ms when move was played
}

export interface GameMetadata {
  id: string;
  event: string;
  site: string;
  date: string;              // YYYY.MM.DD format for PGN
  round: string;
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  termination?: string;
  initialFen: string;        // Standard start FEN or custom FEN
  clockConfig: ClockConfig;
  createdAt: number;
  updatedAt: number;
}

export interface SavedGame {
  metadata: GameMetadata;
  moves: MoveRecord[];
  whiteTimeMs: number;
  blackTimeMs: number;
  overallElapsedMs: number;
}

export interface AppSettings {
  autoRotate: boolean;       // MUST default to false!
  wakeLockEnabled: boolean;  // Default true
  soundEnabled: boolean;     // Default true
  includeClockInPgn: boolean;// Default true
}
```

---

## 2. `src/clocks.ts` — High-Precision Move & Overall Timer Engine
Requirements for the clock engine:
- Uses `performance.now()` or `Date.now()` deltas on a `100ms` interval so backgrounding the tab or slight frame drops never cause clock drift.
- Tracks:
  1. `whiteTimeMs`: In `'stopwatch'` mode, starts at `0` and counts **UP** while it is White's turn. In `'countdown'` mode, starts at `initialMinutes * 60_000` and counts **DOWN** while it is White's turn.
  2. `blackTimeMs`: Same for Black.
  3. `currentMoveElapsedMs`: Resets to `0` at the start of each turn and counts **UP** (`emtMs`), measuring exactly how long the active player spent thinking on the current move.
  4. `overallElapsedMs`: Total active game time (`whiteElapsed + blackElapsed` or wall-clock active time while unpaused).
- **Lifecycle Behavior:**
  - Before the first move is made (`ply === 0`), the clock is in `'ready'` state. As soon as White makes Move 1 (or if the user taps the Play/Pause clock button before Move 1), the clock transitions to `'running'`.
  - When `recordMove(moverColor: 'w' | 'b')` is called:
    - Captures `emtMs = this.currentMoveElapsedMs` for the move just completed.
    - If `mode === 'countdown'` and the clock was running, adds `incrementSeconds * 1000` to the mover's remaining time.
    - Resets `currentMoveElapsedMs = 0` and switches active side to the opponent.
    - Returns `{ emtMs, whiteClkMs: this.whiteTimeMs, blackClkMs: this.blackTimeMs }`.
  - When **Undo** is called:
    - Restores `whiteTimeMs` and `blackTimeMs` to the snapshot from the previous `MoveRecord` (or initial state if back at ply 0), resets `currentMoveElapsedMs = 0`, and keeps the clock running (or paused if it was paused).
  - If a player hits `0ms` in `'countdown'` mode:
    - Emits `onFlag('w' | 'b')` callback and pauses the clock.

Provide helper formatting functions in `src/clocks.ts`:
- `formatDisplayClock(ms: number, showTenthsWhenLow = true): string`
  - Formats `H:MM:SS` if `>= 1 hour`, `MM:SS` otherwise, and `MM:SS.d` when in countdown mode under 20 seconds.
- `formatShortEmt(ms: number): string`
  - Formats move time cleanly for the move list badge: e.g., `2.4s`, `45s`, `1m 12s`.

---

## 3. `src/game-state.ts` — Chess.js Move & History Manager
Manages:
- An instance of `Chess` from `chess.js`.
- `moves: MoveRecord[]` — the canonical list of recorded moves.
- `viewPly: number` — which ply is currently displayed on the board (`0` = initial position, `moves.length` = live position).
  - When `viewPly < moves.length`, the user is **inspecting history** (board is read-only; a banner or highlight shows they are viewing an earlier move, and clicking "Resume / Jump to Live" or `>|` returns to `viewPly = moves.length`).
- **Key Methods:**
  - `initNewGame(options)`: Resets `Chess` to standard FEN or a validated custom `initialFen`. Validates custom FEN using `validateFen(fen)` from `chess.js` before starting.
  - `makeMove(from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n')`:
    - Executes move in `chess.js`.
    - Queries `clockEngine.commitMove(moverColor)` to get `{ emtMs, whiteClkMs, blackClkMs }`.
    - Pushes a new `MoveRecord` to `this.moves`.
    - Checks if `chess.isGameOver()` (Checkmate → `1-0` or `0-1`, Stalemate / Threefold / Insufficient Material / 50-move → `1/2-1/2`) and automatically updates `metadata.result`, `metadata.termination`, and stops the clock!
  - `undoLastMove()`:
    - Pops the last `MoveRecord` from `this.moves`.
    - Reconstructs board state to the new tip FEN (`moves[moves.length - 1]?.fenAfter ?? metadata.initialFen`).
    - Restores clock times to the new tip move's `whiteClkMs` / `blackClkMs` (or initial clock values if `moves.length === 0`).
  - `goToPly(ply: number)`:
    - Clamps `ply` between `0` and `this.moves.length`.
    - Sets `this.viewPly = ply`.
    - Returns the FEN and `lastMove` coordinates at `viewPly` so the board renders that historical position without losing the live game.

---

## 4. `src/storage.ts` — LocalStorage Auto-Save & Archive
Keys:
- `otb_chess_active_game_v1`: Auto-saved after every move, undo, metadata edit, or clock pause. Restored automatically when the app opens!
- `otb_chess_archive_v1`: Array of `SavedGame` objects (up to 100 games, newest first).
- `otb_chess_settings_v1`: `AppSettings` object (`autoRotate: false`, `wakeLockEnabled: true`, `soundEnabled: true`, `includeClockInPgn: true`).

---

## 5. `src/wake-lock.ts` — Screen Wake Lock Manager + Move Sound Synthesis
- Implements `WakeLockManager` using `navigator.wakeLock.request('screen')` and re-requests on `document.visibilitychange`.
- Also include a lightweight Web Audio API sound synthesizer (`playMoveSound(type: 'move' | 'capture' | 'check' | 'gameEnd')`) using short oscillator/noise clicks so the app needs zero external `.mp3` files and gives crisp tactile audio feedback when making OTB moves.
