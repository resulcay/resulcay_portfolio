/** Resolves once `work` settles (either way) or after `ms`, whichever comes first. */
export async function settleWithin(work: Promise<unknown>, ms: number): Promise<'done' | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => (timer = setTimeout(() => resolve('timeout'), ms)));
  const done = work.then(
    () => 'done' as const,
    () => 'done' as const,
  );
  try {
    return await Promise.race([done, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Collects the loads a view waits for; `settled` waits for all of them, even ones added meanwhile. */
export function createGate() {
  const pending = new Set<Promise<unknown>>();
  return {
    track(work: Promise<unknown>) {
      pending.add(work.catch(() => undefined));
    },
    settled(ms: number) {
      const all = async () => {
        let seen: number;
        do {
          seen = pending.size;
          await Promise.all(pending);
        } while (pending.size !== seen);
      };
      return settleWithin(all(), ms);
    },
  };
}

export type Gate = ReturnType<typeof createGate>;
