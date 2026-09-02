#!/usr/bin/env python3
import os
import sys
import subprocess
import requests

TEMP_DIR = "openaip_s3_tmp"

# Stable public export bucket: no presigning, no expiry, no API key. Paths are
# <country>_<type>.geojson, so a build needs only an ISO country code.
BASE = "https://storage.openaip.net/openaip-system-exports"

# Layer name in the archive -> openAIP export type code.
LAYERS = {
    "airspaces": "asp",
    "airports": "apt",
    "navaids": "nav",
    "reporting-points": "rpp",
    "obstacles": "obs",
    "hotspots": "hot",
}


def download(country, layer_name, type_code):
    out_path = os.path.join(TEMP_DIR, f"{layer_name}.geojson")
    url = f"{BASE}/{country}_{type_code}.geojson"
    print(f"[*] Downloading {country}_{type_code}.geojson...")
    resp = requests.get(url, stream=True, timeout=60)

    if resp.status_code != 200:
        print(f"[!] Failed to download {layer_name} (Status: {resp.status_code})")
        print(f"    {url}")
        return None

    with open(out_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1 << 20):
            f.write(chunk)

    print(f"    Saved {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")
    return out_path


# Max zoom per layer. --no-clipping stores a whole feature in every tile it
# touches, so cost scales with feature area x 4^zoom. Point layers are free at
# z14; airspaces are not — Austria's CTA C alone spans 25k tiles at z14, which
# is what turns a 13 MB archive into 72 MB. Because features are deduped on
# _id rather than stitched back together, airspaces gain nothing above z12.
MAX_ZOOM = {
    "airspaces": 12,
}
DEFAULT_MAX_ZOOM = 14

# Geometry and attributes must survive verbatim: a dropped airspace reads as
# "clear here", and a simplified boundary moves a legal limit.
FIDELITY_FLAGS = [
    # Keep whole polygons in every tile they touch. With clipping, an 8-vertex
    # CTR came back as 169 fragments at z14 — drawable, but it turns "outline
    # the airspace I am in" and the altitude stack into a seam-aware
    # reassembly problem. Duplicates are deduped client-side on _id instead.
    "--no-clipping",
    "--no-feature-limit",
    "--no-tile-size-limit",
    "--no-simplification-of-shared-nodes",
    "--no-line-simplification",
    "--no-tiny-polygon-reduction",
    "--force",
]


def build_layer(layer_name, file_path):
    """Tile one layer at its own max zoom. Returns the temp archive path."""
    out_path = os.path.join(TEMP_DIR, f"{layer_name}.pmtiles")
    max_zoom = MAX_ZOOM.get(layer_name, DEFAULT_MAX_ZOOM)
    print(f"[*] Tiling {layer_name} (z0-z{max_zoom})...")
    subprocess.run(
        [
            "tippecanoe",
            "-o", out_path,
            f"-z{max_zoom}", "-Z0",
            "--projection=EPSG:4326",
            *FIDELITY_FLAGS,
            f"--named-layer={layer_name}:{file_path}",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"    {out_path} ({os.path.getsize(out_path) / (1024 * 1024):.1f} MB)")
    return out_path


def main():
    country = (sys.argv[1] if len(sys.argv) > 1 else "at").lower()
    output_pmtiles = f"openaip_{country}.pmtiles"

    os.makedirs(TEMP_DIR, exist_ok=True)

    layer_archives = []
    for layer_name, type_code in LAYERS.items():
        file_path = download(country, layer_name, type_code)
        if file_path:
            layer_archives.append(build_layer(layer_name, file_path))

    if not layer_archives:
        print(f"[!] No layers downloaded for '{country}'", file=sys.stderr)
        return

    # tile-join merges the per-layer archives; per-layer max zoom is why this
    # cannot be a single tippecanoe invocation.
    print("\n[*] Joining layers into PMTiles archive...")
    try:
        subprocess.run(
            [
                "tile-join",
                "-o", output_pmtiles,
                "--attribution=Data courtesy of openAIP (CC-BY-NC-SA)",
                "--no-tile-size-limit",
                "--force",
                *layer_archives,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"\n[✓] Successfully compiled: {output_pmtiles}")
        print(f"    File size: {os.path.getsize(output_pmtiles) / (1024 * 1024):.2f} MB")
    except subprocess.CalledProcessError as e:
        print(f"[!] Tile build error: {e}", file=sys.stderr)
    except FileNotFoundError as e:
        print(f"[!] tippecanoe/tile-join not found in PATH: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
