#include <cstdio>
#include <cstdlib>
#include <cstring>
#include "record_json_codec.h"

namespace {
int gTests=0,gPassed=0,gAssertions=0;
#define ASSERT_TRUE(x) do{++gAssertions;if(!(x)){std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n",#x,__FILE__,__LINE__);std::exit(1);}}while(0)
#define TEST(name) void name(); void run_##name(){++gTests;std::printf("TEST: %s ... ",#name);name();++gPassed;std::printf("PASS\n");} void name()

const char* validRecord(){
  return "{"
    "\"schemaVersion\":1,"
    "\"id\":\"REC-1\","
    "\"createdAt\":\"2026-09-12T12:00:00\","
    "\"updatedAt\":\"2026-09-12T12:00:00\","
    "\"customerName\":\"A\","
    "\"companyName\":\"B\","
    "\"technicianId\":\"T1\","
    "\"tractorPlate\":\"34ABC1\","
    "\"trailerPlate\":\"34TRL1\","
    "\"tractorChassis\":\"TC\","
    "\"trailerChassis\":\"TRC\","
    "\"fleetOrTrailerNo\":\"F1\","
    "\"vehicleSideContext\":\"trailer\","
    "\"trailerConnectionType\":\"iso12098_15pin\","
    "\"diagnosisNote\":\"\","
    "\"serviceNote\":\"\","
    "\"fee\":\"\","
    "\"reportLogoId\":\"\","
    "\"status\":\"open\","
    "\"tests\":[]"
  "}";
}

TEST(valid_record_parses){
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(validRecord()),"REC-1",r)==RecordStore::RecordError::NONE);
  ASSERT_TRUE(std::strcmp(r.id,"REC-1")==0);
  ASSERT_TRUE(std::strcmp(r.trailerConnectionType,"iso12098_15pin")==0);
}

TEST(duplicate_id_rejected){
  std::string s=validRecord();
  const std::string needle="\"id\":\"REC-1\",";
  s.insert(s.find(needle)+needle.size(),"\"id\":\"EVIL\",");
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(s),"REC-1",r)==RecordStore::RecordError::MALFORMED);
}

TEST(nested_shadow_id_does_not_substitute_top_level){
  std::string s=validRecord();
  const std::string top="\"id\":\"REC-1\",";
  s.erase(s.find(top),top.size());
  s.insert(1,"\"shadow\":{\"id\":\"REC-1\"},");
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(s),"REC-1",r)==RecordStore::RecordError::MALFORMED);
}

TEST(escaped_top_level_key_rejected){
  std::string s=validRecord();
  const std::string top="\"id\":\"REC-1\"";
  s.replace(s.find(top),top.size(),"\"\\u0069d\":\"REC-1\"");
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(s),"REC-1",r)==RecordStore::RecordError::MALFORMED);
}

TEST(duplicate_schema_version_rejected){
  std::string s=validRecord();
  s.insert(1,"\"schemaVersion\":1,");
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(s),"REC-1",r)==RecordStore::RecordError::MALFORMED);
}

TEST(malformed_unknown_value_rejected){
  std::string s=validRecord();
  s.insert(s.size()-1,",\"extra\":tru");
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(s),"REC-1",r)==RecordStore::RecordError::MALFORMED);
}

TEST(trailing_garbage_rejected){
  std::string s=validRecord();s+=" garbage";
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(s),"REC-1",r)==RecordStore::RecordError::MALFORMED);
}

TEST(nonempty_tests_placeholder_rejected){
  std::string s=validRecord();
  const std::string a="\"tests\":[]";
  s.replace(s.find(a),a.size(),"\"tests\":[{}]");
  RecordStore::ServiceRecord r{};
  ASSERT_TRUE(RecordJsonCodec::parseServiceRecord(String(s),"REC-1",r)==RecordStore::RecordError::MALFORMED);
}
}

int main(){
  std::printf("=== Remediation: ServiceRecord JSON Codec Tests ===\n\n");
  run_valid_record_parses();
  run_duplicate_id_rejected();
  run_nested_shadow_id_does_not_substitute_top_level();
  run_escaped_top_level_key_rejected();
  run_duplicate_schema_version_rejected();
  run_malformed_unknown_value_rejected();
  run_trailing_garbage_rejected();
  run_nonempty_tests_placeholder_rejected();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
  return gPassed==gTests?0:1;
}
