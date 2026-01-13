import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import GlobalStyle from './style/global';
import styled from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

ReactDOM.render(
  <Wrapper>
    <GlobalStyle />
    <App />
  </Wrapper>,
  document.getElementById('root'),
);
