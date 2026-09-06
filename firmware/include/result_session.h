#pragma once
// Runtime result-session: lifecycle timestamps + confirmation snapshot +
// duplicate-save state. Observes TestEngine; owns NO hardware.
#include <cstdint>
#include "record_store.h"
#include "test_engine.h"
namespace ResultSession {
constexpr size_t kMaxTestIdLen = RecordStore::kMaxTestIdLen;
struct ConfirmationSnap { bool deEnergized=false; bool axleSafety=false; };
struct SessionState {
  bool hasCompleted=false;
  bool saved=false;
  bool timestampsValid=false;
  char testId[kMaxTestIdLen+1];
  char savedTestId[kMaxTestIdLen+1];
  char mode[RecordStore::kMaxModeLen+1];
  char startedAt[RecordStore::kMaxTsLen+1];
  char completedAt[RecordStore::kMaxTsLen+1];
  ConfirmationSnap confirmations;
};
void begin();
void poll();
void onTestAccepted(TestEngine::TestMode m, bool deEnergized, bool axleSafety);
void markSaved(const char* testId);
const SessionState& state();
} // namespace ResultSession