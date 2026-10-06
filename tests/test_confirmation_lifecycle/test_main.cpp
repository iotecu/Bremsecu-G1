#include <cstdio>
#include <cstdlib>

#include "confirmation_lifecycle.h"

namespace {
int gTests=0,gPassed=0,gAssertions=0;
#define ASSERT_TRUE(x) do{++gAssertions;if(!(x)){std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n",#x,__FILE__,__LINE__);std::exit(1);}}while(0)
#define TEST(name) void name(); void run_##name(){++gTests;std::printf("TEST: %s ... ",#name);name();++gPassed;std::printf("PASS\n");} void name()
using namespace ConfirmationLifecycle;

TEST(valid_same_mode_confirmation){
  Store s{}; arm(s,Type::DE_ENERGIZED,7,1000);
  ASSERT_TRUE(isUsable(s,Type::DE_ENERGIZED,7,1500,30000));
}
TEST(expired_confirmation_is_rejected){
  Store s{}; arm(s,Type::DE_ENERGIZED,7,1000);
  ASSERT_TRUE(!isUsable(s,Type::DE_ENERGIZED,7,31001,30000));
}
TEST(wrong_mode_confirmation_is_rejected){
  Store s{}; arm(s,Type::DE_ENERGIZED,7,1000);
  ASSERT_TRUE(!isUsable(s,Type::DE_ENERGIZED,8,1500,30000));
}
TEST(failed_start_cleanup_consumes_slot){
  Store s{}; arm(s,Type::DE_ENERGIZED,7,1000);
  ASSERT_TRUE(consumeForStart(s,Type::DE_ENERGIZED,8,1500,30000)==false);
  ASSERT_TRUE(!isUsable(s,Type::DE_ENERGIZED,7,1600,30000));
}
TEST(explicit_revocation_clears_slot){
  Store s{}; arm(s,Type::AXLE_SAFETY,5,1000); revoke(s,Type::AXLE_SAFETY);
  ASSERT_TRUE(!isUsable(s,Type::AXLE_SAFETY,5,1100,30000));
}
TEST(successful_confirmation_is_single_use){
  Store s{}; arm(s,Type::DE_ENERGIZED,9,1000);
  ASSERT_TRUE(consumeForStart(s,Type::DE_ENERGIZED,9,1100,30000));
  ASSERT_TRUE(!consumeForStart(s,Type::DE_ENERGIZED,9,1200,30000));
}
TEST(confirmation_types_are_independent){
  Store s{}; arm(s,Type::DE_ENERGIZED,7,1000); arm(s,Type::AXLE_SAFETY,5,1000);
  ASSERT_TRUE(consumeForStart(s,Type::DE_ENERGIZED,7,1100,30000));
  ASSERT_TRUE(isUsable(s,Type::AXLE_SAFETY,5,1100,30000));
}
TEST(clear_removes_all_slots){
  Store s{}; arm(s,Type::DE_ENERGIZED,7,1000); arm(s,Type::AXLE_SAFETY,5,1000); clear(s);
  ASSERT_TRUE(!isUsable(s,Type::DE_ENERGIZED,7,1100,30000));
  ASSERT_TRUE(!isUsable(s,Type::AXLE_SAFETY,5,1100,30000));
}
}

int main(){
  std::printf("=== Package 7: Confirmation Lifecycle Tests ===\n\n");
  run_valid_same_mode_confirmation();
  run_expired_confirmation_is_rejected();
  run_wrong_mode_confirmation_is_rejected();
  run_failed_start_cleanup_consumes_slot();
  run_explicit_revocation_clears_slot();
  run_successful_confirmation_is_single_use();
  run_confirmation_types_are_independent();
  run_clear_removes_all_slots();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
  return gPassed==gTests?0:1;
}
