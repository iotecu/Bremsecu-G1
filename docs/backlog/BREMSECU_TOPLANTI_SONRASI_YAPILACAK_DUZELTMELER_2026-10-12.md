# Bremsecu - Toplantı Sonrası Yapılacak Düzeltmeler

**Tarih:** 12.10.2026  
**Durum:** Toplantı öncesi çalışan demo sürümü donduruldu. Bu dosya toplantı sonrasında ele alınacak eksikleri ve düzeltmeleri kaybetmemek için oluşturuldu.

> Not: Carousel artık kullanılmıyor. Eski carousel maddeleri backlog kapsamından çıkarılmıştır.

## 1. Yeni araç kaydını gerçekten kalıcı hale getirmek

- PWA tarafında `POST /api/v1/records` çağrı akışı mevcut.
- Ancak mevcut saha durumunda **Yeni Araç > Kaydet** işlemi kalıcı bir kayıt oluşturmuyor.
- Araç kaydı; müşteri, teknisyen, çekici/dorse plaka, şasi, filo/dorse no ve bağlantı tipini kalıcı olarak saklamalı.
- Kayıt oluşturulduğunda aktif servis kaydı kimliği dönmeli ve sonraki test sonuçları bu kayda bağlanmalı.
- Uygulama kapanıp açılsa dahi kayıt bulunabilmeli.

## 2. SD kart altyapısı

Henüz tamamlanmış bir SD kart kayıt çalışması yok.

Plan:
- Araç kayıtlarının SD karta yazılması.
- Test sonuçlarının SD karta yazılması.
- Rapor verilerinin saklanması.
- Eski kayıtların listelenmesi ve aranması.
- Servis/teknisyen geçmişinin saklanması.
- Dosya formatının belirlenmesi (tercihen sade ve kurtarılabilir JSON/CSV yapısı).
- SD kart yoksa / okunamıyorsa kullanıcıya açık hata verilmesi.
- Yazma sırasında güç kesilmesine karşı bozuk dosya riskinin azaltılması.

## 3. RTC entegrasyonu

Henüz RTC ile kayıt/rapor zaman damgası entegrasyonu yapılmadı.

Plan:
- Araç kaydı oluşturulurken RTC timestamp kullanılması.
- Her test sonucuna RTC tarih/saat damgası eklenmesi.
- Raporların RTC tarih/saat bilgisiyle oluşturulması.
- Cihaz açılışında RTC geçerlilik kontrolü.
- RTC tarihi geçersizse kullanıcıya uyarı.
- Tablet/telefon saatine bağımlılığın kaldırılması.

## 4. Gerçek rapor sistemi

Rapor ekranları mevcut olsa da gerçek rapor kayıt zinciri tamamlanmış değildir.

Yapılacaklar:
- Aktif araç kaydına test sonuçlarının eklenmesi.
- ISO7638 sonuçları.
- ISO12098 sonuçları.
- Kablo testi sonuçları.
- CAN terminasyon sonuçları.
- Lamba testi sonuçları.
- Müşteri, teknisyen, çekici/dorse bilgileri.
- Tarih/saat.
- Teknisyen notu.
- PASS/FAIL durumları ve ölçülen gerçek değerler.
- Kaydet / kaydetmeden çık davranışlarının gerçek veriye uygulanması.
- Eski raporu çağırma.
- Daha sonra PDF/çıktı yapısı.

## 5. Eski kayıtlar

- Eski kayıt ekranı gerçek SD verisine bağlanmalı.
- Plaka ile arama.
- Şasi ile arama.
- Müşteri ile arama.
- Dorse/filo numarası ile arama.
- Eski kaydı açıp raporu görüntüleme.
- Eski kaydı yeniden aktif edip tekrar test etme.

## 6. Kalibrasyon

- ISO7638 voltaj kanalları.
- ISO12098 voltaj kanalları.
- GND ölçüm zinciri.
- CAN-H.
- CAN-L.
- Özellikle dorse CAN tarafı.
- Kalibrasyon katsayılarının kalıcı olarak saklanması.
- Referans multimetre ile sistematik doğrulama.

## 7. CAN terminasyon testi

- Gerçek 120 ohm / 60 ohm hesabı tamamlanmalı.
- CAN-H ile CAN-L farkından direnç çıkarmaya çalışan eski/yanlış mantık varsa tamamen kaldırılmalı.
- Hesap gerçek test akımı / hat düşümü ölçüm mantığına göre sabitlenmeli.
- Ekranda gerçek direnç değeri gösterilmeli.
- Çekici ve dorse tarafı ayrı ayrı doğrulanmalı.
- Enerjisiz CAN hattı güvenlik koşulu korunmalı.

## 8. Test sonuçlarının kayıt mantığı

- PASS/FAIL yalnız ekranda kalmamalı.
- Her pin sonucu aktif araç kaydına bağlanmalı.
- Ölçülen ham değer ve mühendislik değeri saklanmalı.
- Test başlangıç/bitiş zamanı saklanmalı.
- Kaydet ve kaydetmeden çık akışları gerçek kayıt durumunu değiştirmeli.
- Testten çıkarken fiziksel çıkışların OFF olduğu garanti edilmeli.

## 9. Teknisyen sistemi

Mevcut toplantı sürümünde:
- Ayarlar içinde teknisyen kaydı çalışıyor.
- Yeni Araç ekranında teknisyen seçiminde güvenli butonlu çözüm kullanılıyor.

Toplantı sonrası:
- Seçilen teknisyenin araç kaydına gerçekten yazıldığı doğrulanmalı.
- Seçilen teknisyenin rapora taşındığı doğrulanmalı.
- İstenirse daha sonra Bremsecu tasarımlı özel dropdown/list picker yapılabilir.

## 10. Android / PWA ürünleştirme

Mevcut toplantı sürümünde:
- Fullscreen çalışıyor.
- Ekran uyumuyor.
- ESP bağlantısı çalışıyor.
- HTTP tarafında native Capacitor HTTP kullanılarak `Failed to fetch` sorunu giderildi.
- Telefon ve tablette çalışma doğrulandı.

Toplantı sonrası:
- Ayarlar içindeki "ekranı açık tut" seçeneği native Android davranışını gerçekten kontrol etmeli.
- Arka plan / ön plan geçişleri tekrar test edilmeli.
- Wi-Fi kopma / ESP kapanıp açılma senaryoları test edilmeli.
- Release APK hazırlanmalı.
- Debug/Android Studio bağımlılığı kaldırılmalı.
- Temiz kurulum testi yapılmalı.

## 11. Gerçek donanımla uçtan uca saha doğrulaması

### ISO7638
- Tüm pinlerin gerçek araç/dorse beslemeleriyle doğrulanması.
- GND ölçümleri.
- CAN DC değerleri.

### ISO12098
- Tüm pinlerin gerçek araç/dorse üzerinde doğrulanması.
- Pin 10/11/12 koşullu fonksiyon akışları.
- Pin 14/15 CAN görünürlüğü ve ölçümü.

### Kablo testi
- Seçilen pine 3.3 V sürme.
- Karşı pinlerin taranması.
- Açık devre / doğru pin / kısa devre / yanlış pin ayrımı.
- PASS/FAIL eşikleri.

### Lamba testi
- Tüm ISO12098 lamba kanalları.
- ON/OFF komutlarının fiziksel çıkışla eşleşmesi.
- Akım ölçümü.
- PASS/FAIL sınırlarının belirlenmesi.
- Dingil kaldırma fonksiyonunun tamamlanması veya ürün hazır olana kadar açıkça devre dışı bırakılması.

## 12. Batarya ekranı

Düşük öncelik.

- Gerçek batarya voltajı.
- Akım.
- Güç.
- Yüzde hesabı.
- INA226 verisinin UI'a bağlanması.
- Şarj/deşarj davranışlarının doğrulanması.

---

## Öncelik sırası

### P1 - Veri altyapısı
1. SD kart
2. RTC
3. Kalıcı yeni araç kaydı
4. Gerçek rapor zinciri
5. Eski kayıtlar

### P2 - Ölçüm doğruluğu
1. Kalibrasyon
2. CAN terminasyon
3. Gerçek donanımla uçtan uca test doğrulaması

### P3 - Ürünleştirme
1. Android/PWA yaşam döngüsü
2. Release APK
3. UI son rötuşları
4. Batarya ekranı

## Toplantı öncesi kural

Çalışan toplantı sürümüne yeni özellik eklenmeyecek. Telefon ve tablette doğrulanan mevcut demo sürümü toplantı bitene kadar dondurulacaktır.
