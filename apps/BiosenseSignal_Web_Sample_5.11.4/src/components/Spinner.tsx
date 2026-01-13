import React from 'react';
import styled, { keyframes } from 'styled-components';
// @ts-ignore
import { ReactComponent as SpinnerBase } from '../assets/no-stats.svg';
import { Flex } from './shared/Flex';
import media from '../style/media';

const SpinnerAnimation = keyframes`
  0% {
    transform: rotate(0deg)
  }
  100% {
    transform: rotate(360deg)
  }
`;

const Wrapper = styled(Flex)`
  width: fit-content;
  animation: ${SpinnerAnimation} 1.2s infinite;
  animation-timing-function: linear;
  opacity: 0.8;
  margin-top: 13px;
  ${media.tablet`
    margin-top: 0px;
    margin-right: 30px;
`}
`;

const Spinner = () => (
  <Wrapper>
    <SpinnerBase />
  </Wrapper>
);

export default Spinner;
