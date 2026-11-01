/* =========================================================
   themes/theme.js — colour theme switching.

   Three themes are available: "midnight" (the default look,
   defined in css/themes/midnight.css), "light" (light.css) and
   "dark" (dark.css). The chosen theme is written to
   <html data-theme="..."> and remembered in localStorage, so
   both pages and the downloaded PNG follow the selection.

   Loaded from <head> of every page, which applies the saved
   theme before the first paint (no flash of the wrong theme).
   Exposes: MazeGen.Theme
   ========================================================= */
(function (global) {
  "use strict";

  var MazeGen = (global.MazeGen = global.MazeGen || {});

  var STORAGE_KEY = "maze-gen-theme";
  var DEFAULT_THEME = "midnight";
  var THEMES = [
    { id: "midnight", name: "Midnight" },
    { id: "light", name: "Light" },
    { id: "dark", name: "Dark" }
  ];

  /* callbacks fired after the user picks a theme */
  var listeners = [];

  function isValid(id) {
    return THEMES.some(function (theme) {
      return theme.id === id;
    });
  }

  function readStored() {
    try {
      var stored = global.localStorage.getItem(STORAGE_KEY);
      return isValid(stored) ? stored : null;
    } catch (e) {
      return null;
    }
  }

  function store(id) {
    try {
      global.localStorage.setItem(STORAGE_KEY, id);
    } catch (e) {
      /* private mode etc. — the theme still applies for this page */
    }
  }

  /* the theme currently on <html> (default when unlabelled) */
  function current() {
    var id = document.documentElement.getAttribute("data-theme");
    return isValid(id) ? id : DEFAULT_THEME;
  }

  function syncButtons(theme) {
    var buttons = document.querySelectorAll("[data-theme-btn]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute(
        "aria-pressed",
        buttons[i].getAttribute("data-theme-btn") === theme ? "true" : "false"
      );
    }
  }

  /* switch to a theme; unknown ids fall back to the default.
     Notifies listeners when the theme really changed, so anything
     painted from the tokens (the canvas) can repaint itself. */
  function apply(id) {
    var theme = isValid(id) ? id : DEFAULT_THEME;
    var changed = current() !== theme;
    document.documentElement.setAttribute('data-theme', theme);
    store(theme);
    syncButtons(theme);
    if (changed) {
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](theme);
      }
    }
    return theme;
  }

  /* register a callback: function (themeId) { ... } */
  function onChange(fn) {
    if (typeof fn === "function") {
      listeners.push(fn);
    }
  }

  function init() {
    /* restore the saved choice (keeps whatever <head> already set) */
    apply(readStored() || current());

    var buttons = document.querySelectorAll("[data-theme-btn]");
    for (var i = 0; i < buttons.length; i++) {
      (function (button) {
        button.addEventListener("click", function () {
          apply(button.getAttribute("data-theme-btn"));
        });
      })(buttons[i]);
    }

    syncButtons(current());
  }

  /* apply the saved theme straight away (script lives in <head>) */
  apply(readStored() || DEFAULT_THEME);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  MazeGen.Theme = {
    THEMES: THEMES,
    init: init,
    apply: apply,
    current: current,
    onChange: onChange
  };
})(window);
