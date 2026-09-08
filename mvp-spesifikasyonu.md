# MVP Spesifikasyonu ve Devir Paketi

**Sürüm:** 1.0
**Tarih:** 7 Eylül 2026
**Amaç:** Claude Code ile geliştirmeye başlamak için tek referans doküman.

**İlgili dokümanlar:**
- `etut-portali-proje-dokumani.md` — vizyon, mimari, maliyet motoru
- `etut-surec-modeli.md` — etüt aşamaları A1–A13
- `etut-veri-modeli.md` — varlıklar ve alanlar
- `kat-plani-uretim-mimarisi.md` — plan üretim katmanları L0–L4

---

## 1. Tek Cümlelik Tanım

Parselin imar verisi girilir; sistem yapılaşabilir zarfı hesaplar, kat planını üretir, plandan gerçek metrajı çıkarır, kalem bazlı maliyeti ve paylaşım senaryosunu hesaplar, denetlenebilir bir fizibilite raporu verir.

---

## 2. Teknoloji Kararları

| Karar | Seçim |
|---|---|
| Uygulama | Next.js (App Router) |
| Veritabanı | PostgreSQL |
| ORM | Prisma |
| Kiracılık | Tek kiracı, çok kiracıya hazır (`organizationId` baştan) |
| Bölge paketi | Ayrı tablo kümesi, projede sürüm dondurulur |
| 2B editör | Tarayıcıda tuval tabanlı vektör editör |
| Geometri | Sunucu tarafı poligon işlemleri (offset, kesişim, alan, çevre) |
| Kimlik | Basit — MVP'de tek organizasyon, dış erişim yok |

---

## 3. İş Paketleri

Sıra, bağımlılığa göredir. Her paket kendi başına test edilebilir olmalı.

### İP-1 — Temel altyapı
- Prisma şeması (bkz. `etut-veri-modeli.md`)
- `organizationId` tüm kök varlıklarda, tek organizasyon seed
- Proje CRUD, kademe (K1/K2/K3) alanı
- Bölge paketi tabloları + sürüm dondurma mekanizması
- Hesaplanan alan altyapısı: `computedValue` / `overrideValue` / `overrideReason`

**Bitti sayılır:** Boş bir proje açılabiliyor, bölge paketine bağlanıyor, sürüm donuyor.

### İP-2 — Sihirbaz ve kural motoru
- A1 Parsel ve tapu formları
- A2 İmar durumu formları + özel kısıt kontrol listesi
- A3 Zemin ve saha formları
- A4 Hak sahipleri listesi, paylar, çoğunluk göstergesi
- Kural motoru: bölge paketinden kural okuma, eşik değerlendirme
- **L0 zarf hesabı:** parsel poligonu → çekme mesafesi ötelemesi → taban alanı kontrolü → kat adedi → zarf
- Kademeye göre alan gösterimi (K1/K2/K3)

**Bitti sayılır:** Parsel ve imar verisi girilince zarf ve azami inşaat alanı doğru çıkıyor.

### İP-3 — Program, çekirdek, servis mekanları, otopark
- Proje başlangıç sihirbazı (8 soru)
- A5 program tanımı: kat kat birim karması, tipoloji hedef alanları
- **L1 çekirdek yerleşimi:** strateji önerisi (merkezî / kenar / çift), merdiven + asansör + şaft
- Servis mekanı motoru: eşik hesabı → checklist → onay → bodrum planına blok
- Otopark kısıt çözücü: ihtiyaç → servis mekanı düşümü → yerleşim → bodrum kat senaryoları
- Rampa uzunluğu hesabı (kot farkı ÷ eğim sınırı)

**Bitti sayılır:** Program girilince çekirdek yerleşiyor, servis mekanları listeleniyor, otopark senaryoları yan yana çıkıyor.

### İP-4 — Plan motoru
Sıra önemli — **manuel mod otomatikten önce** yazılır.

1. **Manuel bölümleme modu:** kullanıcı zarf üzerinde birim sınırlarını çizer
2. **L2 otomatik bölümleme:** kısıtlı altbölümleme (hedef alan, cephe erişimi, çekirdek erişimi, en-boy oranı)
3. **L3 tipoloji şablonları:** ilk 5 tip (1+1, 2+1, 3+1, 4+1, dubleks 3+1), ilişki şeması, şablon esnetme
4. **L4 detaylandırma:** duvar kalınlıkları, kapı ve pencere yerleşimi, kolon aksları
5. Tipik kat çoğaltma + kilit mekanizması

**Bitti sayılır:** Program ve zarftan metraja hazır, semantik olarak eksiksiz bir tipik kat planı çıkıyor.

### İP-5 — Metraj motoru
- Nesne → imalat kalemi eşleme tablosu ve motoru
- Açıklık düşümü kuralı — kalem bazında merkezî tanım
- Mekan bazlı miktar formülleri (alan, çevre, duvar yüzeyi, seramik, su yalıtımı, kartonpiyer)
- Cephe bazlı miktarlar (her cephe ayrı — kare bina varsayımı **yok**)
- Yapısal ampirik katsayı seti
- **Parametrik götürü:** elektrik, sıhhi tesisat, ısıtma/soğutma, havalandırma
- `QuantityLine` kaynak izlenebilirliği (hangi nesne, hangi formül)
- Elle ezme + gerekçe kaydı

**Bitti sayılır:** Plandan kalem bazlı metraj çıkıyor ve her satırın kaynağı görülebiliyor.

### İP-6 — Maliyet ve nakit akışı
- Tarihli fiyat kütüphanesi (CRUD, toplu güncelleme ekranı, eskime uyarısı)
- Kalem bazlı maliyet hesabı
- Süreç şablonu ve adım süreleri (basit — Gantt yok)
- Süre bağlı maliyet motoru
- Nakit akışı: aylık gider dağılımı + gelir takvimi → net pozisyon → azami finansman ihtiyacı
- Finansman maliyeti geri beslemesi
- Maliyetten teklife geçiş zinciri

**Bitti sayılır:** Metrajdan teklif fiyatına kadar zincir tamam, S-eğrisi çıkıyor.

### İP-7 — Gelir, paylaşım, fizibilite
- A10 gelir varsayımları (birim değerler, kat ve cephe katsayıları)
- A11 paylaşım senaryosu hesabı
- A12 fizibilite sonucu: brüt kâr, marj, azami finansman ihtiyacı, başabaş

**Bitti sayılır:** Hak sahibi başına düşen alan ve müteahhit payı hesaplanıyor.

### İP-8 — Düzenleme ve canlı panel
- Plan düzenleme: duvar taşıma, birim sınırı taşıma, mekan ekleme/silme, açıklık düzenleme
- Kısıt yayılımı: emsal aşımı, tolerans dışı birim, cephesiz mekan, şaft hizası, kaçış mesafesi, otopark eksiği
- **İlke: engelleme, uyar**
- Canlı maliyet paneli: iki hızlı katman (anlık kaba / istek üzerine tam)
- Doğal dil düzenleme komutu → parametre değişikliği

**Bitti sayılır:** Duvar taşındığında panel canlı güncelleniyor.

### İP-9 — Rapor
- İç fizibilite raporu, denetlenebilir formatta (girdi + birim fiyat + miktar + sonuç)
- Kategori dağılımı ve yüzdeler
- Metraj kaynağı şeffaflığı (geometriden mi, katsayıdan mı, elle mi)
- Ezilmiş değerlerin işaretlenmesi
- Kat planı çıktısı
- Versiyon karşılaştırma

**Bitti sayılır:** Rapor tek başına savunulabilir; her rakamın kaynağı görünüyor.

### İP-10 — Geriye dönük doğrulama
- Bitmiş bir gerçek proje sisteme girilir
- Sistem çıktısı gerçek maliyetle karşılaştırılır
- Sapma kalem kalem raporlanır
- Ampirik katsayılar ve parametrik götürü katsayıları kalibre edilir

**Bitti sayılır:** %5 hedefinin gerçekten tutup tutmadığı ölçülmüş oluyor.

> Bu paket atlanmamalı. `%5 sapma` iddiasının tek kanıtı budur ve aynı zamanda katsayı kalibrasyonunu sağlar.

---

## 4. Kabul Kriterleri

MVP tamamlandı sayılır ancak şunlar sağlanırsa:

1. Gerçek bir parsel verisiyle proje açılıp tipik kat planı üretilebiliyor
2. Otomatik bölümleme başarısız olduğunda manuel modla aynı sonuç alınabiliyor
3. Metrajın her satırı hangi nesneden ve hangi formülden geldiğini gösteriyor
4. Duvar taşındığında maliyet paneli güncelleniyor
5. Rapordaki her rakamın girdisi ve birim fiyatı görünüyor
6. Nakit akışı ve azami finansman ihtiyacı çıkıyor
7. Paylaşım senaryosu hak sahibi başına alan veriyor
8. Bitmiş bir projede sapma ölçülmüş ve raporlanmış

---

## 5. Faz 0 — Paralel Yürüyecek İçerik İşi

Bunlar kod değil, alan uzmanı çıktısıdır. Kod geliştirme beklemesin diye **hemen başlamalı.**

| İş | Süre tahmini | Bloke ettiği paket |
|---|---|---|
| Pilot bölge seçimi ve kural setinin çıkarılması | ~1 hafta | İP-2, İP-3 |
| Tipoloji şablonlarının tanımı (ilk 5 tip, ilişki şeması) | 2–3 gün | **İP-4** |
| Poz kataloğu ve nesne→kalem eşleme tablosu (ilk 60–80 kalem) | 3–4 gün | İP-5 |
| Açıklık düşümü kurallarının kalem bazında tanımı | 1 gün | İP-5 |
| Kalite paketleri içeriği (3 seviye) | 2 gün | İP-5, İP-6 |
| Süreç şablonu (20–30 adım, süreler, süre bağlı giderler) | 1–2 gün | İP-6 |
| Paylaşım formülünün tanımı | 0,5 gün | İP-7 |
| Kalibrasyon için geçmiş proje verisi derlemesi | değişken | İP-10 |

---

## 6. Kritik Tasarım İlkeleri (kodda korunacak)

1. **Yerel hiçbir şey koda gömülmez.** Mevzuat, eşik, katsayı, kalem kodu — hepsi bölge paketinde veri.
2. **Proje bölge paketi sürümünü dondurur.** Yönetmelik değişimi eski projeyi geriye dönük değiştirmez.
3. **Metrekare × birim fiyat hesabı yapılmaz.** Her miktar geometriden veya tanımlı formülden çıkar.
4. **Her nesne semantik kalır.** Serbest çizim yok; geometri serbest, nesne anlamlı.
5. **Her hesaplanan değer ezilebilir ve ezme işaretlenir.**
6. **Açıklık düşümü kuralı kalem bazında merkezî tanımlıdır**, her yerde aynı uygulanır.
7. **Kısıt ihlali engellemez, uyarır.**
8. **Adlandırma IFC hiyerarşisiyle hizalı** kalır — dışa aktarım Faz 3'te olsa da isimlendirme baştan doğru.
9. **Süre bağlı maliyetler süreç adımlarına bağlıdır**, elle girilmez.
10. **Rapor denetlenebilirdir** — girdi, birim fiyat, miktar, formül görünür.

---

## 7. Bilinen Riskler ve Karşılıkları

| Risk | Karşılık |
|---|---|
| L2 otomatik bölümleme yetersiz kalır | Manuel mod önce yazılır; ürün onsuz da ayakta |
| Tipoloji şablonları gerçekçi olmaz | Geçmiş proje planlarından türetilir; yoksa ilk 5 tip elle tanımlanır ve doğrulama testinde kalibre edilir |
| Fiyat kütüphanesi bakımı aksar | Toplu güncelleme ekranı + eskime uyarısı + fiyat sorumlusu rolü |
| %5 hedefi tutmaz | İP-10 ölçer; tutmuyorsa ya kapsam derinleşir ya iddia revize edilir |
| Veri giriş yükü terk yaratır | Kademeli yapı (K1 15 alan, K3 300 alan); K1 tek başına değer üretmeli |
| Kapsam şişer | Faz 2 ve sonrası kilitli; MVP kapsamına ekleme yapılmaz |
