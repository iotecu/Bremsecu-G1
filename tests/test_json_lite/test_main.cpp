#include <cstdio>
#include <cstdlib>
#include "json_lite.h"

namespace {
int gTests=0,gPassed=0,gAssertions=0;
#define ASSERT_TRUE(x) do{++gAssertions;if(!(x)){std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n",#x,__FILE__,__LINE__);std::exit(1);}}while(0)
#define TEST(name) void name(); void run_##name(){++gTests;std::printf("TEST: %s ... ",#name);name();++gPassed;std::printf("PASS\n");} void name()

TEST(valid_top_level_values){
  String s; bool b=false; uint32_t u=0;
  ASSERT_TRUE(JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"confirm\":true,\"id\":42}"),"mode",s));
  ASSERT_TRUE(s=="iso7638_voltage");
  ASSERT_TRUE(JsonLite::getBool(String("{\"confirm\":true}"),"confirm",b)&&b);
  ASSERT_TRUE(JsonLite::getUint32(String("{\"id\":4294967295}"),"id",u)&&u==4294967295u);
}

TEST(nested_or_string_keys_do_not_match){
  ASSERT_TRUE(!JsonLite::hasKey(String("{\"note\":\"\\\"mode\\\":\\\"evil\\\"\"}"),"mode"));
  ASSERT_TRUE(!JsonLite::hasKey(String("{\"nested\":{\"mode\":\"evil\"}}"),"mode"));
}

TEST(duplicate_requested_key_fails_closed){
  String s;
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"a\",\"mode\":\"b\"}"),"mode",s));
}

TEST(escaped_top_level_keys_fail_closed){
  String s; bool b=false; uint32_t u=0;
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"safe\",\"m\\u006fde\":\"other\"}"),"mode",s));
  ASSERT_TRUE(!JsonLite::hasKey(String("{\"\\u006dode\":\"other\"}"),"mode"));
  ASSERT_TRUE(!JsonLite::getBool(String("{\"confirm\":true,\"conf\\u0069rm\":false}"),"confirm",b));
  ASSERT_TRUE(!JsonLite::getUint32(String("{\"id\":1,\"\\u0069d\":2}"),"id",u));
}

TEST(trailing_garbage_and_bad_escape_fail){
  String s;
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"ok\"} garbage"),"mode",s));
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"bad\\q\"}"),"mode",s));
}

TEST(invalid_boolean_token_fails){
  bool b=false;
  ASSERT_TRUE(!JsonLite::getBool(String("{\"x\":trueXYZ}"),"x",b));
}

TEST(non_json_or_overflow_uint32_fails){
  uint32_t u=0;
  ASSERT_TRUE(!JsonLite::getUint32(String("{\"x\":0x10}"),"x",u));
  ASSERT_TRUE(!JsonLite::getUint32(String("{\"x\":+1}"),"x",u));
  ASSERT_TRUE(!JsonLite::getUint32(String("{\"x\":-1}"),"x",u));
  ASSERT_TRUE(!JsonLite::getUint32(String("{\"x\":01}"),"x",u));
  ASSERT_TRUE(!JsonLite::getUint32(String("{\"x\":4294967296}"),"x",u));
}

TEST(top_level_value_wins_over_nested_same_name){
  uint32_t u=0;
  ASSERT_TRUE(JsonLite::getUint32(String(" { \"x\" : 0, \"arr\":[1,{\"x\":9}] } "),"x",u));
  ASSERT_TRUE(u==0u);
}

TEST(malformed_unknown_primitive_fails_whole_document){
  String s;
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"extra\":tru}"),"mode",s));
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"extra\":NaN}"),"mode",s));
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"extra\":+1}"),"mode",s));
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"extra\":01}"),"mode",s));
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"extra\":1e}"),"mode",s));
  ASSERT_TRUE(!JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"extra\":1.}"),"mode",s));
}

TEST(valid_unknown_json_values_are_skipped){
  String s;
  ASSERT_TRUE(JsonLite::getString(String("{\"mode\":\"iso7638_voltage\",\"a\":null,\"b\":-1.25e+2,\"c\":[true,false,{\"x\":0}]}"),"mode",s));
  ASSERT_TRUE(s=="iso7638_voltage");
}

TEST(optional_string_distinguishes_absent_from_invalid){
  String s;
  ASSERT_TRUE(JsonLite::getOptionalString(String("{\"x\":\"ok\"}"),"missing",s)==JsonLite::FieldStatus::ABSENT);
  ASSERT_TRUE(JsonLite::getOptionalString(String("{\"x\":\"ok\",\"bad\":tru}"),"missing",s)==JsonLite::FieldStatus::INVALID);
  ASSERT_TRUE(JsonLite::getOptionalString(String("{\"x\":\"ok\"}"),"x",s)==JsonLite::FieldStatus::OK);
  ASSERT_TRUE(s=="ok");
}
}

int main(){
  std::printf("=== Package 10: JSON Lite Tests ===\n\n");
  run_valid_top_level_values();
  run_nested_or_string_keys_do_not_match();
  run_duplicate_requested_key_fails_closed();
  run_escaped_top_level_keys_fail_closed();
  run_trailing_garbage_and_bad_escape_fail();
  run_invalid_boolean_token_fails();
  run_non_json_or_overflow_uint32_fails();
  run_top_level_value_wins_over_nested_same_name();
  run_malformed_unknown_primitive_fails_whole_document();
  run_valid_unknown_json_values_are_skipped();
  run_optional_string_distinguishes_absent_from_invalid();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
  return gPassed==gTests?0:1;
}
