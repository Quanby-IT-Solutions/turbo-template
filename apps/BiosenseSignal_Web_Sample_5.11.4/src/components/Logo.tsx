import React from 'react';
import styled from 'styled-components';
import logo from '../assets/logo.svg';

const Img = styled.img`
  height: 27px;
  padding-top: 9px;
  pointer-events: none;
`;

const Logo = () => {
  return <Img src={logo} />;
};

export default Logo;
