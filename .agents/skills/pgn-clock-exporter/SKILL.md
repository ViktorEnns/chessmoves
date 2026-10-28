---
name: pgn-clock-exporter
description: >-
  How to format and export Chess PGN strings with per-move clock annotations ([%clk H:MM:SS] and [%emt S.S]), and how to integrate 1-tap Lichess API import, Chess.com clipboard + analysis launch, Web Share API, and .pgn file download.
---

# PGN Clock Formatter & Platform Exporter Skill

Use this skill when building `src/pgn-export.ts` and `src/clocks.ts` so exported games include accurate per-move and overall time annotations recognized by **Chess.com**, **Lichess**, and **ChessBase**.

## 1. Formatting `%clk` and `%emt` Tags
Both Lichess and Chess.com parse `{[%clk H:MM:SS]}` inside PGN move comments to render move-time graphs in their analysis boards.
- **`%clk` (`H:MM:SS`):** In **Countdown** mode, this is the remaining clock time immediately after the move. In **Stopwatch** mode, this is the cumulative elapsed time for that player (or you can provide an option to export remaining time from a virtual base or elapsed time).
- **`%emt` (`S.S`):** The exact seconds spent thinking on that move (e.g., `[%emt 4.2]`).

```ts
export function formatClkTag(ms: number): string {
  const clamped = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatEmtTag(ms: number): string {
  const seconds = Math.max(0, ms / 1000).toFixed(1);
  return seconds;
}
```

## 2. Building the Annotated PGN String
Rather than relying solely on `chess.pgn()` if you maintain a custom `MoveRecord[]` array with clock metadata, construct the PGN headers and movetext cleanly (or replay into a fresh `Chess` instance using `chess.setComment()`):

```ts
export interface MoveRecord {
  ply: number;
  san: string;
  from: string;
  to: string;
  fenAfter: string;
  emtMs: number;       // Time spent on this specific move
  whiteClkMs: number;  // White's clock reading after this move
  blackClkMs: number;  // Black's clock reading after this move
}
```

When generating the PGN with `includeClocks = true`:
```ts
// Example comment attached to each move:
const clkValue = isWhiteMove ? move.whiteClkMs : move.blackClkMs;
const comment = `[%clk ${formatClkTag(clkValue)}] [%emt ${formatEmtTag(move.emtMs)}]`;
```
Example output:
```pgn
[Event "OTB Game"]
[Site "Mobile Recorder"]
[Date "2026.10.28"]
[Round "1"]
[White "White"]
[Black "Black"]
[Result "*"]
[TimeControl "-"]

1. e4 {[%clk 0:00:02] [%emt 2.1]} e5 {[%clk 0:00:03] [%emt 3.4]} 2. Nf3 {[%clk 0:00:07] [%emt 4.8]} *
```

## 3. One-Tap Lichess Analysis Import (`POST https://lichess.org/api/import`)
Lichess allows unauthenticated CORS `POST` requests to `/api/import` to create an instant analysis board URL:

```ts
export async function openInLichessAnalysis(pgn: string): Promise<string> {
  // Always copy to clipboard first as a reliable backup
  await navigator.clipboard.writeText(pgn).catch(() => {});

  const response = await fetch('https://lichess.org/api/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({ pgn }),
  });

  if (!response.ok) {
    // Fallback: open lichess paste page if rate-limited or offline
    window.open('https://lichess.org/paste', '_blank', 'noopener');
    throw new Error(`Lichess import returned ${response.status}`);
  }

  const data: { id: string; url: string } = await response.json();
  window.open(data.url, '_blank', 'noopener');
  return data.url;
}
```

## 4. One-Tap Chess.com Analysis Workflow
Chess.com does not accept unauthenticated `POST` PGN imports or `?pgn=` query strings on `/analysis`. The smooth workflow for mobile is:
1. Copy the PGN (with `[%clk]` tags) to the clipboard via `navigator.clipboard.writeText(pgn)`.
2. Show a clear toast banner: `"PGN copied to clipboard! Tap 'Load' on Chess.com to paste."`
3. Open `https://www.chess.com/analysis?tab=analysis` in a new tab after a brief `350ms` delay (or immediately in the click handler so mobile popup blockers don't block `window.open`).
   - **CRITICAL MOBILE TIP:** Mobile Safari and Chrome block `window.open()` if it happens *after* an `await` inside an `async` function! Always trigger `navigator.clipboard.writeText(pgn)` synchronously without awaiting before `window.open()`, OR copy first and provide a synchronous link/button.
