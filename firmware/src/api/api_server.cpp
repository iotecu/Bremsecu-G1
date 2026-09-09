// =============================================================================
// BREMSECU G1 REV-2 — api_server.cpp
// Phase-3 device/status + test intents (accepted ConfirmationStore semantics),
// Step-2 records create/list/search, Step-3 /report/save-result,
// Step-4 /api/v1/settings (GET/PUT),
// Step-6 /api/v1/report (GET/PUT).
// =============================================================================
#include "api_server.h"
#include <Arduino.h>
#include <WebServer.h>
#include "config.h"
#include "json_lite.h"
#include "api_json.h"
#include "network_service.h"
#include "ws_server.h"
#include "tpic_map.h"
#include "tpic_control.h"
#include "test_engine.h"
#include "channels.h"
#include "record_store.h"
#include "active_record.h"
#include "result_session.h"
#include "test_result_store.h"
#include "settings_store.h"
#include "report_composer.h"

namespace ApiServer {
namespace {
WebServer gServer(80);
bool gReady=false;
constexpr const char* kFirmwareVersion="0.3.0-phase4"; // PROVISIONAL
constexpr const char* kHardwareRevision="REV-2";
constexpr const char* kApiVersion="v1";
constexpr const char* kUnresolved[]={"CALIBRATION_COEFFICIENTS","GND_TWO_REFERENCE_THRESHOLDS","INA226_CURRENT_THRESHOLDS","CAN_TERMINATION_WINDOWS","CROSS_SCAN_TIMING","HAZARD_PRODUCT_DECISION","PRODUCTION_CREDENTIAL_POLICY"};

struct ConfirmationStore{bool deEnergized=false;bool axleSafety=false;} gConf;

void sendError(int c,const char*e,const char*i){String s="{\"error\":\"";s+=e;s+="\",\"i18nKey\":\"";s+=i;s+="\"}";gServer.send(c,"application/json",s);}
void sendOk(const String&x=""){String s="{\"ok\":true";s+=x;s+="}";gServer.send(200,"application/json",s);}
struct HttpErr{int code;const char*err;const char*i18n;};
HttpErr mapRecordErr(RecordStore::RecordError e){switch(e){case RecordStore::RecordError::NONE:return{200,"OK","ok"};case RecordStore::RecordError::NOT_READY:return{503,"STORAGE_ERROR","error.storage_error"};case RecordStore::RecordError::INVALID_ARG:return{400,"INVALID_REQUEST","error.invalid_request"};case RecordStore::RecordError::INVALID_ID:return{400,"INVALID_REQUEST","error.invalid_request"};case RecordStore::RecordError::NOT_FOUND:return{404,"NOT_FOUND","error.not_found"};case RecordStore::RecordError::MALFORMED:return{400,"INVALID_REQUEST","error.invalid_request"};case RecordStore::RecordError::RTC_UNAVAILABLE:return{503,"STORAGE_ERROR","error.storage_error"};default:return{500,"STORAGE_ERROR","error.storage_error"};}}
HttpErr mapStorageErr(RecordStore::RecordError e){
  switch(e){
    case RecordStore::RecordError::NONE:return{200,"OK","ok"};
    case RecordStore::RecordError::NOT_READY:
    case RecordStore::RecordError::RTC_UNAVAILABLE:return{503,"STORAGE_ERROR","error.storage_error"};
    default:return{500,"STORAGE_ERROR","error.storage_error"};
  }
}
HttpErr mapSettingsErr(SettingsStore::SettingsError e){
  switch(e){
    case SettingsStore::SettingsError::NONE:return{200,"OK","ok"};
    case SettingsStore::SettingsError::NOT_READY:return{503,"STORAGE_ERROR","error.storage_error"};
    case SettingsStore::SettingsError::INVALID_ARG:return{400,"INVALID_REQUEST","error.invalid_request"};
    case SettingsStore::SettingsError::MALFORMED:
    case SettingsStore::SettingsError::READ_FAILED:
    case SettingsStore::SettingsError::WRITE_FAILED:
    case SettingsStore::SettingsError::COMMIT_FAILED:
    case SettingsStore::SettingsError::RECOVERY_FAILED:
    case SettingsStore::SettingsError::SERIALIZATION_FAILED:
    default:return{500,"STORAGE_ERROR","error.storage_error"};
  }
}
HttpErr mapReportErr(ReportComposer::ReportError e){
    switch(e){
        case ReportComposer::ReportError::NONE: return{200,"OK","ok"};
        case ReportComposer::ReportError::NOT_READY: return{503,"STORAGE_ERROR","error.storage_error"};
        case ReportComposer::ReportError::NOT_FOUND: return{404,"NOT_FOUND","error.not_found"};
        case ReportComposer::ReportError::INVALID_ARG: return{400,"INVALID_REQUEST","error.invalid_request"};
        case ReportComposer::ReportError::MALFORMED:
        case ReportComposer::ReportError::READ_FAILED: return{500,"STORAGE_ERROR","error.storage_error"};
        case ReportComposer::ReportError::OUTPUT_FAILED: return{500,"STORAGE_ERROR","error.storage_error"};
        default: return{500,"STORAGE_ERROR","error.storage_error"};
    }
}
HttpErr mapReportStorageErr(RecordStore::RecordError e){
    switch(e){
        case RecordStore::RecordError::NONE: return{200,"OK","ok"};
        case RecordStore::RecordError::INVALID_ARG:
        case RecordStore::RecordError::INVALID_ID: return{400,"INVALID_REQUEST","error.invalid_request"};
        case RecordStore::RecordError::NOT_FOUND: return{404,"NOT_FOUND","error.not_found"};
        case RecordStore::RecordError::NOT_READY:
        case RecordStore::RecordError::RTC_UNAVAILABLE: return{503,"STORAGE_ERROR","error.storage_error"};
        case RecordStore::RecordError::MALFORMED:
        case RecordStore::RecordError::READ_FAILED:
        case RecordStore::RecordError::WRITE_FAILED:
        case RecordStore::RecordError::COMMIT_FAILED:
        case RecordStore::RecordError::RECOVERY_FAILED:
        case RecordStore::RecordError::SERIALIZATION_FAILED:
        default: return{500,"STORAGE_ERROR","error.storage_error"};
    }
}

String deviceSerialPlaceholder(){const uint64_t mac=ESP.getEfuseMac();char b[24];snprintf(b,sizeof(b),"ESP-%04X%08X",(unsigned)((mac>>32)&0xFFFF),(unsigned)(mac&0xFFFFFFFFu));return String(b);}

String networkJson(){
  const NetworkService::NetworkStatus st=NetworkService::status();
  String s="{\"apActive\":";s+=st.apActive?"true":"false";
  s+=",\"staConnected\":";s+=st.staConnected?"true":"false";
  s+=",\"apIp\":\"";s+=st.apIp.toString();s+="\"";
  s+=",\"staIp\":\"";s+=st.staIp.toString();s+="\"";
  s+=",\"staSsid\":\"";{String t=st.staSsid;for(size_t i=0;i<t.length();++i){char c=t[i];if(c=='"'||c=='\\')s+='\\';s+=c;}}s+="\"";
  s+=",\"staRssi\":";s+=String((int)st.staRssi);
  s+="}";
  return s;
}
String safeStateJson(){const uint32_t w=TpicControl::state();const uint32_t cb=(w&((1UL<<TpicBit::K2_CAN7638_CK)|(1UL<<TpicBit::K3_CAN12098_CK)|(1UL<<TpicBit::K4_CAN7638_DR)|(1UL<<TpicBit::K5_CAN12098_DR)));String s="{\"allOutputsOff\":";s+=(w==0u)?"true":"false";s+=",\"outputWord\":\"0x";s+=String(w,HEX);s+="\"";s+=",\"k1SelectVOn\":";s+=((w&(1UL<<TpicBit::K1_SELECT_V))!=0u)?"true":"false";s+=",\"k6MasterGndOn\":";s+=((w&(1UL<<TpicBit::K6_MASTER_GND))!=0u)?"true":"false";s+=",\"canRelayActive\":";s+=(cb!=0u)?"true":"false";s+="}";return s;}

void handleDevice(){
  String s="{";
  jsonPutStr(s,"product",Config::PRODUCT);s+=",";
  jsonPutStr(s,"firmwareVersion",kFirmwareVersion);s+=",";
  jsonPutStr(s,"hardwareRevision",kHardwareRevision);s+=",";
  jsonPutStr(s,"serialNumber",deviceSerialPlaceholder().c_str());s+=",";
  jsonPutStr(s,"apiVersion",kApiVersion);s+=",";
  s+="\"network\":";s+=networkJson();
  s+=",\"capabilities\":{\"websocket\":";s+=WsServer::isReady()?"true":"false";
  s+=",\"mdns\":";s+=(Config::ENABLE_MDNS)?"true":"false";
  s+=",\"approvedModes\":[\"iso7638_voltage\",\"iso12098_voltage\",\"cable_iso7638\",\"cable_iso12098\",\"lamp_iso12098\",\"axle_lift\",\"can_termination_iso7638_tractor\",\"can_termination_iso7638_trailer\",\"can_termination_iso12098_tractor\",\"can_termination_iso12098_trailer\"]}";
  s+="}";
  gServer.send(200,"application/json",s);
}
void handleStatus(){
  String s="{";
  s+="\"network\":";s+=networkJson();
  s+=",\"safeState\":";s+=safeStateJson();
  s+=",\"activeTest\":{\"active\":";s+=TestEngine::isActive()?"true":"false";
  s+=",\"state\":";s+=String((unsigned)TestEngine::state());
  s+=",\"abortReason\":";s+=String((unsigned)TestEngine::abortReason());s+="}";
  s+=",\"activeRecordId\":";
  if(ActiveRecord::hasActiveRecord()){s+="\"";jsonEscapeAppend(s,ActiveRecord::activeRecordId());s+="\"";}else s+="null";
  s+=",\"unresolvedEngineering\":[";
  for(size_t i=0;i<sizeof(kUnresolved)/sizeof(kUnresolved[0]);++i){if(i)s+=",";s+="\"";s+=kUnresolved[i];s+="\"";}
  s+="]}";
  gServer.send(200,"application/json",s);
}

String modeStr(TestEngine::TestMode m){switch(m){case TestEngine::TestMode::ISO7638_VOLTAGE:return "iso7638_voltage";case TestEngine::TestMode::ISO12098_VOLTAGE:return "iso12098_voltage";case TestEngine::TestMode::CABLE_ISO7638:return "cable_iso7638";case TestEngine::TestMode::CABLE_ISO12098:return "cable_iso12098";case TestEngine::TestMode::LAMP_ISO12098:return "lamp_iso12098";case TestEngine::TestMode::AXLE_LIFT:return "axle_lift";case TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR:return "can_termination_iso7638_tractor";case TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER:return "can_termination_iso7638_trailer";case TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR:return "can_termination_iso12098_tractor";case TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER:return "can_termination_iso12098_trailer";default:return "unknown";}}
bool isCableMode(TestEngine::TestMode m){return m==TestEngine::TestMode::CABLE_ISO7638||m==TestEngine::TestMode::CABLE_ISO12098;}
bool isTermMode(TestEngine::TestMode m){return m>=TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR&&m<=TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;}
bool optBoolDefaultFalse(const String&b,const char*k,bool&o,bool&rej){rej=false;if(!JsonLite::hasKey(b,k)){o=false;return true;}if(!JsonLite::getBool(b,k,o)){rej=true;}return !rej;}

void handleTestStart(){
  const String body=gServer.arg("plain");
  String mIn;
  if(!JsonLite::getString(body,"mode",mIn)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  TestEngine::TestMode mode;
  if(mIn=="iso7638_voltage")mode=TestEngine::TestMode::ISO7638_VOLTAGE;
  else if(mIn=="iso12098_voltage")mode=TestEngine::TestMode::ISO12098_VOLTAGE;
  else if(mIn=="cable_iso7638")mode=TestEngine::TestMode::CABLE_ISO7638;
  else if(mIn=="cable_iso12098")mode=TestEngine::TestMode::CABLE_ISO12098;
  else if(mIn=="lamp_iso12098")mode=TestEngine::TestMode::LAMP_ISO12098;
  else if(mIn=="axle_lift")mode=TestEngine::TestMode::AXLE_LIFT;
  else if(mIn=="can_termination_iso7638_tractor")mode=TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR;
  else if(mIn=="can_termination_iso7638_trailer")mode=TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER;
  else if(mIn=="can_termination_iso12098_tractor")mode=TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR;
  else if(mIn=="can_termination_iso12098_trailer")mode=TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;
  else{sendError(400,"INVALID_TEST_MODE","error.invalid_test_mode");return;}
  TestEngine::TestStartParams p;p.mode=mode;
  if(isCableMode(mode)){uint32_t m=0;if(JsonLite::getUint32(body,"enabledPinMask",m))p.enabledPinMask=m;}
  if(mode==TestEngine::TestMode::LAMP_ISO12098){uint32_t pin=0;if(!JsonLite::getUint32(body,"lampPin",pin)||pin<1||pin>15){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}p.lampPin=(uint8_t)pin;}
  if(isTermMode(mode)){bool v=false,r=false;if(!optBoolDefaultFalse(body,"deEnergizedConfirmed",v,r)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}p.deEnergizedConfirmed=v||gConf.deEnergized;}
  if(mode==TestEngine::TestMode::AXLE_LIFT){bool v=false,r=false;if(!optBoolDefaultFalse(body,"axleSafetyConfirmed",v,r)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}p.axleSafetyConfirmed=v||gConf.axleSafety;}
  if(TestEngine::isActive()){sendError(409,"TEST_ALREADY_ACTIVE","error.test_already_active");return;}
  if(!TestEngine::start(p)){
    switch(TestEngine::abortReason()){
      case TestEngine::AbortReason::INTERLOCK_REJECTED:sendError(409,"SAFETY_INTERLOCK","error.safety_interlock");return;
      case TestEngine::AbortReason::EXTERNAL_ENERGY:sendError(409,"EXTERNAL_ENERGY_DETECTED","error.external_energy_detected");return;
      case TestEngine::AbortReason::SERVICE_FAULT:sendError(500,"SENSOR_ERROR","error.sensor_error");return;
      case TestEngine::AbortReason::PRECONDITION:sendError(409,"PRECONDITION_FAILED","error.precondition_failed");return;
      default:sendError(409,"START_REJECTED","error.start_rejected");return;
    }
  }
  ResultSession::onTestAccepted(mode,p.deEnergizedConfirmed,p.axleSafetyConfirmed);
  gConf.deEnergized=false;gConf.axleSafety=false;
  sendOk(",\"mode\":\""+mIn+"\"");
}
void handleTestStop(){if(TestEngine::isActive())TestEngine::stop();gConf.deEnergized=false;gConf.axleSafety=false;sendOk(",\"active\":false");}
void handleTestConfirm(){
  const String body=gServer.arg("plain");
  String type;if(!JsonLite::getString(body,"type",type)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  bool value=true;bool rej=false;
  if(JsonLite::hasKey(body,"value")&&!JsonLite::getBool(body,"value",value)){rej=true;}
  if(rej){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  if(type=="de_energized"){gConf.deEnergized=value;}
  else if(type=="axle_safety"){gConf.axleSafety=value;}
  else{sendError(400,"INVALID_CONFIRMATION","error.invalid_confirmation");return;}
  sendOk(",\"type\":\""+type+"\",\"value\":"+(value?"true":"false"));
}

enum ReqStr{ABSENT,OK,TOOLONG,BAD};
ReqStr reqString(const String&body,const char*key,char*out,size_t cap){
  String needle=String("\"")+key+"\":\"";
  int idx=body.indexOf(needle);
  if(idx<0)return ABSENT;
  size_t i=(size_t)idx+needle.length();size_t o=0;
  for(;i<body.length();++i){
    char c=body[i];
    if(c=='\\'&&i+1<body.length()){++i;char e=body[i];switch(e){case '"':c='"';break;case '\\':c='\\';break;case 'n':c='\n';break;case 'r':c='\r';break;case 't':c='\t';break;default:return BAD;}}
    else if(c=='"'){out[o]='\0';return OK;}
    if(o+1>=cap)return TOOLONG;
    out[o++]=c;
  }
  return BAD;
}
bool putFilter(const String&v,char*dst,size_t cap){const size_t n=v.length();if(n>=cap)return false;memcpy(dst,v.c_str(),n);dst[n]='\0';return true;}
bool parseU16(const String&s,uint16_t&out){if(s.length()==0)return false;uint32_t acc=0;for(size_t i=0;i<s.length();++i){const char c=s[i];if(c<'0'||c>'9')return false;acc=acc*10+(uint32_t)(c-'0');if(acc>0xFFFF)return false;}out=(uint16_t)acc;return true;}
struct PageCtx{String*s;bool first;};
void onPage(const RecordStore::ServiceRecord&r,void*v){
  PageCtx*c=(PageCtx*)v;
  if(!c->first)*c->s+=",";c->first=false;
  String&s=*c->s;
  s+="{";
  jsonPutStr(s,"id",r.id);s+=",";jsonPutStr(s,"createdAt",r.createdAt);s+=",";
  jsonPutStr(s,"updatedAt",r.updatedAt);s+=",";
  jsonPutStr(s,"customerName",r.customerName);s+=",";
  jsonPutStr(s,"companyName",r.companyName);s+=",";
  jsonPutStr(s,"tractorPlate",r.tractorPlate);s+=",";
  jsonPutStr(s,"trailerPlate",r.trailerPlate);s+=",";
  jsonPutStr(s,"tractorChassis",r.tractorChassis);s+=",";
  jsonPutStr(s,"trailerChassis",r.trailerChassis);s+=",";
  jsonPutStr(s,"fleetOrTrailerNo",r.fleetOrTrailerNo);s+=",";
  jsonPutStr(s,"vehicleSideContext",r.vehicleSideContext);s+=",";
  jsonPutStr(s,"trailerConnectionType",r.trailerConnectionType);s+=",";
  jsonPutStr(s,"status",r.status);
  s+="}";
}
void handleRecordsPost(){
  if(!RecordStore::isReady()){sendError(503,"STORAGE_ERROR","error.storage_error");return;}
  const String body=gServer.arg("plain");
  RecordStore::ServiceRecord rec;memset(&rec,0,sizeof(rec));
  bool bad=false;
  auto put=[&](const char*k,char*dst,size_t cap){ReqStr r=reqString(body,k,dst,cap);if(r==TOOLONG||r==BAD)bad=true;};
  put("customerName",rec.customerName,sizeof(rec.customerName));
  put("companyName",rec.companyName,sizeof(rec.companyName));
  put("technicianId",rec.technicianId,sizeof(rec.technicianId));
  put("tractorPlate",rec.tractorPlate,sizeof(rec.tractorPlate));
  put("trailerPlate",rec.trailerPlate,sizeof(rec.trailerPlate));
  put("tractorChassis",rec.tractorChassis,sizeof(rec.tractorChassis));
  put("trailerChassis",rec.trailerChassis,sizeof(rec.trailerChassis));
  put("fleetOrTrailerNo",rec.fleetOrTrailerNo,sizeof(rec.fleetOrTrailerNo));
  put("vehicleSideContext",rec.vehicleSideContext,sizeof(rec.vehicleSideContext));
  put("trailerConnectionType",rec.trailerConnectionType,sizeof(rec.trailerConnectionType));
  put("diagnosisNote",rec.diagnosisNote,sizeof(rec.diagnosisNote));
  put("serviceNote",rec.serviceNote,sizeof(rec.serviceNote));
  put("fee",rec.fee,sizeof(rec.fee));
  put("reportLogoId",rec.reportLogoId,sizeof(rec.reportLogoId));
  put("status",rec.status,sizeof(rec.status));
  if(bad){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  RecordStore::RecordError e=RecordStore::create(rec);
  if(e!=RecordStore::RecordError::NONE){HttpErr h=mapRecordErr(e);sendError(h.code,h.err,h.i18n);return;}
  ActiveRecord::setActiveRecordId(rec.id);
  String s="{\"ok\":true";
  s+=",\"recordId\":\"";jsonEscapeAppend(s,rec.id);s+="\"";
  s+=",\"createdAt\":\"";jsonEscapeAppend(s,rec.createdAt);s+="\"";
  s+=",\"updatedAt\":\"";jsonEscapeAppend(s,rec.updatedAt);s+="\"";
  s+="}";
  gServer.send(200,"application/json",s);
}
void handleRecordsGet(){
  if(!RecordStore::isReady()){sendError(503,"STORAGE_ERROR","error.storage_error");return;}
  RecordStore::SearchParams sp;memset(&sp,0,sizeof(sp));
  if(gServer.hasArg("customer")&&!putFilter(gServer.arg("customer"),sp.filter.customer,sizeof(sp.filter.customer))){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  if(gServer.hasArg("tractorPlate")&&!putFilter(gServer.arg("tractorPlate"),sp.filter.tractorPlate,sizeof(sp.filter.tractorPlate))){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  if(gServer.hasArg("trailerPlate")&&!putFilter(gServer.arg("trailerPlate"),sp.filter.trailerPlate,sizeof(sp.filter.trailerPlate))){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  if(gServer.hasArg("chassis")&&!putFilter(gServer.arg("chassis"),sp.filter.chassis,sizeof(sp.filter.chassis))){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  if(gServer.hasArg("fleetOrTrailerNo")&&!putFilter(gServer.arg("fleetOrTrailerNo"),sp.filter.fleetOrTrailerNo,sizeof(sp.filter.fleetOrTrailerNo))){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  sp.offset=0;sp.limit=RecordStore::kMaxPageLimit;
  if(gServer.hasArg("offset")&&!parseU16(gServer.arg("offset"),sp.offset)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  if(gServer.hasArg("limit")&&!parseU16(gServer.arg("limit"),sp.limit)){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  String bodyStr="{\"records\":[";
  PageCtx pc;pc.s=&bodyStr;pc.first=true;
  RecordStore::SearchOutcome out;
  RecordStore::RecordError e=RecordStore::search(sp,onPage,&pc,out);
  if(e!=RecordStore::RecordError::NONE){HttpErr h=mapRecordErr(e);sendError(h.code,h.err,h.i18n);return;}
  bodyStr+="]";
  bodyStr+=",\"offset\":"+String(out.offset);
  bodyStr+=",\"limit\":"+String(out.limit);
  bodyStr+=",\"returned\":"+String(out.returned);
  bodyStr+=",\"hasMore\":"+String(out.hasMore?"true":"false");
  bodyStr+=",\"totalMatched\":"+String(out.totalMatched);
  bodyStr+=",\"skipped\":"+String(out.skipped);
  if(out.truncated)bodyStr+=",\"truncated\":true";
  bodyStr+="}";
  gServer.send(200,"application/json",bodyStr);
}

void handleReportSaveResult(){
  if(!RecordStore::isReady()||!TestResultStore::isReady()){sendError(503,"STORAGE_ERROR","error.storage_error");return;}
  if(!ActiveRecord::hasActiveRecord()){sendError(409,"PRECONDITION_FAILED","error.precondition_failed");return;}
  const char*recordId=ActiveRecord::activeRecordId();
  RecordStore::ServiceRecord rec;
  RecordStore::RecordError le=RecordStore::load(recordId,rec);
  if(le==RecordStore::RecordError::NOT_FOUND){sendError(409,"PRECONDITION_FAILED","error.precondition_failed");return;}
  if(le!=RecordStore::RecordError::NONE){sendError(500,"STORAGE_ERROR","error.storage_error");return;}
  if(TestEngine::isActive()){sendError(409,"PRECONDITION_FAILED","error.precondition_failed");return;}
  const ResultSession::SessionState&st=ResultSession::state();
  if(!st.hasCompleted){sendError(409,"PRECONDITION_FAILED","error.precondition_failed");return;}
  if(!st.timestampsValid){sendError(503,"STORAGE_ERROR","error.storage_error");return;}
  const String body=gServer.arg("plain");
  char note[RecordStore::kMaxNoteLen+1];memset(note,0,sizeof(note));
  ReqStr rs=reqString(body,"technicianNote",note,sizeof(note));
  if(rs==TOOLONG||rs==BAD){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}
  TestResultStore::SaveOutcome so;
  RecordStore::RecordError we=TestResultStore::writeCompleted(recordId,rec.technicianId,note,so);
  if(we!=RecordStore::RecordError::NONE){HttpErr h=mapStorageErr(we);sendError(h.code,h.err,h.i18n);return;}
  RecordStore::TestRef ref;memset(&ref,0,sizeof(ref));
  strncpy(ref.testId,so.testId,sizeof(ref.testId)-1);
  strncpy(ref.mode,st.mode,sizeof(ref.mode)-1);
  strncpy(ref.savedAt,st.completedAt,sizeof(ref.savedAt)-1);
  RecordStore::RecordError ae=RecordStore::addTestRef(recordId,ref);
  if(ae!=RecordStore::RecordError::NONE){HttpErr h=mapStorageErr(ae);sendError(h.code,h.err,h.i18n);return;}
  ResultSession::markSaved(so.testId);
  WsServer::notifyRecordUpdated(recordId,so.testId);
  String s="{\"ok\":true,\"recordId\":\"";s+=recordId;s+="\",\"testId\":\"";s+=so.testId;s+="\",\"mode\":\"";s+=st.mode;s+="\",\"classificationFinal\":false}";
  gServer.send(200,"application/json",s);
}

struct PutCursor { const char* s; size_t len; size_t pos; };
void putSkipWs(PutCursor& c) {
  while (c.pos < c.len && (c.s[c.pos]==' '||c.s[c.pos]=='\t'||c.s[c.pos]=='\n'||c.s[c.pos]=='\r')) c.pos++;
}
bool putExpectChar(PutCursor& c, char ch) {
  putSkipWs(c);
  if (c.pos < c.len && c.s[c.pos] == ch) { c.pos++; return true; }
  return false;
}
bool putPeekChar(PutCursor& c, char ch) {
  putSkipWs(c);
  return c.pos < c.len && c.s[c.pos] == ch;
}
bool putParseString(PutCursor& c, char* out, size_t cap, size_t& outLen) {
  putSkipWs(c);
  if (c.pos >= c.len || c.s[c.pos] != '"') return false;
  c.pos++;
  outLen = 0;
  if (cap == 0) return false;
  while (c.pos < c.len) {
    char ch = c.s[c.pos++];
    if (ch == '"') { out[outLen] = '\0'; return true; }
    if (ch == '\\') {
      if (c.pos >= c.len) return false;
      char esc = c.s[c.pos++]; char mapped = 0;
      switch(esc) {
        case '"': mapped = '"'; break; case '\\': mapped = '\\'; break;
        case '/': mapped = '/'; break; case 'n': mapped = '\n'; break;
        case 'r': mapped = '\r'; break; case 't': mapped = '\t'; break;
        default: return false;
      }
      if (outLen >= cap - 1) return false;
      out[outLen++] = mapped;
    } else {
      if ((unsigned char)ch < 0x20) return false;
      if (outLen >= cap - 1) return false;
      out[outLen++] = ch;
    }
  }
  return false;
}
bool putParseBool(PutCursor& c, bool& out) {
  putSkipWs(c);
  if (c.pos + 4 <= c.len && memcmp(c.s + c.pos, "true", 4) == 0) { c.pos += 4; out = true; return true; }
  if (c.pos + 5 <= c.len && memcmp(c.s + c.pos, "false", 5) == 0) { c.pos += 5; out = false; return true; }
  return false;
}
bool putTextOk(const char* v) {
  for (; *v; ++v) { unsigned char c = (unsigned char)*v; if (c < 0x20 && c != '\n' && c != '\r' && c != '\t') return false; }
  return true;
}

void handleSettingsGet(){
  if(!SettingsStore::isReady()){sendError(503,"STORAGE_ERROR","error.storage_error");return;}
  SettingsStore::Settings s; SettingsStore::defaults(s);
  SettingsStore::SettingsError e=SettingsStore::load(s);
  if(e!=SettingsStore::SettingsError::NONE && e!=SettingsStore::SettingsError::NOT_FOUND){
    HttpErr h=mapSettingsErr(e); sendError(h.code,h.err,h.i18n); return;
  }
  String out="{";
  jsonPutStr(out,"language",s.language);out+=",";
  out+="\"keepScreenAwake\":";out+=s.keepScreenAwake?"true":"false";out+=",";
  out+="\"technicians\":[";
  for(uint8_t i=0;i<s.technicianCount;++i){
    if(i)out+=",";
    out+="{";jsonPutStr(out,"id",s.technicians[i].id);out+=",";
    jsonPutStr(out,"name",s.technicians[i].name);out+=",";
    out+="\"active\":";out+=s.technicians[i].active?"true":"false";
    out+="}";
  }
  out+="],";
  jsonPutStr(out,"serviceCompany",s.serviceCompany);out+=",";
  jsonPutStr(out,"serviceAddress",s.serviceAddress);out+=",";
  jsonPutStr(out,"servicePhone",s.servicePhone);out+=",";
  jsonPutStr(out,"serviceEmail",s.serviceEmail);out+=",";
  jsonPutStr(out,"reportLogoId",s.reportLogoId);out+=",";
  out+="\"device\":{";
  jsonPutStr(out,"product",Config::PRODUCT);out+=",";
  jsonPutStr(out,"model","");out+=",";
  jsonPutStr(out,"firmwareVersion",kFirmwareVersion);out+=",";
  jsonPutStr(out,"hardwareRevision",kHardwareRevision);out+=",";
  jsonPutStr(out,"serialNumber",deviceSerialPlaceholder().c_str());out+=",";
  jsonPutStr(out,"productionDate","");
  out+="}}";
  gServer.send(200,"application/json",out);
}

void handleSettingsPut(){
  if(!SettingsStore::isReady()){sendError(503,"STORAGE_ERROR","error.storage_error");return;}
  const String& body = gServer.arg("plain");
  if(body.length()==0){sendError(400,"INVALID_REQUEST","error.invalid_request");return;}

  SettingsStore::Settings s; SettingsStore::defaults(s);
  SettingsStore::SettingsError le=SettingsStore::load(s);
  if(le!=SettingsStore::SettingsError::NONE && le!=SettingsStore::SettingsError::NOT_FOUND){
    HttpErr h=mapSettingsErr(le); sendError(h.code,h.err,h.i18n); return;
  }

  PutCursor c = {body.c_str(), body.length(), 0};
  if (!putExpectChar(c, '{')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }

  bool anyApplied = false;
  bool hasLang=false, hasKeepAwake=false, hasTechs=false;
  bool hasComp=false, hasAddr=false, hasPhone=false, hasEmail=false, hasLogo=false;

  SettingsStore::Technician tempTechs[SettingsStore::kMaxTechnicians];
  uint8_t tempTechCount = 0;

  if (!putPeekChar(c, '}')) {
    while (true) {
      char key[32]; size_t keyLen;
      if (!putParseString(c, key, sizeof(key), keyLen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
      if (!putExpectChar(c, ':')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }

      if (strcmp(key, "language") == 0) {
        if (hasLang) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasLang = true;
        char val[SettingsStore::kMaxLanguageLen + 1]; size_t slen;
        if (!putParseString(c, val, sizeof(val), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        const char* const langs[] = {"tr","en","de","fr","it","el","ru","ar","fa","bg","pl","sr","ro","es"};
        bool supported = false;
        for(int i=0; i<14; ++i) if(strcmp(val, langs[i])==0) { supported=true; break; }
        if (!supported) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        memcpy(s.language, val, sizeof(s.language));
        anyApplied = true;
      } else if (strcmp(key, "keepScreenAwake") == 0) {
        if (hasKeepAwake) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasKeepAwake = true;
        bool val;
        if (!putParseBool(c, val)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        s.keepScreenAwake = val;
        anyApplied = true;
      } else if (strcmp(key, "technicians") == 0) {
        if (hasTechs) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasTechs = true;
        if (!putExpectChar(c, '[')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        tempTechCount = 0;
        if (!putPeekChar(c, ']')) {
          while (true) {
            if (tempTechCount >= SettingsStore::kMaxTechnicians) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
            if (!putExpectChar(c, '{')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
            bool tHasId=false, tHasName=false, tHasActive=false;
            SettingsStore::Technician t; memset(&t, 0, sizeof(t));
            if (!putPeekChar(c, '}')) {
              while (true) {
                char tkey[16]; size_t tkeyLen;
                if (!putParseString(c, tkey, sizeof(tkey), tkeyLen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
                if (!putExpectChar(c, ':')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
                if (strcmp(tkey, "id") == 0) {
                  if (tHasId) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } tHasId = true;
                  size_t slen;
                  if (!putParseString(c, t.id, sizeof(t.id), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
                } else if (strcmp(tkey, "name") == 0) {
                  if (tHasName) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } tHasName = true;
                  size_t slen;
                  if (!putParseString(c, t.name, sizeof(t.name), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
                } else if (strcmp(tkey, "active") == 0) {
                  if (tHasActive) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } tHasActive = true;
                  if (!putParseBool(c, t.active)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
                } else {
                  sendError(400,"INVALID_REQUEST","error.invalid_request"); return;
                }
                if (!putExpectChar(c, ',')) {
                  if (!putExpectChar(c, '}')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
                  break;
                }
              }
            } else {
              c.pos++;
            }
            if (!tHasId || !tHasName || !tHasActive) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
            if (t.id[0] == '\0' || t.name[0] == '\0') { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
            if (!putTextOk(t.id) || !putTextOk(t.name)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
            for (uint8_t k = 0; k < tempTechCount; ++k) {
              if (strcmp(tempTechs[k].id, t.id) == 0) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
            }
            tempTechs[tempTechCount++] = t;
            if (!putExpectChar(c, ',')) {
              if (!putExpectChar(c, ']')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
              break;
            }
          }
        } else {
          c.pos++;
        }
        anyApplied = true;
      } else if (strcmp(key, "serviceCompany") == 0) {
        if (hasComp) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasComp = true;
        size_t slen; if (!putParseString(c, s.serviceCompany, sizeof(s.serviceCompany), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        anyApplied = true;
      } else if (strcmp(key, "serviceAddress") == 0) {
        if (hasAddr) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasAddr = true;
        size_t slen; if (!putParseString(c, s.serviceAddress, sizeof(s.serviceAddress), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        anyApplied = true;
      } else if (strcmp(key, "servicePhone") == 0) {
        if (hasPhone) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasPhone = true;
        size_t slen; if (!putParseString(c, s.servicePhone, sizeof(s.servicePhone), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        anyApplied = true;
      } else if (strcmp(key, "serviceEmail") == 0) {
        if (hasEmail) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasEmail = true;
        size_t slen; if (!putParseString(c, s.serviceEmail, sizeof(s.serviceEmail), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        anyApplied = true;
      } else if (strcmp(key, "reportLogoId") == 0) {
        if (hasLogo) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; } hasLogo = true;
        size_t slen; if (!putParseString(c, s.reportLogoId, sizeof(s.reportLogoId), slen)) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        anyApplied = true;
      } else {
        sendError(400,"INVALID_REQUEST","error.invalid_request"); return;
      }

      if (!putExpectChar(c, ',')) {
        if (!putExpectChar(c, '}')) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }
        break;
      }
    }
  } else {
    c.pos++;
  }

  putSkipWs(c);
  if (c.pos != c.len) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }

  if (!anyApplied) { sendError(400,"INVALID_REQUEST","error.invalid_request"); return; }

  if (hasTechs) {
    memcpy(s.technicians, tempTechs, sizeof(SettingsStore::Technician) * tempTechCount);
    s.technicianCount = tempTechCount;
  }

  SettingsStore::SettingsError se=SettingsStore::save(s);
  if(se!=SettingsStore::SettingsError::NONE){HttpErr h=mapSettingsErr(se);sendError(h.code,h.err,h.i18n);return;}

  String out="{";
  jsonPutStr(out,"language",s.language);out+=",";
  out+="\"keepScreenAwake\":";out+=s.keepScreenAwake?"true":"false";out+=",";
  out+="\"technicians\":[";
  for(uint8_t i=0;i<s.technicianCount;++i){
    if(i)out+=",";
    out+="{";jsonPutStr(out,"id",s.technicians[i].id);out+=",";
    jsonPutStr(out,"name",s.technicians[i].name);out+=",";
    out+="\"active\":";out+=s.technicians[i].active?"true":"false";
    out+="}";
  }
  out+="],";
  jsonPutStr(out,"serviceCompany",s.serviceCompany);out+=",";
  jsonPutStr(out,"serviceAddress",s.serviceAddress);out+=",";
  jsonPutStr(out,"servicePhone",s.servicePhone);out+=",";
  jsonPutStr(out,"serviceEmail",s.serviceEmail);out+=",";
  jsonPutStr(out,"reportLogoId",s.reportLogoId);
  out+="}";
  gServer.send(200,"application/json",out);
}

// --- Step-6 Report --------------------------------------------------------------
bool reportChunkWriter(const char* data, size_t len, void* ctx) {
    WebServer* srv = (WebServer*)ctx;
    if (!srv->client().connected()) return false;
    String chunk;
    chunk.reserve(len);
    chunk.concat(data, len);
    srv->sendContent(chunk);
    return true;
}

void handleReportGet() {
    const char* targetId = nullptr;
    char idBuf[RecordStore::kMaxIdLen + 1];

    if (gServer.hasArg("recordId")) {
        String rid = gServer.arg("recordId");
        if (rid.length() == 0 || rid.length() > RecordStore::kMaxIdLen) { 
            sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; 
        }
        strncpy(idBuf, rid.c_str(), sizeof(idBuf));
        idBuf[sizeof(idBuf)-1] = '\0';
        targetId = idBuf;
    } else {
        if (!ActiveRecord::hasActiveRecord()) { 
            sendError(409, "PRECONDITION_FAILED", "error.precondition_failed"); return; 
        }
        targetId = ActiveRecord::activeRecordId();
    }

    ReportComposer::ReportError err = ReportComposer::validate(targetId);
    if (err != ReportComposer::ReportError::NONE) {
        HttpErr h = mapReportErr(err);
        sendError(h.code, h.err, h.i18n);
        return;
    }

    gServer.setContentLength(CONTENT_LENGTH_UNKNOWN);
    gServer.send(200, "application/json", "");
    
    ReportComposer::ReportError streamErr = ReportComposer::streamJson(targetId, reportChunkWriter, &gServer);
    if (streamErr == ReportComposer::ReportError::NONE) {
        gServer.sendContent("");
    } else {
        gServer.client().stop();
    }
}

void handleReportPut() {
    const String& body = gServer.arg("plain");
    if (body.length() == 0) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }

    PutCursor c = {body.c_str(), body.length(), 0};
    if (!putExpectChar(c, '{')) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }

    char rid[RecordStore::kMaxIdLen + 1]; bool hasRid = false;
    char diag[RecordStore::kMaxNoteLen + 1]; bool hasDiag = false;
    char serv[RecordStore::kMaxNoteLen + 1]; bool hasServ = false;
    char fee[RecordStore::kMaxFeeLen + 1]; bool hasFee = false;

    if (!putPeekChar(c, '}')) {
        while (true) {
            char key[32]; size_t keyLen;
            if (!putParseString(c, key, sizeof(key), keyLen)) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
            if (!putExpectChar(c, ':')) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }

            if (strcmp(key, "recordId") == 0) {
                if (hasRid) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; } hasRid = true;
                size_t slen;
                if (!putParseString(c, rid, sizeof(rid), slen)) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
            } else if (strcmp(key, "diagnosisNote") == 0) {
                if (hasDiag) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; } hasDiag = true;
                size_t slen;
                if (!putParseString(c, diag, sizeof(diag), slen)) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
            } else if (strcmp(key, "serviceNote") == 0) {
                if (hasServ) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; } hasServ = true;
                size_t slen;
                if (!putParseString(c, serv, sizeof(serv), slen)) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
            } else if (strcmp(key, "fee") == 0) {
                if (hasFee) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; } hasFee = true;
                size_t slen;
                if (!putParseString(c, fee, sizeof(fee), slen)) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
            } else {
                sendError(400, "INVALID_REQUEST", "error.invalid_request"); return;
            }

            if (!putExpectChar(c, ',')) {
                if (!putExpectChar(c, '}')) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
                break;
            }
        }
    } else {
        c.pos++;
    }

    putSkipWs(c);
    if (c.pos != c.len) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }

    if (!hasDiag && !hasServ && !hasFee) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }

    const char* targetId = nullptr;
    if (hasRid) {
        targetId = rid;
    } else {
        if (!ActiveRecord::hasActiveRecord()) { sendError(409, "PRECONDITION_FAILED", "error.precondition_failed"); return; }
        targetId = ActiveRecord::activeRecordId();
    }

    RecordStore::ServiceRecord rec;
    RecordStore::RecordError le = RecordStore::load(targetId, rec);
    if (le == RecordStore::RecordError::NOT_FOUND) { sendError(404, "NOT_FOUND", "error.not_found"); return; }
    if (le != RecordStore::RecordError::NONE) { HttpErr h = mapReportStorageErr(le); sendError(h.code, h.err, h.i18n); return; }

    if (hasDiag) { 
        memset(rec.diagnosisNote, 0, sizeof(rec.diagnosisNote));
        strncpy(rec.diagnosisNote, diag, sizeof(rec.diagnosisNote) - 1); 
    }
    if (hasServ) { 
        memset(rec.serviceNote, 0, sizeof(rec.serviceNote));
        strncpy(rec.serviceNote, serv, sizeof(rec.serviceNote) - 1); 
    }
    if (hasFee) { 
        memset(rec.fee, 0, sizeof(rec.fee));
        strncpy(rec.fee, fee, sizeof(rec.fee) - 1); 
    }

    RecordStore::RecordError se = RecordStore::save(rec);
    if (se != RecordStore::RecordError::NONE) { HttpErr h = mapReportStorageErr(se); sendError(h.code, h.err, h.i18n); return; }

    RecordStore::RecordError re = RecordStore::load(targetId, rec);
    if (re != RecordStore::RecordError::NONE) { HttpErr h = mapReportStorageErr(re); sendError(h.code, h.err,h.i18n); return; }

    WsServer::notifyRecordUpdated();

    String out = "{\"ok\":true,\"recordId\":\"";
    jsonEscapeAppend(out, rec.id); out += "\",\"updatedAt\":\"";
    jsonEscapeAppend(out, rec.updatedAt); out += "\",\"diagnosisNote\":\"";
    jsonEscapeAppend(out, rec.diagnosisNote); out += "\",\"serviceNote\":\"";
    jsonEscapeAppend(out, rec.serviceNote); out += "\",\"fee\":\"";
    jsonEscapeAppend(out, rec.fee); out += "\"}";
    gServer.send(200, "application/json", out);
}

void handleNotFound(){sendError(404,"NOT_FOUND","error.not_found");}
} // namespace

bool begin(){
  gReady=false;
  gServer.on("/api/v1/device",HTTP_GET,handleDevice);
  gServer.on("/api/v1/status",HTTP_GET,handleStatus);
  gServer.on("/api/v1/test/start",HTTP_POST,handleTestStart);
  gServer.on("/api/v1/test/stop",HTTP_POST,handleTestStop);
  gServer.on("/api/v1/test/confirm",HTTP_POST,handleTestConfirm);
  gServer.on("/api/v1/records",HTTP_POST,handleRecordsPost);
  gServer.on("/api/v1/records",HTTP_GET,handleRecordsGet);
  gServer.on("/api/v1/report/save-result",HTTP_POST,handleReportSaveResult);
  gServer.on("/api/v1/settings",HTTP_GET,handleSettingsGet);
  gServer.on("/api/v1/settings",HTTP_PUT,handleSettingsPut);
  gServer.on("/api/v1/report",HTTP_GET,handleReportGet);
  gServer.on("/api/v1/report",HTTP_PUT,handleReportPut);
  gServer.onNotFound(handleNotFound);
  gServer.begin();
  gReady=true;
  return true;
}
void poll(){if(gReady)gServer.handleClient();}
bool isReady(){return gReady;}
} // namespace ApiServer