

function altitudeByPressure(p: number | null, qnh: number | null): number | null {
    if (p === null ||
        isNaN(p))
        return null;
    if (qnh === null ||
        isNaN(qnh))
        qnh = 1013.25; // default QNH value in hPa
    return 44330.769 * (1 - Math.pow(p / qnh, 0.19029496));
}

function isaToQnhAltitude(isaAltitude: number, qnh: number): number {
  const isaQnh = 1013.25; // Standard ISA QNH in hPa
  const lapseRate = 8.23; // m per hPa
  return isaAltitude + (isaQnh - qnh) * lapseRate;
}

function metersToFeet(meters: number): number {
    const feet = meters * 3.28084;
    return feet;
}

function feetToMeters(feet: number): number {
    const meters = feet * 0.3048;
    return meters;
}
export { altitudeByPressure, isaToQnhAltitude, metersToFeet, feetToMeters };
