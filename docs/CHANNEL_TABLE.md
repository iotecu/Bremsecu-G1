# CHANNEL TABLE — BREMSECU G1-V2
**STATUS: FROZEN v1.2**
Kaynak: MASTER NET MAP v1.3 (FROZEN) | RTC: DS3231 (CONFIRMED)

## Varsayımlar ve doğrulama
- TPIC zinciri: MSB-first, zincir başı U6 (MCU SER -> U6 -> U5 -> U4 -> U3).
- "SW Bit" = 32-bit TPIC word içindeki yazılım bit indeksi (TPIC fiziksel bit no DEĞİL).
- U6 D0-7 = bit 0-7 | U5 D0-7 = bit 8-15 | U4 D0-7 = bit 16-23 | U3 D0-7 = bit 24-31.
- Bu tablo, ilk bring-up'taki blink self-test ile bir kez fiziksel teyit edilince CONFIRMED işaretlenir.
- Limitler G1 fw v10.6'dan taşınmıştır; V2 kartta kalibrasyonla DOĞRULANACAKTIR.

## ISO 7638 (7 pin)
| Pin | Fonksiyon (TR) | (EN) | Net | AIN | MUX | OUT | SW Bit (32-bit TPIC word) | Tip | Voltaj test | Kablo test |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | AKU | BATTERY | 7P_AKU | 0 | 1 | OUT1 | 24 | 24V | 18–30V | 2–5V |
| 2 | KONTAK | IGNITION | 7P_KONTAK | 0 | 2 | OUT2 | 25 | 24V | 18–30V | 2–5V |
| 3 | GND | GND | 7P_GND1 | 0 | 0 | OUT3 | 26 | GND | 0.3–1.0V | 2–5V |
| 4 | GND | GND | 7P_GND2 | 0 | 3 | OUT4 | 27 | GND | 0.3–1.0V | 2–5V |
| 5 | ABS | ABS | 7P_ABS | 0 | 4 | OUT5 | 28 | 24V | 18–30V | 2–5V |
| 6 | CAN H | CAN H | 7P_CAN_H | 0 | 6 | OUT6 | 29 | CAN | 1.3–7.0V | 2–5V |
| 7 | CAN L | CAN L | 7P_CAN_L | 0 | 7 | OUT7 | 30 | CAN | 0.9–7.0V | 2–5V |

## ISO 12098 (15 pin)
| Pin | Fonksiyon (TR) | (EN) | Net | AIN | MUX | OUT | SW Bit (32-bit TPIC word) | Tip | Voltaj test | Kablo test |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | SOL SİNYAL | LEFT SIGNAL | 15P_SOL_SINYAL | 1 | 4 | OUT8 | 31 | PULSE | 18–30V + edge | 2–5V |
| 2 | SAĞ SİNYAL | RIGHT SIGNAL | 15P_SAG_SINYAL | 1 | 2 | OUT9 | 16 | PULSE | 18–30V + edge | 2–5V |
| 3 | ARKA SİS | REAR FOG | 15P_SIS | 1 | 1 | OUT10 | 17 | 24V | 18–30V | 2–5V |
| 4 | ŞASE | GND | 15P_GND3 | 2 | 6 | OUT11 | 18 | GND | 0.3–1.0V | 2–5V |
| 5 | SOL PARK | LEFT PARK | 15P_SOL_PARK | 1 | 0 | OUT12 | 19 | 24V | 18–30V | 2–5V |
| 6 | SAĞ PARK | RIGHT PARK | 15P_SAG_PARK | 1 | 3 | OUT13 | 20 | 24V | 18–30V | 2–5V |
| 7 | STOP LAMBASI | STOP LAMP | 15P_STOP | 1 | 7 | OUT14 | 21 | 24V | 18–30V | 2–5V |
| 8 | GERİ VİTES | REVERSE GEAR | 15P_GERI | 1 | 6 | OUT15 | 22 | 24V | 18–30V | 2–5V |
| 9 | SÜREKLİ +24V | CONTINUOUS +24V | 15P_AKU | 1 | 5 | OUT16 | 23 | 24V | 18–30V | 2–5V |
| 10 | BALATA AŞINMA | PAD WEAR | 15P_BALATA_SINYAL | 2 | 0 | OUT17 | 8 | 24V | 18–30V | 2–5V |
| 11 | FREN SİSTEMİ | BRAKE SYSTEM | 15P_YAYLI | 2 | 2 | OUT18 | 9 | 24V | 18–30V | 2–5V |
| 12 | DİNGİL KALDIRMA | AXLE LIFT | 15P_ASANSOR | 2 | 1 | OUT19 | 10 | 24V | 18–30V | 2–5V |
| 13 | ŞASE | GND | 15P_GND4 | 2 | 7 | OUT20 | 11 | GND | 0.3–1.0V | 2–5V |
| 14 | CAN H | CAN H | 15P_CAN_H | 3 | 3 | OUT21 | 12 | CAN | 1.3–7.0V | 2–5V |
| 15 | CAN L | CAN L | 15P_CAN_L | 2 | 4 | OUT22 | 13 | CAN | 0.9–7.0V | 2–5V |

## CAN ölçüm kanalları (soket sürüşü YOK; taraf röleyle seçilir)
| Net | AIN | MUX | Seçim | İnterlock |
|---|---|---|---|---|
| CANH_1_R | 3 | 0 | K2 (7638 CK) **veya** K4 (7638 DR) | K2+K4 asla aynı anda |
| CANL_1_R | 3 | 1 | (CANH_1_R ile aynı seçim) | — |
| CANH_2_R | 3 | 2 | K3 (12098 CK) **veya** K5 (12098 DR) | K3+K5 asla aynı anda |
| CANL_2_R | 2 | 5 | (CANH_2_R ile aynı seçim) | — |

Not: `_R` düğümü seçilen tarafın rölesiyle enerjilenir; firmware her ölçümde
yalnızca TEK taraf rölesini enerjiler.

## Röleler (U6)
| SW Bit | Röle | Fonksiyon | Güvenlik |
|---|---|---|---|
| 0 | K4 | CAN7638_DR | K2 ile aynı anda ASLA |
| 1 | K5 | CAN12098_DR | K3 ile aynı anda ASLA |
| 2-3 | — | NC | — |
| 4 | K3 | CAN12098_CK | K5 ile aynı anda ASLA |
| 5 | K2 | CAN7638_CK | K4 ile aynı anda ASLA |
| 6 | K1 | SELECT_V | **OFF=3.3V / ON=24V (CONFIRMED)** — 24V yalnız yük ve dingil kaldırma testlerinde |
| 7 | K6 | MASTER_GND | sadece bilinçli test fonksiyonu |

## SELECT_V Güvenlik Durum Makinesi
Durumlar:
- SAFE (default): K1 OFF  -> SELECT_V = 3.3V
- LOAD:            K1 ON   -> SELECT_V = 24V

SAFE'e dönüş tetikleyicileri (istisnasız):
- power-up / reset / watchdog
- fault (INA226 overcurrent, beklenmeyen enerji, interlock ihlali)
- test bitti / stop komutu
- LOAD max-hold timeout (öneri: 30 sn, kalibrasyonla ayarlanır)

SAFE -> LOAD geçişi:
- yalnızca LAMP/LOAD veya ASANSOR-DINGIL testinin açık start komutuyla

LOAD durumunda yasaklar:
- CABLE / CROSS-SCAN başlatılamaz (3.3V penceresi varsayımıyla çelişir)
- CAN TERMINATION başlatılamaz (terminasyon 3.3V/1.5k prensibiyle çalışır)

Mod -> K1 eşlemesi:
| Mod | K1 |
|---|---|
| VOLTAGE (pasif ölçüm) | OFF |
| CABLE / CROSS-SCAN | OFF |
| CAN TERMINATION | OFF |
| LAMP / LOAD | ON |
| ASANSOR-DINGIL | ON |

## ASLA örneklenmeyecek NC slotlar
AIN0→step5 | AIN2→step3 | AIN3→step4,5,6,7

## Pulse GPIO
SAG_PULS = GPIO36 | SOL_PULS = GPIO39 (G1'e göre TAKASLI!)

## Açık konfigürasyon parametreleri
- INA226 address = TBD / VERIFY ON FIRST HARDWARE BOOT
  (I2C scan + reg 0xFE==0x5449 / 0xFF==0x2260 pozitif kimlik; bulunamazsa K1/24V lockout)
- TPIC SW Bit map = blink self-test ile CONFIRMED edilecek

## CHANGELOG
- v1.0 FROZEN: CAN seçim sütunu CK+DR düzeltmesi; "Bit" → "SW Bit (32-bit TPIC word)"; DS3231 confirmed.
- v1.1: K1 SELECT_V yönü CONFIRMED (OFF=3.3V / ON=24V); SELECT_V güvenlik durum makinesi eklendi.
- v1.2: INA226 adres politikası (TBD / ilk donanım açılışında doğrula; pozitif kimlik; yoksa 24V lockout).
