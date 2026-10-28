import type { GameMetadata, MoveRecord } from './types';

export function formatClkTag(ms: number): string {
  const clamped = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatEmtTag(ms: number): string {
  return Math.max(0, ms / 1000).toFixed(1);
}

export function generatePgn(
  metadata: GameMetadata,
  moves: MoveRecord[],
  includeClockComments: boolean = true
): string {
  const headers: string[] = [
    `[Event "${metadata.event}"]`,
    `[Site "${metadata.site}"]`,
    `[Date "${metadata.date}"]`,
    `[Round "${metadata.round}"]`,
    `[White "${metadata.white}"]`,
    `[Black "${metadata.black}"]`,
    `[Result "${metadata.result}"]`
  ];

  if (metadata.clockConfig.mode === 'countdown') {
    headers.push(`[TimeControl "${metadata.clockConfig.initialMinutes * 60}+${metadata.clockConfig.incrementSeconds}"]`);
  } else {
    headers.push(`[TimeControl "-"]`);
  }

  if (metadata.termination) {
    headers.push(`[Termination "${metadata.termination}"]`);
  }

  const standardFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  if (metadata.initialFen && metadata.initialFen !== standardFen) {
    headers.push(`[SetUp "1"]`);
    headers.push(`[FEN "${metadata.initialFen}"]`);
  }

  let moveText = '';
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.color === 'w') {
      moveText += `${m.moveNumber}. `;
    } else if (i === 0 && m.color === 'b') {
      moveText += `${m.moveNumber}... `;
    }

    moveText += m.san;

    if (includeClockComments) {
      const clkMs = m.color === 'w' ? m.whiteClkMs : m.blackClkMs;
      moveText += ` {[%clk ${formatClkTag(clkMs)}] [%emt ${formatEmtTag(m.emtMs)}]}`;
    }

    moveText += ' ';
  }

  moveText += metadata.result;

  return headers.join('\n') + '\n\n' + moveText.trim();
}

export async function copyPgnToClipboard(pgn: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(pgn);
      return true;
    }
  } catch {}

  // Fallback for older mobile webviews
  try {
    const ta = document.createElement('textarea');
    ta.value = pgn;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function analyzeOnLichess(pgn: string): Promise<string> {
  // Always copy PGN first as fallback
  copyPgnToClipboard(pgn);

  const response = await fetch('https://lichess.org/api/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({ pgn })
  });

  if (!response.ok) {
    window.open('https://lichess.org/paste', '_blank', 'noopener');
    throw new Error(`Lichess import returned ${response.status}`);
  }

  const data: { id: string; url: string } = await response.json();
  window.open(data.url, '_blank', 'noopener');
  return data.url;
}

export function analyzeOnChessCom(pgn: string): void {
  // 1. Copy PGN directly to clipboard
  copyPgnToClipboard(pgn);
  // 2. Open Chess.com analysis board immediately in the user interaction thread
  window.open('https://www.chess.com/analysis?tab=analysis', '_blank', 'noopener');
}

export function downloadPgnFile(pgn: string, filename: string): void {
  const blob = new Blob([pgn], { type: 'application/x-chess-pgn;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pgn') ? filename : `${filename}.pgn`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function sharePgn(pgn: string, title: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: pgn
      });
      return true;
    } catch {}
  }
  return false;
}

export function buildShareableGameUrl(pgn: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('pgn', pgn);
  return url.toString();
}

