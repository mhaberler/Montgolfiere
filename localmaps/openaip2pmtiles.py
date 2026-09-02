#!/usr/bin/env python3
import os
import sys
import json
import subprocess
import requests

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
def _key_from_env_files() -> str:
    """Read VITE_OPENAIP_KEY from the repo's .env files (dev, then prod)."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for name in (".env.development", ".env.production", ".env"):
        path = os.path.join(root, name)
        if not os.path.exists(path):
            continue
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("VITE_OPENAIP_KEY="):
                    return line.split("=", 1)[1].strip().strip("\"'")
    return ""


OPENAIP_API_KEY = (
    os.getenv("OPENAIP_API_KEY")
    or os.getenv("VITE_OPENAIP_KEY")
    or _key_from_env_files()
    or "YOUR_OPENAIP_API_KEY_HERE"
)
OUTPUT_PMTILES = "openaip_europe.pmtiles"
TEMP_DIR = "openaip_tmp"

# Approximate bounding box for Europe [min_lon, min_lat, max_lon, max_lat]
# (Adjust as needed for overseas territories / wider regions)
EUROPE_BBOX = "-25.0,34.0,45.0,71.0"
AUSTRIA_BBOX = "9.5,46.3,17.2,49.1"

# openAIP feature layers to fetch
LAYERS = [
    "airspaces",
    "airports",
    "navaids",
    "reporting-points",
    "obstacles",
    "hotspots"
]

BASE_URL = "https://api.openaip.net/api"

# ---------------------------------------------------------------------------
# ETL FUNCTIONS
# ---------------------------------------------------------------------------
def fetch_openaip_layer(layer_name):
    """
    Paginates the openAIP REST API for a given layer within the European BBOX
    and builds a GeoJSON FeatureCollection.
    """
    url = f"{BASE_URL}/{layer_name}"
    headers = {
        "x-openaip-api-key": OPENAIP_API_KEY,
        "Accept": "application/json"
    }

    page = 1
    limit = 100
    features = []

    print(f"[*] Fetching layer: {layer_name}...")

    while True:
        params = {
            "page": page,
            "limit": limit,
            "bbox": AUSTRIA_BBOX
        }

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)

            if response.status_code == 401:
                print(f"[!] Error: Unauthorized. Check your API key.", file=sys.stderr)
                sys.exit(1)
            elif response.status_code == 429:
                print(f"[!] Rate limited. Waiting before retrying...")
                import time; time.sleep(5)
                continue

            response.raise_for_status()
            data = response.json()

            items = data.get("items", [])
            if not items:
                break

            for item in items:
                # openAIP returns geometries in GeoJSON format inside the object payload
                geom = item.get("geometry")
                if not geom:
                    continue

                # Strip out geometry from properties payload to keep attributes clean
                props = {k: v for k, v in item.items() if k != "geometry"}

                feature = {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": props
                }
                features.append(feature)

            total_pages = data.get("totalPages", page)
            print(f"    Fetched page {page} of {total_pages} ({len(features)} total features)")

            if page >= total_pages:
                break

            page += 1

        except requests.exceptions.RequestException as e:
            print(f"[!] API Request failed for {layer_name}: {e}", file=sys.stderr)
            sys.exit(1)

    return {
        "type": "FeatureCollection",
        "features": features
    }


def main():
    if OPENAIP_API_KEY == "YOUR_OPENAIP_API_KEY_HERE" or not OPENAIP_API_KEY:
        print("[!] Error: Set your OPENAIP_API_KEY before running.", file=sys.stderr)
        sys.exit(1)

    os.makedirs(TEMP_DIR, exist_ok=True)
    tippecanoe_cmd = [
        "tippecanoe",
        "-o", OUTPUT_PMTILES,
        "-z14", "-Z0",                       # Zoom level 0 to 14
        "--projection=EPSG:4326",            # Standard Lat/Lon WGS84
        "--attribution=Courtesy of openAIP (CC-BY-NC-SA)",
        "--drop-densest-as-needed",           # Prevent dense tile bloat at low zooms
        "--extend-zooms-if-still-dropping",  # Keep details on high zooms
        "--force"                            # Overwrite output if file exists
    ]

    # 1. Download each layer and save as a GeoJSON file
    for layer in LAYERS:
        geojson_data = fetch_openaip_layer(layer)
        file_path = os.path.join(TEMP_DIR, f"{layer}.geojson")

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(geojson_data, f)

        print(f"[+] Saved {len(geojson_data['features'])} features to {file_path}")

        # Add layer source to Tippecanoe command arguments
        tippecanoe_cmd.extend(["--layer", layer, file_path])

    # 2. Run Tippecanoe to compile into PMTiles
    print("\n[*] Invoking Tippecanoe to compile vector PMTiles archive...")
    print(f"    Command: {' '.join(tippecanoe_cmd)}")

    try:
        subprocess.run(tippecanoe_cmd, check=True)
        print(f"\n[✓] Successfully created: {OUTPUT_PMTILES}")
        print(f"    File size: {os.path.getsize(OUTPUT_PMTILES) / (1024 * 1024):.2f} MB")
    except subprocess.CalledProcessError as e:
        print(f"[!] Tippecanoe compilation failed: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("[!] Error: Tippecanoe executable not found in PATH. Please install Tippecanoe.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()