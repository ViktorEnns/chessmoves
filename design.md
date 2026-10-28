# Design Guidelines (`design.md`)

> *Note: Official brand/design tokens can be expanded here over time. Below are the enforced ergonomic, layout, and contrast rules learned from v1.0 testing.*

## 1. Responsive Viewport & Board Sizing
- **No Arbitrary Small Max-Width Cap on Desktop:** Never cap the chessboard at a fixed `460px` on tablet or desktop viewports.
  - **Mobile Portrait (`< 768px`):** Board size `min(94vw, calc(100dvh - 230px))` so top/bottom player bars, move strip, and action buttons fit without scrolling.
  - **Desktop / Tablet Landscape (`>= 768px`):** Use a responsive two-column layout (`max-w-6xl mx-auto`) where the board + player bars scale up to `min(68vw, calc(100dvh - 180px), 760px)` on the left, and the move list table + export/game controls sit in a dedicated sidebar on the right (`320px–380px`).

## 2. Iconography & Button Contrast Rules
- **NEVER use OS System Emoji (`🔄`, `⏸️`, `▶️`, `⚙️`, `💾`, `📋`) for UI Controls:**
  - Windows and Android render these emoji inside a light-blue 3D box with white glyphs, creating poor contrast (white on light blue) and tiny visual targets.
  - **Always use crisp inline SVG icons (`stroke="currentColor"`, `20px–24px`) paired with explicit text labels.**
- **Minimum Touch & Click Targets:**
  - All primary controls (Flip, Pause/Resume, Navigation `|< < > >|`, Undo, Export/Analyze, Result) must have a minimum height of `44px` (`min-h-11 px-3.5 text-sm font-semibold`) with high-contrast dark surfaces (`bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700`) or high-contrast accent surfaces (`bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold`).

## 3. Prominent Export & Analysis Access
- **Export / Analyze** must be immediately visible in the main control area (both in the bottom control bar on mobile and in the right-hand control panel on desktop, as well as inside every saved game row in the Archive).
