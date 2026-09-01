import type { Geometry, Position } from "geojson";

/** Ray-casting test against one linear ring. */
function inRing(lat: number, lng: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

/** A polygon contains the point when it is inside the outer ring and outside every hole. */
function inPolygon(lat: number, lng: number, rings: Position[][]): boolean {
  if (!rings.length || !inRing(lat, lng, rings[0])) {
    return false;
  }
  return rings.slice(1).every((hole) => !inRing(lat, lng, hole));
}

/** Point-in-polygon for GeoJSON Polygon / MultiPolygon geometries. */
export function containsPoint(
  geometry: Geometry | undefined,
  lat: number,
  lng: number,
): boolean {
  if (!geometry) {
    return false;
  }
  if (geometry.type === "Polygon") {
    return inPolygon(lat, lng, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((rings) => inPolygon(lat, lng, rings));
  }
  return false;
}
