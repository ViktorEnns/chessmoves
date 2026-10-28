import './style.css';
import { GameManager } from './game-state';
import { BoardController, isPromotion } from './board';
import { formatDisplayClock, formatShortEmt } from './clocks';
import { storage } from './storage';
import { wakeLock, sound } from './wake-lock';
import {
  generatePgn,
  copyPgnToClipboard,
  analyzeOnLichess,
  analyzeOnChessCom,
  downloadPgnFile,
  sharePgn,
  buildShareableGameUrl
} from './pgn-export';
import type { ClockConfig, AppSettings } from './types';
import type { Key } from '@lichess-org/chessground/types';

// App Settings & State
let settings: AppSettings = storage.loadSettings();
const game = new GameManager();

// Pending Promotion Move Storage
let pendingPromotion: { orig: Key; dest: Key } | null = null;

// UI Elements Query Helpers
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Initialize Wake Lock based on settings
wakeLock.setEnabled(settings.wakeLockEnabled);
sound.enabled = settings.soundEnabled;

// DOM Elements
const boardContainer = $('chessground-board');
const promoOverlay = $('promotion-overlay');
const historyBanner = $('history-banner');
const moveListScroll = $('move-list-scroll');
const overallTimeBadge = $('overall-time-badge');
const wakeLockDot = $('wake-lock-dot');
const archiveCountBadge = $('archive-count');

// Player bar elements
const topPlayerBar = $('top-player-bar');
const topPlayerColor = $('top-player-color');
const topPlayerName = $('top-player-name');
const topTurnIndicator = $('top-turn-indicator');
const topClock = $('top-clock');
const topLastEmt = $('top-last-emt');

const bottomPlayerBar = $('bottom-player-bar');
const bottomPlayerColor = $('bottom-player-color');
const bottomPlayerName = $('bottom-player-name');
const bottomTurnIndicator = $('bottom-turn-indicator');
const bottomClock = $('bottom-clock');
const bottomLastEmt = $('bottom-last-emt');

// Buttons
const btnFlip = $('btn-flip');
const btnPause = $('btn-pause');
const pauseIconWrap = $('pause-icon-wrap');
const pauseLabel = $('pause-label');
const btnNavFirst = $('btn-nav-first');
const btnNavPrev = $('btn-nav-prev');
const btnNavNext = $('btn-nav-next');
const btnNavLast = $('btn-nav-last');
const btnUndo = $('btn-undo');
const btnResult = $('btn-result');
const resultBadgeText = $('result-badge-text');
const btnJumpLive = $('btn-jump-live');
const btnExportBottom = $('btn-export-bottom');

// Modals
const modalNewGame = $('modal-new-game');
const modalExport = $('modal-export');
const modalArchive = $('modal-archive');
const modalResult = $('modal-result');
const modalSettings = $('modal-settings');

const SVG_PLAY = `<svg class="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const SVG_PAUSE = `<svg class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

// Board Controller
const board = new BoardController(boardContainer, {
  onMoveAttempt: (orig, dest) => {
    handleMoveAttempt(orig, dest);
  },
  onOrientationChange: () => {
    updatePlayerBars();
  }
});

// Sound feedback helper
function notifyMoveSound(san: string, inCheck: boolean, isOver: boolean) {
  if (isOver) {
    sound.play('gameEnd');
  } else if (inCheck) {
    sound.play('check');
  } else if (san.includes('x')) {
    sound.play('capture');
  } else {
    sound.play('move');
  }
}

// Move attempt logic
function handleMoveAttempt(orig: Key, dest: Key) {
  if (isPromotion(game.chess, orig, dest)) {
    pendingPromotion = { orig, dest };
    promoOverlay.classList.remove('hidden');
    return;
  }

  const success = game.makeMove(orig, dest);
  if (success) {
    const last = game.moves[game.moves.length - 1];
    notifyMoveSound(last.san, game.chess.inCheck(), game.chess.isGameOver());
    syncAll();
  } else {
    syncBoard();
  }
}

// Promotion Choice Handling
promoOverlay.querySelectorAll('.promo-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const piece = (btn as HTMLElement).dataset.piece as 'q' | 'r' | 'b' | 'n';
    promoOverlay.classList.add('hidden');
    if (pendingPromotion) {
      const { orig, dest } = pendingPromotion;
      pendingPromotion = null;
      const success = game.makeMove(orig, dest, piece);
      if (success) {
        const last = game.moves[game.moves.length - 1];
        notifyMoveSound(last.san, game.chess.inCheck(), game.chess.isGameOver());
        syncAll();
      } else {
        syncBoard();
      }
    }
  });
});

$('promo-cancel').addEventListener('click', () => {
  pendingPromotion = null;
  promoOverlay.classList.add('hidden');
  syncBoard();
});

// Synchronize UI
function syncBoard() {
  board.sync({
    liveChess: game.chess,
    displayFen: game.getDisplayFen(),
    lastMove: game.getLastMoveCoords(),
    isLivePosition: game.viewPly === game.moves.length,
    isGameOver: game.metadata.result !== '*' || game.chess.isGameOver(),
    autoRotate: settings.autoRotate
  });
}

function updatePauseButtonUI() {
  if (game.clock.isRunning) {
    pauseIconWrap.innerHTML = SVG_PAUSE;
    pauseLabel.textContent = 'Pause';
  } else {
    pauseIconWrap.innerHTML = SVG_PLAY;
    pauseLabel.textContent = game.moves.length > 0 ? 'Resume' : 'Start Clock';
  }
}

function updatePlayerBars() {
  const isWhiteBottom = board.orientation === 'white';
  const turn = game.chess.turn();
  const isCountdown = game.metadata.clockConfig.mode === 'countdown';

  const topColorIsBlack = isWhiteBottom;
  const topSide: 'w' | 'b' = topColorIsBlack ? 'b' : 'w';
  const bottomSide: 'w' | 'b' = topColorIsBlack ? 'w' : 'b';

  // Names
  topPlayerName.textContent = topSide === 'w' ? game.metadata.white : game.metadata.black;
  bottomPlayerName.textContent = bottomSide === 'w' ? game.metadata.white : game.metadata.black;

  // Swatch styles
  if (topSide === 'w') {
    topPlayerColor.className = 'w-3.5 h-3.5 rounded-full bg-white border-2 border-zinc-400';
  } else {
    topPlayerColor.className = 'w-3.5 h-3.5 rounded-full bg-zinc-900 border-2 border-zinc-400';
  }

  if (bottomSide === 'w') {
    bottomPlayerColor.className = 'w-3.5 h-3.5 rounded-full bg-white border-2 border-zinc-400';
  } else {
    bottomPlayerColor.className = 'w-3.5 h-3.5 rounded-full bg-zinc-900 border-2 border-zinc-400';
  }

  // Turn Indicators & Active Highlights
  const isTopTurn = turn === topSide && game.metadata.result === '*';
  const isBottomTurn = turn === bottomSide && game.metadata.result === '*';

  if (isTopTurn) {
    topTurnIndicator.classList.remove('hidden');
    topPlayerBar.classList.add('border-amber-500', 'bg-zinc-800/95');
    topPlayerBar.classList.remove('border-zinc-800');
  } else {
    topTurnIndicator.classList.add('hidden');
    topPlayerBar.classList.remove('border-amber-500', 'bg-zinc-800/95');
    topPlayerBar.classList.add('border-zinc-800');
  }

  if (isBottomTurn) {
    bottomTurnIndicator.classList.remove('hidden');
    bottomPlayerBar.classList.add('border-amber-500', 'bg-zinc-800/95');
    bottomPlayerBar.classList.remove('border-zinc-800');
  } else {
    bottomTurnIndicator.classList.add('hidden');
    bottomPlayerBar.classList.remove('border-amber-500', 'bg-zinc-800/95');
    bottomPlayerBar.classList.add('border-zinc-800');
  }

  // Clocks
  const topMs = topSide === 'w' ? game.clock.whiteTimeMs : game.clock.blackTimeMs;
  const bottomMs = bottomSide === 'w' ? game.clock.whiteTimeMs : game.clock.blackTimeMs;

  topClock.textContent = formatDisplayClock(topMs, isCountdown);
  bottomClock.textContent = formatDisplayClock(bottomMs, isCountdown);

  // Last Move EMT
  const moves = game.moves;
  const lastTopMove = [...moves].reverse().find((m) => m.color === topSide);
  const lastBottomMove = [...moves].reverse().find((m) => m.color === bottomSide);

  topLastEmt.textContent = lastTopMove ? `+${formatShortEmt(lastTopMove.emtMs)}` : '';
  bottomLastEmt.textContent = lastBottomMove ? `+${formatShortEmt(lastBottomMove.emtMs)}` : '';
}

function updateMoveList() {
  if (game.moves.length === 0) {
    moveListScroll.innerHTML = '<span class="text-zinc-400 italic px-2">Make a move on the board to start recording...</span>';
    return;
  }

  let html = '';
  for (let i = 0; i < game.moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const w = game.moves[i];
    const b = game.moves[i + 1];

    const wActive = game.viewPly === w.ply;
    const bActive = b && game.viewPly === b.ply;

    html += `<div class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/70">
      <span class="text-zinc-400 font-mono text-xs">${moveNum}.</span>
      <button data-ply="${w.ply}" class="move-jump-btn font-bold px-1.5 py-0.5 rounded hover:bg-zinc-700 cursor-pointer ${wActive ? 'bg-amber-500 text-zinc-950' : 'text-zinc-100'}">
        ${w.san} <span class="text-[11px] ${wActive ? 'text-zinc-900' : 'text-zinc-400'} font-normal">(${formatShortEmt(w.emtMs)})</span>
      </button>`;

    if (b) {
      html += `<button data-ply="${b.ply}" class="move-jump-btn font-bold px-1.5 py-0.5 rounded hover:bg-zinc-700 cursor-pointer ${bActive ? 'bg-amber-500 text-zinc-950' : 'text-zinc-100'}">
        ${b.san} <span class="text-[11px] ${bActive ? 'text-zinc-900' : 'text-zinc-400'} font-normal">(${formatShortEmt(b.emtMs)})</span>
      </button>`;
    }

    html += `</div>`;
  }

  moveListScroll.innerHTML = html;
  moveListScroll.scrollLeft = moveListScroll.scrollWidth;

  moveListScroll.querySelectorAll('.move-jump-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ply = parseInt((btn as HTMLElement).dataset.ply || '0', 10);
      game.goToPly(ply);
      syncAll();
    });
  });
}

function syncAll() {
  syncBoard();
  updatePlayerBars();
  updateMoveList();
  updatePauseButtonUI();

  if (game.viewPly < game.moves.length) {
    historyBanner.classList.remove('hidden');
  } else {
    historyBanner.classList.add('hidden');
  }

  resultBadgeText.textContent = game.metadata.result;
  overallTimeBadge.textContent = formatDisplayClock(game.clock.overallElapsedMs, false);

  storage.saveActiveGame(game.toSavedGame());
}

// Clock tick listener
game.clock.onTick = (snap) => {
  const isCountdown = game.metadata.clockConfig.mode === 'countdown';
  const isWhiteBottom = board.orientation === 'white';
  const topSide = isWhiteBottom ? 'b' : 'w';
  const bottomSide = isWhiteBottom ? 'w' : 'b';

  topClock.textContent = formatDisplayClock(topSide === 'w' ? snap.whiteTimeMs : snap.blackTimeMs, isCountdown);
  bottomClock.textContent = formatDisplayClock(bottomSide === 'w' ? snap.whiteTimeMs : snap.blackTimeMs, isCountdown);
  overallTimeBadge.textContent = formatDisplayClock(snap.overallElapsedMs, false);
};

// Clock Flag Listener
game.clock.onFlag = (flaggedSide) => {
  sound.play('gameEnd');
  const winner = flaggedSide === 'w' ? 'Black' : 'White';
  game.setResult(flaggedSide === 'w' ? '0-1' : '1-0');
  game.metadata.termination = `Time forfeit (${flaggedSide === 'w' ? 'White' : 'Black'} ran out of time)`;
  showToast(`Time Out! ${winner} wins on time.`);
  syncAll();
};

// Controls
btnFlip.addEventListener('click', () => {
  board.flip();
  updatePlayerBars();
});

btnPause.addEventListener('click', () => {
  game.clock.togglePause();
  updatePauseButtonUI();
  storage.saveActiveGame(game.toSavedGame());
});

btnNavFirst.addEventListener('click', () => {
  game.goToPly(0);
  syncAll();
});

btnNavPrev.addEventListener('click', () => {
  game.goToPly(game.viewPly - 1);
  syncAll();
});

btnNavNext.addEventListener('click', () => {
  game.goToPly(game.viewPly + 1);
  syncAll();
});

btnNavLast.addEventListener('click', () => {
  game.jumpToLive();
  syncAll();
});

btnJumpLive.addEventListener('click', () => {
  game.jumpToLive();
  syncAll();
});

btnUndo.addEventListener('click', () => {
  if (game.moves.length === 0) return;
  const ok = game.undoLastMove();
  if (ok) {
    showToast('Last half-move undone');
    syncAll();
  }
});

btnResult.addEventListener('click', () => {
  modalResult.classList.remove('hidden');
});

$('close-modal-result').addEventListener('click', () => {
  modalResult.classList.add('hidden');
});

modalResult.querySelectorAll('.res-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const res = (btn as HTMLElement).dataset.res as '1-0' | '0-1' | '1/2-1/2' | '*';
    game.setResult(res);
    modalResult.classList.add('hidden');
    syncAll();
  });
});

// Toast notification
function showToast(msg: string) {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = 'px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-100 text-xs md:text-sm font-semibold shadow-xl border border-amber-500/50 transition transform duration-200 pointer-events-auto';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

// NEW GAME MODAL
$('btn-new-game').addEventListener('click', () => {
  modalNewGame.classList.remove('hidden');
});
$('close-modal-new-game').addEventListener('click', () => {
  modalNewGame.classList.add('hidden');
});

let selectedMode: 'stopwatch' | 'countdown' = 'stopwatch';
let selectedMin: number = 10;
let selectedInc: number = 0;

$('mode-stopwatch').addEventListener('click', () => {
  selectedMode = 'stopwatch';
  $('mode-stopwatch').className = 'mode-select-btn px-3 py-2 rounded-lg font-semibold border border-amber-500 bg-amber-500/20 text-amber-300 cursor-pointer';
  $('mode-countdown').className = 'mode-select-btn px-3 py-2 rounded-lg font-semibold border border-zinc-700 bg-zinc-800 text-zinc-200 cursor-pointer';
  $('countdown-options').classList.add('hidden');
});

$('mode-countdown').addEventListener('click', () => {
  selectedMode = 'countdown';
  $('mode-countdown').className = 'mode-select-btn px-3 py-2 rounded-lg font-semibold border border-amber-500 bg-amber-500/20 text-amber-300 cursor-pointer';
  $('mode-stopwatch').className = 'mode-select-btn px-3 py-2 rounded-lg font-semibold border border-zinc-700 bg-zinc-800 text-zinc-200 cursor-pointer';
  $('countdown-options').classList.remove('hidden');
});

document.querySelectorAll('.tc-preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tc-preset-btn').forEach((b) => {
      b.className = 'tc-preset-btn px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 hover:border-amber-500 text-zinc-100 font-semibold cursor-pointer';
    });
    btn.className = 'tc-preset-btn px-2 py-1.5 rounded bg-zinc-800 border border-amber-500 bg-amber-500/20 text-amber-300 font-semibold cursor-pointer';
    selectedMin = parseInt((btn as HTMLElement).dataset.min || '10', 10);
    selectedInc = parseInt((btn as HTMLElement).dataset.inc || '0', 10);
    ($('custom-minutes') as HTMLInputElement).value = '';
    ($('custom-increment') as HTMLInputElement).value = '';
  });
});

$('btn-start-new-game').addEventListener('click', () => {
  const customMin = parseInt(($('custom-minutes') as HTMLInputElement).value, 10);
  const customInc = parseInt(($('custom-increment') as HTMLInputElement).value, 10);
  if (!isNaN(customMin) && customMin > 0) {
    selectedMin = customMin;
    selectedInc = isNaN(customInc) ? 0 : customInc;
  }

  const config: ClockConfig = {
    mode: selectedMode,
    initialMinutes: selectedMin,
    incrementSeconds: selectedInc
  };

  const white = ($('input-white') as HTMLInputElement).value;
  const black = ($('input-black') as HTMLInputElement).value;
  const event = ($('input-event') as HTMLInputElement).value;
  const fen = ($('input-fen') as HTMLInputElement).value;

  const ok = game.startNewGame({
    config,
    white,
    black,
    event,
    initialFen: fen
  });

  if (!ok) {
    $('fen-error').classList.remove('hidden');
    return;
  }

  // Clear ?pgn= query parameter if present so refreshes don't overwrite the new game
  if (window.location.search.includes('pgn=')) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  $('fen-error').classList.add('hidden');
  modalNewGame.classList.add('hidden');
  board.setOrientation('white');
  syncAll();
  showToast('New game started');
});

// EXPORT MODAL & ANALYSIS (Triggered from both Top Header AND Bottom Control Bar)
function openExportModal() {
  updateExportPgn();
  modalExport.classList.remove('hidden');
}

$('btn-export').addEventListener('click', openExportModal);
btnExportBottom.addEventListener('click', openExportModal);

$('close-modal-export').addEventListener('click', () => {
  modalExport.classList.add('hidden');
});

function updateExportPgn() {
  const includeClocks = ($('chk-include-clocks') as HTMLInputElement).checked;
  const pgn = generatePgn(game.metadata, game.moves, includeClocks);
  ($('pgn-textarea') as HTMLTextAreaElement).value = pgn;
  return pgn;
}

$('chk-include-clocks').addEventListener('change', () => {
  updateExportPgn();
});

$('btn-copy-pgn').addEventListener('click', async () => {
  const pgn = updateExportPgn();
  const ok = await copyPgnToClipboard(pgn);
  if (ok) showToast('PGN copied to clipboard');
});

$('btn-copy-share-link').addEventListener('click', async () => {
  const pgn = generatePgn(game.metadata, game.moves, true);
  const shareUrl = buildShareableGameUrl(pgn);
  const ok = await copyPgnToClipboard(shareUrl);
  if (ok) showToast('Shareable Game URL copied! Anyone with this link can view this game.');
});

$('btn-download-pgn').addEventListener('click', () => {
  const pgn = updateExportPgn();
  downloadPgnFile(pgn, `${game.metadata.white}_vs_${game.metadata.black}_${game.metadata.date}`);
  showToast('PGN file downloaded');
});

$('btn-share-pgn').addEventListener('click', async () => {
  const pgn = updateExportPgn();
  const ok = await sharePgn(pgn, `${game.metadata.white} vs ${game.metadata.black}`);
  if (!ok) {
    await copyPgnToClipboard(pgn);
    showToast('PGN copied to clipboard');
  }
});

// 1-Tap Lichess
$('btn-export-lichess').addEventListener('click', async () => {
  const pgn = updateExportPgn();
  showToast('Importing to Lichess...');
  try {
    await analyzeOnLichess(pgn);
    showToast('Opened Lichess analysis!');
  } catch {
    showToast('PGN copied — paste on Lichess import page');
  }
});

// 1-Tap Chess.com
$('btn-export-chesscom').addEventListener('click', () => {
  const pgn = updateExportPgn();
  analyzeOnChessCom(pgn);
  showToast('PGN copied! Tap "Load" in Chess.com Analysis to paste.');
});

// ARCHIVE DRAWER
$('btn-archive').addEventListener('click', () => {
  renderArchive();
  modalArchive.classList.remove('hidden');
});
$('close-modal-archive').addEventListener('click', () => {
  modalArchive.classList.add('hidden');
});

$('btn-save-current').addEventListener('click', () => {
  storage.saveToArchive(game.toSavedGame());
  updateArchiveBadge();
  renderArchive();
  showToast('Game saved to local Archive');
});

function updateArchiveBadge() {
  const list = storage.loadArchive();
  if (list.length > 0) {
    archiveCountBadge.textContent = String(list.length);
    archiveCountBadge.classList.remove('hidden');
  } else {
    archiveCountBadge.classList.add('hidden');
  }
}

function renderArchive() {
  const list = storage.loadArchive();
  const archiveListEl = $('archive-list');
  if (list.length === 0) {
    archiveListEl.innerHTML = '<div class="text-xs text-zinc-500 text-center py-4">No saved games in archive</div>';
    return;
  }

  archiveListEl.innerHTML = list.map((g) => {
    const movesCount = Math.ceil(g.moves.length / 2);
    return `
      <div class="p-3 rounded-lg bg-zinc-800/90 border border-zinc-700 flex flex-col gap-2 text-xs md:text-sm">
        <div class="flex items-center justify-between">
          <span class="font-bold text-zinc-100">${g.metadata.white} vs ${g.metadata.black}</span>
          <span class="font-mono text-amber-400 font-bold">${g.metadata.result}</span>
        </div>
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span>${g.metadata.date} • ${movesCount} moves</span>
          <span>${g.metadata.clockConfig.mode === 'countdown' ? `${g.metadata.clockConfig.initialMinutes}+${g.metadata.clockConfig.incrementSeconds}` : 'Stopwatch'}</span>
        </div>
        <div class="flex items-center justify-end gap-2 mt-1">
          <button data-load-id="${g.metadata.id}" class="archive-load-btn px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer">Load</button>
          <button data-export-id="${g.metadata.id}" class="archive-export-btn px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold text-xs cursor-pointer">Export PGN</button>
          <button data-delete-id="${g.metadata.id}" class="archive-del-btn px-2.5 py-1 rounded bg-zinc-800 hover:bg-rose-900 border border-zinc-700 text-zinc-300 text-xs cursor-pointer">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  archiveListEl.querySelectorAll('.archive-load-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.loadId;
      const target = list.find((g) => g.metadata.id === id);
      if (target) {
        game.loadSavedGame(target);
        modalArchive.classList.add('hidden');
        board.setOrientation('white');
        syncAll();
        showToast('Archived game loaded');
      }
    });
  });

  archiveListEl.querySelectorAll('.archive-export-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.exportId;
      const target = list.find((g) => g.metadata.id === id);
      if (target) {
        game.loadSavedGame(target);
        modalArchive.classList.add('hidden');
        syncAll();
        openExportModal();
      }
    });
  });

  archiveListEl.querySelectorAll('.archive-del-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.deleteId;
      if (id) {
        storage.deleteFromArchive(id);
        updateArchiveBadge();
        renderArchive();
      }
    });
  });
}

// SETTINGS MODAL
$('btn-settings').addEventListener('click', () => {
  ($('setting-auto-rotate') as HTMLInputElement).checked = settings.autoRotate;
  ($('setting-wake-lock') as HTMLInputElement).checked = settings.wakeLockEnabled;
  ($('setting-sound') as HTMLInputElement).checked = settings.soundEnabled;
  modalSettings.classList.remove('hidden');
});
$('close-modal-settings').addEventListener('click', () => {
  modalSettings.classList.add('hidden');
});

$('setting-auto-rotate').addEventListener('change', (e) => {
  settings.autoRotate = (e.target as HTMLInputElement).checked;
  storage.saveSettings(settings);
  syncBoard();
});

$('setting-wake-lock').addEventListener('change', (e) => {
  settings.wakeLockEnabled = (e.target as HTMLInputElement).checked;
  storage.saveSettings(settings);
  wakeLock.setEnabled(settings.wakeLockEnabled);
  if (settings.wakeLockEnabled) {
    wakeLockDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
  } else {
    wakeLockDot.className = 'w-2.5 h-2.5 rounded-full bg-zinc-600';
  }
});

$('setting-sound').addEventListener('change', (e) => {
  settings.soundEnabled = (e.target as HTMLInputElement).checked;
  storage.saveSettings(settings);
  sound.enabled = settings.soundEnabled;
});

// Rules Modal / Page Link (Opens seamlessly in a new tab without interrupting live game or clock)
function openRulesPage() {
  window.open('../chess-rules.html', '_blank', 'noopener');
}

const btnRules = $('btn-rules');
if (btnRules) {
  btnRules.addEventListener('click', openRulesPage);
}
const settingRulesBtn = $('setting-rules-btn');
if (settingRulesBtn) {
  settingRulesBtn.addEventListener('click', openRulesPage);
}

// App Startup:
// 1. Check if a shared game PGN was passed via URL (?pgn=...)
const urlParams = new URLSearchParams(window.location.search);
const sharedPgn = urlParams.get('pgn');
if (sharedPgn && game.loadFromPgnString(sharedPgn)) {
  showToast('Loaded shared game from URL!');
} else {
  // 2. Otherwise restore active game from localStorage
  const activeGame = storage.loadActiveGame();
  if (activeGame) {
    game.loadSavedGame(activeGame);
  }
}

updateArchiveBadge();
syncAll();
