import { useCallback, useEffect, useState } from 'react';

const useWarning = (alert) => {
  const [warningMessage, setWarningMessage] = useState<string>();

  const startDismissTimeout = useCallback((seconds: number) => {
    setTimeout(() => {
      setWarningMessage('');
    }, seconds * 1000);
  }, []);

  const displayWarning = useCallback((message: string) => {
    setWarningMessage(message);
    startDismissTimeout(4);
  }, []);

  useEffect(() => {
    if (alert?.code === -1) {
      setWarningMessage('');
      return;
    }

    if (alert?.code) {
      displayWarning(`Warning: ${alert.code}`);
    }
  }, [alert]);

  return warningMessage;
};
export default useWarning;
