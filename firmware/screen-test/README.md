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

Üst panelden 40 ekran seçilir. PASS örneği, çoklu FAIL ve sınıflandırma bekliyor
bağlantıları ISO7638/ISO12098 voltaj ekranlarını bellek içindeki örnek telemetriyle
çalıştırır. Diğer ekranlar görünüm ve gezinme incelemesi içindir. Dil seçimi
mevcut PWA'nın 14 dilini kullanır. Panelin Türkçe test açıklaması sabit kalır.
Sayfa yenilenince örnek kayıt ve senaryo verileri sıfırlanır; dil tercihi tarayıcıda kalır.

Ekran test giriş noktası gerçek HTTP/WebSocket servislerini başlatmaz.
ESP sunucusu donanım API komutlarını kabul etmez. Normal üretim derlemesine
test paneli ve bu senaryo kayıtları dahil edilmez.

Bu HTTP hotspot paketi tarayıcıda ekran incelemesi içindir. Ana ekrana kurulma,
service-worker çevrimdışı önbelleği, gerçek ölçüm, kalıcı kayıt ve PDF çıktısı
bu paketin kabul testi değildir. Bunlar üretim firmware'i ve uygun sunum
ortamıyla ayrıca doğrulanmalıdır.

## İlk fiziksel kontrol

- İlk ekran ve 40 ekran seçimi açılıyor mu?
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
