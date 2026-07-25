// Rotarex ELG tank level sensor, company ID 0x1044.
// Ported from sensor-ble/devices/elg.js. Offsets there are into a buffer that
// still carries the 2-byte company ID; Capacitor strips it, so every offset
// here is 2 lower and the frame lengths are 20 (NONCONN) / 14 (ADV_IND).

// Define interface for Rotarex ELG sensor data
interface RotarexElgData {
  type?: "rotarex-elg";
  status?: number;
  percent?: number | null;
  level_raw?: number | null;
  voltage?: number;
  temperature?: number;
  serial?: string;
}

/** Battery mV from voltage code byte: code * 9 + 1600. */
const voltageFromCode = (code: number): number => 1600 + code * 9;

/** Wire 70 85 00 -> serial string "008570". */
const readSerial = (data: DataView, offset: number): string => {
  const raw =
    data.getUint8(offset) |
    (data.getUint8(offset + 1) << 8) |
    (data.getUint8(offset + 2) << 16);
  return raw.toString(16).padStart(6, "0").toUpperCase();
};

// Periodic ADV_NONCONN_IND: magic "3P0<bc>ELG" + status + level + serial
const decodeNonconn = (data: DataView): RotarexElgData | null => {
  if (
    data.getUint8(0) !== 0x33 ||
    data.getUint8(1) !== 0x50 ||
    data.getUint8(2) !== 0x30 ||
    data.getUint8(3) !== 0xbc ||
    data.getUint8(4) !== 0x45 ||
    data.getUint8(5) !== 0x4c ||
    data.getUint8(6) !== 0x47
  ) {
    return null;
  }

  // [7]=status, [8]=pad, [9..10]=level u16 LE (vendor x100),
  // [11]=unk, [12]=unk (0x2f), [13]=voltage code (ADV_IND code - 0x1e),
  // [14..16]=serial u24 LE. Fault fills [8..11] with ff.
  const status = data.getUint8(7);
  const levelWord = data.getUint16(9, true);
  const invalid = status !== 0 || levelWord === 0xffff;

  return {
    type: "rotarex-elg",
    status,
    // Vendor gauge 0-80; scaled maps 80% full -> 100% usable.
    percent: invalid ? null : levelWord / 80,
    level_raw: invalid ? null : levelWord / 100,
    // Same mV scale as ADV_IND; NONCONN stores code 0x1e lower.
    voltage: voltageFromCode(data.getUint8(13) + 0x1e) / 1000.0,
    serial: readSerial(data, 14),
  };
};

// Button ADV_IND: mac + serial + level + pad + unk + voltage + temp
const decodeAdvInd = (data: DataView): RotarexElgData => {
  const levelRaw = data.getUint8(9);
  // No status byte; rod fault = level_raw 0x7f + [10..11]=ef ff (NONCONN status=1).
  const status = levelRaw === 0x7f ? 1 : 0;

  return {
    type: "rotarex-elg",
    status,
    level_raw: status !== 0 ? null : levelRaw,
    // [10..11]=unk/fault fill, [12]=voltage code, [13]=temp °C
    voltage: voltageFromCode(data.getUint8(12)) / 1000.0,
    temperature: data.getUint8(13),
    serial: readSerial(data, 6),
  };
};

export const parseRotarexElg = function (data: DataView): RotarexElgData {
  if (data.byteLength === 20) {
    return decodeNonconn(data) ?? {};
  }
  if (data.byteLength === 14) {
    return decodeAdvInd(data);
  }
  return {};
};
