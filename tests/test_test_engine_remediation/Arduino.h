#pragma once
#include <cstddef>
#include <cstdint>

typedef uint8_t byte;
typedef bool boolean;

extern unsigned long gMockMillis;
static inline unsigned long millis(){ return gMockMillis; }
