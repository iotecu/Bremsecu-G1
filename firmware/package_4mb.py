"""Build a verified single-file 4 MB Bremsecu G1 diagnostic image."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import os
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--manifest", type=Path, required=True)
parser.add_argument("--data-dir", type=Path, default=Path("data"))
parser.add_argument("--littlefs-tool", type=Path, default=Path.home()/".platformio/packages/tool-mklittlefs"/("mklittlefs.exe" if os.name=="nt" else "mklittlefs"))
args = parser.parse_args()

root = Path(__file__).resolve().parent
build = root / ".pio/build/esp32dev"
source = root / args.data_dir

parts = (build / "partitions.bin").read_bytes()
actual = {}
for index in range(0, len(parts), 32):
    entry = parts[index:index + 32]
    if len(entry) < 32 or struct.unpack_from("<H", entry)[0] != 0x50AA:
        break
    name = entry[12:28].split(b"\0")[0].decode()
    actual[name] = struct.unpack_from("<II", entry, 4)

assert actual.get("factory") == (0x10000, 0x180000), actual
assert actual.get("littlefs") == (0x190000, 0x270000), actual

images = [
    ("bootloader.bin", 0x1000, 0x7000),
    ("partitions.bin", 0x8000, 0x1000),
    ("firmware.bin", 0x10000, 0x180000),
    ("littlefs.bin", 0x190000, 0x270000),
]

flash = bytearray(b"\xff" * 0x400000)
manifest = {
    "purpose": "BREMSECU_G1_DIAGNOSTIC_WITH_PWA",
    "chip": "esp32",
    "flashBytes": len(flash),
    "flashAt": "0x0",
    "files": [],
}

for name, offset, capacity in images:
    content = (build / name).read_bytes()
    assert 0 < len(content) <= capacity, (name, len(content), capacity)
    if name in ("firmware.bin", "bootloader.bin"):
        assert content[0] == 0xE9, f"{name}: invalid ESP image header"
    flash[offset:offset + len(content)] = content
    manifest["files"].append({
        "name": name,
        "offset": hex(offset),
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
    })

assert args.littlefs_tool.is_file(), "LittleFS validation tool is required"
with tempfile.TemporaryDirectory(prefix="bremsecu-lfs-") as directory:
    extracted = Path(directory)
    subprocess.run([
        str(args.littlefs_tool), "-b", "4096", "-p", "256",
        "-s", str(0x270000), "-u", str(extracted), str(build / "littlefs.bin")
    ], check=True, capture_output=True)
    expected = {
        str(p.relative_to(source)): p.read_bytes()
        for p in source.rglob("*") if p.is_file()
    }
    restored = {
        str(p.relative_to(extracted)): p.read_bytes()
        for p in extracted.rglob("*") if p.is_file()
    }
    assert expected == restored, "LittleFS image does not match production PWA staging files"

args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_bytes(flash)
manifest["mergedSha256"] = hashlib.sha256(flash).hexdigest()
manifest["mergedBytes"] = len(flash)
args.manifest.parent.mkdir(parents=True, exist_ok=True)
args.manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Created {args.output}: {len(flash)} bytes sha256={manifest['mergedSha256']}")
