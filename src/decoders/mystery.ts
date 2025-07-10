import { volt2percent, bytesToMacAddress } from "./misc.js";

// Define interface for Mystery/ELG sensor data
interface MysteryData {
  type?: "elg";
  mac?: string;
  status?: string;
  percent?: number;
  rssi?: number;
  buttonPressed?: boolean;
  name?: string;
  txPowerLevel?: number;
  voltage?: number;
  batpct?: number;
}

export const parseMystery = function (data: DataView): MysteryData {
  if (data.buffer.byteLength !== 12) {
    return {};
  }

  const mystery: MysteryData = { type: "elg" };

  mystery.mac = bytesToMacAddress(data, 2);

  const level = data.getInt16(6, true);
  if (level === -32768) {
    mystery.status = "no sensor";
  } else {
    mystery.status = "OK";
    mystery.percent = level;
  }

  if (level === 10000) {
    mystery.status = "full";
    mystery.percent = level / 100;
  }

  //   mystery.buttonPressed = ad.isConnectable;
  //   mystery.name = ad.name;
  //   mystery.txPowerLevel = ad.txPowerLevel;

  mystery.voltage = data.getInt16(8, true) / 1000.0;
  mystery.batpct = volt2percent(mystery.voltage);

  // console.log("----- mystery", JSON.stringify(mystery));

  return mystery;
};
