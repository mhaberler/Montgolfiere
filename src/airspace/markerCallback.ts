import type { Geometry, Point } from "geojson";

const AIRPORT_TYPE_NAMES: Record<number, string> = {
  0: "Other",
  1: "Glider Site",
  2: "Airfield",
  3: "Int'l Airport",
  4: "Heliport",
  5: "Military",
  6: "Ultralight",
  7: "Helipad",
  8: "Seaplane Base",
  9: "Hang Gliding",
};

export function airportTypeName(type: number): string {
  return AIRPORT_TYPE_NAMES[type] ?? `Type ${type}`;
}

const FREQ_TYPE_NAMES: Record<number, string> = {
  0: "Other",
  1: "Approach",
  2: "Apron",
  3: "Arrival",
  4: "Center",
  5: "Clearance",
  6: "CTAF",
  7: "Departure",
  8: "FIS",
  9: "Gliding",
  10: "Ground",
  11: "Info",
  12: "Multicom",
  13: "Radar",
  14: "Tower",
  15: "ATIS",
  16: "Radio",
  17: "UNICOM",
  18: "VOLMET",
  19: "AFIS",
};

function freqTypeName(type: number): string {
  return FREQ_TYPE_NAMES[type] ?? `Type ${type}`;
}

const SURFACE_NAMES: Record<number, string> = {
  0: "Unknown",
  1: "Asphalt",
  2: "Grass",
  3: "Concrete",
  4: "Sand",
  5: "Gravel",
  6: "Water",
  7: "Ice",
  8: "Snow",
  9: "Dirt",
};

function surfaceName(code: number): string {
  return SURFACE_NAMES[code] ?? `Surface ${code}`;
}

interface AirportFrequency {
  value: string;
  unit: number;
  type: number;
  name: string;
  primary: boolean;
  publicUse: boolean;
}

interface AirportRunway {
  designator: string;
  trueHeading: number;
  mainRunway: boolean;
  takeOffOnly: boolean;
  landingOnly: boolean;
  surface?: { mainComposite?: number };
  dimension?: {
    length?: { value: number; unit: number };
    width?: { value: number; unit: number };
  };
}

export interface AirportItem {
  _id: string;
  name: string;
  icaoCode?: string;
  iataCode?: string;
  type: number;
  geometry: Point;
  elevation?: { value: number; unit: number };
  ppr: boolean;
  private: boolean;
  skydiveActivity: boolean;
  winchOnly: boolean;
  frequencies?: AirportFrequency[];
  runways?: AirportRunway[];
}

export function airportPopupHtml(airport: AirportItem): string {
  const icao = airport.icaoCode ? ` <b>${airport.icaoCode}</b>` : "";
  const iata = airport.iataCode ? ` / ${airport.iataCode}` : "";
  const elev = airport.elevation ? ` · ${airport.elevation.value} ft MSL` : "";
  const flags = [
    airport.ppr ? "PPR" : "",
    airport.private ? "Private" : "",
    airport.skydiveActivity ? "Skydive" : "",
    airport.winchOnly ? "Winch only" : "",
  ].filter(Boolean);
  const flagsHtml = flags.length
    ? `<br><span style="color:#888">${flags.join(" · ")}</span>`
    : "";

  let runwaysHtml = "";
  if (airport.runways?.length) {
    const runwayLines = airport.runways
      .filter((runway) => runway.mainRunway !== false)
      .map((runway) => {
        const surface =
          runway.surface?.mainComposite != null
            ? surfaceName(runway.surface.mainComposite)
            : "";
        const length = runway.dimension?.length
          ? `${runway.dimension.length.value} m`
          : "";
        const width = runway.dimension?.width
          ? `×${runway.dimension.width.value} m`
          : "";
        const ops = runway.takeOffOnly
          ? " (T/O only)"
          : runway.landingOnly
            ? " (Ldg only)"
            : "";
        return `RWY ${runway.designator} ${length}${width} ${surface}${ops}`.trim();
      });

    if (runwayLines.length) {
      runwaysHtml = `<br><b>Runways:</b> ${runwayLines.join(", ")}`;
    }
  }

  let freqHtml = "";
  if (airport.frequencies?.length) {
    const lines = airport.frequencies
      .sort((left, right) => Number(right.primary) - Number(left.primary))
      .map((frequency) => {
        const primary = frequency.primary ? "<b>" : "";
        const primaryEnd = frequency.primary ? "</b>" : "";
        return `${primary}${freqTypeName(frequency.type)} ${frequency.value} MHz${primaryEnd}${frequency.name && frequency.name !== frequency.value ? ` <i>${frequency.name}</i>` : ""}`;
      });
    freqHtml = `<br><b>ATS Comm:</b><br>${lines.join("<br>")}`;
  }

  return `<b>${airport.name}</b>${icao}${iata}<br>${airportTypeName(airport.type)}${elev}${flagsHtml}${runwaysHtml}${freqHtml}`;
}

export interface AltitudeLimit {
  value: number;
  unit: number;
  referenceDatum: number;
}

interface OperatingHourEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  byNotam: boolean;
  sunrise: boolean;
  sunset: boolean;
  publicHolidaysExcluded: boolean;
}

export interface HoursOfOperation {
  operatingHours: OperatingHourEntry[];
}

export interface AirspaceItem {
  _id: string;
  name: string;
  type: number;
  icaoClass: number;
  geometry: Geometry;
  lowerLimit?: AltitudeLimit;
  upperLimit?: AltitudeLimit;
  hoursOfOperation?: HoursOfOperation;
  activity?: number;
  onDemand?: boolean;
  onRequest?: boolean;
  byNotam?: boolean;
  specialAgreement?: boolean;
  requestCompliance?: boolean;
}

export function toFeet(limit: AltitudeLimit): number {
  return limit.unit === 6 ? limit.value * 100 : limit.value;
}

export function formatAltitude(limit: AltitudeLimit): string {
  if (limit.unit === 6) {
    return `FL${limit.value}`;
  }
  return `${limit.value} ft`;
}

function computeSunTimes(
  lat: number,
  lng: number,
  date: Date,
): { sunrise: string; sunset: string } {
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor(
    (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000,
  );
  const b = ((dayOfYear - 1) * 360) / 365;
  const br = b * rad;
  const decl =
    0.006918 -
    0.399912 * Math.cos(br) +
    0.070257 * Math.sin(br) -
    0.006758 * Math.cos(2 * br) +
    0.000907 * Math.sin(2 * br) -
    0.002697 * Math.cos(3 * br) +
    0.00148 * Math.sin(3 * br);

  const latRad = lat * rad;
  const cosH =
    (Math.cos(90.833 * rad) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  if (cosH > 1) {
    return { sunrise: "00:00", sunset: "00:00" };
  }
  if (cosH < -1) {
    return { sunrise: "00:00", sunset: "23:59" };
  }

  const h = Math.acos(cosH) / rad;
  const eot =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(br) -
      0.032077 * Math.sin(br) -
      0.014615 * Math.cos(2 * br) -
      0.04089 * Math.sin(2 * br));
  const solarNoon = 720 - 4 * lng - eot;
  const sunriseMin = solarNoon - 4 * h;
  const sunsetMin = solarNoon + 4 * h;

  const format = (minutes: number) => {
    const clamped = ((minutes % 1440) + 1440) % 1440;
    const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
    const mm = String(Math.round(clamped % 60)).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  return { sunrise: format(sunriseMin), sunset: format(sunsetMin) };
}

export interface ActiveResult {
  active: boolean;
  reason: string;
}

export function isActive(
  hours: HoursOfOperation,
  lat: number,
  lng: number,
): ActiveResult {
  const now = new Date();
  const todayDow = now.getUTCDay();
  const entry = hours.operatingHours.find(
    (hour) => hour.dayOfWeek === todayDow,
  );
  if (!entry) {
    return { active: false, reason: "No schedule" };
  }
  if (entry.byNotam) {
    return { active: false, reason: "By NOTAM" };
  }

  const sun = computeSunTimes(lat, lng, now);
  const start = entry.sunrise ? sun.sunrise : entry.startTime;
  const end = entry.sunset ? sun.sunset : entry.endTime;

  if (start === "00:00" && end === "00:00" && !entry.sunrise && !entry.sunset) {
    return { active: true, reason: "24h" };
  }

  const startLabel = entry.sunrise ? `SR ${sun.sunrise}` : start;
  const endLabel = entry.sunset ? `SS ${sun.sunset}` : end;
  const reason = `${startLabel}–${endLabel} UTC`;
  const current = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

  return {
    active: current >= start && current < end,
    reason,
  };
}

const FLAG_LABELS: [keyof AirspaceItem, string][] = [
  ["onDemand", "On Demand"],
  ["onRequest", "On Request"],
  ["byNotam", "By NOTAM"],
  ["specialAgreement", "Special Agreement"],
  ["requestCompliance", "Request Compliance"],
];

export function activeFlags(airspace: AirspaceItem): string[] {
  return FLAG_LABELS.filter(([key]) => airspace[key]).map(([, label]) => label);
}
