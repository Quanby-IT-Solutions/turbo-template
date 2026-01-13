import styled from 'styled-components';
import React, { useEffect, useRef } from 'react';
import { mirror } from '../style/mirror';
import media from '../style/media';

const Canvas = styled.canvas<{ height; dim }>`
  position: absolute;
  top: 0;
  left: 0;
  background-color: ${({ dim }) =>
    dim ? 'rgba(0, 0, 0, 0.4)' : 'transparent'};
  ${media.tablet`
    background-color: transparent;
  `}
  ${mirror}
`;

const OverlayCanvas = ({ faceRect, width, height, isReport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvasRef.current.getContext('2d');
    context.clearRect(0, 0, width, height);
    if (!faceRect) return;
    context.strokeStyle = '#0653F4';
    context.lineWidth = 1;
    !isReport &&
      context.strokeRect(
        faceRect.x,
        faceRect.y,
        faceRect.width,
        faceRect.height,
      );
  }, [faceRect, isReport]);

  return (
    <Canvas width={width} height={height} ref={canvasRef} dim={isReport} />
  );
};

export default OverlayCanvas;
