import React from 'react';
import { Flex } from './shared/Flex';
import styled from 'styled-components';

const LoadingWrapper = styled(Flex)`
  position: absolute;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`;
const Message = styled.h2`
  font-size: 18px;
  color: #01061b;
  font-weight: normal;
`;

const Loader = () => (
  <LoadingWrapper>
      <Message id="loading-message">{'Loading...'}</Message>
  </LoadingWrapper>
);
export default Loader;
