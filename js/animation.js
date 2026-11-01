/* =========================================================
   animation.js — runs a generator across animation frames.
   Each frame processes a batch of steps (bounded by both a
   step count and a time budget) so the UI never freezes.
   Exposes: MazeGen.Animation.createAnimator()
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});

  function createAnimator() {
    var frameId = null;
    var cancelled = false;
    var running = false;
    var pendingResolve = null;

    function finish(result) {
      if (pendingResolve) {
        var resolve = pendingResolve;
        pendingResolve = null;
        resolve(result);
      }
      running = false;
      cancelled = false;
    }

    /* Abort the current run; its promise resolves with false. */
    function cancel() {
      if (!running) return;
      cancelled = true;
      if (frameId !== null) {
        global.cancelAnimationFrame(frameId);
        frameId = null;
      }
      finish(false);
    }

    /*
      run(generator, options) -> Promise<boolean>
      options: { stepsPerFrame, frameBudgetMs, onStep(value), onFrame(count), onDone() }
      Resolves true when the generator finishes, false when cancelled.
    */
    function run(generator, options) {
      cancel(); // stop anything still in flight

      var opts = options || {};
      var stepsPerFrame = opts.stepsPerFrame || Infinity;
      var frameBudgetMs = opts.frameBudgetMs || 12;
      var onStep = opts.onStep || function () {};
      var onFrame = opts.onFrame || function () {};
      var onDone = opts.onDone || function () {};

      cancelled = false;
      running = true;

      return new Promise(function (resolve) {
        pendingResolve = resolve;

        function tick() {
          frameId = null;
          if (cancelled) {
            finish(false);
            return;
          }

          var started = global.performance.now();
          var processed = 0;
          var result = null;

          do {
            result = generator.next();
            if (!result.done) onStep(result.value);
            processed++;
          } while (
            !result.done &&
            processed < stepsPerFrame &&
            global.performance.now() - started < frameBudgetMs
          );

          onFrame(processed);

          if (result.done) {
            onDone();
            finish(true);
            return;
          }

          frameId = global.requestAnimationFrame(tick);
        }

        frameId = global.requestAnimationFrame(tick);
      });
    }

    return {
      run: run,
      cancel: cancel,
      isRunning: function () {
        return running;
      }
    };
  }

  MazeGen.Animation = { createAnimator: createAnimator };
})(window);
