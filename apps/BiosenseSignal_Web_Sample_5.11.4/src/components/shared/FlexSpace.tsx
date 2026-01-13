import styled, { css } from 'styled-components';
import { Flex } from './Flex';

export const flexSpace = css`
  justify-content: space-between;
  align-items: center;
`;

export const FlexSpace = styled(Flex)`
  ${flexSpace};
`;
