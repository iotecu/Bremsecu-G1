#include "report_composer.h"
#include "record_store.h"
#include "test_result_store.h"
#include "settings_store.h"
#include <Arduino.h>
#include <string.h>
#include <stdio.h>

namespace ReportComposer {

namespace {

constexpr size_t kStreamChunkLen = 512; // PROVISIONAL
ReportError gErr = ReportError::NONE;

char gTestBuf[TestResultStore::kMaxTestJsonLen + 1];
RecordStore::ServiceRecord gRec;
SettingsStore::Settings gSet;
RecordStore::TestRef gRefs[RecordStore::kMaxTestsPerRecord];

ReportError mapRecordErr(RecordStore::RecordError e) {
    switch(e) {
        case RecordStore::RecordError::NONE: return ReportError::NONE;
        case RecordStore::RecordError::INVALID_ID:
        case RecordStore::RecordError::INVALID_ARG: return ReportError::INVALID_ARG;
        case RecordStore::RecordError::NOT_FOUND: return ReportError::NOT_FOUND;
        case RecordStore::RecordError::NOT_READY: return ReportError::NOT_READY;
        case RecordStore::RecordError::MALFORMED: return ReportError::MALFORMED;
        default: return ReportError::READ_FAILED;
    }
}

ReportError mapSettingsErr(SettingsStore::SettingsError e) {
    switch(e) {
        case SettingsStore::SettingsError::NONE: return ReportError::NONE;
        case SettingsStore::SettingsError::NOT_FOUND: return ReportError::NONE; // healthy defaults
        case SettingsStore::SettingsError::NOT_READY: return ReportError::NOT_READY;
        case SettingsStore::SettingsError::MALFORMED: return ReportError::MALFORMED;
        default: return ReportError::READ_FAILED;
    }
}

ReportError mapTestResultErr(RecordStore::RecordError e) {
    switch(e) {
        case RecordStore::RecordError::NONE: return ReportError::NONE;
        case RecordStore::RecordError::INVALID_ID:
        case RecordStore::RecordError::INVALID_ARG: return ReportError::INVALID_ARG;
        case RecordStore::RecordError::NOT_FOUND: return ReportError::NOT_FOUND;
        case RecordStore::RecordError::NOT_READY: return ReportError::NOT_READY;
        case RecordStore::RecordError::MALFORMED: return ReportError::MALFORMED;
        default: return ReportError::READ_FAILED;
    }
}

void escAppend(String& s, const char* v) {
  for (const char* p = v; *p; ++p) {
    switch (*p) {
      case '"': s += "\\\""; break; case '\\': s += "\\\\"; break;
      case '\n': s += "\\n"; break; case '\r': s += "\\r"; break;
      case '\t': s += "\\t"; break; default: s += *p; break;
    }
  }
}

bool writeString(ChunkWriter writer, void* ctx, const char* key, const char* val, bool last) {
    String s = "\""; s += key; s += "\":\"";
    escAppend(s, val);
    s += "\"";
    if (!last) s += ",";
    return writer(s.c_str(), s.length(), ctx);
}

bool writeRaw(ChunkWriter writer, void* ctx, const char* data) {
    return writer(data, strlen(data), ctx);
}

} // namespace

ReportError validate(const char* recordId) {
    if (!RecordStore::isReady() || !TestResultStore::isReady() || !SettingsStore::isReady()) {
        return ReportError::NOT_READY;
    }
    if (!recordId || recordId[0] == '\0') return ReportError::INVALID_ARG;

    RecordStore::RecordError re = RecordStore::load(recordId, gRec);
    if (re != RecordStore::RecordError::NONE) return mapRecordErr(re);

    SettingsStore::SettingsError se = SettingsStore::load(gSet);
    if (se == SettingsStore::SettingsError::NOT_FOUND) {
        SettingsStore::defaults(gSet);
    } else if (se != SettingsStore::SettingsError::NONE) {
        return mapSettingsErr(se);
    }

    uint8_t refCount = 0;
    re = RecordStore::listTestRefs(recordId, gRefs, RecordStore::kMaxTestsPerRecord, refCount);
    if (re != RecordStore::RecordError::NONE) return mapRecordErr(re);

    for (uint8_t i = 0; i < refCount; ++i) {
        size_t len = 0;
        RecordStore::RecordError te = TestResultStore::readStoredJson(
            recordId, gRefs[i], gTestBuf, sizeof(gTestBuf), len
        );
        if (te != RecordStore::RecordError::NONE) {
            return mapTestResultErr(te);
        }
    }
    return ReportError::NONE;
}

ReportError streamJson(const char* recordId, ChunkWriter writer, void* context) {
    if (!recordId || recordId[0] == '\0') return ReportError::INVALID_ARG;
    if (!writer) return ReportError::INVALID_ARG;
    if (!RecordStore::isReady() || !TestResultStore::isReady() || !SettingsStore::isReady()) return ReportError::NOT_READY;

    RecordStore::RecordError re = RecordStore::load(recordId, gRec);
    if (re != RecordStore::RecordError::NONE) return mapRecordErr(re);

    SettingsStore::SettingsError se = SettingsStore::load(gSet);
    if (se == SettingsStore::SettingsError::NOT_FOUND) SettingsStore::defaults(gSet);
    else if (se != SettingsStore::SettingsError::NONE) return mapSettingsErr(se);

    uint8_t refCount = 0;
    re = RecordStore::listTestRefs(recordId, gRefs, RecordStore::kMaxTestsPerRecord, refCount);
    if (re != RecordStore::RecordError::NONE) return mapRecordErr(re);

    if (!writeRaw(writer, context, "{\"reportSchemaVersion\":1,\"record\":{")) return ReportError::OUTPUT_FAILED;

    if (!writeString(writer, context, "id", gRec.id, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "createdAt", gRec.createdAt, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "updatedAt", gRec.updatedAt, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "customerName", gRec.customerName, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "companyName", gRec.companyName, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "technicianId", gRec.technicianId, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "tractorPlate", gRec.tractorPlate, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "trailerPlate", gRec.trailerPlate, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "tractorChassis", gRec.tractorChassis, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "trailerChassis", gRec.trailerChassis, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "fleetOrTrailerNo", gRec.fleetOrTrailerNo, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "vehicleSideContext", gRec.vehicleSideContext, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "trailerConnectionType", gRec.trailerConnectionType, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "diagnosisNote", gRec.diagnosisNote, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "serviceNote", gRec.serviceNote, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "fee", gRec.fee, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "reportLogoId", gRec.reportLogoId, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "status", gRec.status, true)) return ReportError::OUTPUT_FAILED;

    if (!writeRaw(writer, context, "},\"serviceProvider\":{")) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "serviceCompany", gSet.serviceCompany, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "serviceAddress", gSet.serviceAddress, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "servicePhone", gSet.servicePhone, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "serviceEmail", gSet.serviceEmail, false)) return ReportError::OUTPUT_FAILED;
    if (!writeString(writer, context, "reportLogoId", gSet.reportLogoId, true)) return ReportError::OUTPUT_FAILED;

    if (!writeRaw(writer, context, "},\"tests\":[")) return ReportError::OUTPUT_FAILED;

    for (uint8_t i = 0; i < refCount; ++i) {
        size_t len = 0;
        RecordStore::RecordError te = TestResultStore::readStoredJson(
            recordId, gRefs[i], gTestBuf, sizeof(gTestBuf), len
        );
        if (te != RecordStore::RecordError::NONE) return mapTestResultErr(te);

        size_t pos = 0;
        while (pos < len) {
            size_t n = (len - pos > kStreamChunkLen) ? kStreamChunkLen : (len - pos);
            if (!writer(gTestBuf + pos, n, context)) return ReportError::OUTPUT_FAILED;
            pos += n;
        }
        
        if (i < refCount - 1) {
            if (!writeRaw(writer, context, ",")) return ReportError::OUTPUT_FAILED;
        }
    }

    if (!writeRaw(writer, context, "]}")) return ReportError::OUTPUT_FAILED;

    return ReportError::NONE;
}

} // namespace ReportComposer