import { useEffect, useState } from 'react';

const useCameras = (): MediaDeviceInfo[] => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    (async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput',
      );
      videoDevices && setCameras(videoDevices);
    })();
  }, []);
  return cameras;
};

export default useCameras;
