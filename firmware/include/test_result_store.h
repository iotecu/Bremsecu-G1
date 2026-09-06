#pragma once
// Durable TestResult evidence files. Serialization + storage + read-only retrieval.
#include "record_store.h"
#include "result_session.h"
namespace TestResultStore {
constexpr size_t kMaxTestJsonLen = 6144; // PROVISIONAL
bool begin();
bool isReady();
struct SaveOutcome {
  char testId[RecordStore::kMaxTestIdLen+1];
  bool idempotentDuplicate=false;
};
RecordStore::RecordError writeCompleted(const char* recordId, const char* operatorId,
                                        const char* technicianNote, SaveOutcome& out);

// Reads the stored TestResult JSON for a given TestRef.
// Validates identity (id, mode, completedAt) against the ref.
// Returns MALFORMED if file missing or identity mismatch.
// outLen is the raw JSON byte count (excluding NUL).
RecordStore::RecordError readStoredJson(
    const char* recordId,
    const RecordStore::TestRef& ref,
    char* out,
    size_t capacity,
    size_t& outLen
);
} // namespace TestResultStore