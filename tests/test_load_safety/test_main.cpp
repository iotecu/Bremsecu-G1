#include <cstdio>
#include <cstdlib>

#include "load_safety.h"

namespace {
int gTests=0,gPassed=0,gAssertions=0;
#define ASSERT_TRUE(x) do{++gAssertions;if(!(x)){std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n",#x,__FILE__,__LINE__);std::exit(1);}}while(0)
#define TEST(name) void name(); void run_##name(){++gTests;std::printf("TEST: %s ... ",#name);name();++gPassed;std::printf("PASS\n");} void name()
using namespace LoadSafety;

TEST(calibration_is_required_before_load_authority){
  ASSERT_TRUE(authorityStatus(false,5.0f)==AuthorityStatus::CURRENT_CALIBRATION_PENDING);
}
TEST(overcurrent_limit_is_required_before_load_authority){
  ASSERT_TRUE(authorityStatus(true,0.0f)==AuthorityStatus::OVERCURRENT_LIMIT_PENDING);
  ASSERT_TRUE(authorityStatus(true,-1.0f)==AuthorityStatus::OVERCURRENT_LIMIT_PENDING);
}
TEST(valid_calibration_and_limit_enable_authority){
  ASSERT_TRUE(authorityStatus(true,5.0f)==AuthorityStatus::READY);
}
TEST(current_at_limit_is_safe){
  ASSERT_TRUE(classifyCurrent(true,5.0f,5.0f)==CurrentDecision::SAFE);
}
TEST(current_above_limit_trips){
  ASSERT_TRUE(classifyCurrent(true,5.01f,5.0f)==CurrentDecision::OVERCURRENT);
}
TEST(invalid_current_evidence_fails_closed){
  ASSERT_TRUE(classifyCurrent(false,0.0f,5.0f)==CurrentDecision::INVALID);
  ASSERT_TRUE(classifyCurrent(true,-0.1f,5.0f)==CurrentDecision::INVALID);
}
TEST(timeout_boundary_is_inclusive){
  ASSERT_TRUE(!timeoutReached(1000,5999,5000));
  ASSERT_TRUE(timeoutReached(1000,6000,5000));
}
TEST(timeout_handles_millis_wraparound){
  ASSERT_TRUE(!timeoutReached(0xFFFFFFF0u,0x00000005u,22u));
  ASSERT_TRUE(timeoutReached(0xFFFFFFF0u,0x00000006u,22u));
}
TEST(zero_timeout_is_immediate_fail_safe){
  ASSERT_TRUE(timeoutReached(100,100,0));
}
}

int main(){
  std::printf("=== Package 8: Load Safety Tests ===\n\n");
  run_calibration_is_required_before_load_authority();
  run_overcurrent_limit_is_required_before_load_authority();
  run_valid_calibration_and_limit_enable_authority();
  run_current_at_limit_is_safe();
  run_current_above_limit_trips();
  run_invalid_current_evidence_fails_closed();
  run_timeout_boundary_is_inclusive();
  run_timeout_handles_millis_wraparound();
  run_zero_timeout_is_immediate_fail_safe();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
  return gPassed==gTests?0:1;
}
