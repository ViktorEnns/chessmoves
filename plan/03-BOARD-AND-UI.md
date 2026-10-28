# 03 — Chessground Board Wrapper & Mobile Touch UI Specification

> **Target Folder:** `e:/- CODE/Chess/otb-chess-recorder/src/`
> **Related Skill:** `chessground-chessjs-bridge`

---

## 1. `src/board.ts` — Chessground Controller

### Responsibilities
1. Mounts `@lichess-org/chessground` onto `#chessground-board`.
2. Converts `chess.js` legal moves into Chessground's `Map<Key, Key[]>` (`dests`).
3. Supports **both Tap-to-Move and Drag-and-Drop** (`selectable.enabled: true`, `draggable.enabled: true`).
4. **Fixed Orientation by Default:**
   - Stores `manualOrientation: 'white' | 'black'` (defaults to `'white'`).
   - Provides `flipBoard()` which toggles `manualOrientation` between `'white'` and `'black'` and notifies the UI so the Top Player Bar and Bottom Player Bar swap seamlessly to match the board's top and bottom edges!
   - Only rotates automatically after a move if `settings.autoRotate === true`. When `settings.autoRotate === false` (the default), the board NEVER rotates between moves.
5. **Pawn Promotion Interception:**
   - In Chessground's `movable.events.after(orig, dest)` callback:
     - First check if moving from `orig` to `dest` is a pawn promotion in the current `chess.js` position (`isPromotionMove(chess, orig, dest)`).
     - If it **is** a promotion:
       - Call `onPromotionRequired(orig, dest, turnColor)` which displays the overlaid `#promotion-modal` with 4 large touch buttons: **Queen (`q`)**, **Rook (`r`)**, **Bishop (`b`)**, **Knight (`n`)** plus a **Cancel** button.
       - If the user picks a piece, complete `makeMove(orig, dest, piece)`.
       - If the user taps Cancel, call `syncBoard()` to snap the pawn back to `orig` without recording a move or switching the clock.
     - If it is **not** a promotion:
       - Immediately call `onMoveCommit(orig, dest)`.

### Reference Implementation Pattern for `src/board.ts`

```ts
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Key, Color } from '@lichess-org/chessground/types';
import { Chess, SQUARES } from 'chess.js';

export function getTurnColor(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black';
}

export function getLegalDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  for (const sq of SQUARES) {
    const ms = chess.moves({ square: sq, verbose: true });
    if (ms.length) {
      dests.set(sq as Key, ms.map((m) => m.to as Key));
    }
  }
  return dests;
}

export function isPromotion(chess: Chess, orig: Key, dest: Key): boolean {
  const moves = chess.moves({ square: orig as any, verbose: true });
  return moves.some((m) => m.to === dest && Boolean(m.promotion));
}

export class BoardController {
  private cg: Api;
  public orientation: Color = 'white';

  constructor(
    container: HTMLElement,
    private handlers: {
      onMoveInput: (orig: Key, dest: Key) => void;
      onOrientationChange?: (orientation: Color) => void;
    }
  ) {
    this.cg = Chessground(container, {
      orientation: 'white',
      turnColor: 'white',
      coordinates: true,
      animation: { enabled: true, duration: 150 },
      highlight: { lastMove: true, check: true },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      movable: {
        free: false,
        color: 'white',
        showDests: true,
        events: {
          after: (orig, dest) => {
            this.handlers.onMoveInput(orig, dest);
          }
        }
      }
    });
  }

  public flip(): Color {
    this.orientation = this.orientation === 'white' ? 'black' : 'white';
    this.cg.set({ orientation: this.orientation });
    this.handlers.onOrientationChange?.(this.orientation);
    return this.orientation;
  }

  public setOrientation(color: Color): void {
    this.orientation = color;
    this.cg.set({ orientation: color });
    this.handlers.onOrientationChange?.(this.orientation);
  }

  public sync(params: {
    chessForDests: Chess;
    displayFen: string;
    lastMove?: [Key, Key];
    isLivePosition: boolean;
    isGameOver: boolean;
    autoRotate: boolean;
  }): void {
    const turn = getTurnColor(params.chessForDests);
    if (params.autoRotate && params.isLivePosition) {
      this.orientation = turn;
      this.handlers.onOrientationChange?.(this.orientation);
    }

    // Check if the displayed position is in check
    const displayChess = new Chess(params.displayFen);
    const inCheckColor = displayChess.inCheck() ? getTurnColor(displayChess) : false;

    const interactive = params.isLivePosition && !params.isGameOver;

    this.cg.set({
      fen: params.displayFen,
      orientation: this.orientation,
      turnColor: turn,
      lastMove: params.lastMove,
      check: inCheckColor,
      movable: {
        free: false,
        color: interactive ? turn : undefined,
        dests: interactive ? getLegalDests(params.chessForDests) : new Map(),
        showDests: true
      }
    });
  }
}
```

---

## 2. Synchronizing Player Clock Bars with Board Orientation
When `board.orientation === 'white'` (default):
- **Top Player Bar** displays **Black** (name, Black clock, Black last move time, Black active turn indicator).
- **Bottom Player Bar** displays **White** (name, White clock, White last move time, White active turn indicator).

When `board.orientation === 'black'` (either via manual **Flip Board** button or if `autoRotate` is enabled):
- **Top Player Bar** displays **White**.
- **Bottom Player Bar** displays **Black**.

This ensures each player's clock bar is always visually adjacent to their own pieces on the board!
