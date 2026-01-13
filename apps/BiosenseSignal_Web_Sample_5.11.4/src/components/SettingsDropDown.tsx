import React, { useCallback } from 'react';
import styled from 'styled-components';

const Select = styled.select`
  padding-left: 10px;
  border: 1px solid #000000;
  box-sizing: border-box;
  border-radius: 5px;
  background-color: #f1f4f9;
  width: 340px;
  height: 36px;
  color: #3e3c3c;
`;

const Option = styled.option`
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  line-height: 17px;
  color: #3e3c3c;
`;

const SettingsDropDown = ({ options, onSelect }) => {
  const handleChange = useCallback((event) => onSelect(event.target.value), []);
  // useEffect(() => {
  //   // options?.length && onSelect(options[0].value);
  // }, [options]);
  return (
    <Select onChange={handleChange}>
      {options?.map(({ value, name }) => (
        <Option key={value} value={value}>
          {name}
        </Option>
      ))}
    </Select>
  );
};
export default SettingsDropDown;
