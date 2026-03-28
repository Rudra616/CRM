import { useState, useEffect, useCallback } from 'react';
import { checkHealth, subscribe, subscribeRecovered } from '../utils/serverStatus';

export const useServerStatus = () => {
  const [serverDown, setServerDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const attemptRecovery = useCallback(async () => {
    setIsChecking(true);
    try {
      await checkHealth();
      setServerDown(false);
    } catch {
      // stay down
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

  useEffect(() => {
    checkHealth().catch(() => setServerDown(true));
  }, []);

  useEffect(() => {
    if (!serverDown) return;
    const id = setInterval(attemptRecovery, 5000);
    return () => clearInterval(id);
  }, [serverDown, attemptRecovery]);

  return { serverDown, isChecking, attemptRecovery };
};