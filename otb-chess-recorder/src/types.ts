export type ClockMode = 'stopwatch' | 'countdown';

export interface ClockConfig {
  mode: ClockMode;
  initialMinutes: number;    // e.g. 10
  incrementSeconds: number;  // e.g. 0, 2, 5
}

export interface MoveRecord {
  ply: number;               // 1-indexed (1 = White move 1, 2 = Black move 1, etc.)
  moveNumber: number;        // 1, 1, 2, 2...
  color: 'w' | 'b';
  san: string;               // e.g. "e4", "Nf3", "O-O"
  from: string;              // e.g. "e2"
  to: string;                // e.g. "e4"
  promotion?: 'q' | 'r' | 'b' | 'n';
  fenBefore: string;
  fenAfter: string;
  emtMs: number;             // Elapsed thinking time for this move in milliseconds
  whiteClkMs: number;        // White clock time reading right after move
  blackClkMs: number;        // Black clock time reading right after move
  timestamp: number;         // Date.now() when move made
}

export interface GameMetadata {
  id: string;
  event: string;
  site: string;
  date: string;              // YYYY.MM.DD
  round: string;
  white: string;
  black: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  termination?: string;
  initialFen: string;        // Starting FEN
  clockConfig: ClockConfig;
  createdAt: number;
  updatedAt: number;
}

export interface SavedGame {
  metadata: GameMetadata;
  moves: MoveRecord[];
  whiteTimeMs: number;
  blackTimeMs: number;
  overallElapsedMs: number;
}

export interface AppSettings {
  autoRotate: boolean;       // MUST default to false!
  wakeLockEnabled: boolean;  // Default true
  soundEnabled: boolean;     // Default true
  includeClockInPgn: boolean;// Default true
}
