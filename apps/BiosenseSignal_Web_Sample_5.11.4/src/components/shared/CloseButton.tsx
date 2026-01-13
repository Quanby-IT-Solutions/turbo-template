import React from 'react';
import Cancel from '../../assets/cancel.svg';
import styled from 'styled-components';

const Img = styled.img`
  height: 17px;
  width: 17px;
  padding: 5px;
`;

const CloseButton = ({ onClick }) => {
  return <Img src={Cancel} onClick={onClick} />;
};

export default CloseButton;
