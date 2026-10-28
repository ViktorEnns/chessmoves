import type { SavedGame, AppSettings } from './types';

const STORAGE_KEY_ACTIVE = 'otb_chess_active_game_v1';
const STORAGE_KEY_ARCHIVE = 'otb_chess_archive_v1';
const STORAGE_KEY_SETTINGS = 'otb_chess_settings_v1';

export const defaultSettings: AppSettings = {
  autoRotate: false,       // Fixed board orientation by default!
  wakeLockEnabled: true,
  soundEnabled: true,
  includeClockInPgn: true
};

export const storage = {
  loadActiveGame(): SavedGame | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ACTIVE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveActiveGame(game: SavedGame): void {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(game));
    } catch (e) {
      console.warn('Failed to save active game', e);
    }
  },

  clearActiveGame(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    } catch {}
  },

  loadArchive(): SavedGame[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ARCHIVE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveToArchive(game: SavedGame): void {
    try {
      const list = this.loadArchive();
      // Filter out duplicate ID if already in archive
      const filtered = list.filter((g) => g.metadata.id !== game.metadata.id);
      filtered.unshift(game);
      // Keep up to 100 games
      if (filtered.length > 100) filtered.length = 100;
      localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to save to archive', e);
    }
  },

  deleteFromArchive(gameId: string): void {
    try {
      const list = this.loadArchive().filter((g) => g.metadata.id !== gameId);
      localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(list));
    } catch {}
  },

  loadSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (data) {
        return { ...defaultSettings, ...JSON.parse(data) };
      }
    } catch {}
    return { ...defaultSettings };
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {}
  }
};
