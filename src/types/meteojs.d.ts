declare module 'meteojs/calc.js' {
  export function altitudeISAByPres(p: number | undefined): number | undefined;
  export function windspeedMSToKMH(wind: number | undefined): number | undefined;
  // Add more exports as needed from calc.js
}