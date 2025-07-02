

function altitudeByPressure(p: number | undefined, qnh: number | undefined): number | undefined {
    if (p === undefined ||
        isNaN(p))
        return undefined;
    if (qnh === undefined ||
        isNaN(qnh))
        qnh = 1013.25; // default QNH value in hPa
    return 44330.769 * (1 - Math.pow(p / qnh, 0.19029496));
}

function isaToQnhAltitude(isaAltitude: number, qnh: number): number {
  const isaQnh = 1013.25; // Standard ISA QNH in hPa
  const lapseRate = 8.23; // m per hPa
  return isaAltitude + (isaQnh - qnh) * lapseRate;
}

export { altitudeByPressure, isaToQnhAltitude };
