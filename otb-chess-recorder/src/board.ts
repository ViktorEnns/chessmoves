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
    if (ms.length > 0) {
      dests.set(sq as Key, ms.map((m) => m.to as Key));
    }
  }
  return dests;
}

export function isPromotion(chess: Chess, orig: Key, dest: Key): boolean {
  const moves = chess.moves({ square: orig as any, verbose: true });
  return moves.some((m) => m.to === dest && Boolean(m.promotion));
}

export interface BoardHandlers {
  onMoveAttempt: (orig: Key, dest: Key) => void;
  onOrientationChange?: (orientation: Color) => void;
}

export class BoardController {
  private cg: Api;
  public orientation: Color = 'white';

  constructor(container: HTMLElement, private handlers: BoardHandlers) {
    this.cg = Chessground(container, {
      orientation: 'white',
      turnColor: 'white',
      coordinates: true,
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      movable: {
        free: false,
        color: 'white',
        showDests: true,
        events: {
          after: (orig, dest) => {
            this.handlers.onMoveAttempt(orig, dest);
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
    liveChess: Chess;
    displayFen: string;
    lastMove?: [string, string];
    isLivePosition: boolean;
    isGameOver: boolean;
    autoRotate: boolean;
  }): void {
    const turn = getTurnColor(params.liveChess);

    if (params.autoRotate && params.isLivePosition) {
      this.orientation = turn;
      this.handlers.onOrientationChange?.(this.orientation);
    }

    const interactive = params.isLivePosition && !params.isGameOver;

    // Check check status of the displayed FEN
    let inCheckColor: Color | false = false;
    try {
      const displayChess = new Chess(params.displayFen);
      if (displayChess.inCheck()) {
        inCheckColor = getTurnColor(displayChess);
      }
    } catch {}

    const lastMoveCoords = params.lastMove ? [params.lastMove[0] as Key, params.lastMove[1] as Key] as [Key, Key] : undefined;

    this.cg.set({
      fen: params.displayFen,
      orientation: this.orientation,
      turnColor: turn,
      lastMove: lastMoveCoords,
      check: inCheckColor,
      movable: {
        free: false,
        color: interactive ? turn : undefined,
        dests: interactive ? getLegalDests(params.liveChess) : new Map(),
        showDests: true
      }
    });
  }
}
