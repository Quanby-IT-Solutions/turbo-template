import React from 'react';
import styled from 'styled-components';
import { Flex } from '../shared/Flex';

const Wrapper = styled(Flex)`
  position: absolute;
  top: 10px;
  height: 70px;
  width: 90%;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 13px 50px;
  box-sizing: border-box;
`;

const Message = styled.div`
  padding: 5px;
  font-size: 14px;
  color: #d84242;
  text-align: center;
`;

const InfoAlert = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <Wrapper>
      <Message>{message}</Message>
    </Wrapper>
  );
};
export default InfoAlert;
