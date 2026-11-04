/* =========================================================
   game/engine.js — the playing rules.

   Owns the player's position and the walk so far: a move is only
   legal when the wall between the two cells is open, the timer
   starts on the first step, and standing on the bottom-right cell
   ends the game. Pure logic — no DOM, no drawing.
   Exposes: MazeGen.Game.Engine
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});
  var Game = (MazeGen.Game = MazeGen.Game || {});
  var Maze = MazeGen.Maze;

  function create(grid) {
    var start = { col: 0, row: 0 };
    var goal = { col: grid.cols - 1, row: grid.rows - 1 };

    var state = {
      col: start.col,
      row: start.row,
      moves: 0,
      trail: [{ col: start.col, row: start.row }],
      startedAt: 0,   // ms epoch of the first step
      finishedAt: 0   // ms epoch of reaching the goal
    };

    function wallBetween(cell, dc, dr) {
      var dir;
      if (dc === 0) dir = dr < 0 ? Maze.WALL.TOP : Maze.WALL.BOTTOM;
      else dir = dc > 0 ? Maze.WALL.RIGHT : Maze.WALL.LEFT;
      return cell.walls[dir];
    }

    function canMove(dc, dr) {
      if (state.finishedAt) return false;
      var cell = Maze.cellAt(grid, state.col, state.row);
      if (!cell || wallBetween(cell, dc, dr)) return false;
      // the wall must lead somewhere: no stepping outside the grid
      return !!Maze.cellAt(grid, state.col + dc, state.row + dr);
    }

    /* Step one cell. Returns { moved, blocked, won, finished }. */
    function move(dc, dr) {
      if (state.finishedAt) return { moved: false, finished: true };
      if (!canMove(dc, dr)) return { moved: false, blocked: true };

      if (!state.startedAt) state.startedAt = Date.now();
      state.col += dc;
      state.row += dr;
      state.moves += 1;
      state.trail.push({ col: state.col, row: state.row });

      var won = state.col === goal.col && state.row === goal.row;
      if (won) state.finishedAt = Date.now();

      return { moved: true, won: won };
    }

    function restart() {
      state.col = start.col;
      state.row = start.row;
      state.moves = 0;
      state.trail = [{ col: start.col, row: start.row }];
      state.startedAt = 0;
      state.finishedAt = 0;
    }

    /* Milliseconds spent so far (stops counting once finished). */
    function elapsedMs() {
      if (!state.startedAt) return 0;
      return (state.finishedAt || Date.now()) - state.startedAt;
    }

    return {
      grid: grid,
      start: start,
      goal: goal,
      state: state,
      canMove: canMove,
      move: move,
      restart: restart,
      elapsedMs: elapsedMs,
      isStarted: function () { return !!state.startedAt; },
      isFinished: function () { return !!state.finishedAt; }
    };
  }

  Game.Engine = { create: create };
})(window);
