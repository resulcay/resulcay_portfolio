export interface Device {
  webgl2: boolean;
  /** GB, when the browser tells (Chromium only). */
  deviceMemory: number | undefined;
  saveData: boolean;
  reducedMotion: boolean;
}

/** Whether the 3D story is a good fit, or the journal is the better way in. */
export function storyFits(device: Device): boolean {
  return (
    device.webgl2 &&
    (device.deviceMemory === undefined || device.deviceMemory >= 4) &&
    !device.saveData &&
    !device.reducedMotion
  );
}

export function readDevice(): Device {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  // Free the probe context straight away; browsers cap how many can live.
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    webgl2: gl !== null,
    deviceMemory: nav.deviceMemory,
    saveData: nav.connection?.saveData === true,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
