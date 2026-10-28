# 05 — V2 Plan: Desktop Responsive UI, High-Contrast Controls, Shareable Links & Deployment

> **Instructions for Gemini Flash:**
> Read [`design.md`](../design.md) and the skills `responsive-chess-ui-ergonomics` and `url-pgn-sharing-and-supabase` before executing this plan.

---

## 1. Root Cause Analysis of V1 Issues (Seen in Desktop Screenshot)
1. **Board Did Not Stretch to Screen Size on Desktop:**
   - In V1 `src/style.css`, `#chessground-board` used `width: min(94vw, 48vh, 460px);`, which forced the board to a tiny `460px` square even on a large desktop monitor.
   - **Fix:** Replace with CSS custom property `--board-size`:
     - Mobile (`< 768px`): `min(95vw, calc(100dvh - 235px))`
     - Desktop (`>= 768px`): `min(62vw, calc(100dvh - 150px), 760px)` so the board fills the vertical desktop height cleanly!
2. **Buttons Were Small & Hard to Read ("White on Light Blue Background"):**
   - In V1 `index.html` and `src/main.ts`, controls used OS system emoji (`🔄`, `⏸️`, `▶️`, `⚙️`, `💾`, `📋`). On Windows/Chrome, Segoe UI Emoji renders `🔄` and `⏸️` as white symbols inside a light-blue 3D square!
   - **Fix:** Strip all system emoji from UI controls. Replace with crisp inline `<svg>` icons (`stroke="currentColor"`) + explicit text labels (`Flip`, `Pause` / `Start`, `Undo`, `Export PGN`), with `min-h-[42px]` (`px-3.5 py-2 text-sm font-semibold`) and high-contrast dark (`bg-zinc-800 text-zinc-100`) or amber (`bg-amber-500 text-zinc-950`) backgrounds.
3. **Prominent Export Button & Archive Export:**
   - Add a prominent **Export / Analyze** button right inside the bottom control bar (next to Undo & Result) so users don't have to hunt in the top-right corner on a wide monitor.
   - Add an **Export** button directly on every saved game card inside the **Archive** modal.
4. **Cross-Session / Cross-Person Sharing (`?pgn=...` URL Parameter):**
   - Because `localStorage` is browser-local, add a **"Copy Shareable Game Link"** button in the Export modal that encodes the full game PGN (with clock tags) into `?pgn=...` in the URL. When another person opens that link, `src/main.ts` automatically parses and loads the game and move times onto their board!

---

## 2. Step-by-Step Execution Tasks

### Task 1: Upgrade `otb-chess-recorder/src/style.css`
- Define `--board-size` for mobile (`min(95vw, calc(100dvh - 235px))`) and desktop (`min(62vw, calc(100dvh - 150px), 760px)`).
- Set `#chessground-board` to `width: var(--board-size); height: var(--board-size);`.
- Set `.player-bar-shell` to `width: var(--board-size);`.

### Task 2: Upgrade `otb-chess-recorder/index.html` & `otb-chess-recorder/src/main.ts`
- Replace all emoji icons (`🔄`, `⏸️`, `▶️`, `⚙️`, `💾`, `📋`, `🔗`, `⚔️`, `♟️`) with clean inline SVGs + readable text labels.
- Enlarge all bottom bar and header buttons (`min-h-[42px] px-3.5 py-2 text-sm font-semibold`).
- Add a primary **Export PGN** button (`#btn-export-bottom`) directly in the bottom control bar alongside Flip, Pause/Start, Prev/Next, Undo, and Result.
- Add **Export** button inside each saved game row in the Archive modal.
- Add **Copy Shareable Game Link (`?pgn=...`)** button in the Export modal and auto-load `?pgn=` on startup.

### Task 3: Build & Deploy Under `viktorenns.de/chessmoves` + Portfolio Card
- Build `otb-chess-recorder` (`npm run build`) and copy the production build into `e:/- CODE/VEwebsite/chessmoves/` so it is served directly at `viktorenns.de/chessmoves` alongside `viktorenns.de/comedyos`.
- Capture a screenshot of the updated app, save to `e:/- CODE/VEwebsite/assets/chessmoves_preview.png`, and add a project card linking to `/chessmoves/` in `e:/- CODE/VEwebsite/index.html`.
- Initialize Git in `e:/- CODE/Chess`, commit all files with a comprehensive changelog, and push to `https://github.com/ViktorEnns/chessmoves.git`.
- Create roadmap/backlog issues (`ISSUES.md` + GitHub Issues if authenticated).
