import React, { useEffect, useState } from 'react';
import { FlexSpace } from './shared/FlexSpace';
import Timer from './Timer';
import styled from 'styled-components';
import media from '../style/media';

const InfoContent = styled(FlexSpace)`
  padding: 5px 5px;
  width: 100%;
  height: 25px;
  box-sizing: border-box;
  ${media.tablet`
    padding: 5px 1px;
  `}
`;

const LicenseInfo = styled.div`
  font-size: 16px;
  color: #01061b;
`;

interface IInfoBar {
  /**
   *  Displays whether the current session state is measuring
   */
  isMeasuring: boolean;
  /**
   *  Total number of seconds for current measurement
   */
  durationSeconds: number;
  /**
   *  Show timer if true
   */
  showTimer: boolean;
  /**
   * Object - offline measurement info for license by measurement
   */
  offlineMeasurements: {
    measurementSecondsEnd: number;
    offlineMeasurements: number;
    offlineMeasurementsRemaining: number;
  };
}

const InfoBar = ({
  isMeasuring,
  durationSeconds,
  showTimer,
  offlineMeasurements,
}: IInfoBar) => {
  const [timerId, setTimerId] = useState(null);
  const [measurementSecondsEnd, setMeasurementSecondsEnd] = useState<number>(0);
  const measurementSecondsEndToDisplay = measurementSecondsEnd
    ? ' | ' + new Date(measurementSecondsEnd * 1000).toISOString().substr(14, 5)
    : ' | 00:00';

  useEffect(() => {
    setMeasurementSecondsEnd(offlineMeasurements?.measurementSecondsEnd);
  }, [offlineMeasurements?.measurementSecondsEnd]);

  useEffect(() => {
    if (timerId === null && measurementSecondsEnd > 0) {
      setTimerId(
        setInterval(() => {
          if (measurementSecondsEnd > 0) {
            setMeasurementSecondsEnd((prev) => {
              if (prev === 0) {
                clearInterval(timerId);
                return;
              }
              return prev - 1;
            });
          }
        }, 1000),
      );
    }
  }, [measurementSecondsEnd, setTimerId]);

  return (
    <InfoContent>
      <LicenseInfo>
        {!isMeasuring && offlineMeasurements
          ? `License: ${offlineMeasurements.offlineMeasurementsRemaining}/${offlineMeasurements.offlineMeasurements}`
          : ''}
        {!isMeasuring && offlineMeasurements?.measurementSecondsEnd
          ? measurementSecondsEndToDisplay
          : ''}
      </LicenseInfo>
      {showTimer && (
        <Timer started={isMeasuring} durationSeconds={durationSeconds} />
      )}
    </InfoContent>
  );
};
export default InfoBar;
