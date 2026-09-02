#!/usr/bin/env python3
import os
import sys
import subprocess
import requests

OUTPUT_PMTILES = "openaip_austria.pmtiles"
TEMP_DIR = "openaip_s3_tmp"

# Presigned URLs from https://www.openaip.net/data/exports (expire ~24h after generation).
# Re-fetch fresh URLs from that page and paste them here when they expire.
LAYERS = {
    "airspaces": "https://s3.openaip.net/openaip-system-exports/at_asp.geojson?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=4XWRJ31Z9O1W8XJ2OQYM%2F20260902%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260902T010926Z&X-Amz-Expires=86400&X-Amz-Signature=af435a57440e856538f22542ea512295de49eb0bc440024965a34f696eefdf15&X-Amz-SignedHeaders=host&x-id=GetObject",
    "airports": "https://s3.openaip.net/openaip-system-exports/at_apt.geojson?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=4XWRJ31Z9O1W8XJ2OQYM%2F20260902%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260902T010918Z&X-Amz-Expires=86400&X-Amz-Signature=9b1b29c9628971d37a0d300771c140f4d7d2b0f5c800dd5aeac5a90f38a0685c&X-Amz-SignedHeaders=host&x-id=GetObject",
    "navaids": "https://s3.openaip.net/openaip-system-exports/at_nav.geojson?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=4XWRJ31Z9O1W8XJ2OQYM%2F20260902%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260902T010930Z&X-Amz-Expires=86400&X-Amz-Signature=63ca8bd93fd0ee3cd12b2862b9905c5f7c4c64329c0e001a966bb5671dbd4c00&X-Amz-SignedHeaders=host&x-id=GetObject",
    "reporting-points": "https://s3.openaip.net/openaip-system-exports/at_rpp.geojson?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=4XWRJ31Z9O1W8XJ2OQYM%2F20260902%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260902T010939Z&X-Amz-Expires=86400&X-Amz-Signature=add0b45819d2f7bca7278b6612bc062b29708b6e42054b5ac529f192ae484d64&X-Amz-SignedHeaders=host&x-id=GetObject",
    "obstacles": "https://s3.openaip.net/openaip-system-exports/at_obs.geojson?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=4XWRJ31Z9O1W8XJ2OQYM%2F20260902%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260902T010945Z&X-Amz-Expires=86400&X-Amz-Signature=43538a54b12231e97000cc6592c2eb1e8f00b4232d0187eec10d335dac9f77bd&X-Amz-SignedHeaders=host&x-id=GetObject",
    "hotspots": "https://s3.openaip.net/openaip-system-exports/at_hot.geojson?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=4XWRJ31Z9O1W8XJ2OQYM%2F20260902%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260902T010934Z&X-Amz-Expires=86400&X-Amz-Signature=13d91f0d28d4821b4e3a424ee9ab656615444d5d6a38f8bc09b82d596577b862&X-Amz-SignedHeaders=host&x-id=GetObject",
}


def download(layer_name, url):
    out_path = os.path.join(TEMP_DIR, f"{layer_name}.geojson")
    print(f"[*] Downloading {layer_name}.geojson from openAIP export bucket...")
    resp = requests.get(url, stream=True, timeout=60)

    if resp.status_code != 200:
        print(f"[!] Failed to download {layer_name} (Status: {resp.status_code})")
        print(f"    {resp.text[:300]}")
        return None

    with open(out_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1 << 20):
            f.write(chunk)

    print(f"    Saved {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")
    return out_path


def main():
    os.makedirs(TEMP_DIR, exist_ok=True)

    tippecanoe_cmd = [
        "tippecanoe",
        "-o", OUTPUT_PMTILES,
        "-z14", "-Z0",
        "--projection=EPSG:4326",
        "--attribution=Data courtesy of openAIP (CC-BY-NC-SA)",
        "--drop-densest-as-needed",
        "--extend-zooms-if-still-dropping",
        "--force"
    ]

    for layer_name, url in LAYERS.items():
        file_path = download(layer_name, url)
        if file_path:
            tippecanoe_cmd.append(f"--named-layer={layer_name}:{file_path}")

    print("\n[*] Running Tippecanoe to build PMTiles archive...")
    try:
        subprocess.run(tippecanoe_cmd, check=True)
        print(f"\n[✓] Successfully compiled: {OUTPUT_PMTILES}")
        print(f"    File size: {os.path.getsize(OUTPUT_PMTILES) / (1024 * 1024):.2f} MB")
    except subprocess.CalledProcessError as e:
        print(f"[!] Tippecanoe error: {e}", file=sys.stderr)
    except FileNotFoundError:
        print("[!] Tippecanoe is not installed or not found in PATH.", file=sys.stderr)


if __name__ == "__main__":
    main()
