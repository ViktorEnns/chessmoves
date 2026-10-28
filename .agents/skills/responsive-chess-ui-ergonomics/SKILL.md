---
name: responsive-chess-ui-ergonomics
description: >-
  Enforces responsive mobile + desktop chessboard scaling, replaces low-contrast system emoji with crisp inline SVG icons + text labels, and ensures 44px+ accessible touch/click targets for OTB chess recording UIs.
---

# Responsive Chess UI & Ergonomics Skill

Use this skill whenever creating or modifying HTML/CSS/TS UI components in the OTB Chess Recorder project (`index.html`, `src/style.css`, `src/main.ts`). Always read `design.md` at the workspace root first.

## 1. Root Cause of Desktop Sizing & Button Contrast Issues (Prevent in Future)
1. **Why the board was tiny on desktop:** Using `width: min(94vw, 48vh, 460px)` capped the board at `48%` of viewport height and a hard `460px` ceiling, leaving 75% of a 1080p/1440p monitor empty black space.
2. **Why buttons looked like "white on light blue background":** Using Unicode emoji (`🔄`, `⏸️`, `▶️`, `⚙️`) causes Windows (Segoe UI Emoji) and Android (Noto Color Emoji) to render a bright light-blue square button graphic behind a white arrow/pause symbol.

## 2. Responsive Board Sizing Formula (`src/style.css`)
Never cap the board at `460px` on desktop. Use a responsive CSS variable `--board-size` that adapts to portrait mobile vs. landscape desktop:

```css
:root {
  /* Mobile portrait default: full width minus margins, leaving room for bars */
  --board-size: min(95vw, calc(100dvh - 235px));
}

@media (min-width: 768px) {
  :root {
    /* Desktop / Tablet two-column layout: scale comfortably up to 720px */
    --board-size: min(58vw, calc(100dvh - 165px), 720px);
  }
}

#chessground-board {
  width: var(--board-size);
  height: var(--board-size);
  aspect-ratio: 1 / 1;
}

.player-bar-width {
  width: var(--board-size);
}
```

## 3. Replace All Emoji with High-Contrast Inline SVGs + Labels
- **BANNED in UI buttons:** `🔄`, `⏸️`, `▶️`, `⚙️`, `💾`, `📋`, `🔗`, `⚔️`, `♟️`.
- **REQUIRED:** Clean `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">` icons paired with readable text labels (`text-sm font-semibold`) and `min-h-[42px]` (`py-2 px-3`).

## 4. Prominent Export Button Placement
Users expect **Export / Analyze** right next to the game controls (and inside every archived game item), not just tucked into the top-right corner of a wide monitor.
- Include a prominent amber **Export / PGN** button in the primary control bar AND in each row of the Saved Game Archive.
