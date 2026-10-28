---
name: vite-pwa-cloudflare
description: >-
  Error-free Vite + TypeScript + Tailwind CSS v4 + vite-plugin-pwa configuration and Screen Wake Lock API implementation for deploying an offline-first mobile PWA to Cloudflare Pages and GitHub Pages.
---

# Vite + Tailwind v4 + PWA + Cloudflare Deployment Skill

Use this skill when scaffolding the project (`package.json`, `vite.config.ts`, `tsconfig.json`, `src/wake-lock.ts`) to guarantee zero build errors on `npm run build` and Cloudflare Pages.

## 1. Exact `package.json` Dependencies
Use these exact compatible package versions so `npm install` and `npm run build` succeed without peer dependency or TypeScript conflicts:

```json
{
  "name": "otb-chess-recorder",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@lichess-org/chessground": "^10.0.0",
    "chess.js": "^1.4.0",
    "lucide": "^0.475.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "~5.7.2",
    "vite": "^6.1.0",
    "vite-plugin-pwa": "^0.21.1"
  }
}
```
*(Tip: You can also use inline SVG icons instead of `lucide` if you want even fewer dependencies).*

## 2. Error-Free `tsconfig.json`
CRITICAL: Always set `"noUnusedLocals": false` and `"noUnusedParameters": false` so that `tsc && vite build` never aborts on a minor unused helper parameter during automated builds:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

## 3. `vite.config.ts` with Tailwind v4 & Offline PWA
Configure `vite-plugin-pwa` with `registerType: 'autoUpdate'` and pre-cache all `.js`, `.css`, `.html`, and `.svg` files (including Chessground board/piece SVGs):

```ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // Works on both Cloudflare Pages root domain and GitHub Pages subpaths!
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'OTB Chess Recorder',
        short_name: 'ChessRec',
        description: 'Record over-the-board chess games with automatic per-move clock tracking and instant PGN export.',
        theme_color: '#18181b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
```

## 4. Screen Wake Lock API (`src/wake-lock.ts`)
During an Over-The-Board chess game, the phone sits on the table beside the board. Without Wake Lock, the phone screen dims and locks every 30–60 seconds.
Implement a defensive Wake Lock manager that automatically re-acquires the lock on `visibilitychange`:

```ts
class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;
  public enabled: boolean = true;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.enabled) {
        this.request();
      }
    });
  }

  async request(): Promise<boolean> {
    if (!('wakeLock' in navigator) || !this.enabled) return false;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    if (this.sentinel) {
      await this.sentinel.release().catch(() => {});
      this.sentinel = null;
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    if (enabled) {
      await this.request();
    } else {
      await this.release();
    }
  }
}

export const wakeLock = new WakeLockManager();
```
