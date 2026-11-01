/* =========================================================
   controls.js — all DOM wiring for the control panel:
   reads settings, updates labels/stats, reports user actions.
   Exposes: MazeGen.Controls
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});
  var Config = MazeGen.Config;

  var refs = {};
  var handlers = {};
  var busy = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheRefs() {
    refs.algorithm = byId('algorithm');
    refs.algorithmHint = byId('algorithm-hint');
    refs.cols = byId('cols');
    refs.colsValue = byId('cols-value');
    refs.rows = byId('rows');
    refs.rowsValue = byId('rows-value');
    refs.speed = byId('speed');
    refs.generate = byId('btn-generate');
    refs.solve = byId('btn-solve');
    refs.clear = byId('btn-clear');
    refs.download = byId('btn-download');
    refs.statSize = byId('stat-size');
    refs.statAlgorithm = byId('stat-algorithm');
    refs.statTime = byId('stat-time');
    refs.statPath = byId('stat-path');
    refs.statusMessage = byId('status-message');
  }

  function fillSelect(select, items, selectedId) {
    select.innerHTML = '';
    items.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      if (item.id === selectedId) option.selected = true;
      select.appendChild(option);
    });
  }

  function algorithmById(id) {
    for (var i = 0; i < Config.ALGORITHMS.length; i++) {
      if (Config.ALGORITHMS[i].id === id) return Config.ALGORITHMS[i];
    }
    return Config.ALGORITHMS[0];
  }

  function syncRangeOutputs() {
    refs.colsValue.textContent = refs.cols.value;
    refs.rowsValue.textContent = refs.rows.value;
  }

  function setAlgorithmHint(id) {
    var algo = algorithmById(id);
    refs.algorithmHint.textContent = algo.hint;
  }

  function bindEvents() {
    /* The maze is always square (1:1): editing either slider
       mirrors the value onto the other one. */
    refs.cols.addEventListener('input', function () {
      refs.rows.value = refs.cols.value;
      syncRangeOutputs();
    });
    refs.rows.addEventListener('input', function () {
      refs.cols.value = refs.rows.value;
      syncRangeOutputs();
    });

    refs.algorithm.addEventListener('change', function () {
      setAlgorithmHint(refs.algorithm.value);
      setStats({ algorithm: algorithmById(refs.algorithm.value).name });
    });

    refs.generate.addEventListener('click', function () {
      if (handlers.onGenerate) handlers.onGenerate();
    });
    refs.solve.addEventListener('click', function () {
      if (handlers.onSolve) handlers.onSolve();
    });
    refs.clear.addEventListener('click', function () {
      if (handlers.onClear) handlers.onClear();
    });
    refs.download.addEventListener('click', function () {
      if (handlers.onDownload) handlers.onDownload();
    });
  }

  /* ---------------- public API ---------------- */

  function init(eventHandlers) {
    handlers = eventHandlers || {};
    cacheRefs();

    fillSelect(refs.algorithm, Config.ALGORITHMS, Config.DEFAULT_ALGORITHM);
    fillSelect(refs.speed, Config.SPEEDS, Config.DEFAULT_SPEED);

    refs.cols.min = Config.MIN_SIZE;
    refs.cols.max = Config.MAX_SIZE;
    refs.cols.value = Config.DEFAULT_SIZE;
    refs.rows.min = Config.MIN_SIZE;
    refs.rows.max = Config.MAX_SIZE;
    refs.rows.value = Config.DEFAULT_SIZE;

    syncRangeOutputs();
    setAlgorithmHint(refs.algorithm.value);
    bindEvents();

    setStats({
      size: Config.DEFAULT_SIZE + ' × ' + Config.DEFAULT_SIZE,
      algorithm: algorithmById(Config.DEFAULT_ALGORITHM).name,
      time: '—',
      path: '—'
    });
  }

  function getSettings() {
    return {
      cols: parseInt(refs.cols.value, 10),
      rows: parseInt(refs.rows.value, 10),
      algorithm: refs.algorithm.value,
      speed: refs.speed.value
    };
  }

  function setBusy(value) {
    busy = !!value;
    document.body.classList.toggle('is-busy', busy);
    refs.generate.disabled = busy;
    refs.solve.disabled = busy;
    refs.clear.disabled = busy;
  }

  function isBusy() {
    return busy;
  }

  function setMessage(text) {
    refs.statusMessage.textContent = text;
  }

  function setStats(values) {
    if (!values) return;
    if (values.size !== undefined) refs.statSize.textContent = values.size;
    if (values.algorithm !== undefined) refs.statAlgorithm.textContent = values.algorithm;
    if (values.time !== undefined) refs.statTime.textContent = values.time;
    if (values.path !== undefined) refs.statPath.textContent = values.path;
  }

  MazeGen.Controls = {
    init: init,
    getSettings: getSettings,
    setBusy: setBusy,
    isBusy: isBusy,
    setMessage: setMessage,
    setStats: setStats
  };
})(window);
