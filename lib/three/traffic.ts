/* ============================================================================
 * Shared traffic-signal clock.
 *
 * One global cycle drives EVERY junction in the city so that traffic lights,
 * cars and pedestrians all agree on who has right of way. Phase is a pure
 * function of the render clock (clock.elapsedTime, in seconds), so no state or
 * network is needed — every agent computes the same answer on every frame.
 *
 *   EW (east-west / horizontal roads) gets green first, then yellow, then red
 *   while NS (north-south / vertical roads) runs its green + yellow.
 * ==========================================================================*/

export type SignalAxis = 'EW' | 'NS';
export type SignalState = 'green' | 'yellow' | 'red';

export const GREEN_SECONDS = 7.0;
export const YELLOW_SECONDS = 1.6;
/** One half-cycle = one direction's green + yellow. */
const HALF = GREEN_SECONDS + YELLOW_SECONDS;
/** Full cycle: EW serve, then NS serve. */
export const CYCLE_SECONDS = HALF * 2;

/** Light state for one axis at time `t` (seconds). */
export function signalState(axis: SignalAxis, t: number): SignalState {
  const p = ((t % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  if (axis === 'EW') {
    if (p < GREEN_SECONDS) return 'green';
    if (p < HALF) return 'yellow';
    return 'red';
  }
  // NS is offset by one half-cycle.
  if (p < HALF) return 'red';
  if (p < HALF + GREEN_SECONDS) return 'green';
  return 'yellow';
}

/** Agents keep moving on green AND yellow (yellow = clearing the box), and
 * only hold on red. */
export function canProceed(axis: SignalAxis, t: number): boolean {
  return signalState(axis, t) !== 'red';
}

/**
 * Clamp a proposed 1-D position so an agent travelling along a road halts at
 * the stop line before the next junction when its light is red.
 *
 * @param c        current coordinate along the travel axis
 * @param proposed next coordinate the agent wants to move to
 * @param dir      travel direction (+1 = increasing coord, -1 = decreasing)
 * @param axes     junction coordinates along the travel axis (sorted asc)
 * @param stopGap  how far before the junction centre to stop
 * @returns the (possibly clamped) coordinate
 */
export function clampToStopLine(
  c: number, proposed: number, dir: number, axes: number[], stopGap: number
): number {
  if (dir > 0) {
    let nextJ = Infinity;
    for (const a of axes) if (a > c + 0.001 && a < nextJ) nextJ = a;
    if (nextJ !== Infinity) {
      const stopLine = nextJ - stopGap;
      // Only hold if we haven't already crossed the line (otherwise: clear it).
      if (c <= stopLine) return Math.min(proposed, stopLine);
    }
  } else {
    let nextJ = -Infinity;
    for (const a of axes) if (a < c - 0.001 && a > nextJ) nextJ = a;
    if (nextJ !== -Infinity) {
      const stopLine = nextJ + stopGap;
      if (c >= stopLine) return Math.max(proposed, stopLine);
    }
  }
  return proposed;
}
