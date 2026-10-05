# Bremsecu ESP32 ekran testi

Bu bağımsız yazılım, PWA ekranlarını boş bir ESP32'nin Wi-Fi ağı üzerinden açar.
Ölçüm donanımı gerekmez. ADC, röle ve teşhis firmware'i bu projeye dahil değildir.
Bütün ölçüm değerleri örnektir; gerçek araç testi yapılmaz.

## Desteklenen kart

Klasik ESP32 DevKit / ESP32-WROOM, en az 4 MB flash (`esp32dev`).
ESP32-C3, S2 ve S3 için bu derleme kullanılmaz. Kart USB'den beslenir.
Yükleme karttaki mevcut uygulama ve dosya sistemi bölümlerinin üzerine yazar;
bu aşamada ayrılan boş test kartı kullanılmalıdır.

## Derleme ve USB yükleme

Bilgisayarda Node.js ve PlatformIO Core gerekir. Depo kökünde:

```sh
cd pwa
npm ci
npm run build:screen-test
cd ..
pio run -d firmware/screen-test
pio run -d firmware/screen-test -t upload --upload-port COM5
pio run -d firmware/screen-test -t uploadfs --upload-port COM5
```

`COM5` yerine kendi USB portunu yazın. Linux/macOS örneği `/dev/ttyUSB0`.
Hem uygulama hem dosya sistemi yüklenmelidir. `data/` ekran derlemesiyle
üretilir; bu klasör veya `.pio/` Git'e eklenmez. Seri monitör hızı 115200'dür.
Gerekirse BOOT tuşuyla kartı yükleme moduna alın, yükleme sonrası RESET'e basın.

Bölümler: uygulama `0x10000`, LittleFS `0x190000`, dosya sistemi kapasitesi
`0x270000` bayt. OTA bu ekran test paketinin kapsamına dahil değildir.

## Telefonda açma

1. Telefon/tabletten **BREMSECU-EKRAN-TEST** ağına bağlanın.
2. Şifre: **bremsecu-test**.
3. İnternet yok uyarısı gelirse bu ağa bağlı kalın.
4. Tarayıcıda **http://192.168.4.1/** adresini açın.

Uygulama doğrudan açılır; üstte ekran seçme menüsü yoktur. Girişten sonra
araç kayıt ekranı ve ana test carousel'i kullanılır. Ana carousel döngülüdür;
ana, CAN ve kablo carousel'leri parmakla veya oklarla kaydırılabilir. Home her
zaman ISO7638 voltaj başlangıç kartına döner. Örnek kayıt ve ölçüm sonuçları
yalnızca RAM'dedir. Sayfa yenilenince örnek veriler sıfırlanır; dil tercihi kalır.

Wi-Fi simgesi ESP'nin sağlık yanıtını 1,5 saniye aralıkla kontrol eder. Yanıt
alınmazsa kırmızıya döner; yeşil/beyaz görünüm sunucuya erişildiğini gösterir.
Bu gösterge kablosuz sinyal seviyesini veya ölçüm donanımını göstermez.

Üstteki BREMSECU logosuna dokunmak destekleyen tarayıcılarda tam ekranı açar
veya kapatır. HTTP hotspot üzerinden kısayol eklemek, bağımsız PWA kurulumu
anlamına gelmez; gerçek kurulum ve service-worker çevrimdışı çalışması güvenli
sunum ortamında ayrıca doğrulanmalıdır. Bu paket HTTPS/kurulum çözümü değildir.

Ekran test servisleri yalnızca sağlık adresine erişir; donanım API komutu veya
WebSocket kullanmaz. ESP sunucusu donanım API komutlarını kabul etmez. Voltaj,
kablo, CAN ve lamba düğmeleri yalnızca örnek sonuçları günceller. Voltaj
satırlarındaki düğmeler gösterilen ölçüm odağını değiştirir; gerçek firmware'in
ölçüm taramasını değiştirmez. Kablo pin seçimleri mevcut enabledPinMask sözleşmesini
kullanır. Koşullu pinler ve dingil için güvenlik onayı korunur.

Normal üretim derlemesine örnek kayıt ve senaryolar dahil edilmez. Gerçek ölçüm,
kalıcı kayıt ve PDF çıktısı bu boş kart paketinin kabul testi değildir.

## İlk fiziksel kontrol

- Giriş, kayıt ekranı ve ana/alt carousel geçişleri açılıyor mu?
- Telefon/dikey-yatay yön, tablet, dokunma ve geri/ana sayfa geçişleri uygun mu?
- 14 dil ve Arapça/Farsça yönü uygun mu?
- Her iki voltaj ekranında PASS, iki pin FAIL ve bekleyen sınıflandırma görünüyor mu?
- FAIL penceresini kapatma/inceleme ve yeniden açma çalışıyor mu?
- Sayfa yenileme ve ESP yeniden başlatma sonrası dosyalar tekrar açılıyor mu?

Otomatik DOM kontrolleri piksel karşılaştırması ve gerçek telefon testinin
yerine geçmez. Fiziksel kartta yükleme ve bu kontroller ayrıca yapılmalıdır.

## İkili ZIP paketini yeniden üretme

PWA ve firmware derlemelerinden sonra dosya sistemi imajını da üretin:

```sh
pio run -d firmware/screen-test -t buildfs
python firmware/screen-test/package.py --output /tmp/Bremsecu-ESP32-Ekran-Test.zip
```

ZIP, klasik ESP32'nin boş 4 MB belleğine yazılacak birleşik imajı, ayrı
ikili dosyaları, SHA-256 özetlerini ve hazır ikili yükleme talimatlarını içerir.
