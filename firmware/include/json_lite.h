#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — json_lite.h
// Minimal transport-level extractors for FIXED, small API request schemas.
// This is intentionally not a general-purpose JSON parser.
//
// Package 10 hardening:
// - only unescaped top-level object members may satisfy a requested key;
// - duplicate requested keys, malformed structure, and trailing garbage fail;
// - strings validate JSON escapes/control characters;
// - booleans require complete true/false tokens;
// - uint32 values require strict unsigned decimal JSON integer syntax.
// =============================================================================

#include <Arduino.h>
#include <cstdint>
#include <cstring>

namespace JsonLite {
namespace detail {
inline bool isWs(char c){return c==' '||c=='\t'||c=='\n'||c=='\r';}
inline void skipWs(const String& b,size_t& p){while(p<b.length()&&isWs(b[p]))++p;}
inline bool isHex(char c){return(c>='0'&&c<='9')||(c>='a'&&c<='f')||(c>='A'&&c<='F');}
inline bool isValueTerminator(char c){return c=='\0'||c==','||c=='}'||c==']'||isWs(c);}

inline bool skipString(const String& b,size_t& p){
  if(p>=b.length()||b[p]!='"')return false;
  ++p;
  while(p<b.length()){
    const unsigned char c=(unsigned char)b[p++];
    if(c=='"')return true;
    if(c<0x20)return false;
    if(c!='\\')continue;
    if(p>=b.length())return false;
    const char e=b[p++];
    if(e=='u'){
      for(uint8_t i=0;i<4;++i){if(p>=b.length()||!isHex(b[p]))return false;++p;}
    }else if(!(e=='"'||e=='\\'||e=='/'||e=='b'||e=='f'||e=='n'||e=='r'||e=='t'))return false;
  }
  return false;
}

inline bool skipValue(const String& b,size_t& p){
  skipWs(b,p);if(p>=b.length())return false;
  if(b[p]=='"')return skipString(b,p);
  if(b[p]=='{'){
    ++p;skipWs(b,p);if(p<b.length()&&b[p]=='}'){++p;return true;}
    while(p<b.length()){
      if(!skipString(b,p))return false;skipWs(b,p);
      if(p>=b.length()||b[p]!=':')return false;++p;
      if(!skipValue(b,p))return false;skipWs(b,p);
      if(p<b.length()&&b[p]==','){++p;skipWs(b,p);continue;}
      if(p<b.length()&&b[p]=='}'){++p;return true;}
      return false;
    }
    return false;
  }
  if(b[p]=='['){
    ++p;skipWs(b,p);if(p<b.length()&&b[p]==']'){++p;return true;}
    while(p<b.length()){
      if(!skipValue(b,p))return false;skipWs(b,p);
      if(p<b.length()&&b[p]==','){++p;skipWs(b,p);continue;}
      if(p<b.length()&&b[p]==']'){++p;return true;}
      return false;
    }
    return false;
  }
  const size_t start=p;
  while(p<b.length()&&!isValueTerminator(b[p]))++p;
  return p>start;
}

inline bool findKey(const String& b,const char* key,size_t& valuePos){
  if(!key)return false;
  size_t p=0;skipWs(b,p);if(p>=b.length()||b[p]!='{')return false;++p;
  bool found=false;size_t foundPos=0;skipWs(b,p);
  if(p<b.length()&&b[p]=='}')return false;
  while(p<b.length()){
    if(b[p]!='"')return false;
    const size_t keyStart=p+1;bool escaped=false;++p;
    while(p<b.length()){
      const unsigned char c=(unsigned char)b[p++];
      if(c=='"')break;
      if(c<0x20)return false;
      if(c!='\\')continue;
      escaped=true;if(p>=b.length())return false;
      const char e=b[p++];
      if(e=='u'){for(uint8_t i=0;i<4;++i){if(p>=b.length()||!isHex(b[p]))return false;++p;}}
      else if(!(e=='"'||e=='\\'||e=='/'||e=='b'||e=='f'||e=='n'||e=='r'||e=='t'))return false;
    }
    if(p==0||b[p-1]!='"')return false;
    const size_t keyEnd=p-1;skipWs(b,p);
    if(p>=b.length()||b[p]!=':')return false;++p;skipWs(b,p);
    const size_t candidatePos=p;
    const size_t keyLen=keyEnd-keyStart;
    const bool match=!escaped&&std::strlen(key)==keyLen&&std::strncmp(b.c_str()+keyStart,key,keyLen)==0;
    if(match){if(found)return false;found=true;foundPos=candidatePos;}
    if(!skipValue(b,p))return false;skipWs(b,p);
    if(p<b.length()&&b[p]==','){++p;skipWs(b,p);continue;}
    if(p<b.length()&&b[p]=='}'){
      ++p;skipWs(b,p);if(p!=b.length())return false;
      if(found)valuePos=foundPos;return found;
    }
    return false;
  }
  return false;
}
} // namespace detail

inline bool hasKey(const String& b,const char* key){size_t p=0;return detail::findKey(b,key,p);}

inline bool getString(const String& b,const char* key,String& out){
  size_t p=0;if(!detail::findKey(b,key,p)||p>=b.length()||b[p]!='"')return false;
  out="";
  for(size_t i=p+1;i<b.length();++i){
    const unsigned char c=(unsigned char)b[i];
    if(c<0x20)return false;
    if(c=='"')return true;
    if(c=='\\'){
      if(++i>=b.length())return false;
      switch(b[i]){case '"':out+='"';break;case '\\':out+='\\';break;case '/':out+='/';break;case 'b':out+='\b';break;case 'f':out+='\f';break;case 'n':out+='\n';break;case 'r':out+='\r';break;case 't':out+='\t';break;default:return false;}
    }else out+=(char)c;
    if(out.length()>64)return false;
  }
  return false;
}

inline bool getBool(const String& b,const char* key,bool& out){
  size_t p=0;if(!detail::findKey(b,key,p))return false;const char* s=b.c_str()+p;
  if(std::strncmp(s,"true",4)==0&&detail::isValueTerminator(s[4])){out=true;return true;}
  if(std::strncmp(s,"false",5)==0&&detail::isValueTerminator(s[5])){out=false;return true;}
  return false;
}

inline bool getUint32(const String& b,const char* key,uint32_t& out){
  size_t p=0;if(!detail::findKey(b,key,p))return false;
  if(p>=b.length()||b[p]<'0'||b[p]>'9')return false;
  if(b[p]=='0'&&p+1<b.length()&&b[p+1]>='0'&&b[p+1]<='9')return false;
  uint32_t v=0;size_t i=p;
  for(;i<b.length()&&b[i]>='0'&&b[i]<='9';++i){
    const uint32_t d=(uint32_t)(b[i]-'0');
    if(v>429496729u||(v==429496729u&&d>5u))return false;
    v=v*10u+d;
  }
  const char end=i<b.length()?b[i]:'\0';
  if(!detail::isValueTerminator(end))return false;
  out=v;return true;
}

} // namespace JsonLite
