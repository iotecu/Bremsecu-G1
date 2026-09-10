#!/usr/bin/env python3
from pathlib import Path

path = Path("firmware/src/api/api_server.cpp")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '#include "report_composer.h"\n',
    '#include "report_composer.h"\n#include "confirmation_lifecycle.h"\n',
    "include",
)

replace_once(
    'struct ConfirmationStore{bool deEnergized=false;bool axleSafety=false;} gConf;\n',
    'ConfirmationLifecycle::Store gConf;\n',
    "confirmation store",
)

old_helpers = '''String modeStr(TestEngine::TestMode m){switch(m){case TestEngine::TestMode::ISO7638_VOLTAGE:return "iso7638_voltage";case TestEngine::TestMode::ISO12098_VOLTAGE:return "iso12098_voltage";case TestEngine::TestMode::CABLE_ISO7638:return "cable_iso7638";case TestEngine::TestMode::CABLE_ISO12098:return "cable_iso12098";case TestEngine::TestMode::LAMP_ISO12098:return "lamp_iso12098";case TestEngine::TestMode::AXLE_LIFT:return "axle_lift";case TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR:return "can_termination_iso7638_tractor";case TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER:return "can_termination_iso7638_trailer";case TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR:return "can_termination_iso12098_tractor";case TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER:return "can_termination_iso12098_trailer";default:return "unknown";}}
bool isCableMode(TestEngine::TestMode m){return m==TestEngine::TestMode::CABLE_ISO7638||m==TestEngine::TestMode::CABLE_ISO12098;}
bool isTermMode(TestEngine::TestMode m){return m>=TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR&&m<=TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;}
bool optBoolDefaultFalse(const String&b,const char*k,bool&o,bool&rej){rej=false;if(!JsonLite::hasKey(b,k)){o=false;return true;}if(!JsonLite::getBool(b,k,o)){rej=true;}return !rej;}
'''

new_helpers = '''String modeStr(TestEngine::TestMode m){switch(m){case TestEngine::TestMode::ISO7638_VOLTAGE:return "iso7638_voltage";case TestEngine::TestMode::ISO12098_VOLTAGE:return "iso12098_voltage";case TestEngine::TestMode::CABLE_ISO7638:return "cable_iso7638";case TestEngine::TestMode::CABLE_ISO12098:return "cable_iso12098";case TestEngine::TestMode::LAMP_ISO12098:return "lamp_iso12098";case TestEngine::TestMode::AXLE_LIFT:return "axle_lift";case TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR:return "can_termination_iso7638_tractor";case TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER:return "can_termination_iso7638_trailer";case TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR:return "can_termination_iso12098_tractor";case TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER:return "can_termination_iso12098_trailer";default:return "unknown";}}
bool parseTestMode(const String& in, TestEngine::TestMode& mode){
  if(in=="iso7638_voltage")mode=TestEngine::TestMode::ISO7638_VOLTAGE;
  else if(in=="iso12098_voltage")mode=TestEngine::TestMode::ISO12098_VOLTAGE;
  else if(in=="cable_iso7638")mode=TestEngine::TestMode::CABLE_ISO7638;
  else if(in=="cable_iso12098")mode=TestEngine::TestMode::CABLE_ISO12098;
  else if(in=="lamp_iso12098")mode=TestEngine::TestMode::LAMP_ISO12098;
  else if(in=="axle_lift")mode=TestEngine::TestMode::AXLE_LIFT;
  else if(in=="can_termination_iso7638_tractor")mode=TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR;
  else if(in=="can_termination_iso7638_trailer")mode=TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER;
  else if(in=="can_termination_iso12098_tractor")mode=TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR;
  else if(in=="can_termination_iso12098_trailer")mode=TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;
  else return false;
  return true;
}
bool isCableMode(TestEngine::TestMode m){return m==TestEngine::TestMode::CABLE_ISO7638||m==TestEngine::TestMode::CABLE_ISO12098;}
bool isTermMode(TestEngine::TestMode m){return m>=TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR&&m<=TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;}
bool optBoolDefaultFalse(const String&b,const char*k,bool&o,bool&rej){rej=false;if(!JsonLite::hasKey(b,k)){o=false;return true;}if(!JsonLite::getBool(b,k,o)){rej=true;}return !rej;}
'''
replace_once(old_helpers, new_helpers, "mode helpers")

start_begin = text.index('void handleTestStart(){')
stop_begin = text.index('void handleTestStop(){', start_begin)
confirm_begin = text.index('void handleTestConfirm(){', stop_begin)
req_begin = text.index('\nenum ReqStr{', confirm_begin)

new_handlers = r'''void handleTestStart(){
  const String body=gServer.arg("plain");
  String mIn;
  if(!JsonLite::getString(body,"mode",mIn)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  TestEngine::TestMode mode;
  if(!parseTestMode(mIn,mode)){sendError(400,"INVALID_TEST_MODE","error.invalid_test_mode");return;}

  TestEngine::TestStartParams p;p.mode=mode;
  if(isCableMode(mode)){uint32_t m=0;if(JsonLite::getUint32(body,"enabledPinMask",m))p.enabledPinMask=m;}
  if(mode==TestEngine::TestMode::LAMP_ISO12098){uint32_t pin=0;if(!JsonLite::getUint32(body,"lampPin",pin)||pin<1||pin>15){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}p.lampPin=(uint8_t)pin;}

  // Confirmations are consumed by this start attempt before TestEngine decides
  // whether the attempt succeeds. Explicit request-body false is revocation,
  // never "false OR stale stored true".
  if(isTermMode(mode)){
    const bool hasExplicit=JsonLite::hasKey(body,"deEnergizedConfirmed");
    if(hasExplicit){
      bool v=false;
      if(!JsonLite::getBool(body,"deEnergizedConfirmed",v)){ConfirmationLifecycle::revoke(gConf,ConfirmationLifecycle::Type::DE_ENERGIZED);sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
      ConfirmationLifecycle::revoke(gConf,ConfirmationLifecycle::Type::DE_ENERGIZED);
      p.deEnergizedConfirmed=v;
    }else{
      p.deEnergizedConfirmed=ConfirmationLifecycle::consumeForStart(gConf,ConfirmationLifecycle::Type::DE_ENERGIZED,(uint8_t)mode,millis());
    }
  }
  if(mode==TestEngine::TestMode::AXLE_LIFT){
    const bool hasExplicit=JsonLite::hasKey(body,"axleSafetyConfirmed");
    if(hasExplicit){
      bool v=false;
      if(!JsonLite::getBool(body,"axleSafetyConfirmed",v)){ConfirmationLifecycle::revoke(gConf,ConfirmationLifecycle::Type::AXLE_SAFETY);sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
      ConfirmationLifecycle::revoke(gConf,ConfirmationLifecycle::Type::AXLE_SAFETY);
      p.axleSafetyConfirmed=v;
    }else{
      p.axleSafetyConfirmed=ConfirmationLifecycle::consumeForStart(gConf,ConfirmationLifecycle::Type::AXLE_SAFETY,(uint8_t)mode,millis());
    }
  }

  if(TestEngine::isActive()){
    // A start attempt cannot preserve any safety confirmation for retry.
    ConfirmationLifecycle::clear(gConf);
    sendError(409,"TEST_ALREADY_ACTIVE","error.test_already_active");return;
  }
  if(!TestEngine::start(p)){
    ConfirmationLifecycle::clear(gConf);
    switch(TestEngine::abortReason()){
      case TestEngine::AbortReason::INTERLOCK_REJECTED:sendError(409,"SAFETY_INTERLOCK","error.safety_interlock");return;
      case TestEngine::AbortReason::EXTERNAL_ENERGY:sendError(409,"EXTERNAL_ENERGY_DETECTED","error.external_energy_detected");return;
      case TestEngine::AbortReason::SERVICE_FAULT:sendError(500,"SENSOR_ERROR","error.sensor_error");return;
      case TestEngine::AbortReason::CALIBRATION_PENDING:sendError(409,"ENGINEERING_VALUE_PENDING","error.engineering_value_pending");return;
      case TestEngine::AbortReason::PRECONDITION:sendError(409,"PRECONDITION_FAILED","error.precondition_failed");return;
      default:sendError(409,"START_REJECTED","error.start_rejected");return;
    }
  }
  ResultSession::onTestAccepted(mode,p.deEnergizedConfirmed,p.axleSafetyConfirmed);
  ConfirmationLifecycle::clear(gConf);
  sendOk(",\"mode\":\""+mIn+"\"");
}

void handleTestStop(){if(TestEngine::isActive())TestEngine::stop();ConfirmationLifecycle::clear(gConf);sendOk(",\"active\":false");}

void handleTestConfirm(){
  const String body=gServer.arg("plain");
  String type;if(!JsonLite::getString(body,"type",type)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  ConfirmationLifecycle::Type confirmType;
  if(type=="de_energized")confirmType=ConfirmationLifecycle::Type::DE_ENERGIZED;
  else if(type=="axle_safety")confirmType=ConfirmationLifecycle::Type::AXLE_SAFETY;
  else{sendError(400,"INVALID_CONFIRMATION","error.invalid_confirmation");return;}

  bool value=true;
  if(JsonLite::hasKey(body,"value")&&!JsonLite::getBool(body,"value",value)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}

  if(!value){
    ConfirmationLifecycle::revoke(gConf,confirmType);
    sendOk(",\"type\":\""+type+"\",\"value\":false");
    return;
  }

  String modeIn;
  if(!JsonLite::getString(body,"mode",modeIn)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  TestEngine::TestMode mode;
  if(!parseTestMode(modeIn,mode)){sendError(400,"INVALID_TEST_MODE","error.invalid_test_mode");return;}
  if((confirmType==ConfirmationLifecycle::Type::DE_ENERGIZED&&!isTermMode(mode))||
     (confirmType==ConfirmationLifecycle::Type::AXLE_SAFETY&&mode!=TestEngine::TestMode::AXLE_LIFT)){
    ConfirmationLifecycle::revoke(gConf,confirmType);
    sendError(400,"INVALID_CONFIRMATION","error.invalid_confirmation");return;
  }

  ConfirmationLifecycle::arm(gConf,confirmType,(uint8_t)mode,millis());
  sendOk(",\"type\":\""+type+"\",\"value\":true,\"mode\":\""+modeIn+"\",\"ttlMs\":"+String((unsigned)ConfirmationLifecycle::kDefaultTtlMs));
}
'''

text = text[:start_begin] + new_handlers + text[req_begin:]

if "gConf.deEnergized" in text or "gConf.axleSafety" in text:
    raise SystemExit("sticky confirmation field reference survived patch")
if "v||gConf" in text:
    raise SystemExit("stale OR semantics survived patch")

path.write_text(text, encoding="utf-8")
print("Package 7 API patch applied")
