export interface MikrotikData {
  dev?: string
  version?: number
  encrypted?: boolean
  salt?: number
  accx?: number
  accy?: number
  accz?: number
  temp?: number
  uptime?: number
  reed_switch?: boolean
  accel_tilt?: boolean
  accel_drop?: boolean
  impact_x?: boolean
  impact_y?: boolean
  impact_z?: boolean
  batpct?: number
}

/**
 * Convert 8.8 fixed-point format to float
 * @param data DataView containing the data
 * @param offset Starting byte offset
 * @returns Float value
 */
function convert_8_8_to_float(data: DataView, offset: number): number {
  const intPart = data.getInt8(offset)
  const fracPart = data.getUint8(offset + 1)
  return intPart + fracPart / 256.0
}

/**
 * Parse MikroTik TG-BT5-IN/OUT BLE advertisement data
 * Supports both indoor (no temp sensor) and outdoor (with temp) models
 * @param data DataView of the manufacturer data
 * @returns Parsed MikroTik sensor data
 */
export const parseMikrotik = function (data: DataView): MikrotikData {
  // MikroTik packets are exactly 20 bytes
  if (data.buffer.byteLength !== 20) {
    return {}
  }

  const mikrotik: MikrotikData = {}

  // Version (byte 2)
  mikrotik.version = data.getUint8(2)

  // User flags (byte 3) - bit 0 indicates encryption
  const user = data.getUint8(3)
  if (user & 0x01) {
    // Encrypted data - cannot decode further
    mikrotik.encrypted = true
    return mikrotik
  }

  // Salt (bytes 4-5, little-endian)
  mikrotik.salt = data.getUint16(4, true)

  // Acceleration X, Y, Z (bytes 6-7, 8-9, 10-11, 8.8 fixed point)
  mikrotik.accx = convert_8_8_to_float(data, 6)
  mikrotik.accy = convert_8_8_to_float(data, 8)
  mikrotik.accz = convert_8_8_to_float(data, 10)

  // Temperature (bytes 12-13, int16 little-endian, scale: /256.0)
  // 0x8000 (-32768) means temp sensor not supported (indoor model)
  const t = data.getInt16(12, true)
  if (t !== -32768) {
    mikrotik.temp = t / 256.0
    mikrotik.dev = 'Mikrotik TG-BT5-OUT'
  } else {
    mikrotik.dev = 'Mikrotik TG-BT5-IN'
  }

  // Uptime (bytes 14-17, uint32 little-endian)
  mikrotik.uptime = data.getUint32(14, true)

  // Flags (byte 18)
  const flags = data.getUint8(18)
  if (flags & 1) {
    mikrotik.reed_switch = true
  }
  if (flags & 2) {
    mikrotik.accel_tilt = true
  }
  if (flags & 4) {
    mikrotik.accel_drop = true
  }
  if (flags & 8) {
    mikrotik.impact_x = true
  }
  if (flags & 16) {
    mikrotik.impact_y = true
  }
  if (flags & 32) {
    mikrotik.impact_z = true
  }

  // Battery (byte 19) - already in percentage (0-100)
  mikrotik.batpct = data.getUint8(19)

  return mikrotik
}
