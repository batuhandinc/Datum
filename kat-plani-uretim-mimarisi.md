# Kat Planı Üretim Mimarisi

**Sürüm:** 1.0
**Tarih:** 7 Eylül 2026
**Amaç:** Etüt aşamasında kat planının nasıl üretileceğini, nasıl düzenleneceğini ve maliyete nasıl bağlanacağını tanımlamak.

---

## 1. Drafted.ai Analizi

### Ne yapıyor

Yapılandırılmış girdilerden konut planı üretiyor: oda listesi, arsa boyutu, ev şekli, isteğe bağlı olarak tuval üzerinde oda konumlandırma. Serbest metin komutu kullanmıyor. Ürettiği plan üzerinde duvar, kapı ve pencere düzenlenebiliyor; 2B düzenlendikçe 3B model gerçek zamanlı güncelleniyor. PDF ve CAD/BIM dışa aktarımı var. Ekip, müteahhit ve müşteri projeye davet edilip birlikte inceleyebiliyor.

### Alacaklarımız

| Özellik | Neden |
|---|---|
| **Yapılandırılmış girdi, serbest metin değil** | Bizim kararımızla birebir örtüşüyor — kullanıcı programı tanımlar, sistem yerleşimi çözer |
| **Üret → incele → düzenle → yeniden üret döngüsü** | Etkileşim modelinin kendisi |
| **2B ile eş zamanlı 3B** | Hak sahibi 2B planı okuyamaz, 3B'yi okur. Sunum gücü buradan gelir |
| **Projeye davet / birlikte inceleme** | Paydaş portalımızın karşılığı |
| **CAD/BIM dışa aktarım** | IFC hedefimizle aynı yön |
| **"Önce bir plan çıksın, insanlar ona tepki versin"** | Ürün felsefesi olarak doğru. Kusurlu bir plan bile, plan yokluğundan iyidir; insanlar somut bir şeye bakınca fikirlerini netleştirir |

Son madde hak sahibi görüşmeleri için özellikle değerli. "Ne istiyorsunuz" diye sormak yerine bir plan gösterip "neresi olmamış" diye sormak süreci hızlandırır.

### Almayacaklarımız — problem farkı

> **Drafted tek bir müstakil konut tasarlıyor. Biz çok birimli apartman tasarlıyoruz. Geometri problemi tamamen farklı.**

| Konu | Drafted | Bizim ihtiyacımız |
|---|---|---|
| Ölçek | Tek konut | N bağımsız bölüm, M kat, tipik kat tekrarı |
| Zarf | Kullanıcı ev şeklini çiziyor | Zarf imar kurallarından **hesaplanıyor** (emsal, taban katsayısı, çekme mesafeleri, yükseklik) |
| Çekirdek | Yok — merdiven bir odadır | Merdiven + asansör + şaft, planın sabit noktası, tüm birimlere erişim vermeli |
| Düşey süreklilik | Önemsiz | **Kritik.** Islak hacimler katlar arası hizalanmalı, şaft dikey geçmeli, kolon aksları oturmalı |
| Bodrum | Basit bodrum desteği | Otopark çözücü + zorunlu servis mekanları |
| Maliyet | **Yok** | Sistemin varlık sebebi |
| Mevzuat kısıtı | Yok | Kural seti motoru |
| Paylaşım | Yok | Hak sahibi dağıtımı |

**Sonuç:** Drafted, doğru **etkileşim modeli** referansı; yanlış **problem alanı** referansı. Algoritmasını kopyalayamayız, deneyimini kopyalarız.

---

## 2. Üretim Mimarisi — Beş Katman

Plan üretimi tek bir sihirli adım değil, birbirine bağlı beş katmandır. Her katman bir üsttekinin çıktısını kısıt olarak alır.

```
L0  Zarf          ← imar kuralları
L1  Çekirdek      ← yönetmelik + kat adedi
L2  Kat bölümleme ← kullanıcı programı (birim karması)
L3  Birim içi     ← tipoloji şablonları
L4  Detay         ← duvar kalınlıkları, açıklıklar, kaplamalar
```

### L0 — Zarf Üretimi

**Girdi:** parsel poligonu, çekme mesafeleri, taban alanı katsayısı, emsal, azami yükseklik, kot

**İşlem:**
1. Parsel poligonu çekme mesafeleri kadar içe ötelenir (inward offset)
2. Oluşan poligon taban alanı katsayısıyla karşılaştırılır; aşıyorsa kullanıcıya alternatif sunulur (küçültme yönü seçimi)
3. Emsal ve azami yükseklikten kat adedi türetilir
4. Kot farkından kazanılabilir bodrum hesaplanır

**Çıktı:** kat plakası poligonu + kat adedi + kat yükseklikleri

**Not:** Bu katman deterministiktir, yapay zekaya ihtiyaç yoktur. Geometrik ötelemedir.

### L1 — Çekirdek Yerleşimi

Apartman planının sabit noktası. Yanlış yerleştirilirse hiçbir şey oturmaz.

**Kısıtlar:**
- Merdiven ve asansör(ler) yan yana, ortak sahanlıkla
- Tüm bağımsız bölümlere erişim vermeli
- Şaftlar düşey geçebilmeli (tüm katlarda aynı konumda)
- Yangın kaçış mesafesi sınırı aşılmamalı
- Doğal aydınlatma tercihi (merdiven cepheye yakınsa avantaj)

**Yerleşim stratejisi:**
- **Merkezî çekirdek:** kat plakası kompakt ise, birimler çekirdeğin çevresine dizilir. 3–6 birim/kat için ideal.
- **Kenar çekirdek:** uzun ve dar plakada, koridor ekseni boyunca. 6+ birim/kat.
- **Çift çekirdek:** çok geniş plakada veya iki bloklu düzende.

Sistem plakanın en-boy oranına ve birim sayısına bakarak strateji önerir; kullanıcı değiştirebilir.

**Çıktı:** çekirdek poligonu, sahanlık, şaft konumları — tüm katlarda sabit

### L2 — Kat Plakası Bölümleme

En kritik ve en zor katman. Problem tanımı:

> Kat plakasından çekirdek çıkarıldıktan sonra kalan alanı, kullanıcının belirlediği hedef alanlara sahip N adet bağımsız bölüme, her birinin cephe alacağı ve çekirdeğe erişeceği şekilde bölmek.

**Kısıtlar:**
- Her birim hedef alanına belirli tolerans içinde ulaşmalı (örn. ±%5)
- Her birimin asgari cephe uzunluğu olmalı (pencere için)
- Her birim çekirdeğe doğrudan veya koridorla erişmeli
- Birim en-boy oranı makul kalmalı (aşırı uzun dar birim olmamalı)
- Islak hacimler şafta yakın konumlanabilmeli

**Algoritma önerisi:** kısıtlı altbölümleme (constrained subdivision)

1. Çekirdek etrafında açısal veya dilimsel bölge ayrımı
2. Hedef alanlara göre ağırlıklı bölme (squarified treemap mantığı — alan hedefini tutarken en-boy oranını iyileştirir)
3. Cephe erişimi kontrolü; sağlanmayan birim için bölme yönü değiştirilir
4. Kısıt ihlali kalırsa alternatif çekirdek konumuyla yeniden denenir

**Çıktı:** birim poligonları, her birinin cephe kenarları ve çekirdek erişim noktası

### L3 — Birim İçi Mekan Yerleşimi

Her bağımsız bölüm, tipoloji şablonuna göre mekanlara ayrılır.

**Yaklaşım: şablon esnetme (template instantiation).** Sıfırdan üretim değil.

Her tipoloji (örn. "3+1") bir **ilişki şeması** taşır:
- Antre girişte, kapıya bitişik
- Salon cephe alır, antreye bağlı
- Mutfak salona veya antreye bağlı, cephe veya şaft alır
- Yatak odaları cephe alır, hole bağlı
- Banyo hole bağlı, şafta bitişik, cephe opsiyonel
- Ebeveyn banyosu ebeveyn odasına bağlı

Şablon, birimin gerçek poligonuna göre esnetilir. Alan hedefleri korunur, oranlar uyarlanır.

**Neden şablon:** Türkiye'de apartman daire planları yüksek oranda tekrar eder. "3+1" planının kaç varyasyonu olduğu sınırlıdır. Şablon kütüphanesi hem hızlı hem öngörülebilir sonuç verir.

**Çıktı:** mekan poligonları, alan ve çevre değerleri, ıslak hacim konumları

### L4 — Detaylandırma

- Duvar kalınlıkları atanır (dış / iç / ıslak hacim / şaft)
- Kapılar mekan ilişkilerinden yerleştirilir
- Pencereler cephe kenarlarına, mekan tipine göre boyutlandırılır
- Kaplamalar spesifikasyon paketinden atanır
- Kolon aksları kabaca yerleştirilir (otopark verimi için)

**Çıktı:** metraja hazır, semantik olarak eksiksiz plan

---

## 3. Algoritma Tercihi

Dört yol var. Hangisinin neden seçildiği:

| Yaklaşım | Artı | Eksi | Karar |
|---|---|---|---|
| **Kural tabanlı / prosedürel** | Deterministik, hızlı, hata ayıklanabilir, semantik nesne üretir, kısıt eklemek kolay | Sonuç mekanik görünebilir | ✅ **L0–L2 için seçildi** |
| **Şablon esnetme** | Gerçekçi plan, öngörülebilir, mimari bilgi taşır | Şablon kütüphanesi kurulmalı | ✅ **L3 için seçildi** |
| **Optimizasyon (genetik, tavlama)** | Daha iyi kalite | Yavaş, öngörülemez, hata ayıklaması zor | ⏳ Faz 2 — iyileştirme katmanı olarak |
| **Üretken yapay zeka (eğitilmiş model)** | Doğal görünen plan | Eğitim verisi yok, sert kısıtları garanti edemez, çıktı raster/graf — vektöre çevirmek gerekir, Türkiye apartman tipolojisi için veri seti mevcut değil | ❌ Uygun değil |

> **Önemli:** Bu bir yapay zeka problemi değil, kısıtlı geometri problemi. Üretken model kullanmak burada hem gereksiz hem riskli — çünkü emsal, çekme mesafesi, yangın kaçış mesafesi gibi **sert kısıtları** eğitilmiş bir model garanti edemez. Deterministik çözücü garanti eder.

Yapay zekanın doğru kullanım yeri farklı: kullanıcının doğal dille verdiği düzenleme talimatını ("mutfağı büyüt, salondan al") parametre değişikliğine çevirmek. Yani geometriyi üretmez, düzenlemeyi yorumlar.

---

## 4. Düzenleme Modeli

Kullanıcı planı düzenleyebilmeli, ama düzenleme semantiği bozmamalı.

### Düzenleme tipleri

| Tip | Davranış |
|---|---|
| **Duvar taşıma** | Komşu iki mekanın alanı yeniden hesaplanır; biri büyür, diğeri küçülür. Birim alanı sabit kalır. |
| **Birim sınırı taşıma** | İki bağımsız bölümün alanı değişir. Hedef alan toleransı aşılırsa uyarı verilir. |
| **Mekan ekleme/silme** | Tipoloji şablonundan sapma işaretlenir. |
| **Açıklık ekleme/taşıma** | Cephe kısıtı kontrol edilir (asgari pencere alanı, kaçış). |
| **Çekirdek taşıma** | Tüm katları etkiler — onay istenir, tüm katlar yeniden çözülür. |
| **Kat kilidi açma** | Kat tipik şablondan ayrışır, bağımsız düzenlenir. |

### Kısıt yayılımı

Her düzenlemeden sonra sistem sessizce kontrol eder ve ihlalleri **engellemeden** gösterir:

- Emsal aşımı
- Birim alanı tolerans dışı
- Cephesiz mekan (yatak odası penceresiz kalmış)
- Şaft hizası bozulmuş
- Kaçış mesafesi aşımı
- Otopark sayısı yetersiz

**İlke: sistem engellemez, uyarır.** Hızlı çalışmayı bloke etmek yanlış; kullanıcı bilinçli olarak kural dışına çıkabilir.

### Doğal dil düzenleme

Kullanıcı "üçüncü katta salonu 2 metre büyüt" der. Sistem bunu bir düzenleme komutuna çevirir, uygular, sonucu gösterir. Geometri motoru aynıdır; değişen sadece komutun geliş yoludur.

---

## 5. Canlı Maliyet Bağı — Asıl Farkımız

> **Drafted'da maliyet yok. TestFit'te kalem bazlı maliyet yok. Bizim ayrıştığımız yer burası.**

Zincir şöyle kurulur:

```
Plan düzenlemesi
   ↓
Geometri güncellenir (mekan alanı, çevre, duvar uzunluğu, açıklık)
   ↓
Metraj yeniden hesaplanır (nesne → kalem eşlemesinden)
   ↓
Maliyet güncellenir (tarihli fiyat kütüphanesinden)
   ↓
Marj ve paylaşım senaryosu güncellenir
```

**Ekranda sürekli görünen panel:**

| Gösterge | Örnek |
|---|---|
| Toplam inşaat alanı | 3.705 m² |
| Emsal kullanımı | %98,2 |
| Bağımsız bölüm sayısı | 18 |
| Otopark durumu | 16/18 — **2 eksik** |
| Toplam maliyet | canlı |
| m² başına maliyet | canlı (rapor için, hesap için değil) |
| Hak sahibi payı / müteahhit payı | canlı |
| Tahmini kâr marjı | canlı |

Kullanıcı bir duvarı ittiğinde bu panelin değişmesi, ürünün en güçlü anıdır. "Bu daireyi 5 m² büyütürsem kaç lira kaybediyorum" sorusunun cevabı anında görünür.

### Performans notu

Tam metraj her düzenlemede yeniden hesaplanırsa yavaşlar. Çözüm: iki hızlı katman.

- **Anlık (her düzenlemede):** alan, emsal, birim sayısı, kaba maliyet (kategori seviyesi)
- **Tam (istek üzerine veya düzenleme durunca):** kalem bazlı metraj ve maliyet

---

## 6. 3B ve Sunum

2B plan hak sahibine yetmez. Drafted'ın gerçek zamanlı 3B'si doğru fikir.

**Kademeli yaklaşım:**

| Faz | Çıktı |
|---|---|
| Faz 1 | 2B plan + basit kütle 3B (kat kat blok) |
| Faz 2 | Duvar-yükseklikli 3B, kapı ve pencere yerleşimli |
| Faz 3 | Malzeme kaplamalı görselleştirme, hak sahibi için daire içi gezinti |

3B modelin ayrı bir veri kaynağı olmaması kritik: **aynı semantik modelden türetilir.** İki ayrı model tutulursa senkron sorunu kaçınılmazdır.

---

## 7. Teknik Yığın Önerisi

| Katman | Öneri | Gerekçe |
|---|---|---|
| Geometri çekirdeği | Sunucu tarafında bir hesaplama modülü; poligon işlemleri için olgun bir geometri kütüphanesi | Öteleme, kesişim, alan/çevre hesabı |
| Plan editörü | Tarayıcıda tuval tabanlı (2B vektör) | Duvar sürükleme, anlık geri bildirim |
| 3B görüntüleme | Tarayıcıda WebGL tabanlı | Aynı modelden türetilmiş |
| Veri | PostgreSQL; geometri alanları için coğrafi/geometrik tip desteği | Poligonları veritabanında saklamak |
| Dışa aktarım | IFC yazımı sunucu tarafında | Ticari BİM yazılımına bağımlı kalmamak |

---

## 8. MVP İçindeki Sıralama

> **Not:** Aşağıdakiler faz değil, MVP içindeki **geliştirme sırasıdır.** Tek yol haritası ana dokümandadır (Faz 0–6). Plan motorunun tamamı MVP'dedir.

| Sıra | Kapsam | Çıktı |
|---|---|---|
| 1 | L0 zarf + L1 çekirdek | Deterministik geometri — hızlı yazılır |
| 2 | **Manuel bölümleme modu** | Kullanıcı birim sınırlarını elle çizer; metraj tam çalışır |
| 3 | L2 otomatik bölümleme | Program hedeflerinden birim poligonları |
| 4 | L3 tipoloji şablonları (ilk 5) + L4 detay | Metraja hazır plan |
| 5 | Düzenleme motoru + kısıt yayılımı | |
| 6 | Canlı maliyet paneli | Ürünün ana anı |
| 7 | Bodrum/otopark çözücü + servis mekanı yerleşimi | Bodrum tamamlanır |

**Faz 2'ye kalanlar:** 3B görselleştirme, hak sahibi sunumu
**Faz 3'e kalanlar:** IFC dışa aktarım, optimizasyon katmanı (alternatif yerleşim üretimi)

### Manuel bölümleme modu — risk azaltıcı

> **L2 otomatik bölümleme projenin en büyük teknik riskidir.** Tüm değer önerisi ona bağlıysa ve tatmin edici sonuç vermezse yedek yol gerekir.

Manuel mod, otomatik moddan **önce** yazılır:

- Sistem zarfı ve çekirdeği verir
- Kullanıcı birim sınırlarını tuval üzerinde çizer
- Mekan yerleşimi yine şablondan gelir (L3 çalışır)
- Metraj, canlı maliyet ve tüm alt sistemler tam çalışır

Böylece otomatik bölümleme gecikse veya kalitesi düşük çıksa bile ürün ayakta kalır. Ayrıca manuel mod kalıcı bir özelliktir — standart dışı parsellerde her zaman gerekecektir.

---

## 9. Açık Kararlar

1. **Birim alan toleransı** — hedef alandan ne kadar sapmaya izin verilecek? (%3 mü %5 mi)
2. **Tipoloji şablon kütüphanesi** — ilk hangi tipler? Öneri: 1+1, 2+1, 3+1, 4+1, dubleks 3+1
3. **Şablon kaynağı** — geçmiş projelerinden mi çıkaracağız, sıfırdan mı tanımlayacağız? Geçmiş projelerin planları elimizde varsa şablon kütüphanesi çok daha gerçekçi olur.
4. **Koridor eşiği** — kat başına kaç birimden sonra koridorlu düzene geçilecek?
5. **Çekirdek strateji seçimi** — sistem mi önersin, kullanıcı mı seçsin? Öneri: sistem önerir, kullanıcı değiştirir.
6. **Anlık maliyet hassasiyeti** — düzenleme sırasında hangi seviyede maliyet gösterilecek?

---

## 10. Sonraki Adım

1. Bir geçmiş projenin tipik kat planını al, L2 ve L3'ün onu üretip üretemeyeceğini kağıt üzerinde test et
2. İlk 5 tipoloji şablonunun ilişki şemasını çıkar
3. L0 ve L1'i prototiple (bunlar deterministik, hızlı yazılır)
4. L2 altbölümleme algoritmasını tek kat üzerinde dene
