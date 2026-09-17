#pragma once
#include <cstddef>
#include <cstdint>
#include <string>

typedef uint8_t byte;
typedef bool boolean;

class String {
 public:
  String() = default;
  String(const char* s) : value_(s ? s : "") {}
  String(const std::string& s) : value_(s) {}
  String& operator=(const char* s){value_=s?s:"";return *this;}
  size_t length() const{return value_.size();}
  const char* c_str() const{return value_.c_str();}
  char operator[](size_t i) const{return value_[i];}
  char& operator[](size_t i){return value_[i];}
  String& operator+=(char c){value_+=c;return *this;}
  bool operator==(const char* s) const{return value_==(s?s:"");}
 private:
  std::string value_;
};

static inline unsigned long millis(){return 0;}
