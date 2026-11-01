/* =========================================================
   renderer.js — draws the grid, solution and highlights
   onto the <canvas>.

   The canvas is always kept 1:1 (square) and sized to the
   biggest square that fits its container, so it contains the
   maze and nothing else — which is exactly what the PNG
   export gives you.

   Colours are read from the CSS custom properties defined
   in css/base.css.
   Exposes: MazeGen.Renderer.create(canvas)
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});

  var FALLBACK_THEME = {
    bg: '#0d1224',
    wall: '#dfe4ff',
    accent: '#7c5cff',
    path: '#4ade80'
  };

  function readTheme() {
    var styles = global.getComputedStyle(document.documentElement);
    function read(name, fallback) {
      var value = styles.getPropertyValue(name);
      return value && value.trim() ? value.trim() : fallback;
    }
    return {
      bg: read('--maze-bg', FALLBACK_THEME.bg),
      wall: read('--maze-wall', FALLBACK_THEME.wall),
      accent: read('--maze-accent', FALLBACK_THEME.accent),
      path: read('--maze-path', FALLBACK_THEME.path)
    };
  }

  function hexToRgba(hex, alpha) {
    var value = hex.replace('#', '');
    if (value.length === 3) {
      value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    }
    var num = parseInt(value, 16);
    if (isNaN(num)) return 'rgba(124, 92, 255, ' + alpha + ')';
    var r = (num >> 16) & 255;
    var g = (num >> 8) & 255;
    var b = num & 255;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function create(canvas) {
    var theme = readTheme();
    var container = canvas.parentElement;
    var mainCtx = canvas.getContext('2d');
    var width = 1;
    var height = 1;
    var dpr = 1;

    /*
      Keep the canvas a perfect square: the largest 1:1 box that
      fits its container. The maze then fills the canvas edge to
      edge, so an export contains no surrounding empty space.
    */
    function resize() {
      var side = 1;
      if (container) {
        side = Math.max(1, Math.min(container.clientWidth, container.clientHeight));
      }
      dpr = global.devicePixelRatio || 1;
      width = side;
      height = side;

      canvas.style.width = side + 'px';
      canvas.style.height = side + 'px';
      canvas.width = Math.round(side * dpr);
      canvas.height = Math.round(side * dpr);
      mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* Space kept between the canvas edge and the maze. */
    function framePadding(g) {
      return Math.max(10, Math.round(Math.min(g.width, g.height) * 0.05));
    }

    /* Map grid coordinates to the target's pixels. */
    function metrics(g, grid) {
      var padding = framePadding(g);
      var avail = Math.min(g.width, g.height) - padding * 2;
      var cell = Math.min(avail / grid.cols, avail / grid.rows);
      var w = cell * grid.cols;
      var h = cell * grid.rows;
      return {
        cell: cell,
        padding: padding,
        x: (g.width - w) / 2,
        y: (g.height - h) / 2
      };
    }

    function cellOrigin(m, col, row) {
      return { x: m.x + col * m.cell, y: m.y + row * m.cell };
    }

    /* The border: a square line sitting halfway through the padding band,
       so there is equal breathing room on both sides of it. */
    function drawFrame(g, m) {
      var side = Math.min(g.width, g.height);
      var inset = m.padding / 2;
      g.ctx.save();
      g.ctx.strokeStyle = theme.accent;
      g.ctx.lineWidth = Math.max(2, Math.min(m.padding * 0.2, 20));
      g.ctx.strokeRect(
        (g.width - side) / 2 + inset,
        (g.height - side) / 2 + inset,
        side - inset * 2,
        side - inset * 2
      );
      g.ctx.restore();
    }

    /* g = { ctx, width, height }: the screen canvas or an export canvas. */

    function drawSolution(g, m, path, count) {
      if (!path || count < 2) return;
      g.ctx.save();
      g.ctx.beginPath();
      for (var i = 0; i < count; i++) {
        var c = path[i];
        var px = m.x + (c.col + 0.5) * m.cell;
        var py = m.y + (c.row + 0.5) * m.cell;
        if (i === 0) g.ctx.moveTo(px, py);
        else g.ctx.lineTo(px, py);
      }
      g.ctx.strokeStyle = theme.path;
      g.ctx.lineWidth = Math.max(2, m.cell * 0.3);
      g.ctx.lineCap = 'round';
      g.ctx.lineJoin = 'round';
      g.ctx.stroke();
      g.ctx.restore();
    }

    function drawEndpoints(g, m, grid) {
      var first = grid.cells[0];
      var last = grid.cells[grid.cells.length - 1];
      var targets = [
        { cell: first, label: 'S' },
        { cell: last, label: 'E' }
      ];
      g.ctx.save();
      for (var i = 0; i < targets.length; i++) {
        var origin = cellOrigin(m, targets[i].cell.col, targets[i].cell.row);
        g.ctx.fillStyle = hexToRgba(theme.accent, 0.28);
        g.ctx.fillRect(origin.x, origin.y, m.cell, m.cell);

        if (m.cell >= 20) {
          g.ctx.fillStyle = theme.accent;
          g.ctx.font = '700 ' + Math.floor(m.cell * 0.42) + 'px system-ui, sans-serif';
          g.ctx.textAlign = 'center';
          g.ctx.textBaseline = 'middle';
          g.ctx.fillText(
            targets[i].label,
            origin.x + m.cell / 2,
            origin.y + m.cell / 2
          );
        }
      }
      g.ctx.restore();
    }

    function drawCursor(g, m, cursor) {
      if (!cursor) return;
      var origin = cellOrigin(m, cursor.col, cursor.row);
      g.ctx.save();
      g.ctx.fillStyle = hexToRgba(theme.accent, 0.45);
      g.ctx.fillRect(origin.x, origin.y, m.cell, m.cell);
      g.ctx.restore();
    }

    function drawWalls(g, m, grid) {
      var cell = m.cell;
      var lineWidth = Math.max(1, Math.min(4, cell * 0.14));

      g.ctx.save();
      g.ctx.beginPath();
      for (var i = 0; i < grid.cells.length; i++) {
        var c = grid.cells[i];
        var origin = cellOrigin(m, c.col, c.row);
        var x = origin.x;
        var y = origin.y;
        var x2 = x + cell;
        var y2 = y + cell;

        if (c.walls[0]) { g.ctx.moveTo(x, y); g.ctx.lineTo(x2, y); }   // TOP
        if (c.walls[1]) { g.ctx.moveTo(x2, y); g.ctx.lineTo(x2, y2); } // RIGHT
        if (c.walls[2]) { g.ctx.moveTo(x, y2); g.ctx.lineTo(x2, y2); } // BOTTOM
        if (c.walls[3]) { g.ctx.moveTo(x, y); g.ctx.lineTo(x, y2); }   // LEFT
      }
      g.ctx.strokeStyle = theme.wall;
      g.ctx.lineWidth = lineWidth;
      g.ctx.lineCap = 'square';
      g.ctx.stroke();
      g.ctx.restore();
    }

    function paint(g, state) {
      g.ctx.save();
      g.ctx.fillStyle = theme.bg;
      g.ctx.fillRect(0, 0, g.width, g.height);

      if (state && state.grid) {
        var m = metrics(g, state.grid);
        drawFrame(g, m);
        drawEndpoints(g, m, state.grid);
        drawSolution(g, m, state.solution, state.solutionProgress || 0);
        drawCursor(g, m, state.cursor);
        drawWalls(g, m, state.grid);
      }

      g.ctx.restore();
    }

    /* state = { grid, solution, solutionProgress, cursor } */

    function draw(state) {
      paint({ ctx: mainCtx, width: width, height: height }, state);
    }

    /*
      Render the maze alone into a square offscreen canvas and
      return it as a PNG data URL — no margins, no page chrome.
    */
    function exportPNG(state, size) {
      var side = size || 1600;
      var off = document.createElement('canvas');
      off.width = side;
      off.height = side;
      var offCtx = off.getContext('2d');
      if (!offCtx) return null;

      paint({ ctx: offCtx, width: side, height: side }, state);

      return off.toDataURL('image/png');
    }

    return {
      resize: resize,
      draw: draw,
      exportPNG: exportPNG
    };
  }

  MazeGen.Renderer = { create: create };
})(window);
