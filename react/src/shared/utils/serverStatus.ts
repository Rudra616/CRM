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
