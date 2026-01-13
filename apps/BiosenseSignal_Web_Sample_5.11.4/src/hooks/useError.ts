import { useCallback, useEffect, useState } from 'react';

const useError = (alert) => {
  const [errorMessage, setErrorMessage] = useState<string>();

  const displayError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  useEffect(() => {
    if (alert?.code === -1) {
      setErrorMessage('');
      return;
    }

    if (alert?.code) {
      displayError(`Error: ${alert.code}`);
    }
  }, [alert]);

  return errorMessage;
};
export default useError;
