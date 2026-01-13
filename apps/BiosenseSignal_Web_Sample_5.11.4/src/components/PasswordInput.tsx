import styled from 'styled-components';
import React, { useState } from 'react';
import Visibility from '../assets/visibility.svg';

const Container = styled.div`
  display: flex;
  position: relative;
  align-items: center;
  width: 340px;
  height: 36px;
`;

const Input = styled.input<{ inValid: boolean }>`
  padding-left: 10px;
  padding-right: 35px;
  box-sizing: border-box;
  border-radius: 5px;
  background-color: #f1f4f9;
  width: inherit;
  height: inherit;
  color: #3e3c3c;
  border: 1px solid #000000;

  &:focus {
    border-width: 2px;
    outline: ${({ inValid }) => (inValid ? 'none' : '')};
    border-color: ${({ inValid }) => (inValid ? '#d80000' : '#000000')};
  }
`;

const ImageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: absolute;
  right: 0;
  padding: 0 10px;
  height: inherit;
`;

const PasswordInput = ({ onChange, onBlur, value, isValid = true }) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <Container>
      <Input
        type={showPassword ? 'string' : 'password'}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
        inValid={!isValid}
      />
      <ImageWrapper onClick={() => setShowPassword(!showPassword)}>
        <img src={Visibility} alt="" />
      </ImageWrapper>
    </Container>
  );
};

export default PasswordInput;
