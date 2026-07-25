// Unit types and configurations
export type UnitType =
  | "Envelope"
  | "OAT"
  | "Tank1"
  | "Tank2"
  | "Tank3"
  | "Tank4"
  | "Tank5"
  | "Tank6"
  | "Box"
  | "Vario"
  | "Switch";

export interface UnitConfig {
  id: string;
  type: UnitType;
  name: string;
  description: string;
  iconName: string;
}

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  Envelope: {
    id: "envelope",
    type: "Envelope",
    name: "Envelope",
    description: "Balloon envelope sensors",
    iconName: "balloon-outline",
  },
  OAT: {
    id: "oat",
    type: "OAT",
    name: "Outside Air Temp",
    description: "Ambient temperature",
    iconName: "thermometer-outline",
  },
  Tank1: {
    id: "tank1",
    type: "Tank1",
    name: "Tank 1",
    description: "Propane tank 1",
    iconName: "flame-outline",
  },
  Tank2: {
    id: "tank2",
    type: "Tank2",
    name: "Tank 2",
    description: "Propane tank 2",
    iconName: "flame-outline",
  },
  Tank3: {
    id: "tank3",
    type: "Tank3",
    name: "Tank 3",
    description: "Propane tank 3",
    iconName: "flame-outline",
  },
  Tank4: {
    id: "tank4",
    type: "Tank4",
    name: "Tank 4",
    description: "Propane tank 4",
    iconName: "flame-outline",
  },
  Tank5: {
    id: "tank5",
    type: "Tank5",
    name: "Tank 5",
    description: "Propane tank 5",
    iconName: "flame-outline",
  },
  Tank6: {
    id: "tank6",
    type: "Tank6",
    name: "Tank 6",
    description: "Propane tank 6",
    iconName: "flame-outline",
  },
  Box: {
    id: "power",
    type: "Box",
    name: "Box",
    description: "Radio box",
    iconName: "battery-half-outline",
  },
  Vario: {
    id: "vario",
    type: "Vario",
    name: "Vario",
    description: "Vario",
    iconName: "paper-plane",
  },
  Switch: {
    id: "switch",
    type: "Switch",
    name: "Switch",
    description: "MikroTik reed switch sensor",
    iconName: "toggle-outline",
  },
};
