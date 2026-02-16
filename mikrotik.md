goal:   Add a decoder for the MikroTik BLE sensor.

Take the following C++ code as guidance:

}

// assumes Mikrotik advertisements, no encryption
static bool decodeMikrotik(const std::vector<uint8_t> &data, JsonDocument &json) {
    if (data.size() != 20)
        return false;
    int16_t t = getInt16LE(data, 12);
    if (t != -32768) { // 0x8000 -> temp is unsupported (indoor)
        json["dev"] = "Mikrotik TG-BT5-OUT";
        json["tempc"] = t / 256.0;
    } else {
        json["dev"] = "Mikrotik TG-BT5-IN";
    }
    json["version"] = getUint8(data, 2);
    auto user = getUint8(data, 3);
    if (user & 0x01) {
        json["encrypted"] = true;
    } else {
        json["salt"] = getUint16LE(data, 4);;
        json["accx"] = convert_8_8_to_float(data, 6);
        json["accy"] = convert_8_8_to_float(data, 8);
        json["accz"] = convert_8_8_to_float(data, 10);

        // uptime (4 bytes, little-endian)
        json["uptime"] = getUint32LE(data, 14);

        // flags (1 byte)
        uint8_t flags = getUint8(data, 18);
        if (flags & 1) {
            json["reed_switch"] = true;
        }
        if (flags & 2) {
            json["accel_tilt"] = true;
        }
        if (flags & 4) {
            json["accel_drop"] = true;
        }
        if (flags & 8) {
            json["impact_x"] = true;
        }
        if (flags & 16) {
            json["impact_y"] = true;
        }
        if (flags & 32) {
            json["impact_z"] = true;
        }
        // battery (1 byte)
        uint8_t batt = getUint8(data, 19);
        json["batt"] = batt;
    }
    return true;
}


When done, add the Microtik decoder to blesensors.ts And useDeviceMappings.ts.

Take timings from the ruuvi sensors here: SENSOR_STATUS_THRESHOLDS

Add a unit called switch and include the primary attribute reed_switch, batt and temperature as secondary.

