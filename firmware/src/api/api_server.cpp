// =============================================================================
// BREMSECU G1 REV-2 — api_server.cpp
// Phase-3 device/status + test intents (accepted ConfirmationStore semantics),
// Step-2 records create/list/search, Step-3 /report/save-result.
// Records/save endpoints call RecordStore/ResultSession/TestResultStore ONLY.
// /report/save-result persistence failures use the storage error mapping (never
// 400 INVALID_REQUEST for a corrupted stored TestResult/index).
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
// Existing records-endpoint mapping (unchanged for POST/GET /api/v1/records).
HttpErr mapRecordErr(RecordStore::RecordError e){switch(e){case RecordStore::RecordError::NONE:return{200,"OK","ok"};case RecordStore::RecordError::NOT_READY:return{503,"STORAGE_ERROR","error.storage_error"};case RecordStore::RecordError::INVALID_ARG:return{400,"INVALID_REQUEST","error.invalid_request"};case RecordStore::RecordError::INVALID_ID:return{400,"INVALID_REQUEST","error.invalid_request"};case RecordStore::RecordError::NOT_FOUND:return{404,"NOT_FOUND","error.not_found"};case RecordStore::RecordError::MALFORMED:return{400,"INVALID_REQUEST","error.invalid_request"};case RecordStore::RecordError::RTC_UNAVAILABLE:return{503,"STORAGE_ERROR","error.storage_error"};default:return{500,"STORAGE_ERROR","error.storage_error"};}}
// Persistence-failure mapping for /report/save-result: never 400 for a
// corrupted stored TestResult/index; internal failures are STORAGE_ERROR.
HttpErr mapStorageErr(RecordStore::RecordError e){
  switch(e){
    case RecordStore::RecordError::NONE:return{200,"OK","ok"};
    case RecordStore::RecordError::NOT_READY:
    case RecordStore::RecordError::RTC_UNAVAILABLE:return{503,"STORAGE_ERROR","error.storage_error"};
    default:return{500,"STORAGE_ERROR","error.storage_error"};
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
  ResultSession::onTestAccepted(mode,p.deEnergizedConfirmed,p.axleSafetyConfirmed); // snapshot BEFORE one-shot clear
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

// --- Step-2 records -------------------------------------------------------------
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
  jsonPutStr(s,"updatedAt",r.updatedAt);s+=",";jsonPutStr(s,"customerName",r.customerName);s+=",";
  jsonPutStr(s,"companyName",r.companyName);s+=",";jsonPutStr(s,"tractorPlate",r.tractorPlate);s+=",";
  jsonPutStr(s,"trailerPlate",r.trailerPlate);s+=",";jsonPutStr(s,"tractorChassis",r.tractorChassis);s+=",";
  jsonPutStr(s,"trailerChassis",r.trailerChassis);s+=",";jsonPutStr(s,"fleetOrTrailerNo",r.fleetOrTrailerNo);s+=",";
  jsonPutStr(s,"vehicleSideContext",r.vehicleSideContext);s+=",";jsonPutStr(s,"trailerConnectionType",r.trailerConnectionType);s+=",";
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
  bodyStr+=",\"hasMore\":"+(out.hasMore?"true":"false");
  bodyStr+=",\"totalMatched\":"+String(out.totalMatched);
  bodyStr+=",\"skipped\":"+String(out.skipped);
  if(out.truncated)bodyStr+=",\"truncated\":true";
  bodyStr+="}";
  gServer.send(200,"application/json",bodyStr);
}

// --- Step-3 save-result -----------------------------------------------------------
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
  if(ae!=RecordStore::RecordError::NONE){HttpErr h=mapStorageErr(ae);sendError(h.code,h.err,h.i18n);return;} // orphan remains; retry converges
  ResultSession::markSaved(so.testId); // runtime status only; no bypass of durable binding
  WsServer::notifyRecordUpdated(recordId,so.testId);
  String s="{\"ok\":true,\"recordId\":\"";s+=recordId;s+="\",\"testId\":\"";s+=so.testId;s+="\",\"mode\":\"";s+=st.mode;s+="\",\"classificationFinal\":false}";
  gServer.send(200,"application/json",s);
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
  gServer.onNotFound(handleNotFound);
  gServer.begin();
  gReady=true;
  return true;
}
void poll(){if(gReady)gServer.handleClient();}
bool isReady(){return gReady;}
} // namespace ApiServer