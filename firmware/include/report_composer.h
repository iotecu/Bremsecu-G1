#pragma once
// Read-only canonical report composition.
// Streams JSON incrementally to avoid large heap allocations.
#include <cstdint>
#include <cstddef>

namespace ReportComposer {

enum class ReportError : uint8_t {
  NONE = 0,
  NOT_READY,
  INVALID_ARG,
  NOT_FOUND,
  MALFORMED,
  READ_FAILED,
  OUTPUT_FAILED
};

using ChunkWriter = bool (*)(const char* data, size_t len, void* context);

// Preflight validation: ensures record, settings, and all referenced test results
// are present and valid. Must pass before streaming begins.
ReportError validate(const char* recordId);

// Streams the canonical report JSON.
// Returns OUTPUT_FAILED if the writer callback returns false.
ReportError streamJson(const char* recordId, ChunkWriter writer, void* context);

} // namespace ReportComposer