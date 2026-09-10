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
}

int main(){
  std::printf("=== Package 10: JSON Lite Tests ===\n\n");
  run_valid_top_level_values();
  run_nested_or_string_keys_do_not_match();
  run_duplicate_requested_key_fails_closed();
  run_trailing_garbage_and_bad_escape_fail();
  run_invalid_boolean_token_fails();
  run_non_json_or_overflow_uint32_fails();
  run_top_level_value_wins_over_nested_same_name();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
  return gPassed==gTests?0:1;
}
