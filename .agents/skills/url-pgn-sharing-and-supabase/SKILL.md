---
name: url-pgn-sharing-and-supabase
description: >-
  How to share recorded chess games across devices via stateless URL hash/query PGN encoding (?pgn=...) and how to optionally sync games to a lightweight Supabase single-table backend.
---

# URL PGN Sharing & Optional Supabase Sync Skill

Use this skill when implementing cross-device game sharing (`?pgn=` shareable links) or optional cloud persistence with Supabase.

## 1. Stateless Shareable Game Links (`?pgn=...` or `#pgn=...`)
Because `localStorage` only lives inside the browser on the specific phone/computer where moves were recorded, another person opening the base URL (`viktorenns.de/chessmoves`) will see a blank new game unless the game data is passed in the URL or stored in a database.

### Zero-Backend Solution: Shareable Link with Encoded PGN
Encode the game's PGN (including `[%clk]` and `[%emt]` tags) into a URL parameter so anyone clicking the link immediately loads the exact game, moves, and clock readings:

```ts
export function createShareableGameUrl(pgn: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('pgn', pgn);
  return url.toString();
}

export function getSharedPgnFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('pgn');
}
```
When the app boots in `src/main.ts`, check `getSharedPgnFromUrl()`. If present, parse the headers, moves, and `{[%clk ...] [%emt ...]}` comments and load the game onto the board immediately!

## 2. Optional Supabase Cloud Sync Architecture
If you want a persistent cloud archive across all your devices without needing long URLs:
- **Single Table Schema (`chess_games`):**
  ```sql
  create table public.chess_games (
    id text primary key,
    short_code text unique not null,
    white text not null default 'White',
    black text not null default 'Black',
    event text not null default 'OTB Game',
    result text not null default '*',
    pgn text not null,
    moves_json jsonb not null,
    created_at timestamptz not null default now()
  );
  alter table public.chess_games enable row level security;
  create policy "Public read access" on public.chess_games for select using (true);
  create policy "Public insert/update" on public.chess_games for insert with check (true);
  ```
- **Local-First Hybrid Pattern:** Always save to `localStorage` first (zero latency, works 100% offline in tournament halls), then sync to Supabase in the background when `navigator.onLine` is true and `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are configured.
