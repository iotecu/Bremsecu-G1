#include <cstdio>
#include <cstdlib>
#include <cmath>

#include "test_engine_domain.h"

namespace {
int gTests=0, gPassed=0, gAssertions=0;
#define ASSERT_TRUE(x) do{++gAssertions;if(!(x)){std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n",#x,__FILE__,__LINE__);std::exit(1);}}while(0)
#define ASSERT_NEAR(a,e,t) do{++gAssertions;float _a=(a),_e=(e);if(std::fabs(_a-_e)>(t)){std::printf("FAIL\n  Assertion failed: %s near %s\n",#a,#e);std::exit(1);}}while(0)
#define TEST(name) void name(); void run_##name(){++gTests;std::printf("TEST: %s ... ",#name);name();++gPassed;std::printf("PASS\n");} void name()

using MeasurementConversion::ConversionStatus;
using MeasurementConversion::MeasurementFamily;
using MeasurementConversion::PinVoltage;
using namespace TestEngineDomain;

PinVoltage cal(float v){return {v,ConversionStatus::CALIBRATED,MeasurementFamily::VEHICLE_DIVIDED};}
PinVoltage pending(){return {0.0f,ConversionStatus::PENDING,MeasurementFamily::VEHICLE_DIVIDED};}

TEST(continuity_min_threshold_is_pin_domain){
  ASSERT_TRUE(classifyContinuity(cal(0.0f),cal(2.0f),2.0f,5.0f,1.0f)==ContinuityDecision::PASS);
  ASSERT_TRUE(classifyContinuity(cal(0.0f),cal(1.99f),2.0f,5.0f,1.0f)!=ContinuityDecision::PASS);
}
TEST(continuity_max_threshold_is_pin_domain){
  ASSERT_TRUE(classifyContinuity(cal(0.0f),cal(5.0f),2.0f,5.0f,1.0f)==ContinuityDecision::PASS);
  ASSERT_TRUE(classifyContinuity(cal(0.0f),cal(5.01f),2.0f,5.0f,1.0f)!=ContinuityDecision::PASS);
}
TEST(open_max_delta_threshold_is_pin_domain){
  ASSERT_TRUE(classifyContinuity(cal(0.5f),cal(1.49f),2.0f,5.0f,1.0f)==ContinuityDecision::OPEN);
  ASSERT_TRUE(classifyContinuity(cal(0.5f),cal(1.50f),2.0f,5.0f,1.0f)==ContinuityDecision::INDETERMINATE);
}
TEST(cross_response_threshold_is_pin_domain){
  const auto low=classifyCross(cal(0.25f),cal(1.74f),1.5f);
  const auto hit=classifyCross(cal(0.25f),cal(1.75f),1.5f);
  ASSERT_TRUE(low.valid && !low.coupled);
  ASSERT_TRUE(hit.valid && hit.coupled);
  ASSERT_NEAR(hit.deltaPinV,1.5f,0.0001f);
}
TEST(external_energy_threshold_is_pin_domain){
  ASSERT_TRUE(classifyExternalEnergy(cal(10.0f),10.0f)==EnergyDecision::SAFE);
  ASSERT_TRUE(classifyExternalEnergy(cal(10.01f),10.0f)==EnergyDecision::EXTERNAL_ENERGY);
}
TEST(pending_conversion_cannot_be_classified){
  ASSERT_TRUE(classifyContinuity(pending(),cal(3.0f),2.0f,5.0f,1.0f)==ContinuityDecision::PENDING);
  ASSERT_TRUE(!classifyCross(cal(0.0f),pending(),1.5f).valid);
  ASSERT_TRUE(classifyExternalEnergy(pending(),10.0f)==EnergyDecision::PENDING);
}
}

int main(){
 std::printf("=== Package 5: TestEngine Pin-Domain Tests ===\n\n");
 run_continuity_min_threshold_is_pin_domain();
 run_continuity_max_threshold_is_pin_domain();
 run_open_max_delta_threshold_is_pin_domain();
 run_cross_response_threshold_is_pin_domain();
 run_external_energy_threshold_is_pin_domain();
 run_pending_conversion_cannot_be_classified();
 std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
 return gPassed==gTests?0:1;
}
