import React from 'react';
import styled from 'styled-components';
import { Flex } from '../shared/Flex';
import ErrorIcon from '../../assets/error-icon.svg';

const Wrapper = styled(Flex)`
  position: absolute;
  bottom: 0;
  height: 120px;
  width: 100%;
  justify-content: start;
  align-items: center;
  background-color: white;
`;

const Message = styled.div`
  padding: 0 20px 0 10px;
  font-size: 14px;
  color: #231f20;
  text-align: left;
`;

const Icon = styled.img`
  margin-left: 30px;
`;

const ErrorAlert = ({ message }) => {
  if (!message) {
    return null;
  }

  return (
    <Wrapper>
      <Icon src={ErrorIcon} />
      <Message>{message}</Message>
    </Wrapper>
  );
};
export default ErrorAlert;
