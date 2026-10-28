---
name: chessground-chessjs-bridge
description: >-
  How to integrate @lichess-org/chessground (v10) with chess.js (v1.4) in TypeScript for a two-player Over-The-Board (OTB) mobile chess recorder, including legal move generation, pawn promotion modal interception, fixed vs. auto-rotating orientation, and CSS sizing.
---

# Chessground + chess.js Integration Skill

Use this skill whenever implementing or modifying the chessboard UI (`src/board.ts`, `src/style.css`) and move validation logic (`src/game-state.ts`).

## 1. Required CSS Imports (`src/style.css`)
`@lichess-org/chessground` renders an invisible or broken board if its CSS files are missing. Always place these exact imports in `src/style.css`:

```css
@import "tailwindcss";
@import "@lichess-org/chessground/assets/chessground.base.css";
@import "@lichess-org/chessground/assets/chessground.brown.css";
@import "@lichess-org/chessground/assets/chessground.cburnett.css";

/* Ensure the board container stays a crisp 1:1 square on mobile viewports */
.cg-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: min(92vw, 52vh);
  margin: 0 auto;
  touch-action: none;
  user-select: none;
}
```

## 2. Computing Legal Dests Map (`toDests`)
Chessground requires a `Map<Key, Key[]>` of legal moves (`movable.dests`). Use `chess.moves({ verbose: true })`:

```ts
import { Chess, SQUARES } from 'chess.js';
import type { Key, Color } from '@lichess-org/chessground/types';

export function toColor(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black';
}

export function toDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  for (const s of SQUARES) {
    const moves = chess.moves({ square: s, verbose: true });
    if (moves.length > 0) {
      dests.set(s as Key, moves.map((m) => m.to as Key));
    }
  }
  return dests;
}
```

## 3. Detecting Pawn Promotion Before Executing Move
When a pawn moves to rank `8` (White) or rank `1` (Black), you MUST check if the move is a promotion before calling `chess.move()`, and show a promotion piece picker (`'q' | 'r' | 'b' | 'n'`):

```ts
export function isPromotionMove(chess: Chess, orig: Key, dest: Key): boolean {
  const moves = chess.moves({ square: orig as any, verbose: true });
  return moves.some((m) => m.to === dest && m.promotion);
}
```

If `isPromotionMove(chess, orig, dest)` is `true`, open the Promotion Modal (`q`, `r`, `b`, `n`) and await the user's choice before committing the move and switching the clock. If the user cancels, call `syncBoardToGame()` to snap the pawn back.

## 4. Synchronizing Chessground After Every Move
Because the user records moves for BOTH sides on one phone:
- `turnColor` must be set to `toColor(chess)`.
- `movable.color` must also be set to `toColor(chess)` (or `'none'` when viewing historical moves or when the game has ended).
- `orientation` must ONLY change automatically if `settings.autoRotate === true`. Otherwise, keep the current board orientation fixed!

```ts
export function syncBoard(
  cg: Api,
  chess: Chess,
  options: {
    orientation: Color;
    autoRotate: boolean;
    isViewingHistory: boolean;
    lastMove?: [Key, Key];
  }
) {
  const turn = toColor(chess);
  const nextOrientation = options.autoRotate ? turn : options.orientation;
  const canMove = !options.isViewingHistory && !chess.isGameOver();

  cg.set({
    fen: chess.fen(),
    orientation: nextOrientation,
    turnColor: turn,
    lastMove: options.lastMove,
    check: chess.inCheck() ? turn : false,
    movable: {
      free: false,
      color: canMove ? turn : undefined,
      dests: canMove ? toDests(chess) : new Map(),
      showDests: true,
    },
    draggable: {
      enabled: true,
      showGhost: true,
    },
    selectable: {
      enabled: true,
    },
  });
}
```
