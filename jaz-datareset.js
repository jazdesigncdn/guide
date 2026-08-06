/* ============================================================
   JAZ BETA DATA RESET  —  single hosted source of truth
   https://guide.jazdesign.com/jaz-datareset.js

   PURPOSE
     Wipes browser-side app state so a beta tester behaves like a first-time user.

   HOW ONE FILE REACHES BOTH ORIGINS
     A <script src> executes in the origin of the INCLUDING page, not the origin
     it is served from. guide.jazdesign.com and jazdesign.com are SEPARATE
     storage origins, so this one file covers both with no per-site edits:
       jazdesign.com pages   -> clears jazdash:*   (client dashboard)
       jaz-design-guide.html -> clears jazguide:*  (guide, guide.jazdesign.com)
     Each copy only finds the keys its own origin actually has.

   INSTALL (once, never edited again)
     <script src="https://guide.jazdesign.com/jaz-datareset.js"></script>
       1. Squarespace: Settings > Advanced > Code Injection > HEADER
       2. jaz-design-guide.html: first <script> in <head>, above the bootstrap
     MUST be synchronous. No defer, no async — it has to run before the app
     reads localStorage.

   RUNNING A NEW BETA ROUND
     Bump _DATAVERSION, commit. Every tester resets once on their next load.
     GitHub Pages caches ~10 min, so allow a short propagation window.
     End of beta: set _DATARESET = false. The leftover version key is harmless.

   MANUAL SINGLE-TESTER RESET
     Append ?jazreset=1 to any URL. Works even when _DATARESET is false.

   NOTES
     jazadmin:* is preserved by design (local-only admin tool).
     Storage-blocked contexts (private mode, file://) no-op safely.
     Browser-side only. Supabase tables and Storage buckets must be wiped separately.
   ============================================================ */
(function () {
  /* ---- CONFIG: the only two lines you ever change ---- */
  var _DATARESET = false; /* master switch: true during beta, false after */
  var _DATAVERSION = 1; /* bump to force one reset per tester */

  /* ---- CONSTANTS ---- */
  var VERSION_KEY = "jazreset:version"; /* lives OUTSIDE the wipe namespace */
  var WIPE = /^(jazguide:|jazdash:|sb-[a-z0-9]+-auth-token)/i;
  var KEEP = /^(jazreset:|jazadmin:)/i;

  var forced = false;
  try {
    forced = /[?&]jazreset=1/.test(String(location.search || ""));
  } catch (e) {}

  function sweep(store) {
    var n = 0,
      all = [],
      i;
    try {
      for (i = 0; i < store.length; i++) all.push(store.key(i));
    } catch (e) {
      return 0;
    }
    for (i = 0; i < all.length; i++) {
      if (!all[i] || KEEP.test(all[i]) || !WIPE.test(all[i])) continue;
      try {
        store.removeItem(all[i]);
        n++;
      } catch (e) {}
    }
    return n;
  }

  if (!_DATARESET && !forced) return;

  var seen = null;
  try {
    seen = window.localStorage.getItem(VERSION_KEY);
  } catch (e) {
    return; /* storage unavailable — nothing to clear */
  }
  if (!forced && seen !== null && Number(seen) === _DATAVERSION) return;

  var cleared = sweep(window.localStorage) + sweep(window.sessionStorage);
  try {
    window.localStorage.setItem(VERSION_KEY, String(_DATAVERSION));
  } catch (e) {}

  try {
    console.log(
      "[JAZ RESET] " +
        location.origin +
        ": v" +
        (seen === null ? "none" : seen) +
        " -> v" +
        _DATAVERSION +
        ", cleared " +
        cleared +
        " key(s)" +
        (forced ? " (manual)" : ""),
    );
  } catch (e) {}
})();
