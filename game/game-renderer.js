/* =========================================================
   game/game-renderer.js — draws what the shared renderer can't:
   the trail you walked and the player marker, on a second canvas
   stacked exactly over the maze canvas.

   Cell geometry mirrors metrics()/framePadding() in js/renderer.js
   (same padding formula, same centring) — keep the two in sync if
   the frame ever changes.
   Exposes: MazeGen.Game.Renderer
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});
  var Game = (MazeGen.Game = MazeGen.Game || {});

  var FALLBACK_THEME = { accent: '#7c5cff', wall: '#dfe4ff' };

  function readTheme() {
    var styles = global.getComputedStyle(document.documentElement);
    function read(name, fallback) {
      var value = styles.getPropertyValue(name);
      return value && value.trim() ? value.trim() : fallback;
    }
    return {
      accent: read('--maze-accent', FALLBACK_THEME.accent),
      wall: read('--maze-wall', FALLBACK_THEME.wall)
    };
  }

  function create(mazeCanvas, overlayCanvas) {
    var theme = readTheme();
    var ctx = overlayCanvas.getContext('2d');
    var boxW = 1; // CSS pixels of the box both canvases share
    var boxH = 1;

    /* Mirror the maze canvas box exactly, so overlay pixels and
       maze pixels land on the same cell. */
    function sync() {
      boxW = parseFloat(mazeCanvas.style.width) || mazeCanvas.width || 1;
      boxH = parseFloat(mazeCanvas.style.height) || mazeCanvas.height || 1;
      overlayCanvas.style.width = mazeCanvas.style.width;
      overlayCanvas.style.height = mazeCanvas.style.height;
      overlayCanvas.width = mazeCanvas.width;
      overlayCanvas.height = mazeCanvas.height;
      var dpr = mazeCanvas.width / boxW || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* Same frame maths as js/renderer.js metrics(). */
    function metrics(grid) {
      var padding = Math.max(10, Math.round(Math.min(boxW, boxH) * 0.05));
      var availW = Math.max(1, boxW - padding * 2);
      var availH = Math.max(1, boxH - padding * 2);
      var cell = Math.min(availW / grid.cols, availH / grid.rows);
      var w = cell * grid.cols;
      var h = cell * grid.rows;
      return { cell: cell, x: (boxW - w) / 2, y: (boxH - h) / 2 };
    }

    function drawTrail(engine, m) {
      var trail = engine.state.trail;
      if (trail.length < 2) return;

      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < trail.length; i++) {
        var px = m.x + (trail[i].col + 0.5) * m.cell;
        var py = m.y + (trail[i].row + 0.5) * m.cell;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = Math.max(2, m.cell * 0.22);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    function drawPlayer(engine, m) {
      var cx = m.x + (engine.state.col + 0.5) * m.cell;
      var cy = m.y + (engine.state.row + 0.5) * m.cell;
      var radius = Math.max(3, m.cell * 0.3);

      ctx.save();
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = m.cell * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = theme.accent;
      ctx.fill();

      // ring in the wall colour: high contrast on every theme's board
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(2, m.cell * 0.08);
      ctx.strokeStyle = theme.wall;
      ctx.stroke();
      ctx.restore();
    }

    function draw(engine) {
      ctx.clearRect(0, 0, boxW, boxH);
      if (!engine) return;
      var m = metrics(engine.grid);
      drawTrail(engine, m);
      drawPlayer(engine, m);
    }

    function refreshTheme() {
      theme = readTheme();
    }

    return {
      sync: sync,
      draw: draw,
      refreshTheme: refreshTheme
    };
  }

  Game.Renderer = { create: create };
})(window);
