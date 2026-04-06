import { useState, useEffect, useCallback } from 'react';
import { subscribe, subscribeRecovered, notifyServerRecovered } from '../utils/serverStatus';

/**
 * “Server down” is driven only by real API failures (axios), not a /health probe.
 */
export const useServerStatus = () => {
  const [serverDown, setServerDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const attemptRecovery = useCallback(async () => {
    setIsChecking(true);
    try {
      notifyServerRecovered();
      setServerDown(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const unsubDown = subscribe(() => setServerDown(true));
    const unsubUp = subscribeRecovered(() => setServerDown(false));
    return () => {
      unsubDown();
      unsubUp();
    };
  }, []);

  return { serverDown, isChecking, attemptRecovery };
};
