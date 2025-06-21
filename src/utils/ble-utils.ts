/**
 * Converts a Uint8Array (or any array-like of numbers) into a hexadecimal string.
 * Each byte is represented by two hex characters (e.g., 255 becomes "ff").
 * @param {Uint8Array} uint8Array The byte array to convert.
 * @returns {string} The hexadecimal representation of the bytes.
 */
export function uint8ArrayToHexString(uint8Array: Uint8Array): string {
  return Array.from(uint8Array)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Serializes an object, converting any DataView attributes into a hexadecimal string
 * representation of their underlying bytes. This is particularly useful for
 * logging or debugging BLE scan results which often contain DataView objects.
 * @param {object} obj The object to serialize.
 * @returns {string} The JSON string representation of the object.
 */
export function serializeDataViewToHexString(obj: any): string {
  return JSON.stringify(obj, (key: string, value: any) => {
    if (value instanceof DataView) {
      const uint8Array = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      return { _type: "DataView", _encoding: "hex", data: uint8ArrayToHexString(uint8Array) };
    }
    return value;
  }, 2);
}