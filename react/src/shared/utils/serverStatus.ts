const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');

type Listener = () => void;
const downListeners = new Set<Listener>();
const upListeners = new Set<Listener>();

export function notifyServerDown(): void {
  downListeners.forEach((fn) => fn());
}

/** Call when any API request succeeds so a false “server down” state can clear. */
export function notifyServerRecovered(): void {
  upListeners.forEach((fn) => fn());
}

export function subscribe(listener: Listener): () => void {
  downListeners.add(listener);
  return () => downListeners.delete(listener);
}

export function subscribeRecovered(listener: Listener): () => void {
  upListeners.add(listener);
  return () => upListeners.delete(listener);
}

export async function checkHealth(): Promise<void> {
  try {
    const r = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!r.ok) {
      throw new Error('Server unhealthy');
    }
  } catch (err) {
    throw new Error('Server unreachable');
  }
}