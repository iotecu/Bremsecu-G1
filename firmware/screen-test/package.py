"""Package a verified classic ESP32 4 MB screen-test build; no device access."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile
import os
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--data-dir',type=Path)
parser.add_argument('--littlefs-tool',type=Path,default=Path.home()/'.platformio/packages/tool-mklittlefs'/('mklittlefs.exe' if os.name=='nt' else 'mklittlefs'))
args = parser.parse_args()
root = Path(__file__).resolve().parent
build = root / '.pio/build/esp32-screen-test'
parts = (build / 'partitions.bin').read_bytes()
actual = {}
for index in range(0, len(parts), 32):
    entry = parts[index:index + 32]
    if len(entry) < 32 or struct.unpack_from('<H', entry)[0] != 0x50AA:
        break
    name = entry[12:28].split(b'\0')[0].decode()
    actual[name] = struct.unpack_from('<II', entry, 4)
assert actual.get('factory') == (0x10000, 0x180000), actual
assert actual.get('littlefs') == (0x190000, 0x270000), actual
source=args.data_dir or root/'data'
metadata=json.loads((source/'screen-test-package.json').read_text())
assert metadata['realMeasurements'] is False
assert sum(p.stat().st_size for p in source.rglob('*') if p.is_file() and p.name != 'screen-test-package.json') == metadata['totalAssetBytes'], 'Stale or incomplete screen-test staging directory'

images = [('bootloader.bin', 0x1000, 0x7000), ('partitions.bin', 0x8000, 0x1000),
          ('firmware.bin', 0x10000, 0x180000), ('littlefs.bin', 0x190000, 0x270000)]
flash = bytearray(b'\xff' * 0x400000)
manifest = {'purpose': 'SCREEN_TEST_ONLY', 'chip': 'esp32', 'flashBytes': len(flash), 'realMeasurements': False, 'files': []}
for name, offset, capacity in images:
    content = (build / name).read_bytes()
    assert 0 < len(content) <= capacity, (name, len(content), capacity)
    if name in ('firmware.bin', 'bootloader.bin'):
        assert content[0] == 0xE9, f'{name}: invalid ESP image header'
    flash[offset:offset + len(content)] = content
    manifest['files'].append({'name': name, 'offset': hex(offset), 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
# mklittlefs can return success after an add-file error. Verify the actual image
# by extracting every file and comparing its bytes before publishing a ZIP.
assert args.littlefs_tool.is_file(), 'LittleFS validation tool is required'
with tempfile.TemporaryDirectory(prefix='bremsecu-lfs-') as directory:
    extracted=Path(directory)
    subprocess.run([str(args.littlefs_tool),'-b','4096','-p','256','-s',str(0x270000),'-u',str(extracted),str(build/'littlefs.bin')],check=True,capture_output=True)
    expected={str(p.relative_to(source)):p.read_bytes() for p in source.rglob('*') if p.is_file()}
    restored={str(p.relative_to(extracted)):p.read_bytes() for p in extracted.rglob('*') if p.is_file()}
    assert expected == restored, 'LittleFS image does not match current screen files'
filename = 'bremsecu-screen-test-4mb.bin'
manifest['mergedSha256'] = hashlib.sha256(flash).hexdigest()
readme = (root / 'README.md').read_text() + f'''

## Hazır ikili paketle yükleme

Bu ZIP içindeki `{filename}` uygulama ve ekran dosyalarını birlikte içerir.
Yalnızca klasik ESP32 / ESP32-WROOM ve 4 MB flash içindir.
Aşağıdaki komut bütün 4 MB belleğin üzerine yazar; boş test kartında kullanın.
ZIP'i açın, terminali açılan klasörde başlatın:

```sh
python -m pip install "esptool>=4.11,<5"
python -m esptool --chip esp32 --port COM5 --baud 115200 write_flash --flash_mode dio --flash_freq 40m --flash_size 4MB 0x0 {filename}
```

`COM5` yerine kartınızın USB portunu yazın. USB yüklemesi sonrası RESET'e basın.
Hazır ikili kullanılıyorsa Node.js / PlatformIO ile yeniden derleme gerekmez.
`manifest.json` dosya boyutlarını, adreslerini ve SHA-256 özetlerini içerir.
Bu paket yazılımsal olarak derlenmiştir; fiziksel kartta deneme henüz yapılmamıştır.
'''
args.output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    archive.writestr(filename, flash)
    archive.writestr('BASLA.md', readme)
    archive.writestr('manifest.json', json.dumps(manifest, indent=2))
    for name, _, _ in images:
        archive.write(build / name, 'images/' + name)
with zipfile.ZipFile(args.output) as archive:
    assert archive.testzip() is None
    assert hashlib.sha256(archive.read(filename)).hexdigest() == manifest['mergedSha256']
print(f'Created {args.output}: {args.output.stat().st_size} bytes; merged image 4 MB, verified partition offsets and checksums.')
