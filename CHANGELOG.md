# Changelog

Notable changes to this project, newest first.

## [1.0.0] — 2026-11-04

Initial release.

### Added

- Four maze generation algorithms — Recursive Backtracker, Prim's,
  Kruskal's and Recursive Division — as step-by-step generator events
  with a frame-budgeted animation loop (Slow / Normal / Fast / Instant).
- Square (1:1) sizing by default with a **Linked / Free** toggle in the
  Size section: linked keeps width and height identical, free sets
  columns and rows independently (re-linking snaps back to square).
- Breadth-first-search solver with an animated shortest-path reveal.
- PNG export of the maze only — background, accent border and padding,
  no page chrome — at a 1600 px long side, aspect preserved (square
  mazes export 1600 × 1600).
- Three colour themes — Midnight (default), Light and Dark — applied
  from `<head>` to avoid a flash, persisted in `localStorage`, with the
  canvas and PNG export following the theme.
- Play page (`game/`): walk the generated maze with arrow keys / WASD
  or the on-screen d-pad; timer, move counter, trail, win banner,
  restart, and an empty state when no maze has been handed over yet.
- Animated header navigation — capsule bar with a gliding pill
  indicator, staggered entrance and a fading trail (`css/nav.css`,
  `js/nav.js`).
- Keyboard shortcuts (`G`, `S`, `C`, `P`, arrows, `R`), responsive
  layout, and a status bar with live statistics.
- Documentation: README, LICENSE, CONTRIBUTING and this changelog.
