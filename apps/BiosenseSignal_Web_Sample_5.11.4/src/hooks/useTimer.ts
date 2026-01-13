import { useEffect, useState } from 'react';

const useTimer = (started, durationSeconds) => {
  const [seconds, setSeconds] = useState(1);
  const [intervalId, setIntervalId] = useState<any>(0);

  useEffect(() => {
    if (started) {
      setSeconds(1);
      const intervalId = setInterval(() => {
        setSeconds((seconds) => {
          if (seconds == durationSeconds - 1) {
            clearInterval(intervalId);
          }
          return seconds + 1;
        });
      }, 1000);
      setIntervalId(intervalId);
    } else {
      clearInterval(intervalId);
    }
  }, [started]);

  return seconds;
};
export default useTimer;
