import styled from 'styled-components';
import React, { useCallback, useEffect, useState } from 'react';
import CloseButton from './shared/CloseButton';
import SettingsDropDown from './SettingsDropDown';
import SettingsItem from './SettingsItem';
import { Flex } from './shared/Flex';
import media from '../style/media';
import {
  useLicenseKey,
  useMeasurementDuration,
  DEFAULT_MEASUREMENT_DURATION,
  MIN_MEASUREMENT_DURATION,
  MAX_MEASUREMENT_DURATION,
} from '../hooks/useLicenseDetails';
import { version } from '../../package.json';

const SideBar = styled(Flex)<{ reverseAnimation }>`
  position: absolute;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  width: 100%;
  top: 0;
  left: 0;
  background-color: #f1f4f9;
  overflow: hidden;
  z-index: 1;
  animation-name: ${({ reverseAnimation }) =>
    reverseAnimation ? 'slide-reverse' : 'slide'};
  animation-duration: 0.3s;
  @keyframes slide {
    from {
      width: 0;
    }
    to {
      width: 100%;
    }
  }
  @keyframes slide-reverse {
    from {
      width: 100%;
    }
    to {
      width: 0;
    }
  }
  ${media.tablet`
    width: 400px;
    box-shadow: 2px 1px 5px rgba(0, 0, 0, 0.1);
    @keyframes slide {
      from {
        width: 0;
      }
      to {
        width: 400px;
      }
    }
    @keyframes slide-reverse {
      from {
        width: 400px;
      }
      to {
        width: 0;
      }
    }
`}
`;

const Wrapper = styled(Flex)`
  flex-direction: column;
  margin-top: 80px;
  width: 340px;
  box-sizing: border-box;
`;

const CloseWrapper = styled(Flex)`
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  margin-bottom: 15px;
`;

const CameraDropDown = styled.div`
  display: none;
  ${media.tablet`
    margin-top: 15px;
    display: block;
  `}
`;

const Title = styled.h3`
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  line-height: 19px;
  color: #3e3c3c;
  margin-bottom: 6px;
`;

const MeasurementDurationWrapper = styled.div`
  margin-top: 15px;
`;

const LicenseStatus = styled.h3`
  margin-top: 6px;
  margin-bottom: 0;
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  line-height: 17px;
`;

const TextBold = styled.span`
  font-weight: bold;
`;

const Version = styled.div`
  font-size: 14px;
  color: #3e3c3c;
`;

const ResetLinkActive = styled.a`
  margin-top: 18px;
  cursor: pointer;
  color: #0653f4;
  font-size: 14px;
`;

const ResetLinkDisabled = styled.a`
  margin-top: 18px;
  cursor: none;
  color: #9fa2a6;
  font-size: 14px;
`;

const HelpBlock = styled.div`
  color: #d80000;
  font-size: 12px;
  line-height: 14px;
  margin-top: 5px;
  margin-left: 2px;
`;

const SettingsBars = ({ open, onClose, cameras, isLicenseValid }) => {
  const [
    processingTimeInLocalStorage,
    setProcessingTimeInLocalStorage,
  ] = useMeasurementDuration();
  const [
    licenseKeyInLocalStorage,
    setLicenseKeyInLocalStorage,
  ] = useLicenseKey();
  const [cameraId, setCameraId] = useState<string>();
  const [processingTime, setProcessingTime] = useState<number>(
    processingTimeInLocalStorage,
  );
  const [isProcessingTimeValid, setIsProcessingTimeValid] = useState<boolean>(
    true,
  );
  const [licenseKey, setLicenseKey] = useState<string>(
    licenseKeyInLocalStorage,
  );
  const [isClosing, setIsClosing] = useState<boolean>();
  const [isResetClickable, setIsResetClickable] = useState<boolean>(false);

  const mapCamerasToDropDown = useCallback(
    (cameras) =>
      cameras?.map(({ deviceId, label }) => ({ value: deviceId, name: label })),
    [],
  );

  const handleCameraSelected = useCallback((cameraId) => {
    setCameraId(cameraId);
  }, []);

  const handleClose = useCallback(() => {
    if (!isProcessingTimeValid) {
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      onClose({ cameraId });
      setIsClosing(false);
    }, 200);
  }, [cameraId, isProcessingTimeValid]);

  const onProcessingTimeChange = useCallback((event) => {
    const processingTime = event.target.value;
    setProcessingTime(processingTime);
    setIsProcessingTimeValid(
      processingTime >= MIN_MEASUREMENT_DURATION &&
        processingTime <= MAX_MEASUREMENT_DURATION,
    );
    setIsResetClickable(true);
  }, []);

  const onProcessingTimeBlur = useCallback((event) => {
    setProcessingTimeInLocalStorage(event.target.value);
  }, []);

  const onLicenseKeyChange = useCallback((event) => {
    setLicenseKey(event.target.value);
    setIsResetClickable(true);
  }, []);

  const onLicenseKeyBlur = useCallback((event) => {
    setLicenseKeyInLocalStorage(event.target.value);
  }, []);

  const onResetSettingsValues = useCallback(() => {
    setProcessingTime(DEFAULT_MEASUREMENT_DURATION);
    setProcessingTimeInLocalStorage(DEFAULT_MEASUREMENT_DURATION);
    setIsProcessingTimeValid(true);
    setLicenseKey('');
    setLicenseKeyInLocalStorage('');
    setIsResetClickable(false);
  }, []);

  useEffect(() => {
    cameras?.length && setCameraId(cameras[0].deviceId);
  }, [cameras]);

  return (
    <div id="settingsBars">
      {open && (
        <SideBar reverseAnimation={!!isClosing}>
          <Wrapper>
            <CloseWrapper>
              <CloseButton onClick={handleClose} />
            </CloseWrapper>
            <Version>Version: {version.replace('-', '(').concat(')')}</Version>
            <SettingsItem
              title={'License Key'}
              type={'password'}
              value={licenseKey}
              onChange={onLicenseKeyChange}
              onBlur={onLicenseKeyBlur}
              isValid={isLicenseValid}
            />
            <LicenseStatus>
              License Status:
              <TextBold>
                {licenseKey && isLicenseValid ? ' Valid' : ' Invalid'}
              </TextBold>
            </LicenseStatus>
            <MeasurementDurationWrapper>
              <SettingsItem
                title={'Measurement Duration'}
                type={'number'}
                value={processingTime}
                onChange={onProcessingTimeChange}
                onBlur={onProcessingTimeBlur}
                isValid={isProcessingTimeValid}
              />
            </MeasurementDurationWrapper>
            {!isProcessingTimeValid && (
              <HelpBlock>Valid range: 20-180</HelpBlock>
            )}
            <CameraDropDown>
              <Title>Camera</Title>
              <SettingsDropDown
                onSelect={handleCameraSelected}
                options={mapCamerasToDropDown(cameras)}
              />
            </CameraDropDown>
            {isResetClickable ? (
              <ResetLinkActive onClick={onResetSettingsValues}>
                Reset Settings Values
              </ResetLinkActive>
            ) : (
              <ResetLinkDisabled onClick={onResetSettingsValues}>
                Reset Settings Values
              </ResetLinkDisabled>
            )}
          </Wrapper>
        </SideBar>
      )}
    </div>
  );
};

export default SettingsBars;
