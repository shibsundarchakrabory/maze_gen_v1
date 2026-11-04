/* =========================================================
   renderer.js — draws the grid, solution and highlights
   onto the <canvas>.

   The canvas keeps the maze's own proportions (cols : rows) and
   is sized to the biggest box of that ratio that fits its
   container, so it contains the maze and nothing else — which is
   exactly what the PNG export gives you. A square maze still
   gets a square canvas, as before.

   Colours are read from the CSS custom properties defined in
   css/themes/: midnight.css (default), light.css and dark.css.
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

  /*
    PNG dimensions for a cols × rows maze: the long side is
    `longSide` px (1600 by default) and the other follows the
    maze's aspect — a square maze still exports 1600 × 1600.
  */
  function exportSize(cols, rows, longSide) {
    var long = longSide || 1600;
    if (!cols || !rows || cols === rows) {
      return { width: long, height: long };
    }
    return cols > rows
      ? { width: long, height: Math.max(1, Math.round(long * rows / cols)) }
      : { width: Math.max(1, Math.round(long * cols / rows)), height: long };
  }

  function create(canvas) {
    var theme = readTheme();
    var container = canvas.parentElement;
    var mainCtx = canvas.getContext('2d');
    var width = 1;
    var height = 1;
    var dpr = 1;
    var aspect = 1; // cols / rows — 1 keeps the classic square box

    /*
      Fit the biggest cols : rows box inside the container, so the
      cells stay square and the maze fills the canvas edge to edge —
      which is exactly what the export gives you. Pass the grid size
      to change the ratio; without arguments the last ratio is kept
      (window resizes, ResizeObserver).
    */
    function resize(cols, rows) {
      if (cols && rows) aspect = cols / rows;

      var cw = 1;
      var ch = 1;
      if (container) {
        cw = Math.max(1, container.clientWidth);
        ch = Math.max(1, container.clientHeight);
      }

      var w;
      var h;
      if (cw / ch >= aspect) {
        h = ch;
        w = h * aspect;
      } else {
        w = cw;
        h = w / aspect;
      }

      dpr = global.devicePixelRatio || 1;
      width = Math.max(1, w);
      height = Math.max(1, h);

      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* Space kept between the canvas edge and the maze. */
    function framePadding(g) {
      return Math.max(10, Math.round(Math.min(g.width, g.height) * 0.05));
    }

    /* Map grid coordinates to the target's pixels. Cells stay
       square; the box may be rectangular when width ≠ height. */
    function metrics(g, grid) {
      var padding = framePadding(g);
      var availW = Math.max(1, g.width - padding * 2);
      var availH = Math.max(1, g.height - padding * 2);
      var cell = Math.min(availW / grid.cols, availH / grid.rows);
      var w = cell * grid.cols;
      var h = cell * grid.rows;
      return {
        cell: cell,
        padding: padding,
        w: w,
        h: h,
        x: (g.width - w) / 2,
        y: (g.height - h) / 2
      };
    }

    function cellOrigin(m, col, row) {
      return { x: m.x + col * m.cell, y: m.y + row * m.cell };
    }

    /* The border: a line sitting halfway through the padding band
       around the maze itself, so there is equal breathing room on
       both sides of it — at any aspect. */
    function drawFrame(g, m) {
      var inset = m.padding / 2;
      g.ctx.save();
      g.ctx.strokeStyle = theme.accent;
      g.ctx.lineWidth = Math.max(2, Math.min(m.padding * 0.2, 20));
      g.ctx.strokeRect(
        m.x - inset,
        m.y - inset,
        m.w + inset * 2,
        m.h + inset * 2
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

    /*
      The maze colours come from CSS, so they change with the theme.
      Called by js/main.js after MazeGen.Theme switches, before the
      next draw — the canvas and exportPNG then use the new palette.
    */
    function refreshTheme() {
      theme = readTheme();
    }

    function draw(state) {
      paint({ ctx: mainCtx, width: width, height: height }, state);
    }

    /*
      Render the maze alone into an offscreen canvas that matches
      its proportions and return it as a PNG data URL — no margins,
      no page chrome.
    */
    function exportPNG(state, size) {
      var grid = state && state.grid;
      var dim = exportSize(grid && grid.cols, grid && grid.rows, size || 1600);
      var off = document.createElement('canvas');
      off.width = dim.width;
      off.height = dim.height;
      var offCtx = off.getContext('2d');
      if (!offCtx) return null;

      paint({ ctx: offCtx, width: dim.width, height: dim.height }, state);

      return off.toDataURL('image/png');
    }

    return {
      resize: resize,
      draw: draw,
      exportPNG: exportPNG,
      exportSize: exportSize,
      refreshTheme: refreshTheme
    };
  }

  MazeGen.Renderer = { create: create, exportSize: exportSize };
})(window);
