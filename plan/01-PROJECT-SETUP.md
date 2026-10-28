# 01 — Project Setup, HTML Layout & Styling Specification

> **Target Folder:** `e:/- CODE/Chess/otb-chess-recorder/`
> **Related Skill:** `vite-pwa-cloudflare`

---

## 1. `otb-chess-recorder/package.json`
Create with the exact dependencies below:
```json
{
  "name": "otb-chess-recorder",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@lichess-org/chessground": "^10.0.0",
    "chess.js": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "~5.7.2",
    "vite": "^6.1.0",
    "vite-plugin-pwa": "^0.21.1"
  }
}
```

---

## 2. `otb-chess-recorder/tsconfig.json`
Ensure `"noUnusedLocals": false` and `"noUnusedParameters": false` are set:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

---

## 3. `otb-chess-recorder/vite.config.ts`
Use `@tailwindcss/vite` and `vite-plugin-pwa`:
```ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'OTB Chess Recorder',
        short_name: 'ChessRec',
        description: 'Record over-the-board chess games with automatic per-move clock tracking and instant PGN export.',
        theme_color: '#18181b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
```

---

## 4. `otb-chess-recorder/public/favicon.svg`
Create a clean SVG chess knight/board icon:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#18181b"/>
  <rect x="12" y="12" width="38" height="38" rx="4" fill="#e4e4e7"/>
  <rect x="50" y="12" width="38" height="38" rx="4" fill="#a16207"/>
  <rect x="12" y="50" width="38" height="38" rx="4" fill="#a16207"/>
  <rect x="50" y="50" width="38" height="38" rx="4" fill="#e4e4e7"/>
  <circle cx="50" cy="50" r="22" fill="#18181b" stroke="#f59e0b" stroke-width="5"/>
  <path d="M50 35 v15 l10 7" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" fill="none"/>
</svg>
```

---

## 5. `otb-chess-recorder/src/style.css`
Import Tailwind v4 and the 3 mandatory Chessground CSS files, plus responsive sizing for mobile screens so the entire app fits comfortably without vertical page scrolling during play:
```css
@import "tailwindcss";
@import "@lichess-org/chessground/assets/chessground.base.css";
@import "@lichess-org/chessground/assets/chessground.brown.css";
@import "@lichess-org/chessground/assets/chessground.cburnett.css";

:root {
  color-scheme: dark;
}

html, body {
  margin: 0;
  padding: 0;
  background-color: #09090b;
  color: #f4f4f5;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

/* Chessground board wrapper: crisp square that fits both compact and tall mobile screens */
.board-shell {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

#chessground-board {
  width: min(94vw, 48vh, 460px);
  height: min(94vw, 48vh, 460px);
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
  touch-action: none;
  user-select: none;
}

/* Custom thin scrollbar for horizontal/vertical move list */
.moves-scroll::-webkit-scrollbar {
  height: 4px;
  width: 4px;
}
.moves-scroll::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 9999px;
}
```

---

## 6. `otb-chess-recorder/index.html`
Design a mobile-first viewport layout (`h-dvh flex flex-col justify-between overflow-hidden`) containing:
1. **Top Header Bar:**
   - App title & overall game elapsed timer badge (`#overall-time-badge`) + Wake Lock indicator dot.
   - Action buttons: **New Game** (`#btn-new-game`), **Archive** (`#btn-archive` with saved count badge), **Export / Analyze** (`#btn-export`), **Settings** (`#btn-settings`).
2. **Top Player Clock Bar (`#top-player-bar`):**
   - Displays whichever player is currently at the TOP of the board (`Black` by default, or `White` if manually flipped).
   - Shows player name, color badge, captured/status info, last move time (`emt`), and large digital clock (`font-mono text-2xl font-bold`).
3. **Interactive Chessground Container (`#chessground-board`):**
   - Centered 1:1 square board.
   - Overlaid **Pawn Promotion Picker (`#promotion-modal`)** (hidden by default; shows large Queen, Rook, Bishop, Knight buttons when promoting).
4. **Bottom Player Clock Bar (`#bottom-player-bar`):**
   - Displays whichever player is at the BOTTOM of the board (`White` by default).
   - Active turn is visually highlighted with an amber/emerald border and pulsing indicator.
5. **Compact Move List & Time Strip (`#move-list-container`):**
   - Scrollable move list showing move number, White move + time spent (e.g., `1. e4 (2.1s)`), Black move + time spent (`e5 (1.8s)`). Clicking any move jumps to that position on the board for inspection.
6. **Bottom Control Bar:**
   - **Flip Board** (`#btn-flip-board` — rotates perspective 180° manually)
   - **Pause / Resume Clock** (`#btn-pause-clock`)
   - **History Navigation:** First (`#btn-first`), Prev (`#btn-prev`), Next (`#btn-next`), Last (`#btn-last`)
   - **Undo Last Move** (`#btn-undo` — takes back the last half-move so accidental taps are fixed in 1 tap)
   - **End Game / Result** (`#btn-result` — quick selector for `1-0`, `0-1`, `½-½`, or `*`)
7. **Modals (Hidden by default):**
   - `#modal-new-game`: Time mode selector (Stopwatch vs Countdown presets `3+2`, `5+0`, `5+3`, `10+0`, `15+10`, Custom), Player names (`White`, `Black`), Event name, and optional **Custom Starting FEN** input with validation.
   - `#modal-export`: Live PGN preview (with toggle to include/exclude `[%clk]` & `[%emt]` comments), **1-Tap Analyze on Lichess**, **1-Tap Analyze on Chess.com**, **Copy PGN**, **Download `.pgn`**, **Share**.
   - `#modal-archive`: List of saved games in `localStorage` with Load, Export, and Delete buttons, plus "Save Current Game to Archive".
   - `#modal-settings`:
     - **Auto-Rotate Board After Move** (`OFF` by default — clear explanation that turning this on rotates the board after every ply).
     - **Keep Screen Awake (Wake Lock)** (`ON` by default).
     - **Confirm Undo** toggle (`OFF` by default for fast 1-tap undo, or `ON` to prevent accidental undo).
     - **Sound / Haptic Feedback on Move** (`ON` by default).
   - `#toast-container`: Floating toast notification at top/bottom for clipboard/export feedback.
