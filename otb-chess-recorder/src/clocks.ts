import type { ClockConfig } from './types';

export class ClockEngine {
  public config: ClockConfig;
  public whiteTimeMs: number = 0;
  public blackTimeMs: number = 0;
  public currentMoveElapsedMs: number = 0;
  public overallElapsedMs: number = 0;

  public activeSide: 'w' | 'b' = 'w';
  public isRunning: boolean = false;
  private lastTickTimestamp: number = 0;
  private intervalId: number | null = null;

  public onTick?: (snapshot: {
    whiteTimeMs: number;
    blackTimeMs: number;
    currentMoveElapsedMs: number;
    overallElapsedMs: number;
    activeSide: 'w' | 'b';
  }) => void;

  public onFlag?: (flaggedSide: 'w' | 'b') => void;

  constructor(config: ClockConfig) {
    this.config = config;
    this.reset(config);
  }

  public reset(config?: ClockConfig, initialTimes?: { whiteMs: number; blackMs: number; overallMs?: number }): void {
    if (config) this.config = config;
    this.stop();

    if (initialTimes) {
      this.whiteTimeMs = initialTimes.whiteMs;
      this.blackTimeMs = initialTimes.blackMs;
      this.overallElapsedMs = initialTimes.overallMs ?? 0;
    } else {
      if (this.config.mode === 'countdown') {
        const startMs = this.config.initialMinutes * 60_000;
        this.whiteTimeMs = startMs;
        this.blackTimeMs = startMs;
      } else {
        this.whiteTimeMs = 0;
        this.blackTimeMs = 0;
      }
      this.overallElapsedMs = 0;
    }

    this.currentMoveElapsedMs = 0;
    this.activeSide = 'w';
    this.emitTick();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTickTimestamp = Date.now();
    this.intervalId = window.setInterval(() => this.tick(), 100);
    this.emitTick();
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.tick(); // final slice
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.emitTick();
  }

  public togglePause(): boolean {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setActiveSide(side: 'w' | 'b'): void {
    this.activeSide = side;
  }

  private tick(): void {
    const now = Date.now();
    const delta = Math.max(0, now - this.lastTickTimestamp);
    this.lastTickTimestamp = now;

    this.currentMoveElapsedMs += delta;
    this.overallElapsedMs += delta;

    if (this.config.mode === 'countdown') {
      if (this.activeSide === 'w') {
        this.whiteTimeMs = Math.max(0, this.whiteTimeMs - delta);
        if (this.whiteTimeMs === 0) {
          this.pause();
          this.onFlag?.('w');
        }
      } else {
        this.blackTimeMs = Math.max(0, this.blackTimeMs - delta);
        if (this.blackTimeMs === 0) {
          this.pause();
          this.onFlag?.('b');
        }
      }
    } else {
      // Stopwatch: count up
      if (this.activeSide === 'w') {
        this.whiteTimeMs += delta;
      } else {
        this.blackTimeMs += delta;
      }
    }

    this.emitTick();
  }

  /**
   * Called when a move is completed on the board.
   * Returns exact emtMs and clock readings.
   */
  public commitMove(mover: 'w' | 'b'): {
    emtMs: number;
    whiteClkMs: number;
    blackClkMs: number;
  } {
    // If not running yet (first move), start it
    if (!this.isRunning) {
      this.start();
    } else {
      this.tick();
    }

    const emtMs = Math.max(100, this.currentMoveElapsedMs);

    // Apply Fischer increment in countdown mode
    if (this.config.mode === 'countdown' && this.config.incrementSeconds > 0) {
      const incMs = this.config.incrementSeconds * 1000;
      if (mover === 'w') {
        this.whiteTimeMs += incMs;
      } else {
        this.blackTimeMs += incMs;
      }
    }

    const snapshot = {
      emtMs,
      whiteClkMs: this.whiteTimeMs,
      blackClkMs: this.blackTimeMs
    };

    // Reset per-move timer & switch side
    this.currentMoveElapsedMs = 0;
    this.activeSide = mover === 'w' ? 'b' : 'w';
    this.lastTickTimestamp = Date.now();

    this.emitTick();
    return snapshot;
  }

  /**
   * Restores clock values when an Undo operation happens
   */
  public restoreClock(prevWhiteMs: number, prevBlackMs: number, activeSide: 'w' | 'b'): void {
    this.whiteTimeMs = prevWhiteMs;
    this.blackTimeMs = prevBlackMs;
    this.currentMoveElapsedMs = 0;
    this.activeSide = activeSide;
    this.lastTickTimestamp = Date.now();
    this.emitTick();
  }

  private emitTick(): void {
    this.onTick?.({
      whiteTimeMs: this.whiteTimeMs,
      blackTimeMs: this.blackTimeMs,
      currentMoveElapsedMs: this.currentMoveElapsedMs,
      overallElapsedMs: this.overallElapsedMs,
      activeSide: this.activeSide
    });
  }
}

/** Formats ms to MM:SS or H:MM:SS */
export function formatDisplayClock(ms: number, isCountdown = false): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // If countdown is under 20 seconds, show tenth of a second
  if (isCountdown && totalSeconds < 20) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Formats move thinking time e.g. "2.4s" or "1m 12s" */
export function formatShortEmt(ms: number): string {
  if (ms < 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs}s`;
}
