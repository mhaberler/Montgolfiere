/**
 * Decodes BTHome servicedata.
 * @param serviceData - The service data object containing BTHome data.
 * @returns A decoded BTHome result object.
 *
 * based mostly on code copyright (c) 2017-2025 AlCalzone
 * https://github.com/AlCalzone/ioBroker.ble.git
 * MIT license
 */
import {logDataViewAsHex} from "@/utils/ble-utils";

interface SensorDefinition {
  id: number;
  label: string;
  signed: boolean;
  size: number;
  factor?: number;
  unit?: string;
}

interface BinarySensorDefinition {
  id: number;
  label: string;
  states: { false: string; true: string };
}

interface BTHomeDecodedData {
  // Core properties that might be present
  type?: "bthome-v2";
  macAddress?: string;
  packetId?: number;
  timestamp?: Date;
  text?: string;
  raw?: string;
  button?: string;

  // Dynamic sensor data - allow any string key for sensor readings
  [key: string]: unknown;
}

export function decodeBTHome(serviceData: DataView): BTHomeDecodedData | null {
  if (
    !serviceData ||
    serviceData.byteLength < 3 || // too short
    serviceData.getUint8(0) & 0x01 || // encrypted data not supported
    (serviceData.getUint8(0) & 0x60) >> 5 != 2 // not BTHome v2
  ) {
    return null;
  }
  // logDataViewAsHex(serviceData);

  const decodedValue: BTHomeDecodedData = { type: "bthome-v2" };
  let offset = 0;

  const mac_included = (serviceData.getUint8(offset) & 0x02) != 0;
  offset++;

  if (mac_included) {
    // Read MAC address bytes in reverse order
    const macBytes: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const byte = serviceData.getUint8(offset + i);
      macBytes.push(byte.toString(16).padStart(2, "0"));
    }
    decodedValue.macAddress = macBytes.join(":");
    offset += 6;
  }

  while (offset < serviceData.byteLength) {
    const objectId = serviceData.getUint8(offset);

    if (objectId === 0x00) {
      // Packet ID
      decodedValue.packetId = serviceData.getUint8(offset + 1);
      offset += 2;
    } else if (multilevelSensorDefinitions.has(objectId)) {
      const def = multilevelSensorDefinitions.get(objectId);
      if (!def) {
        offset += 1; // Skip unknown format
        continue;
      }

      let value: number;
      if (def.signed) {
        // Read signed integer
        switch (def.size) {
          case 1:
            value = serviceData.getInt8(offset + 1);
            break;
          case 2:
            value = serviceData.getInt16(offset + 1, true); // little endian
            break;
          case 3:
            // 3-byte signed integer (little endian)
            {
              const byte0 = serviceData.getUint8(offset + 1);
              const byte1 = serviceData.getUint8(offset + 2);
              const byte2 = serviceData.getUint8(offset + 3);
              value = byte0 | (byte1 << 8) | (byte2 << 16);
              // Sign extend if negative
              if (value & 0x800000) {
                value |= 0xff000000;
              }
            }
            break;
          case 4:
            value = serviceData.getInt32(offset + 1, true); // little endian
            break;
          default:
            console.log(`Unsupported signed size ${def.size}`);
            offset += 1 + def.size;
            continue;
        }
      } else {
        // Read unsigned integer
        switch (def.size) {
          case 1:
            value = serviceData.getUint8(offset + 1);
            break;
          case 2:
            value = serviceData.getUint16(offset + 1, true); // little endian
            break;
          case 3:
            // 3-byte unsigned integer (little endian)
            {
              const byte0 = serviceData.getUint8(offset + 1);
              const byte1 = serviceData.getUint8(offset + 2);
              const byte2 = serviceData.getUint8(offset + 3);
              value = byte0 | (byte1 << 8) | (byte2 << 16);
            }
            break;
          case 4:
            value = serviceData.getUint32(offset + 1, true); // little endian
            break;
          default:
            console.log(`Unsupported unsigned size ${def.size}`);
            offset += 1 + def.size;
            continue;
        }
      }

      if (def.factor) {
        value *= def.factor;
      }

      let key = def.label;
      if (def.unit) {
        key += `_${def.unit}`;
      }
      decodedValue[key] = value;
      offset += 1 + def.size;
    } else if (binarySensorDefinitions.has(objectId)) {
      const def = binarySensorDefinitions.get(objectId);
      if (!def) {
        offset += 2; // Skip unknown format
        continue;
      }
      decodedValue[def.label] = serviceData.getUint8(offset + 1) === 0x01;
      offset += 2;
    } else if (objectId === 0x3a) {
      // button event
      const eventId = serviceData.getUint8(offset + 1);
      if (eventId !== 0x00) {
        const event = [
          "press",
          "double_press",
          "triple_press",
          "long_press",
          "long_double_press",
          "long_triple_press",
        ][eventId - 1];
        decodedValue.button = event;
      }
      offset += 2;
    } else if (objectId === 0x3c) {
      // dimmer event
      const eventId = serviceData.getUint8(offset + 1);
      if (eventId !== 0x00) {
        const event = ["RotateLeft", "RotateRight"][eventId - 1];
        const steps = serviceData.getUint8(offset + 2);
        decodedValue[`dimmer${event}`] = steps;
      }
      offset += 3;
    } else if (objectId === 0x50) {
      // unix timestamp UTC
      const timestamp = serviceData.getUint32(offset + 1, true); // little endian
      decodedValue.timestamp = new Date(timestamp * 1000);
      offset += 5;
    } else if (objectId === 0x53) {
      // text sensor (utf8)
      const length = serviceData.getUint8(offset + 1);
      const textBytes = new Uint8Array(
        serviceData.buffer,
        serviceData.byteOffset + offset + 2,
        length
      );
      const value = new TextDecoder("utf-8").decode(textBytes);
      decodedValue.text = value;
      offset += 2 + length;
    } else if (objectId === 0x54) {
      // raw sensor
      const length = serviceData.getUint8(offset + 1);
      const rawBytes = new Uint8Array(
        serviceData.buffer,
        serviceData.byteOffset + offset + 2,
        length
      );
      const value = Array.from(rawBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      decodedValue.raw = value;
      offset += 2 + length;
    } else if (objectId === 0xF0) { // device type id, 	uint16 (2 bytes)
      const devType = serviceData.getUint16(offset + 1, true); // little endian);
      decodedValue[`devicetype`] = devType;
      offset += 3;
    } else if (objectId === 0xF1) { // firmware version, 	uint32 (4 bytes)
      const major = serviceData.getUint8(offset + 4);
      const minor = serviceData.getUint8(offset + 3);
      const patch = serviceData.getUint8(offset + 2);
      const rel = serviceData.getUint8(offset + 1);
      decodedValue[`fwversion4`] = `${major}.${minor}.${patch}.${rel}`;
      offset += 5;
    } else if (objectId === 0xF2) { // firmware version, uint24 (3 bytes)
      const patch = serviceData.getUint8(offset + 1);
      const minor = serviceData.getUint8(offset + 2);
      const major = serviceData.getUint8(offset + 3);
      decodedValue[`fwversion3`] = `${major}.${minor}.${patch}`;
      offset += 4;
    } else {
      console.log(`Unsupported BTHome object ID ${objectId.toString(16)}`);
      // Try to skip this unknown object by moving forward one byte
      // This is not ideal but prevents infinite loops
      offset += 1;
    }
  }

  return decodedValue;
}

const multilevelSensorsArray = [
  {
    id: 0x51,
    label: "acceleration",
    signed: false,
    size: 2,
    factor: 0.001,
    unit: "m/s²",
  },
  {
    id: 0x01,
    label: "battery",
    signed: false,
    size: 1,
    unit: "%",
  },
  {
    id: 0x12,
    label: "co2",
    signed: false,
    size: 2,
    unit: "ppm",
  },
  { id: 0x09, label: "count", signed: false, size: 1 },
  { id: 0x3d, label: "count", signed: false, size: 2 },
  { id: 0x3e, label: "count", signed: false, size: 4 },
  {
    id: 0x43,
    label: "current",
    signed: false,
    size: 2,
    factor: 0.001,
    unit: "A",
  },
  {
    id: 0x08,
    label: "dewpoint",
    signed: true,
    size: 2,
    factor: 0.01,
    unit: "°C",
  },
  {
    id: 0x40,
    label: "distance (mm)",
    signed: false,
    size: 2,
    unit: "mm",
  },
  {
    id: 0x41,
    label: "distance (m)",
    signed: false,
    size: 2,
    factor: 0.1,
    unit: "m",
  },
  {
    id: 0x42,
    label: "duration",
    signed: false,
    size: 3,
    factor: 0.001,
    unit: "s",
  },
  {
    id: 0x4d,
    label: "energy",
    signed: false,
    size: 4,
    factor: 0.001,
    unit: "kWh",
  },
  {
    id: 0x0a,
    label: "energy",
    signed: false,
    size: 3,
    factor: 0.001,
    unit: "kWh",
  },
  {
    id: 0x4b,
    label: "gas",
    signed: false,
    size: 3,
    factor: 0.001,
    unit: "m3",
  },
  {
    id: 0x4c,
    label: "gas",
    signed: false,
    size: 4,
    factor: 0.001,
    unit: "m3",
  },
  {
    id: 0x52,
    label: "gyroscope",
    signed: false,
    size: 2,
    factor: 0.001,
    unit: "°/s",
  },
  {
    id: 0x03,
    label: "humidity",
    signed: false,
    size: 2,
    factor: 0.01,
    unit: "%",
  },
  {
    id: 0x2e,
    label: "humidity",
    signed: false,
    size: 1,
    unit: "%",
  },
  {
    id: 0x05,
    label: "illuminance",
    signed: false,
    size: 3,
    factor: 0.01,
    unit: "lux",
  },
  {
    id: 0x06,
    label: "mass (kg)",
    signed: false,
    size: 2,
    factor: 0.01,
    unit: "kg",
  },
  {
    id: 0x07,
    label: "mass (lb)",
    signed: false,
    size: 2,
    factor: 0.01,
    unit: "lb",
  },
  {
    id: 0x14,
    label: "moisture",
    signed: false,
    size: 2,
    factor: 0.01,
    unit: "%",
  },
  {
    id: 0x2f,
    label: "moisture",
    signed: false,
    size: 1,
    unit: "%",
  },
  {
    id: 0x0d,
    label: "pm2.5",
    signed: false,
    size: 2,
    unit: "ug/m3",
  },
  {
    id: 0x0e,
    label: "pm10",
    signed: false,
    size: 2,
    unit: "ug/m3",
  },
  {
    id: 0x0b,
    label: "power",
    signed: false,
    size: 3,
    factor: 0.01,
    unit: "W",
  },
  {
    id: 0x04,
    label: "pressure",
    signed: false,
    size: 3,
    factor: 0.01,
    unit: "hPa",
  },
  {
    id: 0x3f,
    label: "rotation",
    signed: true,
    size: 2,
    factor: 0.1,
    unit: "°",
  },
  {
    id: 0x44,
    label: "speed",
    signed: false,
    size: 2,
    factor: 0.01,
    unit: "m/s",
  },
  {
    id: 0x45,
    label: "temperature",
    signed: true,
    size: 2,
    factor: 0.1,
    unit: "C",
  },
  {
    id: 0x02,
    label: "temperature",
    signed: true,
    size: 2,
    factor: 0.01,
    unit: "C",
  },
  {
    id: 0x13,
    label: "tvoc",
    signed: false,
    size: 2,
    unit: "ug/m3",
  },
  {
    id: 0x0c,
    label: "voltage",
    signed: false,
    size: 2,
    factor: 0.001,
    unit: "V",
  },
  {
    id: 0x4a,
    label: "voltage",
    signed: false,
    size: 2,
    factor: 0.1,
    unit: "V",
  },
  {
    id: 0x4e,
    label: "volume",
    signed: false,
    size: 4,
    factor: 0.001,
    unit: "L",
  },
  {
    id: 0x47,
    label: "volume",
    signed: false,
    size: 2,
    factor: 0.1,
    unit: "L",
  },
  {
    id: 0x48,
    label: "volume",
    signed: false,
    size: 2,
    unit: "mL",
  },
  {
    id: 0x49,
    label: "volume Flow Rate",
    signed: false,
    size: 2,
    factor: 0.001,
    unit: "m3/hr",
  },
  {
    id: 0x46,
    label: "UV index",
    signed: false,
    size: 1,
    factor: 0.1,
  },
  {
    id: 0x4f,
    label: "water",
    signed: false,
    size: 4,
    factor: 0.001,
    unit: "L",
  },
];
const multilevelSensorDefinitions = new Map<number, SensorDefinition>(
  multilevelSensorsArray.map((def) => [def.id, def])
);
const binarySensorsArray = [
  { id: 0x15, label: "battery", states: { false: "Normal", true: "Low" } },
  {
    id: 0x16,
    label: "battery charging",
    states: { false: "Not Charging", true: "Charging" },
  },
  {
    id: 0x17,
    label: "carbon monoxide",
    states: { false: "Not detected", true: "Detected" },
  },
  { id: 0x18, label: "cold", states: { false: "Normal", true: "Cold" } },
  {
    id: 0x19,
    label: "connectivity",
    states: { false: "Disconnected", true: "Connected" },
  },
  { id: 0x1a, label: "door", states: { false: "Closed", true: "Open" } },
  {
    id: 0x1b,
    label: "garage door",
    states: { false: "Closed", true: "Open" },
  },
  { id: 0x1c, label: "gas", states: { false: "Clear", true: "Detected" } },
  {
    id: 0x0f,
    label: "generic boolean",
    states: { false: "Off", true: "On" },
  },
  { id: 0x1d, label: "heat", states: { false: "Normal", true: "Hot" } },
  {
    id: 0x1e,
    label: "light",
    states: { false: "No light", true: "Light detected" },
  },
  { id: 0x1f, label: "lock", states: { false: "Locked", true: "Unlocked" } },
  { id: 0x20, label: "moisture", states: { false: "Dry", true: "Wet" } },
  { id: 0x21, label: "motion", states: { false: "Clear", true: "Detected" } },
  {
    id: 0x22,
    label: "moving",
    states: { false: "Not moving", true: "Moving" },
  },
  {
    id: 0x23,
    label: "occupancy",
    states: { false: "Clear", true: "Detected" },
  },
  { id: 0x11, label: "opening", states: { false: "Closed", true: "Open" } },
  {
    id: 0x24,
    label: "plug",
    states: { false: "Unplugged", true: "Plugged in" },
  },
  { id: 0x10, label: "power", states: { false: "Off", true: "On" } },
  { id: 0x25, label: "presence", states: { false: "Away", true: "Home" } },
  { id: 0x26, label: "problem", states: { false: "OK", true: "Problem" } },
  {
    id: 0x27,
    label: "running",
    states: { false: "Not Running", true: "Running" },
  },
  { id: 0x28, label: "safety", states: { false: "Unsafe", true: "Safe" } },
  { id: 0x29, label: "smoke", states: { false: "Clear", true: "Detected" } },
  { id: 0x2a, label: "sound", states: { false: "Clear", true: "Detected" } },
  { id: 0x2b, label: "tamper", states: { false: "Off", true: "On" } },
  {
    id: 0x2c,
    label: "vibration",
    states: { false: "Clear", true: "Detected" },
  },
  { id: 0x2d, label: "window", states: { false: "Closed", true: "Open" } },
];
const binarySensorDefinitions = new Map<number, BinarySensorDefinition>(
  binarySensorsArray.map((def) => [def.id, def])
);
