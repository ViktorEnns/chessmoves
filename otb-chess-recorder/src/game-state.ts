import { Chess, validateFen } from 'chess.js';
import type { GameMetadata, MoveRecord, ClockConfig, SavedGame } from './types';
import { ClockEngine } from './clocks';

export class GameManager {
  public chess: Chess;
  public metadata: GameMetadata;
  public moves: MoveRecord[] = [];
  public viewPly: number = 0; // 0 = start position, moves.length = live
  public clock: ClockEngine;

  public onStateChange?: () => void;
  public onGameOver?: (result: string, reason: string) => void;

  constructor(clockConfig?: ClockConfig) {
    this.chess = new Chess();
    const config = clockConfig ?? { mode: 'stopwatch', initialMinutes: 10, incrementSeconds: 0 };
    this.clock = new ClockEngine(config);
    this.metadata = this.createDefaultMetadata(config);
  }

  public createDefaultMetadata(config: ClockConfig, customFen?: string): GameMetadata {
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    return {
      id: 'game_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      event: 'Casual OTB Game',
      site: 'OTB Chess Recorder',
      date: dateStr,
      round: '1',
      white: 'White',
      black: 'Black',
      result: '*',
      initialFen: customFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      clockConfig: config,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  public startNewGame(options: {
    config: ClockConfig;
    white?: string;
    black?: string;
    event?: string;
    initialFen?: string;
  }): boolean {
    const fen = options.initialFen?.trim();
    if (fen) {
      const validation = validateFen(fen);
      if (!validation.ok) {
        return false;
      }
      this.chess = new Chess(fen);
    } else {
      this.chess = new Chess();
    }

    this.moves = [];
    this.viewPly = 0;
    this.clock.reset(options.config);
    this.clock.setActiveSide(this.chess.turn() === 'w' ? 'w' : 'b');

    this.metadata = this.createDefaultMetadata(options.config, fen);
    if (options.white) this.metadata.white = options.white.trim() || 'White';
    if (options.black) this.metadata.black = options.black.trim() || 'Black';
    if (options.event) this.metadata.event = options.event.trim() || 'Casual OTB Game';

    this.onStateChange?.();
    return true;
  }

  public loadSavedGame(saved: SavedGame): void {
    this.metadata = saved.metadata;
    this.moves = [...saved.moves];
    this.viewPly = this.moves.length;

    // Replay moves to get correct board state
    this.chess = new Chess(this.metadata.initialFen);
    for (const m of this.moves) {
      this.chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    }

    this.clock.reset(this.metadata.clockConfig, {
      whiteMs: saved.whiteTimeMs,
      blackMs: saved.blackTimeMs,
      overallMs: saved.overallElapsedMs
    });
    this.clock.setActiveSide(this.chess.turn() === 'w' ? 'w' : 'b');

    this.onStateChange?.();
  }

  public loadFromPgnString(pgn: string): boolean {
    try {
      const parsed = new Chess();
      parsed.loadPgn(pgn);

      const headers = parsed.getHeaders();
      const comments = parsed.getComments();
      const commentMap = new Map<string, string>();
      for (const c of comments) {
        commentMap.set(c.fen, c.comment);
      }

      const historyVerbose = parsed.history({ verbose: true });
      const initialFen = headers.FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      const config: ClockConfig = { mode: 'stopwatch', initialMinutes: 10, incrementSeconds: 0 };
      if (headers.TimeControl && headers.TimeControl !== '-' && headers.TimeControl.includes('+')) {
        const [secStr, incStr] = headers.TimeControl.split('+');
        const secs = parseInt(secStr, 10);
        const inc = parseInt(incStr, 10);
        if (!isNaN(secs) && secs > 0) {
          config.mode = 'countdown';
          config.initialMinutes = Math.max(1, Math.round(secs / 60));
          config.incrementSeconds = isNaN(inc) ? 0 : inc;
        }
      }

      this.metadata = this.createDefaultMetadata(config, initialFen);
      if (headers.Event) this.metadata.event = headers.Event;
      if (headers.Site) this.metadata.site = headers.Site;
      if (headers.Date) this.metadata.date = headers.Date;
      if (headers.Round) this.metadata.round = headers.Round;
      if (headers.White) this.metadata.white = headers.White;
      if (headers.Black) this.metadata.black = headers.Black;
      if (headers.Result === '1-0' || headers.Result === '0-1' || headers.Result === '1/2-1/2') {
        this.metadata.result = headers.Result;
      }

      this.chess = new Chess(initialFen);
      this.moves = [];
      let whiteClkMs = config.mode === 'countdown' ? config.initialMinutes * 60_000 : 0;
      let blackClkMs = config.mode === 'countdown' ? config.initialMinutes * 60_000 : 0;
      let overallMs = 0;

      for (let i = 0; i < historyVerbose.length; i++) {
        const h = historyVerbose[i];
        const fenBefore = this.chess.fen();
        this.chess.move({ from: h.from, to: h.to, promotion: h.promotion });
        const fenAfter = this.chess.fen();

        let emtMs = 1000;
        const cmt = commentMap.get(fenAfter) || '';
        const emtMatch = cmt.match(/\[%emt\s+([\d.]+)\]/);
        if (emtMatch) {
          emtMs = Math.round(parseFloat(emtMatch[1]) * 1000);
        }
        const clkMatch = cmt.match(/\[%clk\s+(\d+):(\d+):(\d+)\]/);
        if (clkMatch) {
          const clkVal = (parseInt(clkMatch[1], 10) * 3600 + parseInt(clkMatch[2], 10) * 60 + parseInt(clkMatch[3], 10)) * 1000;
          if (h.color === 'w') whiteClkMs = clkVal;
          else blackClkMs = clkVal;
        } else {
          if (h.color === 'w') whiteClkMs += emtMs;
          else blackClkMs += emtMs;
        }
        overallMs += emtMs;

        this.moves.push({
          ply: i + 1,
          moveNumber: Math.ceil((i + 1) / 2),
          color: h.color,
          san: h.san,
          from: h.from,
          to: h.to,
          promotion: h.promotion as any,
          fenBefore,
          fenAfter,
          emtMs,
          whiteClkMs,
          blackClkMs,
          timestamp: Date.now()
        });
      }

      this.viewPly = this.moves.length;
      this.clock.reset(config, { whiteMs: whiteClkMs, blackMs: blackClkMs, overallMs });
      this.clock.setActiveSide(this.chess.turn() === 'w' ? 'w' : 'b');
      this.onStateChange?.();
      return true;
    } catch {
      return false;
    }
  }

  public toSavedGame(): SavedGame {
    return {
      metadata: { ...this.metadata, updatedAt: Date.now() },
      moves: [...this.moves],
      whiteTimeMs: this.clock.whiteTimeMs,
      blackTimeMs: this.clock.blackTimeMs,
      overallElapsedMs: this.clock.overallElapsedMs
    };
  }

  public makeMove(from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean {
    if (this.viewPly !== this.moves.length) {
      // Return to live position first if viewing history
      this.jumpToLive();
    }

    if (this.chess.isGameOver()) return false;

    const moverColor = this.chess.turn() as 'w' | 'b';
    const fenBefore = this.chess.fen();

    try {
      const moveResult = this.chess.move({ from, to, promotion });
      if (!moveResult) return false;

      const timing = this.clock.commitMove(moverColor);
      const ply = this.moves.length + 1;
      const moveNumber = Math.ceil(ply / 2);

      const record: MoveRecord = {
        ply,
        moveNumber,
        color: moverColor,
        san: moveResult.san,
        from,
        to,
        promotion,
        fenBefore,
        fenAfter: this.chess.fen(),
        emtMs: timing.emtMs,
        whiteClkMs: timing.whiteClkMs,
        blackClkMs: timing.blackClkMs,
        timestamp: Date.now()
      };

      this.moves.push(record);
      this.viewPly = this.moves.length;
      this.metadata.updatedAt = Date.now();

      // Check for automatic game over
      if (this.chess.isGameOver()) {
        this.clock.pause();
        let reason = 'Game Ended';
        if (this.chess.isCheckmate()) {
          this.metadata.result = moverColor === 'w' ? '1-0' : '0-1';
          reason = `Checkmate! ${moverColor === 'w' ? 'White' : 'Black'} wins.`;
        } else if (this.chess.isDraw()) {
          this.metadata.result = '1/2-1/2';
          if (this.chess.isStalemate()) reason = 'Draw by Stalemate';
          else if (this.chess.isThreefoldRepetition()) reason = 'Draw by 3-fold repetition';
          else if (this.chess.isInsufficientMaterial()) reason = 'Draw by insufficient material';
          else reason = 'Draw by 50-move rule';
        }
        this.metadata.termination = reason;
        this.onGameOver?.(this.metadata.result, reason);
      }

      this.onStateChange?.();
      return true;
    } catch {
      return false;
    }
  }

  public undoLastMove(): boolean {
    if (this.moves.length === 0) return false;

    this.moves.pop();
    this.viewPly = this.moves.length;

    // Reconstruct chess.js position
    this.chess = new Chess(this.metadata.initialFen);
    for (const m of this.moves) {
      this.chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    }

    // Restore clock readings
    const lastMove = this.moves[this.moves.length - 1];
    const prevWhite = lastMove ? lastMove.whiteClkMs : (this.metadata.clockConfig.mode === 'countdown' ? this.metadata.clockConfig.initialMinutes * 60_000 : 0);
    const prevBlack = lastMove ? lastMove.blackClkMs : (this.metadata.clockConfig.mode === 'countdown' ? this.metadata.clockConfig.initialMinutes * 60_000 : 0);

    this.clock.restoreClock(prevWhite, prevBlack, this.chess.turn() === 'w' ? 'w' : 'b');
    this.metadata.result = '*';
    this.metadata.termination = undefined;

    this.onStateChange?.();
    return true;
  }

  public setResult(result: '1-0' | '0-1' | '1/2-1/2' | '*'): void {
    this.metadata.result = result;
    if (result !== '*') {
      this.clock.pause();
    }
    this.onStateChange?.();
  }

  public goToPly(ply: number): void {
    this.viewPly = Math.max(0, Math.min(ply, this.moves.length));
    this.onStateChange?.();
  }

  public jumpToLive(): void {
    this.viewPly = this.moves.length;
    this.onStateChange?.();
  }

  public getDisplayFen(): string {
    if (this.viewPly === this.moves.length) {
      return this.chess.fen();
    }
    if (this.viewPly === 0) {
      return this.metadata.initialFen;
    }
    return this.moves[this.viewPly - 1].fenAfter;
  }

  public getLastMoveCoords(): [string, string] | undefined {
    if (this.viewPly === 0) return undefined;
    const m = this.moves[this.viewPly - 1];
    return [m.from, m.to];
  }
}
