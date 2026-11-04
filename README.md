# Maze Generator

A maze generator that runs entirely in your browser — vanilla HTML, CSS
and JavaScript, no libraries, no build step, no network requests.
Generate mazes with four classic algorithms, watch them build, solve
them, download them as PNGs, switch between three themes, and walk them
yourself on a playable page.

## Features

- **Four algorithms** — Recursive Backtracker, Prim's, Kruskal's and
  Recursive Division, each with its own description and maze character.
- **Animated generation** — watch the maze carve itself, with
  Slow / Normal / Fast / Instant speeds.
- **Sizing** — square (1:1) by default; a **Linked / Free** toggle in
  the Size section either keeps width and height identical or lets you
  set columns and rows independently.
- **Solver** — breadth-first search finds the shortest path and reveals
  it with a short animation.
- **PNG export** — downloads *only* the maze (background, accent border
  and padding included) at a 1600 px long side, preserving the maze's
  proportions.
- **Three themes** — Midnight (default), Light and Dark, switchable from
  the header on every page, remembered between visits, with no flash of
  the wrong colours.
- **Playable mazes** — press **Play** to open the game page and walk the
  maze you just built with the arrow keys, WASD or the on-screen d-pad;
  timer, move counter, trail and a win banner included.
- **Keyboard-first** — shortcuts for everything (see below).
- **Responsive** — works on desktop and mobile widths.

## Quick start

No installation, no dependencies:

1. Download or clone this repository.
2. Open **`index.html`** in any modern browser — double-clicking the
   file works; nothing is loaded from the network.

Or serve the folder if you prefer:

```bash
npx serve .          # or
python -m http.server
```

## Controls

| Where | Key / action | What it does |
| --- | --- | --- |
| Generator | `G` | Generate a maze with the current settings |
| Generator | `S` | Solve the current maze |
| Generator | `C` | Clear the solution |
| Generator | `P` | Play the current maze (also the ▶ button / header link) |
| Generator | Sliders | Size in cells; **Linked** keeps them equal, **Free** sets them separately |
| Game | Arrow keys / `W` `A` `S` `D` | Move |
| Game | `R` | Restart |
| Header | Midnight / Light / Dark | Switch colour theme (persisted) |

## Project structure

```
maze_gen_v1/
├── index.html            ← homepage: the generator
├── css/
│   ├── base.css          ← reset, typography, shape & spacing tokens
│   ├── themes/           ← colour themes, one file per concern
│   │   ├── midnight.css  ← default palette (all colour tokens)
│   │   ├── light.css     ← light palette overrides
│   │   ├── dark.css      ← dark palette overrides
│   │   └── switcher.css  ← header theme switcher styles
│   ├── layout.css        ← header, app grid, footer
│   ├── nav.css           ← header nav: capsule, gliding pill, motion
│   ├── controls.css      ← panel, inputs, buttons, stats, size link
│   ├── maze.css          ← canvas stage & status bar
│   └── pages.css         ← static content pages
├── js/
│   ├── themes/theme.js   ← theme switching + persistence (loads first)
│   ├── nav.js            ← animated nav indicator (gliding pill + trail)
│   ├── config.js         ← constants, options, defaults
│   ├── maze.js           ← grid model + 4 generators + (de)serialise
│   ├── solver.js         ← BFS shortest-path solver
│   ├── renderer.js       ← canvas drawing + PNG export
│   ├── animation.js      ← frame-based animation loop
│   ├── controls.js       ← DOM wiring for the panel
│   └── main.js           ← bootstrap, orchestration, Play handoff
├── game/                 ← the playable maze (own page + logic)
│   ├── index.html        ← play page
│   ├── game.css          ← d-pad, win banner, empty state
│   ├── session.js        ← reads the handed-over maze
│   ├── engine.js         ← movement rules, timer, win detection
│   ├── game-renderer.js  ← player + trail overlay canvas
│   └── main.js           ← play page bootstrap
└── pages/
    └── about.html        ← how it works: algorithms, docs, shortcuts
```

One file per concern: CSS split by style area, JS split by logic area,
pages in their own directories, theme files isolated in `css/themes/`
with the theme logic in `js/themes/`.

## Browser support

Any current evergreen browser (Chrome, Edge, Firefox, Safari). Everything
runs locally; the theme and the handed-over maze are kept in
`localStorage`.

## License

**Not open source.** This project is released under a proprietary
**Free-to-Use License** — you may run and use the app as-is for your
personal use cases, free of charge.

Modifications, redistribution, commercial use, or any custom use case
beyond that: **contact the developer — Shibsundar Chakrabor.**

See [LICENSE](LICENSE) for the full terms.
