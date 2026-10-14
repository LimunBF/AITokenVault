// Util async: bungkus promise dengan batas waktu supaya UI gak nge-gantung.
export class TimeoutError extends Error {
  constructor(ms) {
    super(`timeout after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new TimeoutError(ms)), ms)),
  ]);
}

export function isTimeoutError(err) {
  return err?.name === 'TimeoutError';
}
