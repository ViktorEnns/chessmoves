# Workspace Agent Rules (GEMINI.md)

This workspace contains the **OTB Chess Recorder PWA** project.
Before writing or modifying code, ALWAYS read:
1. [`design.md`](./design.md) — UI/UX design guidelines, responsive board scaling, and button contrast rules.
2. [`plan/00-MASTER-PLAN.md`](./plan/00-MASTER-PLAN.md) & [`plan/05-V2-UI-EXPORT-DEPLOYMENT-PLAN.md`](./plan/05-V2-UI-EXPORT-DEPLOYMENT-PLAN.md) — Step-by-step execution checklists.
3. The custom skills in `.agents/skills/` (`chessground-chessjs-bridge`, `pgn-clock-exporter`, `vite-pwa-cloudflare`, `responsive-chess-ui-ergonomics`, and `url-pgn-sharing-and-supabase`).

## Core Guardrails for Gemini Flash
- **Target Project Directory:** Build the application inside `e:/- CODE/Chess/otb-chess-recorder/` (unless instructed otherwise).
- **Fixed Board Orientation by Default:** Do NOT auto-rotate the board after each move unless `settings.autoRotate === true`. By default, `autoRotate` MUST be `false`.
- **TypeScript Strictness:** In `tsconfig.json`, keep `"noUnusedLocals": false` and `"noUnusedParameters": false` so builds never fail due to minor unused variables.
- **Tailwind CSS v4:** Use `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss";` in `src/style.css`. Do NOT generate a legacy `tailwind.config.js` or PostCSS config.
- **Chessground CSS:** Always import `@lichess-org/chessground/assets/chessground.base.css`, `chessground.brown.css`, and `chessground.cburnett.css` in `src/style.css`.
- **Chessground Movable Color:** Because one or both players record moves on the same device, `movable.color` in Chessground must match the side whose turn it currently is (`'white'` or `'black'`), and `turnColor` must also be updated after every move.
- **Clocks & Timestamps:** Record elapsed move time (`emtMs`) and remaining/elapsed clock (`clkMs`) on every move, and embed `{[%clk H:MM:SS] [%emt S.S]}` into exported PGNs.
