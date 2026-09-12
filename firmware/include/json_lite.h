#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — json_lite.h
// Minimal transport-level extractors for FIXED, small API request schemas.
// This is intentionally not a general-purpose JSON parser.
//
// Package 10 hardening:
// - only unescaped top-level object members may satisfy a requested key;
// - duplicate requested keys, malformed structure, and trailing garbage fail;
// - all skipped values are still validated as legal JSON;
// - strings validate JSON escapes/control characters;
// - booleans require complete true/false tokens;
// - uint32 values require strict unsigned decimal JSON integer syntax.
// =============================================================================

#include <Arduino.h>
#include <cstdint>
#include <cstring>

namespace JsonLite {

enum class FieldStatus : uint8_t { ABSENT = 0, OK, INVALID };

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

inline bool skipLiteral(const String& b,size_t& p,const char* literal){
  const size_t n=std::strlen(literal);
  if(p+n>b.length()||std::strncmp(b.c_str()+p,literal,n)!=0)return false;
  const char end=(p+n<b.length())?b[p+n]:'\0';
  if(!isValueTerminator(end))return false;
  p+=n;
  return true;
}

inline bool skipNumber(const String& b,size_t& p){
  const size_t n=b.length();
  size_t i=p;
  if(i<n&&b[i]=='-')++i;
  if(i>=n)return false;

  if(b[i]=='0'){
    ++i;
    if(i<n&&b[i]>='0'&&b[i]<='9')return false;
  }else if(b[i]>='1'&&b[i]<='9'){
    do{++i;}while(i<n&&b[i]>='0'&&b[i]<='9');
  }else return false;

  if(i<n&&b[i]=='.'){
    ++i;
    const size_t fracStart=i;
    while(i<n&&b[i]>='0'&&b[i]<='9')++i;
    if(i==fracStart)return false;
  }

  if(i<n&&(b[i]=='e'||b[i]=='E')){
    ++i;
    if(i<n&&(b[i]=='+'||b[i]=='-'))++i;
    const size_t expStart=i;
    while(i<n&&b[i]>='0'&&b[i]<='9')++i;
    if(i==expStart)return false;
  }

  const char end=i<n?b[i]:'\0';
  if(!isValueTerminator(end))return false;
  p=i;
  return true;
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
  if(b[p]=='t')return skipLiteral(b,p,"true");
  if(b[p]=='f')return skipLiteral(b,p,"false");
  if(b[p]=='n')return skipLiteral(b,p,"null");
  if(b[p]=='-'||(b[p]>='0'&&b[p]<='9'))return skipNumber(b,p);
  return false;
}

inline FieldStatus findKeyStatus(const String& b,const char* key,size_t& valuePos){
  if(!key)return FieldStatus::INVALID;
  size_t p=0;skipWs(b,p);if(p>=b.length()||b[p]!='{')return FieldStatus::INVALID;++p;
  bool found=false;size_t foundPos=0;skipWs(b,p);
  if(p<b.length()&&b[p]=='}'){
    ++p;skipWs(b,p);
    return p==b.length()?FieldStatus::ABSENT:FieldStatus::INVALID;
  }
  while(p<b.length()){
    if(b[p]!='"')return FieldStatus::INVALID;
    const size_t keyStart=p+1;bool escaped=false;++p;
    while(p<b.length()){
      const unsigned char c=(unsigned char)b[p++];
      if(c=='"')break;
      if(c<0x20)return FieldStatus::INVALID;
      if(c!='\\')continue;
      escaped=true;if(p>=b.length())return FieldStatus::INVALID;
      const char e=b[p++];
      if(e=='u'){for(uint8_t i=0;i<4;++i){if(p>=b.length()||!isHex(b[p]))return FieldStatus::INVALID;++p;}}
      else if(!(e=='"'||e=='\\'||e=='/'||e=='b'||e=='f'||e=='n'||e=='r'||e=='t'))return FieldStatus::INVALID;
    }
    if(p==0||b[p-1]!='"')return FieldStatus::INVALID;
    const size_t keyEnd=p-1;skipWs(b,p);
    if(p>=b.length()||b[p]!=':')return FieldStatus::INVALID;++p;skipWs(b,p);
    const size_t candidatePos=p;
    const size_t keyLen=keyEnd-keyStart;
    const bool match=!escaped&&std::strlen(key)==keyLen&&std::strncmp(b.c_str()+keyStart,key,keyLen)==0;
    if(match){if(found)return FieldStatus::INVALID;found=true;foundPos=candidatePos;}
    if(!skipValue(b,p))return FieldStatus::INVALID;skipWs(b,p);
    if(p<b.length()&&b[p]==','){++p;skipWs(b,p);continue;}
    if(p<b.length()&&b[p]=='}'){
      ++p;skipWs(b,p);if(p!=b.length())return FieldStatus::INVALID;
      if(found){valuePos=foundPos;return FieldStatus::OK;}
      return FieldStatus::ABSENT;
    }
    return FieldStatus::INVALID;
  }
  return FieldStatus::INVALID;
}

inline bool findKey(const String& b,const char* key,size_t& valuePos){
  return findKeyStatus(b,key,valuePos)==FieldStatus::OK;
}
} // namespace detail

inline bool hasKey(const String& b,const char* key){size_t p=0;return detail::findKeyStatus(b,key,p)==FieldStatus::OK;}

inline FieldStatus getOptionalString(const String& b,const char* key,String& out,size_t maxLen=64){
  size_t p=0;
  const FieldStatus st=detail::findKeyStatus(b,key,p);
  if(st!=FieldStatus::OK)return st;
  if(p>=b.length()||b[p]!='"')return FieldStatus::INVALID;
  out="";
  for(size_t i=p+1;i<b.length();++i){
    const unsigned char c=(unsigned char)b[i];
    if(c<0x20)return FieldStatus::INVALID;
    if(c=='"')return FieldStatus::OK;
    if(c=='\\'){
      if(++i>=b.length())return FieldStatus::INVALID;
      switch(b[i]){case '"':out+='"';break;case '\\':out+='\\';break;case '/':out+='/';break;case 'b':out+='\b';break;case 'f':out+='\f';break;case 'n':out+='\n';break;case 'r':out+='\r';break;case 't':out+='\t';break;default:return FieldStatus::INVALID;}
    }else out+=(char)c;
    if(out.length()>maxLen)return FieldStatus::INVALID;
  }
  return FieldStatus::INVALID;
}

inline bool getString(const String& b,const char* key,String& out,size_t maxLen=64){
  return getOptionalString(b,key,out,maxLen)==FieldStatus::OK;
}

inline bool getBool(const String& b,const char* key,bool& out){
  size_t p=0;if(detail::findKeyStatus(b,key,p)!=FieldStatus::OK)return false;const char* s=b.c_str()+p;
  if(std::strncmp(s,"true",4)==0&&detail::isValueTerminator(s[4])){out=true;return true;}
  if(std::strncmp(s,"false",5)==0&&detail::isValueTerminator(s[5])){out=false;return true;}
  return false;
}

inline bool getUint32(const String& b,const char* key,uint32_t& out){
  size_t p=0;if(detail::findKeyStatus(b,key,p)!=FieldStatus::OK)return false;
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
