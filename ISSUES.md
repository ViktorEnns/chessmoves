# Open Issues & Roadmap (`ISSUES.md`)

This document tracks the open engineering and UX issues for the **OTB Chess Recorder (`chessmoves`)** repository, ready to be tackled in upcoming sprints or synced to GitHub Issues.

---

## Issue #1: [Enhancement] Optional Cloud Sync & Short Shareable Links via Supabase
- **Labels:** `enhancement`, `backend`, `supabase`
- **Problem:** Currently, games are stored in `localStorage` (`otb_chess_active_game_v1` and `otb_chess_archive_v1`) on the user's local browser, or shared via stateless `?pgn=...` URL query parameters. While `?pgn=...` works without a database, 60-move games with clock tags produce long URLs.
- **Proposed Solution:**
  - Connect to a free-tier Supabase project with a single `chess_games` table (`id`, `short_code`, `white`, `black`, `event`, `result`, `pgn`, `moves_json`, `created_at`).
  - Keep `localStorage` as the primary zero-latency offline store, and add a 1-tap **"Publish Short Link (`viktorenns.de/chessmoves?g=abc123`)"** + optional cross-device Archive sync.

---

## Issue #2: [UX] Desktop Two-Column Split Layout (Board Left, Full Move Table & Eval Graph Right)
- **Labels:** `ui/ux`, `desktop`
- **Problem:** In v1.1, we fixed the desktop board scaling (`--board-size: min(68vw, calc(100dvh - 210px), 760px)`) and button contrast. However, on widescreen desktop monitors (`>= 1024px`), placing the move list and PGN export panel in a vertical right-hand sidebar (similar to Lichess / Chess.com) would utilize horizontal space even better than a single vertical stack.
- **Proposed Solution:**
  - On viewports `>= 1024px`, switch `<main>` to a 2-column CSS grid where the left column holds the Top Player Bar + Board + Bottom Player Bar, and the right column displays a full vertical 2-column algebraic notation table, move-time bar chart (`%emt` per move), and instant export controls.

---

## Issue #3: [Feature] Move Time (`%emt`) Visual Bar Chart & Blunder/Critical Move Bookmarks
- **Labels:** `feature`, `analytics`
- **Problem:** Players recording OTB games want to immediately see which moves took the longest thinking time (`%emt`) right after the game finishes, before even exporting to Lichess or Chess.com.
- **Proposed Solution:**
  - Add a compact "Time Graph" tab in the Export/Review modal showing White and Black thinking times per move, plus a 1-tap "Bookmark Move (`?` / `!`)" button during or after play that inserts standard NAG annotations into the PGN.

---

## Issue #4: [Feature] Tabletop Face-to-Face Mode (Invert Top Player Clock & Pieces)
- **Labels:** `feature`, `mobile-otb`
- **Problem:** When the phone lies flat on the table between two players during a casual OTB game, the player sitting on the opposite side of the table sees their clock bar upside down.
- **Proposed Solution:**
  - Add a **"Tabletop Mode"** toggle in Settings that rotates the Top Player Clock Bar `180deg` (`transform: rotate(180deg)`) so the opponent across the table can read their clock right-side up.

---

## Issue #5: [Feature] Import / Export Full Archive as JSON or Multi-Game `.pgn` Database
- **Labels:** `feature`, `storage`
- **Problem:** Because the Saved Game Archive lives in browser `localStorage`, clearing browser site data or switching phones would lose archived games unless exported one by one.
- **Proposed Solution:**
  - Add **"Export All Archived Games (`.pgn` / `.json`)"** and **"Import Archive"** buttons inside the Archive modal for full multi-game backup.
