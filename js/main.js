/* =========================================================
   main.js — application bootstrap. Wires the controls,
   generation, solving, animation and rendering together.
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = global.MazeGen;
  var Config = MazeGen.Config;
  var Controls = MazeGen.Controls;
  var Maze = MazeGen.Maze;
  var Solver = MazeGen.Solver;
  var Renderer = MazeGen.Renderer;
  var Animation = MazeGen.Animation;

  var renderer = null;
  var animator = null;

  var state = {
    grid: null,
    settings: null,
    solution: null,
    solutionProgress: 0,
    cursor: null
  };

  /* ---------------- helpers ---------------- */

  function formatMs(ms) {
    return ms < 1000 ? ms.toFixed(1) + ' ms' : (ms / 1000).toFixed(2) + ' s';
  }

  function algorithmName(id) {
    var list = Config.ALGORITHMS;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].name;
    }
    return id;
  }

  /* Steps per frame so a build finishes close to the chosen target time. */
  function stepsForSpeed(totalSteps, speedId) {
    if (speedId === 'instant') return Infinity;
    var speed = Config.SPEEDS[0];
    for (var i = 0; i < Config.SPEEDS.length; i++) {
      if (Config.SPEEDS[i].id === speedId) speed = Config.SPEEDS[i];
    }
    var targetFrames = Math.max(1, Math.round(speed.targetSeconds * 60));
    return Math.max(1, Math.ceil(totalSteps / targetFrames));
  }

  function draw() {
    renderer.draw({
      grid: state.grid,
      solution: state.solution,
      solutionProgress: state.solutionProgress,
      cursor: state.cursor
    });
  }

  /* ---------------- actions ---------------- */

  function generate() {
    var settings = Controls.getSettings();
    state.settings = settings;

    animator.cancel();
    Controls.setBusy(true);
    Controls.setMessage('Generating…');
    Controls.setStats({
      size: settings.cols + ' × ' + settings.rows,
      algorithm: algorithmName(settings.algorithm),
      time: '…',
      path: '—'
    });

    state.grid = Maze.createGrid(settings.cols, settings.rows);
    Maze.prepare(state.grid, settings.algorithm);
    state.solution = null;
    state.solutionProgress = 0;
    state.cursor = null;

    renderer.resize();
    draw();

    var started = global.performance.now();
    var generator = Maze.generate(state.grid, settings.algorithm);
    var estimatedSteps = settings.cols * settings.rows * Config.EVENTS_PER_CELL;

    var animatorPromise = animator.run(generator, {
      stepsPerFrame: stepsForSpeed(estimatedSteps, settings.speed),
      frameBudgetMs: Config.FRAME_BUDGET_MS,
      onStep: function (event) {
        state.cursor = event.cell || null;
      },
      onFrame: draw
    })
      .then(function (finished) {
        if (!finished) return; // superseded by a newer run

        Maze.openEntranceExit(state.grid);
        state.cursor = null;

        var elapsed = global.performance.now() - started;
        draw();
        Controls.setStats({ time: formatMs(elapsed) });
        Controls.setBusy(false);
        Controls.setMessage(
          'Maze ready — ' + settings.cols + ' × ' + settings.rows +
          ', built in ' + formatMs(elapsed) + '.'
        );
      });

    return animatorPromise;
  }

  function revealPath(length) {
    return (function* () {
      for (var i = 0; i < length; i++) yield i;
    })();
  }

  function solve() {
    if (!state.grid) return Promise.resolve(false);

    animator.cancel();
    Controls.setBusy(true);
    Controls.setMessage('Solving…');

    var started = global.performance.now();
    var path = Solver.solve(state.grid);

    if (!path) {
      Controls.setBusy(false);
      Controls.setStats({ path: 'unreachable' });
      Controls.setMessage('No path found — the exit is blocked.');
      return Promise.resolve(false);
    }

    state.solution = path;
    state.solutionProgress = 0;

    var targetFrames = Math.max(1, Math.round(Config.SOLUTION_TARGET_SECONDS * 60));
    var stepsPerFrame = Math.max(1, Math.ceil(path.length / targetFrames));

    return animator
      .run(revealPath(path.length), {
        stepsPerFrame: stepsPerFrame,
        frameBudgetMs: Config.FRAME_BUDGET_MS,
        onStep: function (index) {
          state.solutionProgress = index + 1;
        },
        onFrame: draw
      })
      .then(function (finished) {
        if (!finished) return;

        state.solutionProgress = path.length;
        var elapsed = global.performance.now() - started;
        draw();
        Controls.setStats({ path: path.length + ' cells' });
        Controls.setBusy(false);
        Controls.setMessage(
          'Solved in ' + formatMs(elapsed) + ' — shortest path visits ' +
          path.length + ' cells.'
        );
      });
  }

  function clearSolution() {
    if (Controls.isBusy()) return;
    state.solution = null;
    state.solutionProgress = 0;
    draw();
    Controls.setStats({ path: '—' });
    Controls.setMessage('Solution cleared.');
  }

  function download() {
    if (!state.grid) return;
    var settings = state.settings || Controls.getSettings();
    // square export of the maze only — no canvas margins, no page chrome
    var url = renderer.exportPNG(state, 1600);
    if (!url) {
      Controls.setMessage('Sorry — this browser cannot export PNGs.');
      return;
    }
    var link = document.createElement('a');
    link.download = 'maze-' + settings.cols + 'x' + settings.rows + '-' +
      settings.algorithm + '.png';
    link.href = url;
    link.click();
    Controls.setMessage('Maze saved as a 1600 × 1600 PNG — the maze only.');
  }

  /* ---------------- keyboard shortcuts ---------------- */

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      // range / checkbox / button inputs never swallow letter keys
      var type = (target.type || 'text').toLowerCase();
      return type !== 'range' && type !== 'checkbox' && type !== 'button';
    }
    return false;
  }

  function bindShortcuts() {
    document.addEventListener('keydown', function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      var key = event.key.toLowerCase();
      if (key === 'g') {
        event.preventDefault();
        generate();
      } else if (key === 's') {
        event.preventDefault();
        if (!Controls.isBusy()) solve();
      } else if (key === 'c') {
        event.preventDefault();
        clearSolution();
      }
    });
  }

  /* Public API — handy for tests and console tinkering. */
  MazeGen.App = {
    generate: generate,
    solve: solve,
    clearSolution: clearSolution,
    download: download,
    /* PNG data URL of the maze alone, square (default 1600 × 1600). */
    exportPNG: function (size) {
      return renderer.exportPNG(state, size || 1600);
    },
    getState: function () {
      return state;
    }
  };

  /* ---------------- boot ---------------- */

  function boot() {
    var canvas = document.getElementById('maze-canvas');
    renderer = Renderer.create(canvas);
    animator = Animation.createAnimator();

    Controls.init({
      onGenerate: generate,
      onSolve: solve,
      onClear: clearSolution,
      onDownload: download
    });

    renderer.resize();

    if (global.ResizeObserver) {
      var observer = new global.ResizeObserver(function () {
        renderer.resize();
        draw();
      });
      observer.observe(canvas.parentElement);
    } else {
      global.addEventListener('resize', function () {
        renderer.resize();
        draw();
      });
    }

    bindShortcuts();
    generate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
