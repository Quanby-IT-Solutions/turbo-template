import { useCallback, useEffect } from 'react';
const useDisableZoom = () => {
  const preventDefaultHandler = useCallback((e) => e.preventDefault(), []);

  useEffect(() => {
    document.addEventListener('gesturestart', preventDefaultHandler);
    document.addEventListener('gesturechange', preventDefaultHandler);
    window.addEventListener('gestureend', preventDefaultHandler);

    return () => {
      window.removeEventListener('gesturestart', preventDefaultHandler);
      window.removeEventListener('gesturechange', preventDefaultHandler);
      window.removeEventListener('gestureend', preventDefaultHandler);
    };
  }, []);
};
export default useDisableZoom;
