import React from 'react';
import styled from 'styled-components';
import Logo from './Logo';
import SettingsButton from './SettingsButton';
import media from '../style/media';
import { Flex } from './shared/Flex';

const Wrapper = styled(Flex)`
  width: 100%;
  position: relative;
  justify-content: start;
  align-items: center;
  min-height: 60px;
  z-index: 2;
  box-shadow: 0 4px 7px rgba(0, 0, 0, 0.2);
  background: #01061b;
  ${media.tablet`
    padding-left: 100px;
`}
`;

const TopBar = ({ onSettingsClick, isMeasuring }) => {
  return (
    <Wrapper>
      <SettingsButton disable={isMeasuring} onClick={onSettingsClick} />
      <Logo />
    </Wrapper>
  );
};

export default TopBar;
