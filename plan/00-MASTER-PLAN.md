# 00 — Master Execution Plan (For Gemini Flash)

> **Instructions for Gemini Flash:**
> Execute this plan phase by phase in order. Read the referenced specification file before each phase, and activate the workspace skills in `.agents/skills/` (`vite-pwa-cloudflare`, `chessground-chessjs-bridge`, `pgn-clock-exporter`) as needed.
> All application code MUST be created inside the subfolder:
> `e:/- CODE/Chess/otb-chess-recorder/`

---

## Project Overview
We are building **OTB Chess Recorder**, a mobile-first Offline-Capable Progressive Web App (PWA) built with **Vite + TypeScript + Tailwind CSS v4 + `@lichess-org/chessground` + `chess.js`**.

### Key Requirements
1. **Two-Player Move Input on One Device:** The user can record moves for both White and Black (or pass/leave the phone on the table for the opponent to tap/drag their move).
2. **Board Orientation Control:**
   - **NEVER rotate the board between moves by default** (`settings.autoRotate = false` by default).
   - Provide a **Flip Board** button (manual 180° flip of perspective) and an optional **Auto-Rotate** toggle inside Settings.
3. **Automatic Per-Move & Overall Time Tracking:**
   - **Stopwatch Mode (Default):** Starts automatically on Move 1 (or when tapping Start Clock). Tracks elapsed thinking time per move (`emtMs`) and cumulative time per side (`whiteClkMs`, `blackClkMs`) plus overall game duration.
   - **Countdown Clock Mode (Optional Presets & Custom):** Supports presets like `3+0`, `3+2`, `5+0`, `5+3`, `10+0`, `10+5`, `15+10`, `30+0`, or custom minutes + increment. Automatically switches clocks and applies Fischer increment the instant a move is made on the board.
4. **Full OTB Feature Set:**
   - **Pawn Promotion Picker Modal:** Intercepts pawn promotion moves to choose Queen, Rook, Bishop, or Knight before committing the move.
   - **Undo / Redo & History Scrubbing:** Navigate backward/forward (`|<`, `<`, `>`, `>|`) through the move list, or **Undo** the last move (restoring or continuing clock state cleanly).
   - **Custom Starting Position / FEN Setup:** Start a new game from standard position or paste/edit a custom FEN string (with validation).
   - **Game Archive & Metadata:** Auto-saves the active game on every move to `localStorage`. Lets the user edit metadata (White name, Black name, Event, Round, Result `1-0` / `0-1` / `1/2-1/2` / `*`) and save/load games from a local Game Archive list.
   - **Screen Wake Lock & Offline PWA:** Keeps the phone screen awake during an active OTB game (`navigator.wakeLock`) and caches all assets via Service Worker for 100% offline use.
5. **Export & Analysis Integration:**
   - Generates standard PGN with embedded `{[%clk H:MM:SS] [%emt S.S]}` tags on every move.
   - **Analyze on Lichess (1-Tap):** Sends PGN to `POST https://lichess.org/api/import` and opens the resulting Lichess analysis board URL directly.
   - **Analyze on Chess.com (1-Tap):** Copies the annotated PGN to the clipboard (synchronously before `window.open` to avoid mobile popup blockers), displays a helper toast, and opens `https://www.chess.com/analysis?tab=analysis`.
   - **Copy PGN / Share / Download `.pgn` file.**

---

## Target Directory Structure (`e:/- CODE/Chess/otb-chess-recorder/`)

```text
otb-chess-recorder/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── favicon.svg
└── src/
    ├── main.ts            # App entry point, UI binding, modal controllers
    ├── style.css          # Tailwind v4 + Chessground CSS + custom mobile layout rules
    ├── types.ts           # All TypeScript interfaces (MoveRecord, SavedGame, ClockConfig, Settings)
    ├── clocks.ts          # High-precision requestAnimationFrame / timestamp delta clock engine
    ├── game-state.ts      # chess.js wrapper, move execution, Undo/Redo, FEN setup
    ├── board.ts           # @lichess-org/chessground wrapper, legal dests, promotion check, orientation
    ├── pgn-export.ts      # PGN builder with [%clk] & [%emt], Lichess API import, Chess.com launch
    ├── storage.ts         # localStorage auto-save for active game, saved game archive, settings
    └── wake-lock.ts       # Screen Wake Lock API manager with visibilitychange re-acquisition
```

---

## Step-by-Step Execution Checklist for Gemini Flash

### Phase 1: Project Scaffolding & Configuration
- [ ] Read [`plan/01-PROJECT-SETUP.md`](./01-PROJECT-SETUP.md) and skill `vite-pwa-cloudflare`.
- [ ] Create `otb-chess-recorder/package.json`, `otb-chess-recorder/tsconfig.json`, `otb-chess-recorder/vite.config.ts`, `otb-chess-recorder/public/favicon.svg`, `otb-chess-recorder/index.html`, and `otb-chess-recorder/src/style.css`.

### Phase 2: Data Models, Clock Engine & Core Chess State
- [ ] Read [`plan/02-CORE-STATE-AND-CLOCKS.md`](./02-CORE-STATE-AND-CLOCKS.md).
- [ ] Create `otb-chess-recorder/src/types.ts`.
- [ ] Create `otb-chess-recorder/src/clocks.ts` (Stopwatch + Countdown with increment, pause/resume, per-move `emtMs` measurement).
- [ ] Create `otb-chess-recorder/src/game-state.ts` (`chess.js` state manager, move history with timestamps, Undo/Redo, custom FEN loader).
- [ ] Create `otb-chess-recorder/src/storage.ts` (`localStorage` persistence for active session, game archive, and user settings).
- [ ] Create `otb-chess-recorder/src/wake-lock.ts`.

### Phase 3: Chessground Board UI & Promotion Handling
- [ ] Read [`plan/03-BOARD-AND-UI.md`](./03-BOARD-AND-UI.md) and skill `chessground-chessjs-bridge`.
- [ ] Create `otb-chess-recorder/src/board.ts` (Chessground initialization, legal moves map, fixed orientation vs optional `autoRotate`, manual flip, promotion modal trigger).

### Phase 4: PGN Export, Lichess API & Chess.com Integration
- [ ] Read [`plan/04-EXPORT-AND-DEPLOYMENT.md`](./04-EXPORT-AND-DEPLOYMENT.md) and skill `pgn-clock-exporter`.
- [ ] Create `otb-chess-recorder/src/pgn-export.ts` (PGN generator with `[%clk]` and `[%emt]` tags, Lichess `POST /api/import`, Chess.com clipboard + tab open, Web Share API, `.pgn` file download).

### Phase 5: Main Controller, Modals & Build Verification
- [ ] Create `otb-chess-recorder/src/main.ts` wiring together the board, clocks, move list table, control bar, New Game / FEN modal, Export / Analysis modal, Archive drawer, and Settings modal.
- [ ] Run `npm install` inside `otb-chess-recorder/`.
- [ ] Run `npm run build` inside `otb-chess-recorder/` and verify zero TypeScript or Vite bundling errors.
