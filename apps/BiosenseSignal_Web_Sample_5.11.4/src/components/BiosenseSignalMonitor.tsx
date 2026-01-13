import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import {
  isMobile,
  isTablet,
  isIos,
  HealthMonitorCodes,
  SessionState,
} from '@biosensesignal/web-sdk';
import { useMediaPredicate } from 'react-media-hook';
import {
  useError,
  useLicenseKey,
  useMeasurementDuration,
  useMonitor,
  usePageVisibility,
  usePrevious,
  useWarning,
} from '../hooks';
import Stats from './Stats';
import StartButton from './StartButton';
import { mirror } from '../style/mirror';
import { Flex } from './shared/Flex';
import Timer from './Timer';
import media from '../style/media';
import InfoBar from './InfoBar';
import { ErrorAlert, InfoAlert, WarningAlert } from './alert';
import Loader from './Loader';
import { VideoReadyState } from '../types';
import TopBar from './TopBar';
import Mask from '../assets/mask.svg';

const MonitorWrapper = styled(Flex)<{ isSettingsOpen: boolean }>`
  flex-direction: column;
  width: 100%;
  justify-content: start;
  align-items: center;
  flex: 1;
  z-index: ${({ isSettingsOpen }) => isSettingsOpen && '-1'};
  ${media.tablet`
    width: fit-content;
    justify-content: center;
  `}
`;

const MeasurementContentWrapper = styled(Flex)<{ isMobile: boolean }>`
  width: auto;
  height: ${({ isMobile }) => isMobile && '100%'};
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  ${media.mobile`
    margin: 40px 0 60px 0;
  `}
`;

const VideoAndStatsWrapper = styled(Flex)<{ isMobile: boolean }>`
  position: relative;
  justify-content: center;
  width: 100%;
  height: ${({ isMobile }) => isMobile && '100%'};
  ${media.tablet`
    width: 812px;
    height: 609px;
  `} ${media.wide`
    width: 1016px;
    height: 762px;
  `};
`;

const VideoWrapper = styled.div`
  width: 100%;
  height: 100%;
  z-index: -1;
`;

const Img = styled.img<{ isDesktop: boolean }>`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  object-fit: ${({ isDesktop }) => (isDesktop ? 'contain' : 'cover')};
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  ${mirror};
`;

const ButtonWrapper = styled(Flex)`
  flex: 2;
  z-index: 3;
  width: 100%;
  flex-direction: column;
  justify-content: start;
  align-items: center;
  margin-top: -30px;
  ${media.mobile`
    margin-top: 50px;
  `}
  ${media.tablet`
  padding: 0;
  height: auto;
  width: auto;
  position: absolute;
  right: 0;
  bottom: 42%;
  margin-right: 60px;
`}
`;

const ButtomTimerWrapper = styled(Flex)`
  display: none;
  ${media.tablet`
    justify-content: center;
    align-items: center;
    margin-top: 10px;
    height: 30px;
    display: flex;
  `}
`;

const InfoBarWrapper = styled.div`
  height: 25px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  ${media.mobile`
    flex: 0.45;
  `}
`;

const BiosenseSignalMonitor = ({
  showMonitor,
  cameraId,
  onLicenseStatus,
  onSettingsClick,
  isSettingsOpen,
}) => {
  if (!showMonitor) {
    return null;
  }

  const video = useRef<HTMLVideoElement>(null);
  const [isMeasurementEnabled, setIsMeasurementEnabled] = useState<boolean>(
    false,
  );
  const [startMeasuring, setStartMeasuring] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTimeoutPromise, setLoadingTimeoutPromise] = useState<number>();
  const isPageVisible = usePageVisibility();
  const isMediaTablet = useMediaPredicate('(min-width: 1000px)');
  const [processingTime] = useMeasurementDuration();
  const [licenseKey] = useLicenseKey();
  const {
    sessionState,
    vitalSigns,
    offlineMeasurements,
    error,
    warning,
    info,
  } = useMonitor(
    video,
    cameraId,
    processingTime,
    licenseKey,
    null,
    startMeasuring,
  );
  const prevSessionState = usePrevious(sessionState);
  const errorMessage = useError(error);
  const warningMessage = useWarning(warning);

  const isMeasuring = useCallback(
    () => sessionState === SessionState.MEASURING,
    [sessionState],
  );

  const isVideoReady = useCallback(
    () => video.current?.readyState === VideoReadyState.HAVE_ENOUGH_DATA,
    [],
  );

  const handleButtonClick = useCallback(() => {
    setIsLoading(true);
    if (sessionState === SessionState.ACTIVE) {
      setStartMeasuring(true);
      setLoadingTimeoutPromise(
        window.setTimeout(() => setIsLoading(true), processingTime * 1000),
      );
    } else if (isMeasuring()) {
      clearTimeout(loadingTimeoutPromise);
      setStartMeasuring(false);
    }
  }, [sessionState, setIsLoading, processingTime]);

  useEffect(() => {
    if (isMeasuring()) {
      setIsLoading(false);
      if (errorMessage) {
        setIsMeasurementEnabled(false);
      } else {
        setIsMeasurementEnabled(true);
      }
      !isPageVisible && setStartMeasuring(false);
    } else if (
      (sessionState === SessionState.ACTIVE ||
        sessionState === SessionState.TERMINATED) &&
      errorMessage
    ) {
      setIsMeasurementEnabled(false);
    }
    if (
      sessionState === SessionState.ACTIVE &&
      prevSessionState !== sessionState
    ) {
      setStartMeasuring(false);
      setIsLoading(false);
    }
  }, [errorMessage, sessionState, isPageVisible]);

  useEffect(() => {
    onLicenseStatus(!(error?.code in HealthMonitorCodes));
  }, [error]);

  const mobile = useMemo(() => isMobile(), []);
  const desktop = useMemo(() => !isTablet() && !isMobile(), []);

  return (
    <>
      <TopBar onSettingsClick={onSettingsClick} isMeasuring={isMeasuring()} />
      <MonitorWrapper isSettingsOpen={isSettingsOpen}>
        <MeasurementContentWrapper isMobile={mobile}>
          <InfoBarWrapper>
            <InfoBar
              showTimer={isMeasurementEnabled && !isMediaTablet}
              isMeasuring={isMeasuring()}
              durationSeconds={processingTime}
              offlineMeasurements={offlineMeasurements}
            />
          </InfoBarWrapper>
          <VideoAndStatsWrapper isMobile={mobile}>
            <VideoWrapper>
              <Img src={Mask} isDesktop={desktop} />
              <Video ref={video} id="video" muted={true} playsInline={true} />
            </VideoWrapper>
            {(isMeasuring()
              ? !errorMessage && !warningMessage
              : !errorMessage) &&
              isMeasurementEnabled && <Stats vitalSigns={vitalSigns} />}
            <ErrorAlert message={errorMessage} />
            {isMeasuring() && <WarningAlert message={warningMessage} />}
            {isMeasuring() && <InfoAlert message={info.message} />}
            {!isVideoReady() && licenseKey && <Loader />}
          </VideoAndStatsWrapper>
          <ButtomTimerWrapper>
            {isMeasurementEnabled && (
              <Timer started={isMeasuring()} durationSeconds={processingTime} />
            )}
          </ButtomTimerWrapper>
          <ButtonWrapper>
            <StartButton
              isLoading={isLoading}
              isMeasuring={isMeasuring()}
              onClick={handleButtonClick}
            />
          </ButtonWrapper>
        </MeasurementContentWrapper>
      </MonitorWrapper>
    </>
  );
};

export default BiosenseSignalMonitor;


