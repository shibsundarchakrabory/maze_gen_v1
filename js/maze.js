/* =========================================================
   maze.js — grid model + the four generation algorithms.
   Every generator is a JS generator that yields small events
   so the animation loop can draw progress step by step.
   Exposes: MazeGen.Maze
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});

  var WALL = { TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3 };

  var DIRECTIONS = [
    { dc: 0, dr: -1 }, // TOP
    { dc: 1, dr: 0 },  // RIGHT
    { dc: 0, dr: 1 },  // BOTTOM
    { dc: -1, dr: 0 }  // LEFT
  ];

  /* ---------------- helpers ---------------- */

  function oppositeWall(dir) {
    return (dir + 2) % 4;
  }

  function randInt(minInclusive, maxExclusive) {
    return minInclusive + Math.floor(Math.random() * (maxExclusive - minInclusive));
  }

  function pick(list) {
    return list[randInt(0, list.length)];
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = randInt(0, i + 1);
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  /* ---------------- grid model ---------------- */

  function createGrid(cols, rows) {
    var cells = new Array(cols * rows);
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        cells[row * cols + col] = {
          index: row * cols + col,
          col: col,
          row: row,
          walls: [true, true, true, true], // TOP RIGHT BOTTOM LEFT
          visited: false,
          inFrontier: false
        };
      }
    }
    return { cols: cols, rows: rows, cells: cells };
  }

  function cellAt(grid, col, row) {
    if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return null;
    return grid.cells[row * grid.cols + col];
  }

  /* Set a wall on `cell` in `dir` and mirror it onto the neighbour,
     so both sides of every boundary always agree. */
  function setWall(grid, cell, dir, value) {
    cell.walls[dir] = value;
    var d = DIRECTIONS[dir];
    var other = cellAt(grid, cell.col + d.dc, cell.row + d.dr);
    if (other) other.walls[oppositeWall(dir)] = value;
  }

  function carve(grid, from, to, dir) {
    setWall(grid, from, dir, false);
  }

  function neighboursOf(grid, cell) {
    var list = [];
    for (var dir = 0; dir < 4; dir++) {
      var d = DIRECTIONS[dir];
      var other = cellAt(grid, cell.col + d.dc, cell.row + d.dr);
      if (other) list.push({ cell: other, dir: dir });
    }
    return list;
  }

  function unvisitedNeighbours(grid, cell) {
    var list = [];
    var all = neighboursOf(grid, cell);
    for (var i = 0; i < all.length; i++) {
      if (!all[i].cell.visited) list.push(all[i]);
    }
    return list;
  }

  function visitedNeighbours(grid, cell) {
    var list = [];
    var all = neighboursOf(grid, cell);
    for (var i = 0; i < all.length; i++) {
      if (all[i].cell.visited) list.push(all[i]);
    }
    return list;
  }

  /* Open the entrance (top-left) and exit (bottom-right). */
  function openEntranceExit(grid) {
    var first = cellAt(grid, 0, 0);
    var last = cellAt(grid, grid.cols - 1, grid.rows - 1);
    if (first) setWall(grid, first, WALL.LEFT, false);
    if (last) setWall(grid, last, WALL.RIGHT, false);
  }

  /* Algorithm-specific setup applied before generation starts. */
  function prepare(grid, algorithmId) {
    if (algorithmId !== 'division') return;
    // Recursive division works the other way round: start fully open
    // (only the outer border remains) and add walls during generation.
    for (var i = 0; i < grid.cells.length; i++) {
      var cell = grid.cells[i];
      cell.walls[WALL.TOP] = cell.row === 0;
      cell.walls[WALL.BOTTOM] = cell.row === grid.rows - 1;
      cell.walls[WALL.LEFT] = cell.col === 0;
      cell.walls[WALL.RIGHT] = cell.col === grid.cols - 1;
    }
  }

  /* ---------------- algorithms ---------------- */

  /* 1. Recursive backtracker (iterative DFS) */
  function* generateBacktracker(grid) {
    var start = pick(grid.cells);
    start.visited = true;
    var stack = [start];
    yield { type: 'carve', cell: start };

    while (stack.length) {
      var current = stack[stack.length - 1];
      var options = unvisitedNeighbours(grid, current);
      if (!options.length) {
        stack.pop();
        continue;
      }
      var choice = pick(options);
      carve(grid, current, choice.cell, choice.dir);
      choice.cell.visited = true;
      stack.push(choice.cell);
      yield { type: 'carve', cell: choice.cell };
    }
  }

  /* 2. Prim's algorithm with an explicit frontier */
  function* generatePrim(grid) {
    var seed = pick(grid.cells);
    seed.visited = true;
    var frontier = [];

    function addFrontier(cell) {
      var ns = neighboursOf(grid, cell);
      for (var i = 0; i < ns.length; i++) {
        var n = ns[i].cell;
        if (!n.visited && !n.inFrontier) {
          n.inFrontier = true;
          frontier.push(n);
        }
      }
    }

    addFrontier(seed);
    yield { type: 'carve', cell: seed };

    while (frontier.length) {
      var idx = randInt(0, frontier.length);
      var cell = frontier[idx];
      frontier[idx] = frontier[frontier.length - 1];
      frontier.pop();

      var fromTree = visitedNeighbours(grid, cell);
      var link = pick(fromTree);
      // link.dir points from `cell` towards the tree, so carve from `cell`
      carve(grid, cell, link.cell, link.dir);
      cell.visited = true;
      addFrontier(cell);
      yield { type: 'carve', cell: cell };
    }
  }

  /* 3. Kruskal's algorithm with union-find */
  function* generateKruskal(grid) {
    var total = grid.cells.length;
    var parent = new Array(total);
    var rank = new Array(total);
    for (var i = 0; i < total; i++) {
      parent[i] = i;
      rank[i] = 0;
    }

    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }

    function union(a, b) {
      var ra = find(a);
      var rb = find(b);
      if (ra === rb) return false;
      if (rank[ra] < rank[rb]) parent[ra] = rb;
      else if (rank[ra] > rank[rb]) parent[rb] = ra;
      else {
        parent[rb] = ra;
        rank[ra]++;
      }
      return true;
    }

    var edges = [];
    for (var c = 0; c < grid.cells.length; c++) {
      var cell = grid.cells[c];
      var right = cellAt(grid, cell.col + 1, cell.row);
      if (right) edges.push({ a: cell, b: right, dir: WALL.RIGHT });
      var bottom = cellAt(grid, cell.col, cell.row + 1);
      if (bottom) edges.push({ a: cell, b: bottom, dir: WALL.BOTTOM });
    }
    shuffle(edges);

    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];
      if (union(edge.a.index, edge.b.index)) {
        carve(grid, edge.a, edge.b, edge.dir);
        yield { type: 'carve', cell: edge.b };
      }
    }
  }

  /* 4. Recursive division (adds walls instead of removing them) */
  function* generateDivision(grid) {
    var stack = [{ c0: 0, r0: 0, c1: grid.cols - 1, r1: grid.rows - 1 }];

    while (stack.length) {
      var rect = stack.pop();
      var w = rect.c1 - rect.c0 + 1;
      var h = rect.r1 - rect.r0 + 1;
      if (w < 2 && h < 2) continue;

      /* split along the longer side; ties are random */
      var horizontal;
      if (w < 2) horizontal = true;
      else if (h < 2) horizontal = false;
      else if (h > w) horizontal = true;
      else if (w > h) horizontal = false;
      else horizontal = Math.random() < 0.5;

      var wallCells = [];
      var passage;

      if (horizontal) {
        var splitRow = randInt(rect.r0 + 1, rect.r1 + 1);
        for (var col = rect.c0; col <= rect.c1; col++) {
          var cell = cellAt(grid, col, splitRow);
          setWall(grid, cell, WALL.TOP, true);
          wallCells.push(cell);
        }
        var passageCol = randInt(rect.c0, rect.c1 + 1);
        passage = cellAt(grid, passageCol, splitRow);
        setWall(grid, passage, WALL.TOP, false);

        stack.push({ c0: rect.c0, r0: rect.r0, c1: rect.c1, r1: splitRow - 1 });
        stack.push({ c0: rect.c0, r0: splitRow, c1: rect.c1, r1: rect.r1 });
      } else {
        var splitCol = randInt(rect.c0 + 1, rect.c1 + 1);
        for (var row = rect.r0; row <= rect.r1; row++) {
          var cellV = cellAt(grid, splitCol, row);
          setWall(grid, cellV, WALL.LEFT, true);
          wallCells.push(cellV);
        }
        var passageRow = randInt(rect.r0, rect.r1 + 1);
        passage = cellAt(grid, splitCol, passageRow);
        setWall(grid, passage, WALL.LEFT, false);

        stack.push({ c0: rect.c0, r0: rect.r0, c1: splitCol - 1, r1: rect.r1 });
        stack.push({ c0: splitCol, r0: rect.r0, c1: rect.c1, r1: rect.r1 });
      }

      yield { type: 'divide', cell: passage, cells: wallCells };
    }
  }

  var GENERATORS = {
    backtracker: generateBacktracker,
    prim: generatePrim,
    kruskal: generateKruskal,
    division: generateDivision
  };

  /* Return a generator for the requested algorithm. */
  function generate(grid, algorithmId) {
    var fn = GENERATORS[algorithmId] || GENERATORS.backtracker;
    return fn(grid);
  }

  /* ---------------- persistence ----------------

     The handoff format between pages: walls only, because a cell's
     col/row are implied by its index in the flat array. Kept here
     (with the model it describes) so the generator and the game
     page can never disagree on the shape. */

  function serialize(grid) {
    var walls = new Array(grid.cells.length);
    for (var i = 0; i < grid.cells.length; i++) {
      var w = grid.cells[i].walls;
      walls[i] = [w[0] ? 1 : 0, w[1] ? 1 : 0, w[2] ? 1 : 0, w[3] ? 1 : 0];
    }
    return { cols: grid.cols, rows: grid.rows, walls: walls };
  }

  function isInt(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  }

  /* Rebuild a grid from serialize()'s output.
     Returns null for missing/corrupt data instead of throwing. */
  function deserialize(data) {
    if (!data || typeof data !== 'object') return null;
    if (!isInt(data.cols) || !isInt(data.rows)) return null;
    if (data.cols < 1 || data.rows < 1 || data.cols > 1000 || data.rows > 1000) return null;
    if (!Array.isArray(data.walls) || data.walls.length !== data.cols * data.rows) return null;

    var grid = createGrid(data.cols, data.rows);
    for (var i = 0; i < data.walls.length; i++) {
      var w = data.walls[i];
      if (!Array.isArray(w) || w.length !== 4) return null;
      grid.cells[i].walls = [!!w[0], !!w[1], !!w[2], !!w[3]];
    }
    return grid;
  }

  MazeGen.Maze = {
    WALL: WALL,
    DIRECTIONS: DIRECTIONS,
    createGrid: createGrid,
    cellAt: cellAt,
    setWall: setWall,
    carve: carve,
    neighboursOf: neighboursOf,
    prepare: prepare,
    openEntranceExit: openEntranceExit,
    generate: generate,
    serialize: serialize,
    deserialize: deserialize
  };
})(window);
