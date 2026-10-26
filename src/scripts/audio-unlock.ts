/**
 * Creates the page's AudioContext. Call it only inside a click handler:
 * browsers allow audio to start from a user gesture, and a context made
 * earlier would start suspended and log a warning.
 */
export function unlockAudio(): AudioContext | undefined {
  const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return undefined;
  try {
    const context = new Context();
    void context.resume();
    return context;
  } catch {
    return undefined;
  }
}
