#!/usr/bin/env python3
"""Generate src/assets/openaip-countries.json.

Lists the openAIP export bucket to discover which countries publish which
layers, then derives each country's bounding box from its GeoJSON geometry.

The app uses this table to answer "which countries does this viewport touch"
without any network access, and to distinguish a layer openAIP does not
publish from one the user has simply not downloaded yet. Only 129 of 239
countries publish an airspace export.

Regenerate manually when openAIP adds countries; it is not part of the build.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

BUCKET = "https://storage.openaip.net/openaip-system-exports"
LAYERS = ("asp", "apt")
OUTPUT = os.path.join(
    os.path.dirname(__file__), "..", "src", "assets", "openaip-countries.json"
)


def list_bucket():
    """Return {key: size} for every object, following continuation tokens."""
    items = {}
    token = None
    while True:
        url = f"{BUCKET}/?list-type=2&max-keys=1000"
        if token:
            url += "&continuation-token=" + urllib.parse.quote(token)
        body = urllib.request.urlopen(url, timeout=60).read().decode()
        for m in re.finditer(r"<Key>([^<]+)</Key>.*?<Size>(\d+)</Size>", body, re.S):
            items[m.group(1)] = int(m.group(2))
        token_match = re.search(
            r"<NextContinuationToken>([^<]+)</NextContinuationToken>", body
        )
        if "<IsTruncated>true</IsTruncated>" in body and token_match:
            token = token_match.group(1)
        else:
            return items


def coords_of(geometry):
    """Yield every [lng, lat] pair in a Point/Polygon/MultiPolygon geometry."""
    kind = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if kind == "Point":
        yield coordinates
    elif kind == "Polygon":
        for ring in coordinates:
            yield from ring
    elif kind == "MultiPolygon":
        for polygon in coordinates:
            for ring in polygon:
                yield from ring


def longitude_span(xs):
    """Narrowest longitude span covering xs, allowing antimeridian wrap.

    A plain min/max makes any country straddling 180 degrees (us, ru, nz, fj)
    span the whole globe, so its bbox then matches every viewport on Earth.
    Sort the longitudes and find the largest gap: the span is everything
    outside that gap, expressed as min > max when it wraps.
    """
    ordered = sorted(set(xs))
    if len(ordered) < 2:
        return ordered[0], ordered[0]

    widest_gap = -1.0
    gap_at = 0
    for i in range(len(ordered)):
        nxt = ordered[(i + 1) % len(ordered)]
        gap = (nxt - ordered[i]) % 360.0
        if gap > widest_gap:
            widest_gap = gap
            gap_at = i

    # The span runs from just after the gap, around to the gap's start.
    return ordered[(gap_at + 1) % len(ordered)], ordered[gap_at]


def bbox_of(country, layers):
    """Union bbox across a country's layers: [minLng, minLat, maxLng, maxLat].

    minLng > maxLng means the box crosses the antimeridian.
    """
    xs, ys = [], []
    for layer in layers:
        url = f"{BUCKET}/{country}_{layer}.geojson"
        try:
            data = json.loads(urllib.request.urlopen(url, timeout=120).read())
        except Exception as error:  # noqa: BLE001 - report and skip
            print(f"    [!] {country}_{layer}: {error}", file=sys.stderr)
            continue
        for feature in data.get("features", []):
            for lng, lat, *_ in coords_of(feature.get("geometry") or {}):
                xs.append(lng)
                ys.append(lat)
    if not xs:
        return None
    min_lng, max_lng = longitude_span(xs)
    return [min_lng, min(ys), max_lng, max(ys)]


def main():
    print("[*] Listing export bucket...")
    objects = list_bucket()
    print(f"    {len(objects)} objects")

    sizes = {}
    for key, size in objects.items():
        m = re.fullmatch(r"([a-z]{2})_(\w+)\.geojson", key)
        if m and m.group(2) in LAYERS:
            sizes.setdefault(m.group(1), {})[m.group(2)] = size

    countries = {}
    for index, country in enumerate(sorted(sizes), 1):
        layers = sizes[country]
        print(f"[{index}/{len(sizes)}] {country} ({'+'.join(sorted(layers))})")
        bbox = bbox_of(country, sorted(layers))
        if bbox is None:
            continue
        countries[country] = {
            "bbox": [round(v, 4) for v in bbox],
            # A missing layer key means openAIP does not publish it for this
            # country — distinct from "the user has not downloaded it".
            "layers": layers,
        }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(countries, f, separators=(",", ":"), sort_keys=True)

    with_asp = sum(1 for d in countries.values() if "asp" in d["layers"])
    print(f"\n[✓] {OUTPUT}")
    print(f"    {len(countries)} countries, {with_asp} with airspace")
    print(f"    {os.path.getsize(OUTPUT) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
