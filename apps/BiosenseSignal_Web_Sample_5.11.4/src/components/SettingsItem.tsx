import styled from 'styled-components';
import React from 'react';
import PasswordInput from './PasswordInput';

const Wrapper = styled.div``;
const Title = styled.h3`
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  line-height: 19px;
  color: #3e3c3c;
  margin-bottom: 6px;
`;

const Input = styled.input<{ inValid: boolean }>`
  padding-left: 10px;
  box-sizing: border-box;
  border-radius: 5px;
  background-color: #f1f4f9;
  width: 340px;
  height: 36px;
  color: #3e3c3c;
  border: 1px solid #000000;

  &:focus {
    border-width: 2px;
    outline: ${({ inValid }) => (inValid ? 'none' : '')};
    border-color: ${({ inValid }) => (inValid ? '#d80000' : '#000000')};
  }
`;

const SettingsItem = ({
  title,
  onChange,
  onBlur,
  type,
  value,
  isValid = true,
}) => {
  return (
    <Wrapper>
      <Title>{title}</Title>
      {type === 'password' ? (
        <PasswordInput
          onChange={onChange}
          onBlur={onBlur}
          value={value}
          isValid={isValid}
        />
      ) : (
        <Input
          type={type}
          onChange={onChange}
          onBlur={onBlur}
          value={value}
          inValid={!isValid}
        />
      )}
    </Wrapper>
  );
};
export default SettingsItem;
