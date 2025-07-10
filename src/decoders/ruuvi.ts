import { volt2percent, bytesToMacAddress } from "./misc.js";

// Define interface for Ruuvi sensor data
interface RuuviData {
  type?: "ruuvi";

  temp?: number;
  hum?: number;
  press?: number;
  accX?: number;
  accY?: number;
  accZ?: number;
  batt?: number;
  batpct?: number;
  txpwr?: number;
  moves?: number;
  seq?: number;
  mac?: string;
}

// https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2
export const parseRuuvi = function (data: DataView): RuuviData {
  if (data.buffer.byteLength !== 24) {
    return {};
  }

  if (data.getUint8(0) !== 5) {
    // old ruuvi fw
    return {};
  }

  const ruuvi: RuuviData = { type: "ruuvi" };

  // Temperature
  let value = data.getInt16(1);
  if (value !== 0x8000) {
    ruuvi.temp = Math.round(value * 0.005 * 100) / 100;
  }

  // Humidity
  value = data.getUint16(3);
  if (value !== 65535) {
    ruuvi.hum = value / 400.0;
  }

  // Pressure
  value = data.getUint16(5);
  if (value !== 65535) {
    ruuvi.press = value + 50000;
  }

  // Acceleration X
  value = data.getInt16(7, true);
  if (value !== 0x8000) {
    ruuvi.accX = value;
  }

  // Acceleration Y
  value = data.getInt16(9, true);
  if (value !== 0x8000) {
    ruuvi.accY = value;
  }

  // Acceleration Z
  value = data.getInt16(11, true);
  if (value !== 0x8000) {
    ruuvi.accZ = value;
  }

  // Power info (battery and TX power)
  const powerInfo = data.getUint16(13);

  // Battery voltage (mV)
  value = (powerInfo >>> 5) + 1600;
  if (value !== 2047) {
    ruuvi.batt = value;
    ruuvi.batpct = volt2percent(ruuvi.batt / 1000);
  }

  // TX power
  value = (powerInfo & 0b11111) * 2 - 40;
  if (value !== 31) {
    ruuvi.txpwr = value;
  }

  // Movement counter
  value = data.getUint8(15);
  if (value !== 255) {
    ruuvi.moves = value;
  }

  // Sequence number
  value = data.getUint16(16);
  if (value !== 65535) {
    ruuvi.seq = value;
  }

  // MAC address
  ruuvi.mac = bytesToMacAddress(data, 18);

  return ruuvi;
};
