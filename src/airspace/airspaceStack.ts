const ICAO_CLASS_NAMES = [
  'Class A',
  'Class B',
  'Class C',
  'Class D',
  'Class E',
  'Class F',
  'Class G',
  'Other',
  'SUA',
]

export function icaoClassName(icaoClass: number): string {
  return ICAO_CLASS_NAMES[icaoClass] ?? `Unknown (${icaoClass})`
}

const AIRSPACE_TYPE_NAMES = [
  'Other',
  'Restricted',
  'Danger',
  'Prohibited',
  'CTR',
  'TMZ',
  'RMZ',
  'TMA',
  'TRA',
  'TSA',
  'FIR',
  'UIR',
  'ADIZ',
  'ATZ',
  'MATZ',
  'Airway',
  'MTR',
  'Alert Area',
  'Warning Area',
  'Protected Area',
  'HTZ',
  'Gliding Sector',
  'TRP',
  'TIZ',
  'TIA',
  'MTA',
  'CTA',
  'ACC',
  'Aerial Sporting/Recreational',
  'Low Altitude Overflight Restriction',
  'MRT',
  'TFR',
  'VFR Sector',
  'FIS Sector',
  'LTA',
  'UTA',
  'MCTR',
]

const ACTIVITY_NAMES = [
  'None',
  'Parachuting',
  'Aerobatics',
  'Aeroclub/Aerial Work',
  'ULM',
  'Hang Gliding/Paragliding',
]

export function activityName(activity: number): string {
  return ACTIVITY_NAMES[activity] ?? `Unknown (${activity})`
}

export function airspaceTypeName(type: number): string {
  return AIRSPACE_TYPE_NAMES[type] ?? `Unknown (${type})`
}

export const MIN_CEILING = 10_000
export const CEIL_STEP = 5_000

const ICAO_CLASS_HEX: Record<number, string> = {
  0: '#CC0000',
  1: '#1A73E8',
  2: '#1A73E8',
  3: '#22A7E0',
  4: '#E91E63',
  5: '#E91E63',
  6: '#808080',
  7: '#808080',
  8: '#808080',
}

const TYPE_HEX_OVERRIDES: Record<number, string> = {
  1: '#FF0000',
  2: '#FFB300',
  3: '#FF0000',
  5: '#E91E63',
  17: '#FFB300',
  18: '#FFB300',
  21: '#008000',
  25: '#FFB300',
  28: '#008000',
}

const ACTIVITY_HEX_OVERRIDES: Record<number, string> = {
  1: '#008000',
  5: '#008000',
}

export function airspaceColor(entry: {
  type: number
  icaoClass: number
  activity: number
}): string {
  if (entry.activity && ACTIVITY_HEX_OVERRIDES[entry.activity]) {
    return ACTIVITY_HEX_OVERRIDES[entry.activity]
  }

  if (TYPE_HEX_OVERRIDES[entry.type] !== undefined) {
    return TYPE_HEX_OVERRIDES[entry.type]
  }

  return ICAO_CLASS_HEX[entry.icaoClass] ?? '#808080'
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface AirspaceEntry {
  name: string
  type: number
  icaoClass: number
  lowerFt: number
  upperFt: number
  lowerLabel: string
  upperLabel: string
  activity: number
  flags: string[]
  activeReason: string
  active: boolean
}

export function featuresToEntries(features: GeoJSON.Feature[]): AirspaceEntry[] {
  return features
    .map((feature) => ({
      name: feature.properties?.name ?? '?',
      type: feature.properties?.type ?? 0,
      icaoClass: feature.properties?.icaoClass ?? 0,
      lowerFt: feature.properties?.lowerFt ?? 0,
      upperFt: feature.properties?.upperFt ?? 0,
      lowerLabel: feature.properties?.lowerLabel ?? '?',
      upperLabel: feature.properties?.upperLabel ?? '?',
      activity: feature.properties?.activity ?? 0,
      flags: feature.properties?.flags ?? [],
      activeReason: feature.properties?.activeReason ?? '24h',
      active: feature.properties?.active ?? true,
    }))
    .sort((left, right) => left.lowerFt - right.lowerFt)
}

export function computeCeiling(entries: AirspaceEntry[]): number {
  const highestFt = entries.reduce((maxFt, entry) => Math.max(maxFt, entry.upperFt), 0)
  return Math.max(MIN_CEILING, Math.ceil(highestFt / CEIL_STEP) * CEIL_STEP)
}

export function assignColumns(entries: AirspaceEntry[]): number[] {
  const columnTops: number[] = []
  const columnOf: number[] = []

  for (const entry of entries) {
    const col = columnTops.findIndex((top) => top === entry.lowerFt)
    if (col >= 0) {
      columnOf.push(col)
      columnTops[col] = entry.upperFt
    } else {
      columnOf.push(columnTops.length)
      columnTops.push(entry.upperFt)
    }
  }

  return columnOf
}

export function computeColumnOrder(
  entries: AirspaceEntry[],
  columnOf: number[],
  numCols: number,
  aircraftAlt: number,
): number[] {
  const colClass: number[] = new Array(numCols).fill(Infinity)

  entries.forEach((entry, index) => {
    const col = columnOf[index]
    if (aircraftAlt >= entry.lowerFt && aircraftAlt < entry.upperFt) {
      colClass[col] = Math.min(colClass[col], entry.icaoClass)
    }
  })

  const indices = Array.from({ length: numCols }, (_, index) => index)
  indices.sort((left, right) => colClass[left] - colClass[right])

  const order: number[] = new Array(numCols)
  indices.forEach((origCol, displayPos) => {
    order[origCol] = displayPos
  })

  return order
}
