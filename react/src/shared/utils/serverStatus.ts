const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');

type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyServerDown(): void {
  listeners.forEach((fn) => fn());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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