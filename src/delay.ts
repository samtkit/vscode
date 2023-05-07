/**
 * Returns a promise that resolves after the given number of milliseconds.
 * @param millis the number of milliseconds to wait
 * @returns a promise that resolves after the given number of milliseconds
 */
export default async function delay(millis: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
