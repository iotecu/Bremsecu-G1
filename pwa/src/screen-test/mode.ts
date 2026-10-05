/** Explicit build-time boundary. Never enabled by an ESP address or API failure. */
export function isScreenTestBuild(): boolean {
  // Direct access lets Vite replace this at build time; Node tests have no env.
  return typeof import.meta.env !== 'undefined' && import.meta.env.MODE === 'screen-test';
}
