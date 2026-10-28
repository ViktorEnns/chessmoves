# OTB Chess Recorder PWA

A mobile-first, offline-ready Progressive Web App (PWA) designed to record Over-The-Board (OTB) chess games with automatic per-move and overall clock tracking, tactile feedback, and instant 1-tap export to Lichess and Chess.com.

## Key Features
- **Two-Player Same-Device Recording:** Either one player records for both sides or players tap/drag their own moves directly on the phone.
- **Fixed Board Orientation by Default:** The board orientation remains fixed (Bottom = White, Top = Black). A manual **Flip Board (🔄)** button swaps perspective whenever needed. Optional **Auto-Rotate** can be toggled in Settings if desired.
- **Precise Clock Tracking:**
  - **Stopwatch Mode (Default):** Measures per-move thinking time (`emt`) and total elapsed duration.
  - **Countdown Mode:** Time controls (`3+2`, `5+0`, `5+3`, `10+0`, `15+10`, custom) with Fischer increments and timeout flags.
- **Pawn Promotion Modal:** Clean touch picker (Queen, Rook, Bishop, Knight) before committing promotion moves.
- **Undo & Navigation:** 1-tap Undo restores the previous position and clock snapshot cleanly. Full move list navigation (`|<`, `<`, `>`, `>|`) to review past moves.
- **Rich PGN Export & 1-Tap Analysis:**
  - Embeds standard `{[%clk H:MM:SS] [%emt S.S]}` tags for move-time graphs.
  - **Lichess 1-Tap:** Directly uploads to Lichess analysis board via API.
  - **Chess.com 1-Tap:** Copies PGN with clock tags to clipboard and launches Chess.com Analysis.
  - **Download & Web Share:** Save `.pgn` files or share to messaging apps.
- **Offline & Standalone PWA:** Fully cached via Service Worker. Screen Wake Lock prevents phone display sleep during games.

---

## Local Development

```bash
# Navigate to project folder
cd otb-chess-recorder

# Install dependencies
npm install

# Start local dev server
npm run dev

# Build production bundle
npm run build
```

---

## Cloudflare Pages Deployment Guide

1. Push your repository to **GitHub**.
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Compute (Workers & Pages)** → **Create** → **Pages** → **Connect to Git**.
3. Select this repository.
4. Set the build configuration:
   - **Root directory:** `otb-chess-recorder` (or leave `/` if repository root is inside this folder)
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click **Save and Deploy**. Cloudflare Pages will build and deploy the app with HTTPS in ~25 seconds.
6. Open the deployed link on your mobile browser and select **Add to Home Screen** to install as a standalone app!
