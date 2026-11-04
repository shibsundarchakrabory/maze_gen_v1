/* =========================================================
   game/main.js — play page bootstrap.

   Loads the handed-over maze, stacks a player overlay on top of
   the shared maze renderer, and wires keyboard / d-pad / buttons
   to the engine. Also owns the HUD (moves, time, status), the win
   banner and the "no maze yet" empty state.
   Exposes: MazeGen.Game.App
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = global.MazeGen;
  var Game = MazeGen.Game;

  var session = null;      // { grid, settings }
  var engine = null;
  var renderer = null;     // shared renderer (maze, frame, S/E)
  var overlay = null;      // game renderer (trail + player)
  var timerId = null;

  var refs = {};

  /* ---------------- helpers ---------------- */

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheRefs() {
    refs.stage = byId('play-stage');
    refs.stack = byId('canvas-stack');
    refs.maze = byId('maze-canvas');
    refs.player = byId('player-canvas');
    refs.winBanner = byId('win-banner');
    refs.winDetail = byId('win-detail');
    refs.restart = byId('btn-restart');
    refs.again = byId('btn-again');
    refs.size = byId('game-size');
    refs.algorithm = byId('game-algorithm');
    refs.moves = byId('game-moves');
    refs.time = byId('game-time');
    refs.status = byId('game-status');
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatTime(ms) {
    var total = Math.floor(ms / 1000);
    var minutes = Math.floor(total / 60);
    return minutes + ':' + pad2(total % 60);
  }

  function setStatus(text) {
    refs.status.textContent = text;
  }

  /* ---------------- drawing & layout ---------------- */

  function draw() {
    renderer.draw({ grid: session.grid });
    overlay.draw(engine);
  }

  /*
    Both canvases fill the biggest square that fits the stage:
    the stack box is sized here, the shared renderer sizes the maze
    canvas from it, and the overlay mirrors that box exactly.
  */
  function layout() {
    if (!session) return;
    var side = Math.max(1, Math.min(refs.stage.clientWidth, refs.stage.clientHeight));
    refs.stack.style.width = side + 'px';
    refs.stack.style.height = side + 'px';
    renderer.resize();
    overlay.sync();
    draw();
  }

  /* ---------------- HUD ---------------- */

  function updateHud() {
    refs.moves.textContent = String(engine.state.moves);
    refs.time.textContent = formatTime(engine.elapsedMs());
  }

  /* ---------------- game flow ---------------- */

  /* One step in a direction; shared by keyboard, d-pad and the API. */
  function moveBy(dc, dr) {
    if (!engine) return null;
    var result = engine.move(dc, dr);

    if (result.blocked) {
      setStatus('Blocked — that wall is in the way.');
      return result;
    }
    if (!result.moved) return result;

    draw();
    updateHud();

    if (result.won) onWin();
    return result;
  }

  function onWin() {
    var time = formatTime(engine.elapsedMs());
    var moves = engine.state.moves;
    setStatus('Solved in ' + time + ' with ' + moves + ' moves.');
    refs.winDetail.textContent = time + ' · ' + moves + ' moves';
    refs.winBanner.hidden = false;
  }

  function restart() {
    if (!engine) return;
    engine.restart();
    refs.winBanner.hidden = true;
    draw();
    updateHud();
    setStatus('Go! Reach the E in the bottom-right corner.');
  }

  /* ---------------- input ---------------- */

  var KEY_DIRECTIONS = {
    arrowup: [0, -1],
    arrowright: [1, 0],
    arrowdown: [0, 1],
    arrowleft: [-1, 0],
    w: [0, -1],
    d: [1, 0],
    s: [0, 1],
    a: [-1, 0]
  };

  function bindKeyboard() {
    document.addEventListener('keydown', function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      var key = event.key.toLowerCase();
      var dir = KEY_DIRECTIONS[key];
      if (dir) {
        event.preventDefault(); // arrows must not scroll the page
        moveBy(dir[0], dir[1]);
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        restart();
      }
    });
  }

  function bindButtons() {
    refs.restart.addEventListener('click', restart);
    refs.again.addEventListener('click', restart);

    var pads = document.querySelectorAll('[data-move]');
    for (var i = 0; i < pads.length; i++) {
      (function (button) {
        button.addEventListener('click', function () {
          var parts = button.getAttribute('data-move').split(',');
          moveBy(parseInt(parts[0], 10), parseInt(parts[1], 10));
          button.blur(); // keep arrow-key movement for the page
        });
      })(pads[i]);
    }
  }

  function bindResize() {
    if (global.ResizeObserver) {
      var observer = new global.ResizeObserver(layout);
      observer.observe(refs.stage);
    } else {
      global.addEventListener('resize', layout);
    }
  }

  function showEmptyState() {
    document.body.classList.add('is-empty');
  }

  /* ---------------- boot ---------------- */

  function boot() {
    cacheRefs();

    session = Game.Session.read();
    if (!session) {
      showEmptyState();
      return;
    }

    engine = Game.Engine.create(session.grid);
    renderer = MazeGen.Renderer.create(refs.maze);
    overlay = Game.Renderer.create(refs.maze, refs.player);

    refs.size.textContent = session.settings.size + ' × ' + session.settings.size;
    refs.algorithm.textContent = session.settings.algorithmName || '—';

    /* canvas colours follow the header's theme switcher */
    MazeGen.Theme.onChange(function () {
      renderer.refreshTheme();
      overlay.refreshTheme();
      draw();
    });

    layout();
    bindResize();
    bindKeyboard();
    bindButtons();
    updateHud();
    setStatus('Use the arrows or WASD — reach the E in the bottom-right corner.');

    /* live timer (elapsedMs() freezes once the maze is solved) */
    timerId = global.setInterval(updateHud, 250);
  }

  /* Public API — handy for tests and console tinkering. */
  Game.App = {
    move: moveBy,
    canMove: function (dc, dr) {
      return engine ? engine.canMove(dc, dr) : false;
    },
    restart: restart,
    elapsed: function () {
      return engine ? engine.elapsedMs() : 0;
    },
    getState: function () {
      if (!engine) return null;
      return {
        col: engine.state.col,
        row: engine.state.row,
        moves: engine.state.moves,
        trail: engine.state.trail.length,
        started: engine.isStarted(),
        won: engine.isFinished(),
        goal: { col: engine.goal.col, row: engine.goal.row },
        cols: engine.grid.cols,
        rows: engine.grid.rows
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
