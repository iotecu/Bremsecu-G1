#!/usr/bin/env python3
from pathlib import Path
import re


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

ws = Path("firmware/src/api/ws_server.cpp")
replace_once(
    ws,
    'case TestEngine::AbortReason::CALIBRATION_PENDING:return "CALIBRATION_PENDING";case TestEngine::AbortReason::USER_STOP:return "USER_STOP";',
    'case TestEngine::AbortReason::CALIBRATION_PENDING:return "CALIBRATION_PENDING";case TestEngine::AbortReason::OVERCURRENT:return "OVERCURRENT";case TestEngine::AbortReason::USER_STOP:return "USER_STOP";',
    "ws overcurrent reason",
)
replace_once(
    ws,
    's+=",\\\"onMs\\\":";s+=String((unsigned)r.load.onMs);s+=",\\\"classificationFinal\\\":false}";return s;',
    's+=",\\\"peakCurrent\\\":{\\\"valid\\\":";s+=r.load.peakCurrentValid?"true":"false";s+=",\\\"value\\\":";if(r.load.peakCurrentValid)s+=String(r.load.peakCurrentA,4);else s+="null";s+="}";s+=",\\\"sampleCount\\\":";s+=String((unsigned)r.load.sampleCount);s+=",\\\"overcurrent\\\":";s+=r.load.overcurrent?"true":"false";s+=",\\\"timedOut\\\":";s+=r.load.timedOut?"true":"false";s+=",\\\"onMs\\\":";s+=String((unsigned)r.load.onMs);s+=",\\\"classificationFinal\\\":false}";return s;',
    "ws load evidence",
)

store = Path("firmware/src/storage/test_result_store.cpp")
text = store.read_text(encoding="utf-8")
pattern = re.compile(
    r's\+="\\\{";putStr\(s,"measurementFamily","load_current"\);'
    r'.*?putBool\(s,"classificationFinal",false\);s\+="\\\}";first=false;',
    re.DOTALL,
)
match = pattern.search(text)
if not match:
    raise SystemExit("stored load evidence: load_current serialization block not found")
replacement = '''s+="{";putStr(s,"measurementFamily","load_current");s+=",\\\"shunt\\\":{\\\"valid\\\":";s+=(r.load.shuntValid?"true":"false");s+=",\\\"value\\\":";s+=String(r.load.shuntV,6);s+="}";s+=",\\\"bus\\\":{\\\"valid\\\":";s+=(r.load.busValid?"true":"false");s+=",\\\"value\\\":";s+=String(r.load.busV,3);s+="}";s+=",\\\"current\\\":{\\\"valid\\\":";s+=(r.load.currentValid?"true":"false");s+=",\\\"value\\\":";s+=String(r.load.currentA,4);s+="}";s+=",\\\"peakCurrent\\\":{\\\"valid\\\":";s+=(r.load.peakCurrentValid?"true":"false");s+=",\\\"value\\\":";if(r.load.peakCurrentValid)s+=String(r.load.peakCurrentA,4);else s+="null";s+="}";s+=",\\\"sampleCount\\\":";s+=String((unsigned)r.load.sampleCount);s+=",\\\"overcurrent\\\":";s+=(r.load.overcurrent?"true":"false");s+=",\\\"timedOut\\\":";s+=(r.load.timedOut?"true":"false");s+=",\\\"onMs\\\":";s+=String((unsigned)r.load.onMs);s+=",";putBool(s,"classificationFinal",false);s+="}";first=false;'''
text = text[:match.start()] + replacement + text[match.end():]
store.write_text(text, encoding="utf-8")

print("Package 8 telemetry/storage evidence patch applied")
