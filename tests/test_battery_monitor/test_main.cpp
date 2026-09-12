#include <cstdio>
#include <cstdlib>
#include <cmath>

#include "battery_monitor.h"
#include "adc_service.h"
#include "battery_ina226_service.h"

namespace {
int gTests=0,gPassed=0,gAssertions=0;
#define ASSERT_TRUE(x) do{++gAssertions;if(!(x)){std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n",#x,__FILE__,__LINE__);std::exit(1);}}while(0)
#define ASSERT_NEAR(a,b,e) do{++gAssertions;float _aa=(a),_bb=(b);if(std::fabs(_aa-_bb)>(e)){std::printf("FAIL\n  Assertion failed: |%s-%s| <= %s\n  at %s:%d\n",#a,#b,#e,__FILE__,__LINE__);std::exit(1);}}while(0)
#define TEST(name) void name(); void run_##name(){++gTests;std::printf("TEST: %s ... ",#name);name();++gPassed;std::printf("PASS\n");} void name()

bool gAdcOk=true;
float gNodeV=1.0f;
bool gInaReady=true;
bool gBusValid=true;
float gBusV=12.0f;
bool gShuntValid=true;
float gShuntV=0.100f;
Channels::MuxCoord gLastCoord={0,0};
uint8_t gBeginAddress=0;

void reset(){
  gAdcOk=true;gNodeV=1.0f;gInaReady=true;gBusValid=true;gBusV=12.0f;
  gShuntValid=true;gShuntV=0.100f;gLastCoord={0,0};gBeginAddress=0;
}

TEST(authority_constants){
  ASSERT_TRUE(BatteryMonitor::kBatteryMuxCoord.ain==3u);
  ASSERT_TRUE(BatteryMonitor::kBatteryMuxCoord.step==4u);
  ASSERT_NEAR(BatteryMonitor::kDividerScale,11.0f,0.0001f);
  ASSERT_NEAR(BatteryMonitor::kShuntOhms,0.010f,0.000001f);
  ASSERT_TRUE(BatteryIna226Service::kI2cAddress==0x41u);
}

TEST(conversion_math){
  ASSERT_NEAR(BatteryMonitor::batteryVoltageFromNode(1.0f),11.0f,0.0001f);
  ASSERT_NEAR(BatteryMonitor::batteryCurrentFromShunt(0.100f),10.0f,0.0001f);
  ASSERT_NEAR(BatteryMonitor::batteryCurrentFromShunt(-0.020f),-2.0f,0.0001f);
}

TEST(valid_telemetry){
  reset();
  ASSERT_TRUE(BatteryMonitor::begin());
  ASSERT_TRUE(gBeginAddress==0x41u);
  const auto t=BatteryMonitor::read();
  ASSERT_TRUE(gLastCoord.ain==3u&&gLastCoord.step==4u);
  ASSERT_TRUE(t.voltageValid);
  ASSERT_NEAR(t.voltageV,11.0f,0.0001f);
  ASSERT_TRUE(t.currentValid);
  ASSERT_NEAR(t.currentA,10.0f,0.0001f);
  ASSERT_TRUE(t.powerValid);
  ASSERT_NEAR(t.powerW,110.0f,0.001f);
  ASSERT_TRUE(t.inaBusVoltageValid);
  ASSERT_NEAR(t.inaBusVoltageV,12.0f,0.0001f);
  ASSERT_TRUE(t.shuntVoltageValid);
}

TEST(missing_sources_fail_explicitly){
  reset();
  gAdcOk=false;
  gInaReady=false;
  const auto t=BatteryMonitor::read();
  ASSERT_TRUE(!t.voltageValid);
  ASSERT_TRUE(!t.currentValid);
  ASSERT_TRUE(!t.powerValid);
  ASSERT_TRUE(!t.inaBusVoltageValid);
  ASSERT_TRUE(!t.shuntVoltageValid);
  ASSERT_TRUE(t.error==BatteryMonitor::Error::PARTIAL);
}
}

namespace AdcService {
bool begin(const AdcConfig&){return true;}
bool isReady(){return true;}
AdcError lastError(){return AdcError::NONE;}
bool readRaw(Channels::AdcChannel,int16_t&){return false;}
bool readNodeVolts(Channels::AdcChannel,float&){return false;}
bool readMuxNodeVolts(Channels::MuxCoord coord,float& out){gLastCoord=coord;if(!gAdcOk)return false;out=gNodeV;return true;}
void scanAllNodes(NodeSample*,uint8_t){}
}

namespace BatteryIna226Service {
bool begin(uint8_t addr){gBeginAddress=addr;return gInaReady;}
bool isReady(){return gInaReady;}
Error lastError(){return gInaReady?Error::NONE:Error::NOT_READY;}
uint8_t i2cAddress(){return gBeginAddress;}
bool readBusVoltage(float&){return false;}
bool readShuntVoltage(float&){return false;}
bool sample(Sample& out){out=Sample{};if(!gInaReady){out.error=Error::NOT_READY;return false;}out.busVolts=gBusV;out.busValid=gBusValid;out.shuntVolts=gShuntV;out.shuntValid=gShuntValid;return gBusValid||gShuntValid;}
}

int main(){
  std::printf("=== Battery Monitor Tests ===\n\n");
  run_authority_constants();
  run_conversion_math();
  run_valid_telemetry();
  run_missing_sources_fail_explicitly();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
  return gPassed==gTests?0:1;
}
