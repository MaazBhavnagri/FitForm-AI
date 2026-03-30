/**
 * smoothing.js
 * Moving average filter for stabilizing noisy angle readings.
 */

export class MovingAverageFilter {
  /**
   * @param {number} windowSize - Number of frames to average (default: 5)
   */
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.buffer = [];
  }

  /**
   * Push a new value and return the smoothed average.
   * @param {number} value
   * @returns {number} Smoothed value
   */
  push(value) {
    this.buffer.push(value);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }
    const sum = this.buffer.reduce((acc, v) => acc + v, 0);
    return sum / this.buffer.length;
  }

  /** Reset the buffer (call when pose is lost) */
  reset() {
    this.buffer = [];
  }

  /** Returns true if the buffer has enough samples */
  get isReady() {
    return this.buffer.length >= Math.min(3, this.windowSize);
  }
}
