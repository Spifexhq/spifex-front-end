let gate: Promise<void> | null = null;

export function setAuthGate(p: Promise<void>) {
  gate = p;
}

export function clearAuthGate() {
  gate = null;
}

export async function waitAuthGate(timeoutMs = 4000): Promise<void> {
  if (!gate) return;

  let t: number | null = null;
  try {
    await Promise.race([
      gate,
      new Promise<void>((resolve) => {
        t = window.setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (t) window.clearTimeout(t);
  }
}
