/* =========================================================
   solver.js — breadth-first search from entrance to exit.
   Returns the shortest path through the maze (array of cells)
   or null when the exit is unreachable.
   Exposes: MazeGen.Solver
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});

  function solve(grid) {
    if (!grid || !grid.cells.length) return null;

    var DIRECTIONS = MazeGen.Maze.DIRECTIONS;

    var total = grid.cells.length;
    var start = 0;
    var end = total - 1;

    var prev = new Array(total).fill(-1);
    var seen = new Uint8Array(total);
    var queue = new Array(total);
    var head = 0;
    var tail = 0;

    queue[tail++] = start;
    seen[start] = 1;

    while (head < tail) {
      var index = queue[head++];
      if (index === end) break;

      var cell = grid.cells[index];
      for (var dir = 0; dir < 4; dir++) {
        if (cell.walls[dir]) continue; // wall blocks this direction

        var d = DIRECTIONS[dir];
        var col = cell.col + d.dc;
        var row = cell.row + d.dr;
        if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;

        var next = row * grid.cols + col;
        if (seen[next]) continue;

        seen[next] = 1;
        prev[next] = index;
        queue[tail++] = next;
      }
    }

    if (!seen[end]) return null;

    var path = [];
    for (var at = end; at !== -1; at = prev[at]) {
      path.push(grid.cells[at]);
      if (at === start) break;
    }
    path.reverse();
    return path;
  }

  MazeGen.Solver = { solve: solve };
})(window);
