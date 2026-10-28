# 04 — PGN Export, Analysis Links & Cloudflare / GitHub Deployment Specification

> **Target Folder:** `e:/- CODE/Chess/otb-chess-recorder/src/`
> **Related Skill:** `pgn-clock-exporter`

---

## 1. `src/pgn-export.ts` — PGN Generator with `[%clk]` & `[%emt]`

### PGN Header Tags
Always include the Seven Tag Roster plus `TimeControl` and optional `FEN`/`SetUp` when a custom starting position is used:
```pgn
[Event "Casual OTB Game"]
[Site "OTB Chess Recorder"]
[Date "2026.10.28"]
[Round "1"]
[White "Player 1"]
[Black "Player 2"]
[Result "*"]
[TimeControl "600+0"]
```
- If `clockConfig.mode === 'stopwatch'`, set `[TimeControl "-"]`.
- If `clockConfig.mode === 'countdown'`, set `[TimeControl "${initialMinutes * 60}+${incrementSeconds}"]`.
- If `metadata.initialFen` differs from the standard starting FEN (`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`), include:
  ```pgn
  [SetUp "1"]
  [FEN "<metadata.initialFen>"]
  ```

### PGN Move Text with Clock Annotations
For each `MoveRecord` in `moves`:
- Format move number:
  - If `move.color === 'w'`, prefix with `${move.moveNumber}. `
  - If `move.color === 'b'` and it is the very first move of the game (from a custom Black-to-move FEN), prefix with `${move.moveNumber}... `
- When `includeClockComments === true`:
  - `clkMs = move.color === 'w' ? move.whiteClkMs : move.blackClkMs`
  - Append ` {[%clk ${formatClkTag(clkMs)}] [%emt ${formatEmtTag(move.emtMs)}]}` immediately after `move.san`.
- Append ` ${metadata.result}` at the end of the movetext.

---

## 2. Export & Platform Analysis Actions in `src/pgn-export.ts`

1. **Copy PGN to Clipboard (`copyPgnToClipboard(pgn: string)`):**
   - Uses `navigator.clipboard.writeText(pgn)` with a fallback hidden `<textarea>` `document.execCommand('copy')` so it works on every mobile browser.
2. **Analyze on Lichess (`analyzeOnLichess(pgn: string)`):**
   - Copies PGN to clipboard first.
   - Sends `POST https://lichess.org/api/import` with `Content-Type: application/x-www-form-urlencoded` and body `new URLSearchParams({ pgn })`.
   - Parses JSON `{ id, url }` and opens `data.url` in a new tab (`window.open(data.url, '_blank', 'noopener')`).
   - Also displays the clickable Lichess link inside the Export modal in case the mobile browser blocked the popup after the `fetch` call!
3. **Analyze on Chess.com (`analyzeOnChessCom(pgn: string)`):**
   - Synchronously triggers `copyPgnToClipboard(pgn)`.
   - Shows toast: `"PGN copied! In Chess.com Analysis, tap 'Load' -> Paste PGN."`
   - Opens `https://www.chess.com/analysis?tab=analysis` in a new tab immediately within the user click gesture.
4. **Download `.pgn` File (`downloadPgnFile(pgn: string, filename: string)`):**
   - Creates a `Blob([pgn], { type: 'application/x-chess-pgn;charset=utf-8' })` and triggers an `<a download="...pgn">` click.
5. **Native Mobile Share (`sharePgn(pgn: string, title: string)`):**
   - Checks `if (navigator.share)` and calls `navigator.share({ title, text: pgn })`.

---

## 3. Cloudflare Pages & GitHub Pages Deployment Guide (Include in `otb-chess-recorder/README.md`)

Write a concise `otb-chess-recorder/README.md` with instructions for deploying to **Cloudflare Pages** (connected to GitHub):

1. Push the repository to GitHub.
2. Log in to **Cloudflare Dashboard → Compute (Workers & Pages) → Create → Pages → Connect to Git**.
3. Select the GitHub repository and configure the build settings:
   - **Root directory:** `otb-chess-recorder` (or `/` if pushed from inside `otb-chess-recorder`)
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy**. Cloudflare Pages will build and publish the HTTPS PWA URL in ~25 seconds.
5. Open the link on your phone (iOS Safari: *Share → Add to Home Screen*; Android Chrome: *Install App / Add to Home Screen*) for full-screen standalone offline use.
