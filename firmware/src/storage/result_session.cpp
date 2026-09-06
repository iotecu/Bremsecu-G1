#include "result_session.h"
#include "rtc_service.h"
#include <string.h>
#include <stdio.h>
#include <Arduino.h>

namespace ResultSession {
namespace {
SessionState g;
bool gPrevActive=false;
uint16_t gSeq=0;

const char* modeStr(TestEngine::TestMode m){
  switch(m){
    case TestEngine::TestMode::ISO7638_VOLTAGE:return "iso7638_voltage";
    case TestEngine::TestMode::ISO12098_VOLTAGE:return "iso12098_voltage";
    case TestEngine::TestMode::CABLE_ISO7638:return "cable_iso7638";
    case TestEngine::TestMode::CABLE_ISO12098:return "cable_iso12098";
    case TestEngine::TestMode::LAMP_ISO12098:return "lamp_iso12098";
    case TestEngine::TestMode::AXLE_LIFT:return "axle_lift";
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR:return "can_termination_iso7638_tractor";
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER:return "can_termination_iso7638_trailer";
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR:return "can_termination_iso12098_tractor";
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER:return "can_termination_iso12098_trailer";
    default:return "unknown";  // never alias an unknown enum to a real mode
  }
}
bool grabTs(char*out,size_t l){
  RtcService::RtcDateTime d;
  if(!RtcService::isReady()||!RtcService::readDateTime(d))return false;
  int n=snprintf(out,l,"%04u-%02u-%02uT%02u:%02u:%02u",(unsigned)d.year,(unsigned)d.month,(unsigned)d.day,(unsigned)d.hour,(unsigned)d.minute,(unsigned)d.second);
  return n>0&&(size_t)n<l;
}
} // namespace

void begin(){ memset(&g,0,sizeof(g)); gPrevActive=false; }

void onTestAccepted(TestEngine::TestMode m,bool de,bool ax){
  ++gSeq;
  unsigned r=(unsigned)(esp_random()&0xFFFFu);
  snprintf(g.testId,sizeof(g.testId),"T-%04X-%04X",(unsigned)gSeq,r);
  strncpy(g.mode,modeStr(m),sizeof(g.mode)-1); g.mode[sizeof(g.mode)-1]='\0';
  g.timestampsValid = grabTs(g.startedAt,sizeof(g.startedAt));
  g.completedAt[0]='\0';
  g.confirmations.deEnergized=de; g.confirmations.axleSafety=ax;
  g.hasCompleted=false; g.saved=false; g.savedTestId[0]='\0';
}

void poll(){
  const bool active=TestEngine::isActive();
  const TestEngine::TestState st=TestEngine::state();
  if(gPrevActive && !active){
    if(st==TestEngine::TestState::COMPLETE){
      bool ok=grabTs(g.completedAt,sizeof(g.completedAt));
      g.timestampsValid = g.timestampsValid && ok;
      g.hasCompleted=true; g.saved=false;
    } else {
      g.hasCompleted=false;
    }
  }
  gPrevActive=active;
}

void markSaved(const char*id){
  g.saved=true;
  strncpy(g.savedTestId,id,sizeof(g.savedTestId)-1);
  g.savedTestId[sizeof(g.savedTestId)-1]='\0';
}

const SessionState& state(){ return g; }

} // namespace ResultSession