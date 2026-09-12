#include <cstdio>
#include <cstdlib>
#include <cstring>

#include "test_engine.h"
#include "safety_interlocks.h"
#include "adc_service.h"
#include "calibration_runtime.h"
#include "ina226_service.h"
#include "pulse_monitor.h"
#include "measurement_conversion.h"

unsigned long gMockMillis = 0;

namespace {
int gTests=0,gPassed=0,gAssertions=0;
#define ASSERT_TRUE(x) do{++gAssertions;if(!(x)){std::printf("FAIL\n  Assertion failed: %s\n  at %s:%d\n",#x,__FILE__,__LINE__);std::exit(1);}}while(0)
#define TEST(name) void name(); void run_##name(){++gTests;std::printf("TEST: %s ... ",#name);name();++gPassed;std::printf("PASS\n");} void name()

bool gAdcReady=true;
bool gInaReady=true;
bool gInaCalibration=true;
bool gFailNextAdc=false;
Channels::AdcChannel gFailChannel=Channels::kNoChannel;
float gAdcNodeV=0.0f;
float gInaCurrentA=0.0f;
bool gInaSampleValid=true;
uint32_t gFaultSafeCalls=0;
uint32_t gLoadApplyCalls=0;
uint32_t gCableApplyCalls=0;
MeasurementConversion::CalibrationTable gTable{};

void resetMocks(){
  gMockMillis=0;
  gAdcReady=true;
  gInaReady=true;
  gInaCalibration=true;
  gFailNextAdc=false;
  gFailChannel=Channels::kNoChannel;
  gAdcNodeV=0.0f;
  gInaCurrentA=0.0f;
  gInaSampleValid=true;
  gFaultSafeCalls=0;
  gLoadApplyCalls=0;
  gCableApplyCalls=0;
  for(uint8_t i=0;i<Channels::kAdcChannelCount;++i){
    gTable.channel[i].model=MeasurementConversion::CalibrationModel::LINEAR;
    gTable.channel[i].slope=1.0f;
    gTable.channel[i].offset=0.0f;
  }
}

TEST(default_cable_start_is_fail_closed){
  resetMocks();
  TestEngine::begin();
  TestEngine::TestStartParams p;
  p.mode=TestEngine::TestMode::CABLE_ISO7638;
  p.enabledPinMask=1u;
  ASSERT_TRUE(!TestEngine::start(p));
  ASSERT_TRUE(TestEngine::abortReason()==TestEngine::AbortReason::CALIBRATION_PENDING);
  ASSERT_TRUE(!TestEngine::isActive());
  ASSERT_TRUE(gCableApplyCalls==0u);
}

TEST(load_settle_runs_first_watchdog_sample){
  resetMocks();
  TestEngine::TestEngineConfig cfg;
  cfg.loadOvercurrentMaxA=5.0f; // test fixture authority only
  cfg.loadOnSettleMs=100;
  cfg.loadSampleIntervalMs=20;
  TestEngine::begin(cfg);
  TestEngine::TestStartParams p;
  p.mode=TestEngine::TestMode::LAMP_ISO12098;
  p.lampPin=1;
  ASSERT_TRUE(TestEngine::start(p));
  TestEngine::step(); // SAFE_CHECK: prescan + energize load
  ASSERT_TRUE(TestEngine::state()==TestEngine::TestState::LOAD_ON_SETTLE);
  ASSERT_TRUE(gLoadApplyCalls==1u);
  gInaCurrentA=10.0f;
  gMockMillis=20;
  TestEngine::step();
  ASSERT_TRUE(TestEngine::state()==TestEngine::TestState::FAULT);
  ASSERT_TRUE(TestEngine::abortReason()==TestEngine::AbortReason::OVERCURRENT);
  ASSERT_TRUE(gFaultSafeCalls>=2u); // start safe reset + overcurrent fault-safe
}

TEST(gnd_second_reference_adc_failure_faults){
  resetMocks();
  TestEngine::begin();
  TestEngine::TestStartParams p;
  p.mode=TestEngine::TestMode::ISO7638_VOLTAGE;
  ASSERT_TRUE(TestEngine::start(p));
  TestEngine::step(); // SAFE_CHECK -> SWEEP, K6 on
  ASSERT_TRUE(TestEngine::state()==TestEngine::TestState::SWEEP);

  int guard=0;
  while(TestEngine::state()!=TestEngine::TestState::SWEEP_GND_OFF && guard++<10){
    TestEngine::step();
  }
  ASSERT_TRUE(TestEngine::state()==TestEngine::TestState::SWEEP_GND_OFF);

  gFailChannel=Channels::AdcChannel::MUX_7P_GND1;
  gFailNextAdc=true;
  gMockMillis+=25;
  TestEngine::step();
  ASSERT_TRUE(TestEngine::state()==TestEngine::TestState::FAULT);
  ASSERT_TRUE(TestEngine::abortReason()==TestEngine::AbortReason::SERVICE_FAULT);
  ASSERT_TRUE(TestEngine::results().voltCount==2u);
}
}

namespace SafetyInterlocks {
void begin(){}
void clearCanSelection(){}
bool energizeCanRelay(int){return true;}
void faultSafe(){++gFaultSafeCalls;}
bool applyCableTestOutput(uint32_t){++gCableApplyCalls;return true;}
bool applyMeasurementReference(uint32_t){return true;}
bool applyLoadOutput(uint32_t){++gLoadApplyCalls;return true;}
}

namespace AdcService {
bool begin(const AdcConfig&){gAdcReady=true;return true;}
bool isReady(){return gAdcReady;}
AdcError lastError(){return AdcError::NONE;}
bool readRaw(Channels::AdcChannel,int16_t&){return false;}
bool readNodeVolts(Channels::AdcChannel ch,float& out){
  if(gFailNextAdc && ch==gFailChannel){gFailNextAdc=false;return false;}
  out=gAdcNodeV;return true;
}
void scanAllNodes(NodeSample*,uint8_t){}
}

namespace CalibrationRuntime {
bool begin(){return true;}
Status status(){return Status::READY;}
bool isReady(){return true;}
CalibrationPayload::DecodeStatus payloadStatus(){return CalibrationPayload::DecodeStatus::OK;}
uint32_t calibrationGeneration(){return 1;}
const MeasurementConversion::CalibrationTable& table(){return gTable;}
bool saveAndActivate(const MeasurementConversion::CalibrationTable&,uint32_t){return false;}
}

namespace Ina226Service {
bool begin(const Ina226Config&){gInaReady=true;return true;}
bool isReady(){return gInaReady;}
Ina226Error lastError(){return Ina226Error::NONE;}
bool readBusVoltage(float&){return false;}
bool readShuntVoltage(float&){return false;}
bool readRawCurrent(int16_t&){return false;}
bool readCurrent(float&){return false;}
bool isCalibrationApplied(){return gInaCalibration;}
bool applyCalibration(uint32_t,uint32_t){gInaCalibration=true;return true;}
bool sample(Ina226Sample& out){
  if(!gInaSampleValid)return false;
  out.busVolts=24.0f;out.busValid=true;
  out.shuntVolts=0.01f;out.shuntValid=true;
  out.rawCurrent=0;out.rawValid=true;
  out.currentA=gInaCurrentA;out.currentValid=true;
  out.error=Ina226Error::NONE;
  return true;
}
}

namespace PulseMonitor {
bool begin(const PulseConfig&){return true;}
bool isReady(){return true;}
bool snapshot(PulseInput,PulseEvidence&){return false;}
bool hasRecentActivity(PulseInput){return false;}
void reset(PulseInput){}
void resetAll(){}
}

int main(){
  std::printf("=== Remediation: TestEngine State-Machine Tests ===\n\n");
  run_default_cable_start_is_fail_closed();
  run_load_settle_runs_first_watchdog_sample();
  run_gnd_second_reference_adc_failure_faults();
  std::printf("\n=== Results: %d/%d test cases passed, %d assertions ===\n",gPassed,gTests,gAssertions);
  return gPassed==gTests?0:1;
}
