import { bytesToMacAddress } from "./misc.js";

// Define interface for TPMS sensor data
interface TPMSData {
  type?: "tpms";
  location?: number;
  mac?: string;
  bar?: number;
  temperature?: number;
  batpct?: number;
  status?: number;
}

export const parseTPMS0100 = function (data: DataView): TPMSData {
  if (data.buffer.byteLength !== 16) {
    return {};
  }

  const tpms: TPMSData = { type: "tpms" };

  tpms.location = data.getUint8(0) & 0x7f;
  tpms.mac = bytesToMacAddress(data, 2);
  tpms.bar = data.getInt32(6, true) / 100000.0;
  tpms.temperature = data.getInt32(10, true) / 100.0;
  tpms.batpct = data.getUint8(14);
  tpms.status = data.getUint8(15);

  return tpms;
};

export const parseTPMS00AC = function (data: DataView): TPMSData {
  if (data.buffer.byteLength !== 15) {
    return {};
  }

  const tpms: TPMSData = { type: "tpms" };

  tpms.bar = data.getInt32(0, true) / 100000.0;
  tpms.temperature = data.getInt32(4, true) / 100.0 + 273.15; // Convert to Kelvin
  tpms.batpct = data.getUint8(8);
  tpms.location = data.getUint8(9) & 0x7f;
  tpms.mac = bytesToMacAddress(data, 9);

  return tpms;
};
