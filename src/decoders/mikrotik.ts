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
 * Note: Manufacturer data is 18 bytes (no 2-byte service UUID prefix)
 * @param data DataView of the manufacturer data
 * @returns Parsed MikroTik sensor data
 */
export const parseMikrotik = function (data: DataView): MikrotikData {
    // MikroTik packets are exactly 18 bytes (not 20 - no 2-byte prefix)
    if (data.buffer.byteLength !== 18) {
        return {}
    }

    const mikrotik: MikrotikData = {}

    // Version (byte 0)
    mikrotik.version = data.getUint8(0)

    // User flags (byte 1) - bit 0 indicates encryption
    const user = data.getUint8(1)
    if (user & 0x01) {
        // Encrypted data - cannot decode further
        mikrotik.encrypted = true
        return mikrotik
    }

    // Salt (bytes 2-3, little-endian)
    mikrotik.salt = data.getUint16(2, true)

    // Acceleration X, Y, Z (bytes 4-5, 6-7, 8-9, 8.8 fixed point)
    mikrotik.accx = convert_8_8_to_float(data, 4)
    mikrotik.accy = convert_8_8_to_float(data, 6)
    mikrotik.accz = convert_8_8_to_float(data, 8)

    // Temperature (bytes 10-11, int16 little-endian, scale: /256.0)
    // 0x8000 (-32768) means temp sensor not supported (indoor model)
    const t = data.getInt16(10, true)
    if (t !== -32768) {
        mikrotik.temp = t / 256.0
        mikrotik.dev = 'Mikrotik TG-BT5-OUT'
    } else {
        mikrotik.dev = 'Mikrotik TG-BT5-IN'
    }

    // Uptime (bytes 12-15, uint32 little-endian)
    mikrotik.uptime = data.getUint32(12, true)

    // Flags (byte 16)
    const flags = data.getUint8(16)
    mikrotik.reed_switch = (flags & 1) != 0
    mikrotik.accel_tilt = (flags & 2) != 0
    mikrotik.accel_drop = (flags & 4) != 0
    mikrotik.impact_x = (flags & 8) != 0
    mikrotik.impact_y = (flags & 16) != 0
    mikrotik.impact_z = (flags & 32) != 0

    // Battery (byte 17) - already in percentage (0-100)
    mikrotik.batpct = data.getUint8(17)

    return mikrotik
}
