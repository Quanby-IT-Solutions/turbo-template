import React from 'react';
import styled from 'styled-components';
import Play from '../assets/play-big.svg';
import Stop from '../assets/stop.svg';
import media from '../style/media';
import Spinner from './Spinner';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 58px;
  width: 58px;
  ${media.tablet`
    height: 88px;
    width: 88px;
  `}
`;

const Button = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #01061b;
  border-radius: 50%;
  cursor: pointer;
  height: inherit;
  width: inherit;
`;

const Icon = styled.img`
  width: 100%;
  padding: 52px;
  ${media.tablet`
    padding: 32px;
  `}
`;

export interface IStartButton {
  /**
   *  Displays a spinner when isLoading is true
   */
  isLoading;
  /**
   *  function triggered on button click
   */
  onClick: () => void;
  /**
   *  Displays whether the current session state is measuring
   */
  isMeasuring: boolean;
}

const StartButton = ({ isLoading, onClick, isMeasuring }: IStartButton) => {
  return (
    <Container>
      {isLoading ? (
        <Spinner />
      ) : (
        <Button onClick={onClick}>
          <Icon src={isMeasuring ? Stop : Play} />
        </Button>
      )}
    </Container>
  );
};

export default StartButton;
