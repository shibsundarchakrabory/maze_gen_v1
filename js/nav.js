/* =========================================================
   nav.js — the animated navigation indicator.

   Positions the gliding pill (css/nav.css .nav-indicator) over
   the active link, follows hover/focus around the capsule and
   drops a few fading dots behind it, echoing the player trail on
   the game page. Purely decorative: without this file the links
   still work as plain anchors.
   Exposes: MazeGen.Nav
   ========================================================= */
(function (global) {
  'use strict';

  var MazeGen = (global.MazeGen = global.MazeGen || {});

  var nav = null;
  var indicator = null;
  var links = [];
  var active = null;
  var current = null; // the link the pill is (heading) to
  var last = null; // the pill's last resting box { x, w }
  var colorTimer = null;
  var reducedMotion = false;

  /* matches the pill's glide (nav.css transform transition, 0.5 s) */
  var GLIDE_MS = 520;

  /* A link's box in the pill's coordinate space: offsetLeft already
     measures from .site-nav's padding edge, which is exactly where
     the pill's left:0 sits. offsetLeft and offsetWidth ignore
     transforms, so this stays correct even while the entrance
     animation is still bouncing the links around. */
  function boxOf(link) {
    return { x: link.offsetLeft, w: link.offsetWidth };
  }

  function spawnTrail(from, box) {
    var fromC = from.x + from.w / 2;
    var toC = box.x + box.w / 2;
    for (var i = 1; i <= 3; i++) {
      var t = i / 4;
      var dot = document.createElement('span');
      dot.className = 'nav-trail-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.left = fromC + (toC - fromC) * t + 'px';
      nav.appendChild(dot);
      (function (node) {
        global.setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 750);
      })(dot);
    }
  }

  /* Glide the pill onto `link`. */
  function place(link, withTrail) {
    if (!link || !indicator) return;
    var previous = current;
    current = link;
    var box = boxOf(link);

    if (withTrail && last && !reducedMotion) {
      var travelled = Math.abs(box.x + box.w / 2 - (last.x + last.w / 2));
      if (travelled > 44) spawnTrail(last, box);
    }

    indicator.style.width = box.w + 'px';
    indicator.style.transform = 'translateX(' + box.x + 'px)';

    /* colour follows the pill: the old link drops it right away, the
       new one gets it only once the pill has arrived — so the text
       never wears on-accent before its pill is underneath it.
       No colour churn when the pill isn't actually changing links
       (hovering the link it already sits on would flicker). */
    if (link !== previous) {
      if (colorTimer) {
        global.clearTimeout(colorTimer);
        colorTimer = null;
      }
      for (var i = 0; i < links.length; i++) {
        links[i].classList.remove('is-on');
      }
      if (withTrail && !reducedMotion) {
        colorTimer = global.setTimeout(function () {
          colorTimer = null;
          if (current === link) link.classList.add('is-on');
        }, GLIDE_MS);
      } else {
        link.classList.add('is-on');
      }
    }

    last = box;

    /* fade the pill in on the first placement (a frame later, so
       the opacity transition has something to animate from) */
    if (!indicator.classList.contains('is-ready')) {
      global.requestAnimationFrame(function () {
        indicator.classList.add('is-ready');
      });
    }
  }

  function currentLink() {
    return current || active;
  }

  function refresh() {
    place(currentLink(), false);
  }

  function init() {
    nav = document.querySelector('.site-nav');
    if (!nav) return;

    indicator = nav.querySelector('.nav-indicator');
    links = [].slice.call(nav.querySelectorAll('a'));
    if (!indicator || !links.length) return;

    active = nav.querySelector('a.is-active') || links[0];
    reducedMotion = !!(global.matchMedia &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches);

    for (var i = 0; i < links.length; i++) {
      (function (link) {
        link.addEventListener('mouseenter', function () {
          place(link, true);
        });
        link.addEventListener('focus', function () {
          place(link, true);
        });
      })(links[i]);
    }

    /* leaving the capsule parks the pill back on the active page */
    nav.addEventListener('mouseleave', function () {
      place(active, true);
    });

    place(active, false);
    global.addEventListener('resize', refresh);
  }

  MazeGen.Nav = {
    init: init,
    refresh: refresh
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
