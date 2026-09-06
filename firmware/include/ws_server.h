#pragma once
namespace WsServer {
bool begin();
void poll();
bool isReady();
void notifyRecordUpdated();
void notifyRecordUpdated(const char* recordId, const char* testId);
} // namespace WsServer