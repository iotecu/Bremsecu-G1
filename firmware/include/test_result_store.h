#pragma once
// Durable TestResult evidence files. Serialization + storage only; no
// TestEngine control, no re-classification.
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
} // namespace TestResultStore