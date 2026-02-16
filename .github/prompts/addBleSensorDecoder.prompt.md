---
name: addBleSensorDecoder
description: Add a new BLE sensor decoder following project patterns and architecture
argument-hint: sensor-name manufacturer-id reference-implementation-or-spec
---

Add a decoder for ${sensor-name} BLE sensors to the project.

## Reference Implementation
${Paste or describe the reference implementation, protocol specification, or data format}

## Requirements
1. **Research Phase**: Examine existing decoders in the codebase to understand:
   - Binary data parsing patterns and utility functions
   - Standardized metric naming conventions
   - Decoder function signatures and return types
   - How decoders are registered in the BLE scanner
   - Device type configuration and status thresholds
   - Unit type definitions and metric configurations
   - UI integration patterns

2. **Clarify Details**: Before implementation, ask about:
   - BLE manufacturer ID or service UUID
   - Data interpretation (battery format, scaling factors, units)
   - Encrypted/secure packet handling
   - Broadcast timing/frequency (for threshold configuration)
   - UI display preferences (primary vs secondary metrics)

3. **Implementation**:
   - Create decoder file with TypeScript interface and parse function
   - Validate packet structure (length, format)
   - Parse binary data with correct byte offsets and endianness
   - Map to standardized metric names (temp, hum, batpct, etc.)
   - Handle edge cases (encryption, invalid data, missing sensors)
   - Register manufacturer ID or service UUID in scanner
   - Import and wire decoder in scanner's decode logic
   - Add device type to type definitions if needed
   - Configure status thresholds based on broadcast frequency
   - Define primary/secondary/hidden metrics for UI display
   - Initialize unit sensor data structures

4. **Verification**:
   - Run type checker to ensure no TypeScript errors
   - Verify manufacturer ID is correctly registered
   - Test with actual hardware if available
   - Check UI displays metrics correctly

## Key Considerations
- Match existing code style and patterns exactly
- Pay attention to byte offset corrections (manufacturer data may exclude service UUID prefix)
- Use appropriate data type methods (getUint8, getInt16, getUint32, etc.)
- Follow unit system conventions (°C for temperature, % for battery, etc.)
- Consider broadcast timing when setting online/warning/offline thresholds
- Keep UI metric configurations aligned with sensor capabilities
