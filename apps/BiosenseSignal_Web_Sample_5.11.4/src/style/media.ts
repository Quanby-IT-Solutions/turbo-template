import { css } from 'styled-components';
export interface Media {
  mobile: any;
  tablet: any;
  desktop: any;
  wide: any;
}
export const defaultMediaBreakpoints = {
  mobile: '680px',
  tablet: '1000px',
  desktop: '1280px',
  wide: '1600px',
};

const media = Object.keys(defaultMediaBreakpoints).reduce((memo, val) => {
  memo[val] = (...args) => css`
    @media (min-width: ${defaultMediaBreakpoints[val]}) {
      ${css(
        // @ts-ignore
        ...args,
      )};
    }
  `;
  return memo;
}, {});

export default media as Media;
