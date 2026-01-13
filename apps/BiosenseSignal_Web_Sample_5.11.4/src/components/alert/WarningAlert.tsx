import React from 'react';
import styled from 'styled-components';
import { Flex } from '../shared/Flex';

const Wrapper = styled(Flex)`
  position: absolute;
  left: 0;
  bottom: 0;
  height: 70px;
  width: 100%;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 8, 0.8);
`;

const Message = styled.div`
  padding: 5px;
  font-size: 14px;
  color: white;
  text-align: center;
`;

const WarningAlert = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <Wrapper>
      <Message>{message}</Message>
    </Wrapper>
  );
};
export default WarningAlert;
