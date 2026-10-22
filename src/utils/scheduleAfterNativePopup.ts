/**
 * Runs `fn` after the browser has finished tearing down any native <select>
 * dropdown popup. Why this exists: a mouse click on a native select *option*
 * commits the value and dispatches the `change` event while Chromium is still
 * destroying the popup widget. Work scheduled inside that `change` handler
 * (React state updates -> synchronous-ish re-render + a11y tree churn) lands
 * in the same teardown window; under real hardware mouse input this has
 * repeatedly left the tab unresponsive (renderer hang/crash). Programmatically
 * setting the value never enters that window, which is why that path always
 * worked. Two animation frames are enough for the popup close/cleanup to
 * complete; the app re-render then starts on a clean frame.
 */
export function scheduleAfterNativePopup(fn: () => void): void {
  const twoFrames = (run: () => void, depth = 2) => {
    if (depth <= 0) {
      try {
        run();
      } catch (err) {
        // Never let the deferred work die silently or inside the compositor loop.
        setTimeout(() => {
          throw err;
        });
      }
      return;
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => twoFrames(run, depth - 1));
    } else {
      // Test environment fallback (jsdom without a compositor loop).
      setTimeout(() => twoFrames(run, depth - 1), 0);
    }
  };
  twoFrames(fn);
}
