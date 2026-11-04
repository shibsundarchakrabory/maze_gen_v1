/* =========================================================
   game/session.js — the handoff between pages.

   The generator (js/main.js play()) writes the current maze to
   localStorage under Config.STORAGE_KEY_PLAY; this reads it back
   and rebuilds a real grid via Maze.deserialize (the model owns
   the format). Anything missing or corrupt simply yields null so
   main.js can show the "no maze yet" empty state.
   Exposes: MazeGen.Game.Session
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});
  var Game = (MazeGen.Game = MazeGen.Game || {});

  var KEY = (MazeGen.Config && MazeGen.Config.STORAGE_KEY_PLAY) || 'maze-gen-game';

  function read() {
    var raw;
    try {
      raw = global.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
    if (!raw) return null;

    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!payload || typeof payload !== 'object') return null;

    var grid = MazeGen.Maze.deserialize(payload.maze);
    if (!grid) return null;

    var settings = payload.settings || {};
    return {
      grid: grid,
      settings: {
        algorithm: settings.algorithm || '',
        algorithmName: settings.algorithmName || '',
        size: isInt(settings.size) && settings.size > 0 ? settings.size : grid.cols
      },
      createdAt: payload.createdAt || 0
    };
  }

  function isInt(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  }

  Game.Session = { read: read };
})(window);
