/* =========================================================
   config.js — constants, options and defaults
   Exposes: MazeGen.Config
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});

  MazeGen.Config = {
    /* Grid size limits (mirrored on the range inputs in index.html).
       The maze is always square — rows === columns, a 1:1 ratio. */
    MIN_SIZE: 8,
    MAX_SIZE: 80,
    DEFAULT_SIZE: 24,

    /* generation methods offered in the UI */
    ALGORITHMS: [
      {
        id: 'backtracker',
        name: 'Recursive Backtracker',
        hint: 'Carves one long, windy path with backtracking. The classic all-rounder: few dead ends, long corridors.'
      },
      {
        id: 'prim',
        name: "Prim's Algorithm",
        hint: 'Grows outward from a single seed cell. Produces lots of short dead ends and a branching, tree-like feel.'
      },
      {
        id: 'kruskal',
        name: "Kruskal's Algorithm",
        hint: 'Shuffles every possible wall and joins regions at random. Gives an even, organic distribution of paths.'
      },
      {
        id: 'division',
        name: 'Recursive Division',
        hint: 'Starts with an open box and adds walls inward. Results in long corridors and rectangular rooms.'
      }
    ],

    /* animation speeds: target wall-clock seconds for a full build */
    SPEEDS: [
      { id: 'slow', name: 'Slow', targetSeconds: 14 },
      { id: 'normal', name: 'Normal', targetSeconds: 4 },
      { id: 'fast', name: 'Fast', targetSeconds: 1.2 },
      { id: 'instant', name: 'Instant', targetSeconds: 0.35 }
    ],

    DEFAULT_ALGORITHM: 'backtracker',
    DEFAULT_SPEED: 'normal',

    /* localStorage key used to hand the current maze over to the
       game page: written by play() in js/main.js, read by
       game/session.js */
    STORAGE_KEY_PLAY: 'maze-gen-game',

    /* animation tuning */
    FRAME_BUDGET_MS: 12,          // max ms of work per animation frame
    EVENTS_PER_CELL: 1,           // rough estimate of generator events per cell
    SOLUTION_TARGET_SECONDS: 0.7  // how long the solution path takes to draw
  };
})(window);
