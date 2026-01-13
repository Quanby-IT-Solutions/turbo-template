import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useTimer } from '../hooks';
import media from '../style/media';
import { useMediaPredicate } from 'react-media-hook';

const Value = styled.div`
  font-size: 16px;
  color: #01061b;
  ${media.tablet`
    color: #0653f4;
    font-size: 24px;
 `}
`;

const Timer = ({ started, durationSeconds }) => {
  const isMediaTablet = useMediaPredicate('(min-width: 1000px)');
  const seconds = useTimer(started, durationSeconds);
  const formatMinutes = useCallback(
    (seconds) => ('0' + Math.floor(seconds / 60)).slice(-2),
    [seconds],
  );
  const formatSeconds = useCallback(
    (seconds) => ('0' + (seconds % 60)).slice(-2),
    [seconds],
  );
  return (
    <Value>
      {!isMediaTablet && 'Duration: '}
      {formatMinutes(seconds)}:{formatSeconds(seconds)}
    </Value>
  );
};

export default Timer;
