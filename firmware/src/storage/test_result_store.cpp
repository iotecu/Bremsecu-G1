#include "test_result_store.h"
#include "test_engine.h"
#include "sd_service.h"
#include <Arduino.h>
#include <string.h>
#include <stdio.h>

namespace TestResultStore {
namespace {

bool gReady=false;
const char* kTestDir="/bremsecu/tests";

char gTestVerify[kMaxTestJsonLen+1];

void escAppend(String&s,const char*v){for(const char*p=v;*p;++p){switch(*p){case '"':s+="\\\"";break;case '\\':s+="\\\\";break;case '\n':s+="\\n";break;case '\r':s+="\\r";break;case '\t':s+="\\t";break;default:s+=*p;}}}
void putStr(String&s,const char*k,const char*v){s+="\"";s+=k;s+="\":\"";escAppend(s,v);s+="\"";}
void putNum(String&s,const char*k,float v,int dec){s+="\"";s+=k;s+="\":";s+=String(v,dec);}
void putBool(String&s,const char*k,bool v){s+="\"";s+=k;s+="\":";s+=(v?"true":"false");}

bool findKey(const String&b,const char*k,size_t&vp){String n=String("\"")+k+"\":\"";int i=b.indexOf(n);if(i<0)return false;vp=(size_t)i+n.length();return vp<=b.length();}
bool jgetString(const String&b,const char*k,char*out,size_t ol){size_t vp;if(!findKey(b,k,vp))return false;size_t o=0;for(size_t i=vp;i<b.length();++i){char c=b[i];if(c=='\\'&&i+1<b.length()){++i;char e=b[i];switch(e){case '"':c='"';break;case '\\':c='\\';break;case 'n':c='\n';break;case 'r':c='\r';break;case 't':c='\t';break;default:return false;}}else if(c=='"'){out[o]='\0';return true;}if(o+1>=ol)return false;out[o++]=c;}return false;}

const char* targetSideFor(TestEngine::TestMode m){
  switch(m){
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR:
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR:return "tractor";
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER:
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER:return "trailer";
    default:return "";
  }
}

const char* relayStr(Channels::RelayControl rc){
  switch(rc){
    case Channels::RelayControl::RELAY_CAN7638_DR:return "CAN7638_DR";
    case Channels::RelayControl::RELAY_CAN12098_DR:return "CAN12098_DR";
    case Channels::RelayControl::RELAY_CAN12098_CK:return "CAN12098_CK";
    case Channels::RelayControl::RELAY_CAN7638_CK:return "CAN7638_CK";
    case Channels::RelayControl::RELAY_SELECT_V:return "SELECT_V";
    case Channels::RelayControl::RELAY_MASTER_GND:return "MASTER_GND";
    default:return "UNKNOWN";
  }
}

String buildJson(const ResultSession::SessionState& st,const char*operatorId,const char*note){
  const TestEngine::TestResults& r=TestEngine::results();
  String s="{";
  putStr(s,"id",st.testId); s+=",";
  putStr(s,"mode",st.mode); s+=",";
  putStr(s,"targetSide",targetSideFor(r.mode)); s+=",";
  putStr(s,"startedAt",st.startedAt); s+=",";
  putStr(s,"completedAt",st.completedAt); s+=",";
  putStr(s,"overallStatus","INDETERMINATE"); s+=",";
  putBool(s,"classificationFinal",false); s+=",";
  s+="\"channels\":[";
  bool first=true;
  if(r.mode==TestEngine::TestMode::ISO7638_VOLTAGE||r.mode==TestEngine::TestMode::ISO12098_VOLTAGE){
    for(uint8_t i=0;i<r.voltCount;++i){
      const auto&v=r.volt[i];
      if(!first)s+=",";first=false;
      s+="{";putNum(s,"channelId",(float)(unsigned)v.ch,0);s+=",";putNum(s,"pin",(float)v.pin,0);s+=",";
      putStr(s,"function",Channels::channelName(v.ch));s+=",";putStr(s,"measurementFamily","voltage");s+=",";
      putNum(s,"engineeringValue",v.nodeV,3);s+=",";putStr(s,"unit","V");s+=",";
      putBool(s,"valid",v.valid);s+=",";
      putStr(s,"status",v.valid?"measured":"invalid");s+=",";putBool(s,"classificationFinal",false);
      if(v.k6OffValid){s+=",\"k6OffEvidence\":";s+=String(v.k6OffV,3);}
      if(v.pulseValid){s+=",\"pulseState\":{\"edges\":";s+=String((unsigned)v.pulse.edgeCount);s+=",\"level\":";s+=(v.pulse.level?"true":"false");s+="}";}
      s+="}";
    }
  } else if(r.mode==TestEngine::TestMode::CABLE_ISO7638||r.mode==TestEngine::TestMode::CABLE_ISO12098){
    for(uint8_t i=0;i<r.cableCount;++i){
      const auto&c=r.cable[i];
      if(!first)s+=",";first=false;
      s+="{";putNum(s,"channelId",(float)(unsigned)c.ch,0);s+=",";putNum(s,"pin",(float)c.pin,0);s+=",";
      putStr(s,"function",Channels::channelName(c.ch));s+=",";putStr(s,"measurementFamily","cable_continuity");s+=",";
      putNum(s,"stepIndex",(float)c.stepIndex,0);s+=",";
      putNum(s,"engineeringValue",c.focusV,3);s+=",";putStr(s,"unit","V");s+=",";
      putBool(s,"valid",c.processed);s+=",";
      putStr(s,"status",c.continuity==TestEngine::ContinuityResult::PASS?"PASS":c.continuity==TestEngine::ContinuityResult::OPEN?"OPEN":"INDETERMINATE");s+=",";
      putBool(s,"classificationFinal",false);s+=",\"baseline\":";s+=String(c.baselineV,3);s+="}";
    }
  } else if(r.mode>=TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR&&r.mode<=TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER){
    s+="{";putStr(s,"measurementFamily","can_resistance");s+=",";
    putStr(s,"relay",relayStr(r.term.relay));s+=",";
    putNum(s,"vhV",r.term.vhV,3);s+=",";putNum(s,"vlV",r.term.vlV,3);s+=",";putNum(s,"deltaV",r.term.deltaV,3);s+=",";
    putBool(s,"valid",r.term.valid);s+=",";putBool(s,"classificationFinal",false);s+="}";
    first=false;
  } else {
    s+="{";putStr(s,"measurementFamily","load_current");s+=",";
    s+="\"shunt\":{\"valid\":";s+=(r.load.shuntValid?"true":"false");s+=",\"value\":";s+=String(r.load.shuntV,6);s+="}";
    s+=",\"bus\":{\"valid\":";s+=(r.load.busValid?"true":"false");s+=",\"value\":";s+=String(r.load.busV,3);s+="}";
    s+=",\"current\":{\"valid\":";s+=(r.load.currentValid?"true":"false");s+=",\"value\":";s+=String(r.load.currentA,4);s+="}";
    s+=",\"onMs\":";s+=String((unsigned)r.load.onMs);s+=",";putBool(s,"classificationFinal",false);s+="}";
    first=false;
  }
  s+="],\"confirmations\":[";
  first=true;
  if(st.confirmations.deEnergized){s+="{";putStr(s,"type","de_energized");s+=",\"value\":true,";putStr(s,"timestamp",st.startedAt);s+=",";putStr(s,"operatorId",operatorId);s+="}";first=false;}
  if(st.confirmations.axleSafety){if(!first)s+=",";s+="{";putStr(s,"type","axle_safety");s+=",\"value\":true,";putStr(s,"timestamp",st.startedAt);s+=",";putStr(s,"operatorId",operatorId);s+="}";first=false;}
  s+="],";
  putStr(s,"technicianNote",note?note:""); s+=",";
  s+="\"rawEvidence\":{";
  if(r.mode==TestEngine::TestMode::CABLE_ISO7638||r.mode==TestEngine::TestMode::CABLE_ISO12098){
    s+="\"crossScan\":[";
    for(uint8_t i=0;i<r.shortCount;++i){
      if(i)s+=",";
      const auto&x=r.shorts[i];
      s+="{\"focusPin\":";s+=String(x.focusPin);s+=",\"coupledPin\":";s+=String(x.coupledPin);
      s+=",\"stepIndex\":";s+=String((unsigned)x.stepIndex);
      s+=",\"baseline\":";s+=String(x.baselineV,3);s+=",\"measured\":";s+=String(x.measuredV,3);s+=",\"delta\":";s+=String(x.deltaV,3);s+="}";
    }
    s+="]";
  } else { s+="\"none\":true"; }
  s+="}}";
  return s;
}

bool sameTest(const char* path, const ResultSession::SessionState& st) {
  size_t sz=0;
  if (!SdService::fileSize(path,sz)) return false;
  if (sz==0||sz>kMaxTestJsonLen) return false;
  size_t g=0;
  if (!SdService::readFile(path,(uint8_t*)gTestVerify,kMaxTestJsonLen,g)) return false;
  gTestVerify[g]='\0';
  String b=String(gTestVerify);
  char id[RecordStore::kMaxTestIdLen+1]; char md[RecordStore::kMaxModeLen+1];
  char started[RecordStore::kMaxTsLen+1]; char completed[RecordStore::kMaxTsLen+1];
  if (!jgetString(b,"id",id,sizeof(id))) return false;
  if (!jgetString(b,"mode",md,sizeof(md))) return false;
  if (!jgetString(b,"startedAt",started,sizeof(started))) return false;
  if (!jgetString(b,"completedAt",completed,sizeof(completed))) return false;
  return strcmp(id,st.testId)==0
      && strcmp(md,st.mode)==0
      && strcmp(started,st.startedAt)==0
      && strcmp(completed,st.completedAt)==0;
}

bool isSafePathToken(const char* s) {
    if (!s || s[0] == '\0') return false;
    for (const char* p = s; *p; ++p) {
        char c = *p;
        if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
              (c >= '0' && c <= '9') || c == '-')) {
            return false;
        }
    }
    return true;
}

} // namespace

bool begin(){
  gReady=false;
  if (!SdService::isReady()) return false;
  if (!SdService::ensureDir("/bremsecu")||!SdService::ensureDir(kTestDir)) return false;
  gReady=true; return true;
}
bool isReady(){ return gReady; }

RecordStore::RecordError writeCompleted(const char*recordId,const char*operatorId,const char*note,SaveOutcome&out){
  out.idempotentDuplicate=false;
  const ResultSession::SessionState& st=ResultSession::state();
  if(!st.hasCompleted) return RecordStore::RecordError::NOT_FOUND;
  strncpy(out.testId,st.testId,sizeof(out.testId)-1); out.testId[sizeof(out.testId)-1]='\0';

  char dir[64]; snprintf(dir,sizeof(dir),"%s/%s",kTestDir,recordId);
  char fp[96],tp[96];
  snprintf(fp,sizeof(fp),"%s/%s.json",dir,st.testId);
  snprintf(tp,sizeof(tp),"%s/%s.tmp",dir,st.testId);

  bool se=false;
  if (SdService::exists(fp)) {
    if (sameTest(fp,st)) { out.idempotentDuplicate=true; return RecordStore::RecordError::NONE; }
    return RecordStore::RecordError::MALFORMED;
  }

  if(!SdService::ensureDir(dir)) return RecordStore::RecordError::NOT_READY;
  String json=buildJson(st,operatorId,note);
  if(json.length()==0||json.length()>kMaxTestJsonLen) return RecordStore::RecordError::SERIALIZATION_FAILED;

  if(SdService::exists(tp)) SdService::removeFile(tp);
  if(!SdService::writeFile(tp,(const uint8_t*)json.c_str(),json.length())) return RecordStore::RecordError::WRITE_FAILED;

  size_t fsz=0;
  if(!SdService::fileSize(tp,fsz)||fsz!=json.length()){ SdService::removeFile(tp); return RecordStore::RecordError::WRITE_FAILED; }
  size_t got=0;
  if(!SdService::readFile(tp,(uint8_t*)gTestVerify,kMaxTestJsonLen,got)||got!=json.length()||memcmp(gTestVerify,json.c_str(),got)!=0){
    SdService::removeFile(tp); return RecordStore::RecordError::WRITE_FAILED;
  }
  if(!SdService::renameFile(tp,fp)){ SdService::removeFile(tp); return RecordStore::RecordError::COMMIT_FAILED; }
  return RecordStore::RecordError::NONE;
}

RecordStore::RecordError readStoredJson(
    const char* recordId,
    const RecordStore::TestRef& ref,
    char* out,
    size_t capacity,
    size_t& outLen
) {
    outLen = 0;
    if (!gReady) return RecordStore::RecordError::NOT_READY;
    if (!out || capacity == 0) return RecordStore::RecordError::INVALID_ARG;
    if (!recordId || !isSafePathToken(recordId)) return RecordStore::RecordError::INVALID_ARG;
    if (!ref.testId[0] || !isSafePathToken(ref.testId)) return RecordStore::RecordError::INVALID_ARG;
    if (!ref.mode[0] || !ref.savedAt[0]) return RecordStore::RecordError::INVALID_ARG;

    char path[96];
    int n = snprintf(path, sizeof(path), "%s/%s/%s.json", kTestDir, recordId, ref.testId);
    if (n <= 0 || (size_t)n >= sizeof(path)) return RecordStore::RecordError::INVALID_ARG;

    size_t sz = 0;
    if (!SdService::fileSize(path, sz)) {
        SdService::SdError sdErr = SdService::lastError();
        if (sdErr == SdService::SdError::NOT_MOUNTED) return RecordStore::RecordError::NOT_READY;
        if (sdErr == SdService::SdError::NOT_FOUND) return RecordStore::RecordError::MALFORMED;
        return RecordStore::RecordError::READ_FAILED;
    }
    if (sz == 0 || sz > kMaxTestJsonLen) return RecordStore::RecordError::MALFORMED;
    if (sz >= capacity) return RecordStore::RecordError::INVALID_ARG;

    size_t got = 0;
    if (!SdService::readFile(path, (uint8_t*)out, capacity - 1, got)) {
        SdService::SdError sdErr = SdService::lastError();
        if (sdErr == SdService::SdError::NOT_MOUNTED) return RecordStore::RecordError::NOT_READY;
        if (sdErr == SdService::SdError::NOT_FOUND) return RecordStore::RecordError::MALFORMED;
        return RecordStore::RecordError::READ_FAILED;
    }
    if (got != sz) return RecordStore::RecordError::READ_FAILED;

    if (memchr(out, '\0', got) != nullptr) return RecordStore::RecordError::MALFORMED;

    out[got] = '\0';

    // --- Structural guard: find first '{' and last non-whitespace '}' ---------
    size_t i = 0;
    while (i < got && (out[i]==' '||out[i]=='\t'||out[i]=='\n'||out[i]=='\r')) i++;
    if (i >= got || out[i] != '{') return RecordStore::RecordError::MALFORMED;

    size_t j = got - 1;
    while (j > i && (out[j]==' '||out[j]=='\t'||out[j]=='\n'||out[j]=='\r')) j--;
    if (j <= i || out[j] != '}') return RecordStore::RecordError::MALFORMED;

    char id[RecordStore::kMaxTestIdLen + 1] = {0};
    char mode[RecordStore::kMaxModeLen + 1] = {0};
    char completed[RecordStore::kMaxTsLen + 1] = {0};
    bool hasId = false, hasMode = false, hasComp = false;

    size_t p = i + 1;

    auto skipWs = [&]() {
        while (p < j && (out[p]==' '||out[p]=='\t'||out[p]=='\n'||out[p]=='\r')) p++;
    };

    bool firstMember = true;

    while (true) {
        skipWs();

        if (p >= j) {
            if (p == j) break;
            return RecordStore::RecordError::MALFORMED;
        }

        if (!firstMember) {
            if (out[p] != ',') return RecordStore::RecordError::MALFORMED;
            p++;
            skipWs();
            if (p >= j) return RecordStore::RecordError::MALFORMED;
        }
        firstMember = false;

        if (out[p] != '"') return RecordStore::RecordError::MALFORMED;
        p++;
        char key[32]; size_t kLen = 0;
        while (p < j && out[p] != '"') {
            if (out[p] == '\\') {
                if (p + 1 >= j) return RecordStore::RecordError::MALFORMED;
                p++;
                char esc = out[p++];
                if (esc != '"' && esc != '\\' && esc != '/' &&
                    esc != 'n' && esc != 'r' && esc != 't')
                    return RecordStore::RecordError::MALFORMED;
            } else {
                if ((unsigned char)out[p] < 0x20) return RecordStore::RecordError::MALFORMED;
                if (kLen < sizeof(key) - 1) key[kLen++] = out[p];
                p++;
            }
        }
        if (p >= j || out[p] != '"') return RecordStore::RecordError::MALFORMED;
        key[kLen] = '\0';
        p++;

        skipWs();
        if (p >= j || out[p] != ':') return RecordStore::RecordError::MALFORMED;
        p++;
        skipWs();
        if (p >= j) return RecordStore::RecordError::MALFORMED;

        bool isIdentity = false;
        char* dest = nullptr; size_t cap = 0; bool* hasFlag = nullptr;

        if (strcmp(key, "id") == 0)          { isIdentity = true; dest = id;        cap = sizeof(id);        hasFlag = &hasId; }
        else if (strcmp(key, "mode") == 0)   { isIdentity = true; dest = mode;      cap = sizeof(mode);      hasFlag = &hasMode; }
        else if (strcmp(key, "completedAt") == 0) { isIdentity = true; dest = completed; cap = sizeof(completed); hasFlag = &hasComp; }

        if (isIdentity) {
            if (*hasFlag) return RecordStore::RecordError::MALFORMED;
            *hasFlag = true;

            if (out[p] != '"') return RecordStore::RecordError::MALFORMED;
            p++;
            size_t vLen = 0;
            while (p < j && out[p] != '"') {
                if (out[p] == '\\') {
                    if (p + 1 >= j) return RecordStore::RecordError::MALFORMED;
                    p++;
                    char esc = out[p++];
                    char mapped = 0;
                    switch (esc) {
                        case '"':  mapped = '"';  break;
                        case '\\': mapped = '\\'; break;
                        case '/':  mapped = '/';  break;
                        case 'n':  mapped = '\n'; break;
                        case 'r':  mapped = '\r'; break;
                        case 't':  mapped = '\t'; break;
                        default: return RecordStore::RecordError::MALFORMED;
                    }
                    if (vLen >= cap - 1) return RecordStore::RecordError::MALFORMED;
                    dest[vLen++] = mapped;
                } else {
                    if ((unsigned char)out[p] < 0x20) return RecordStore::RecordError::MALFORMED;
                    if (vLen >= cap - 1) return RecordStore::RecordError::MALFORMED;
                    dest[vLen++] = out[p++];
                }
            }
            if (p >= j || out[p] != '"') return RecordStore::RecordError::MALFORMED;
            dest[vLen] = '\0';
            p++;
        } else {
            if (out[p] == '"') {
                p++;
                while (p < j && out[p] != '"') {
                    if (out[p] == '\\') {
                        if (p + 1 >= j) return RecordStore::RecordError::MALFORMED;
                        p += 2;
                    } else {
                        if ((unsigned char)out[p] < 0x20) return RecordStore::RecordError::MALFORMED;
                        p++;
                    }
                }
                if (p >= j || out[p] != '"') return RecordStore::RecordError::MALFORMED;
                p++;
            } else if (out[p] == '{') {
                int depth = 1; p++;
                while (p < j && depth > 0) {
                    if (out[p] == '"') {
                        p++;
                        while (p < j && out[p] != '"') {
                            if (out[p] == '\\') { if (p + 1 >= j) return RecordStore::RecordError::MALFORMED; p += 2; }
                            else p++;
                        }
                        if (p < j) p++;
                    } else {
                        if (out[p] == '{') depth++;
                        else if (out[p] == '}') depth--;
                        p++;
                    }
                }
                if (depth != 0) return RecordStore::RecordError::MALFORMED;
            } else if (out[p] == '[') {
                int depth = 1; p++;
                while (p < j && depth > 0) {
                    if (out[p] == '"') {
                        p++;
                        while (p < j && out[p] != '"') {
                            if (out[p] == '\\') { if (p + 1 >= j) return RecordStore::RecordError::MALFORMED; p += 2; }
                            else p++;
                        }
                        if (p < j) p++;
                    } else {
                        if (out[p] == '[') depth++;
                        else if (out[p] == ']') depth--;
                        p++;
                    }
                }
                if (depth != 0) return RecordStore::RecordError::MALFORMED;
            } else if (out[p] == 't' && p + 4 <= j && memcmp(out + p, "true", 4) == 0) {
                p += 4;
            } else if (out[p] == 'f' && p + 5 <= j && memcmp(out + p, "false", 5) == 0) {
                p += 5;
            } else if (out[p] == 'n' && p + 4 <= j && memcmp(out + p, "null", 4) == 0) {
                p += 4;
            } else if (out[p] == '-' || (out[p] >= '0' && out[p] <= '9')) {
                if (out[p] == '-') p++;
                while (p < j && ((out[p] >= '0' && out[p] <= '9') || out[p] == '.' ||
                       out[p] == 'e' || out[p] == 'E' || out[p] == '+' || out[p] == '-')) p++;
            } else {
                return RecordStore::RecordError::MALFORMED;
            }
        }
    }

    for (size_t t = j + 1; t < got; ++t) {
        if (out[t] != ' ' && out[t] != '\t' && out[t] != '\n' && out[t] != '\r')
            return RecordStore::RecordError::MALFORMED;
    }

    if (!hasId || !hasMode || !hasComp) return RecordStore::RecordError::MALFORMED;

    if (strcmp(id, ref.testId) != 0) return RecordStore::RecordError::MALFORMED;
    if (strcmp(mode, ref.mode) != 0) return RecordStore::RecordError::MALFORMED;
    if (strcmp(completed, ref.savedAt) != 0) return RecordStore::RecordError::MALFORMED;

    outLen = got;
    return RecordStore::RecordError::NONE;
}

} // namespace TestResultStore