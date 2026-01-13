import settings from '../assets/settings-hamburger.svg';
import React from 'react';
import styled from 'styled-components';

const Img = styled.img<{ disable: boolean }>`
  height: 17px;
  width: 22px;
  margin: 0 8px;
  padding: 13px;
  visibility: ${({ disable }) => disable && 'hidden'};
`;

const SettingsButton = ({ onClick, disable }) => {
  return (
    <Img
      id="settingsButton"
      disable={disable}
      src={settings}
      onClick={onClick}
    />
  );
};

export default SettingsButton;
