/* =========================================================
   renderer.js — draws the grid, solution and highlights
   onto the <canvas>. Reads its colours from the CSS custom
   properties defined in css/base.css.
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
    var ctx = canvas.getContext('2d');
    var theme = readTheme();
    var width = 1;
    var height = 1;
    var dpr = 1;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = global.devicePixelRatio || 1;
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* Map grid coordinates to canvas pixels. */
    function metrics(grid) {
      var cell = Math.min(width / grid.cols, height / grid.rows);
      return {
        cell: cell,
        x: (width - cell * grid.cols) / 2,
        y: (height - cell * grid.rows) / 2
      };
    }

    function cellOrigin(m, col, row) {
      return { x: m.x + col * m.cell, y: m.y + row * m.cell };
    }

    function drawSolution(m, path, count) {
      if (!path || count < 2) return;
      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < count; i++) {
        var c = path[i];
        var px = m.x + (c.col + 0.5) * m.cell;
        var py = m.y + (c.row + 0.5) * m.cell;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = theme.path;
      ctx.lineWidth = Math.max(2, m.cell * 0.3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    function drawEndpoints(m, grid) {
      var first = grid.cells[0];
      var last = grid.cells[grid.cells.length - 1];
      var targets = [
        { cell: first, label: 'S' },
        { cell: last, label: 'E' }
      ];
      ctx.save();
      for (var i = 0; i < targets.length; i++) {
        var origin = cellOrigin(m, targets[i].cell.col, targets[i].cell.row);
        ctx.fillStyle = hexToRgba(theme.accent, 0.28);
        ctx.fillRect(origin.x, origin.y, m.cell, m.cell);

        if (m.cell >= 20) {
          ctx.fillStyle = theme.accent;
          ctx.font = '700 ' + Math.floor(m.cell * 0.42) + 'px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            targets[i].label,
            origin.x + m.cell / 2,
            origin.y + m.cell / 2
          );
        }
      }
      ctx.restore();
    }

    function drawCursor(m, cursor) {
      if (!cursor) return;
      var origin = cellOrigin(m, cursor.col, cursor.row);
      ctx.save();
      ctx.fillStyle = hexToRgba(theme.accent, 0.45);
      ctx.fillRect(origin.x, origin.y, m.cell, m.cell);
      ctx.restore();
    }

    function drawWalls(m, grid) {
      var cell = m.cell;
      var lineWidth = Math.max(1, Math.min(4, cell * 0.14));

      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < grid.cells.length; i++) {
        var c = grid.cells[i];
        var origin = cellOrigin(m, c.col, c.row);
        var x = origin.x;
        var y = origin.y;
        var x2 = x + cell;
        var y2 = y + cell;

        if (c.walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x2, y); }   // TOP
        if (c.walls[1]) { ctx.moveTo(x2, y); ctx.lineTo(x2, y2); } // RIGHT
        if (c.walls[2]) { ctx.moveTo(x, y2); ctx.lineTo(x2, y2); } // BOTTOM
        if (c.walls[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y2); }   // LEFT
      }
      ctx.strokeStyle = theme.wall;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'square';
      ctx.stroke();
      ctx.restore();
    }

    /*
      state = {
        grid,               // Maze.createGrid() result (null clears the canvas)
        solution,           // array of cells, or null
        solutionProgress,   // how many path cells are revealed so far
        cursor              // cell currently being carved, or null
      }
    */
    function draw(state) {
      ctx.save();
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, width, height);

      if (state && state.grid) {
        var m = metrics(state.grid);
        drawEndpoints(m, state.grid);
        drawSolution(m, state.solution, state.solutionProgress || 0);
        drawCursor(m, state.cursor);
        drawWalls(m, state.grid);
      }

      ctx.restore();
    }

    function toDataURL() {
      return canvas.toDataURL('image/png');
    }

    return {
      resize: resize,
      draw: draw,
      toDataURL: toDataURL
    };
  }

  MazeGen.Renderer = { create: create };
})(window);
