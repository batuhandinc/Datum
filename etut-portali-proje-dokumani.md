# İnşaat Etüt ve BİM Otomasyon Portalı — Proje Dokümanı

**Sürüm:** 0.3
**Tarih:** 7 Eylül 2026
**Değişiklikler:** Çekirdek/bölge paketi ayrımı netleştirildi (yerel mevzuat koddan çıkarıldı) · Gerçek metraj ilkesi ayrı bölüm oldu · Süreç ve İş Akışı modülü eklendi · Zamana bağlı maliyet motoru tanımlandı · Rapor çıktı spesifikasyonu eklendi

---

## 1. Vizyon

İnşaat projesinin dijital ikizini, insan eliyle değil veri ve yapay zeka ile üretmek. Sistem, bir projenin arsa değerlendirmesinden teslimine kadar tüm aşamalarını kapsar ve her aşamada aynı veri modelini zenginleştirir.

**İki temel iddia:**

1. **Metrekare tahmini değil, gerçek metraj.** Sistem m² birim fiyatla çarpma yapmaz. Geometriden gerçek miktar üretir, o miktarı kalem fiyatıyla çarpar.
2. **Etüt, projenin tohumudur.** Etütte toplanan veri projelendirme modülünün girdisidir. Nihai hedef: *tuşa bas, BİM modeli gelsin.*

---

## 2. Mimari Temel İlke: Çekirdek / Bölge Paketi Ayrımı

> **Sistem hiçbir ülkeye, mevzuata veya destek programına gömülü olmayacak.**

Yerel her şey **veri**dir. Motor evrenseldir.

### Çekirdek (ülkeden bağımsız — kod)

- Geometri motoru (parsel, zarf, kat, mekan, duvar, açıklık)
- Nesne ve mekan modeli (IFC hizalı)
- Metraj çıkarım motoru
- Nesne → imalat kalemi eşleme motoru
- Maliyet toplama ve dağıtım motoru
- Süreç / iş akışı motoru
- Zamana bağlı maliyet motoru
- Rapor şablon motoru
- Yetkilendirme ve paydaş portalı altyapısı

### Bölge Paketi (yerel — veri)

| Paket içeriği | Örnek |
|---|---|
| İmar ve yapılaşma kural seti | Emsal tanımı, çekme mesafeleri, yükseklik hesabı |
| Zorunlu mekan eşikleri | Sığınak, otopark, bisiklet park, kapıcı dairesi eşikleri |
| Teknik yönetmelik kuralları | Yangın, asansör, kaçış mesafeleri |
| İmalat kalemi kataloğu ve kodlaması | Ulusal poz listesi veya kurum içi kodlama |
| Maliyet kategori ağacı | Kaba / ince / diğer kırılımı bölgeye göre değişir |
| Proje gideri kalemleri | Denetim bedeli, sigorta primleri, abonelikler, teminat komisyonu |
| Para birimi, vergi, endeks kuralları | Vergi oranı, endeksleme serisi |
| Paydaş anlaşma kuralları | Karar çoğunluğu eşiği, itiraz süreleri |
| Destek/teşvik programı tanımları | Uygunluk koşulu, tutar, ödeme takvimi, son tarih |
| Rapor şablonu ve dili | |

**Sonuç:** Yeni bir ülkeye, ile veya mevzuat değişikliğine geçiş = yeni paket. Kod değişmez.

**Destek programları özel bir modül değildir.** Bir destek programı, bölge paketinde şu alanlarla tanımlı bir kayıttır: uygunluk koşulları, hesaplama kuralı, başvuru adımları, ödeme takvimi, riskler. Sistem bunu jenerik "teşvik" nesnesi olarak işler; nakit akışına gelir kalemi, süreç modülüne adım dizisi olarak yansır.

---

## 3. Modül Haritası

| Modül | Kapsam | Çıktı |
|---|---|---|
| **M1 — Etüt ve Fizibilite** | Parsel, imar analizi, kütle, kat planı, gerçek metraj, maliyet, paylaşım senaryosu | Fizibilite raporu, sunum dosyası, yapılandırılmış model |
| **M2 — Paydaş ve Anlaşma** | Hak sahibi / malik listesi, pay oranları, karar çoğunluğu durumu, sözleşme yönetimi, teşvik programı takibi | Anlaşma durumu, sözleşme seti, pay tablosu |
| **M3 — Projelendirme** | BİM yazılımı entegrasyonu; mimari, statik, mekanik, elektrik | BİM modeli, uygulama projeleri, kesin metraj |
| **M4 — Onay ve İzin** | Zemin etüdü, denetim kurumu, resmi onay adımları | İzin durumu panosu |
| **M5 — İhale ve Tedarik** | Kalem bazlı teklif toplama, karşılaştırma, taşeron sözleşmeleri | Sözleşmeler, satın alma planı |
| **M6 — İcra** | İş programı, hakediş, ilerleme, kalite, iş güvenliği | Gerçekleşen metraj/maliyet |
| **M7 — Teslim** | Eksik listesi, kabul, mülkiyet devri, garanti dönemi | Teslim tutanakları |
| **MX — Süreç ve İş Akışı** | *Kesişen katman.* Tüm modüllerin adımlarını, sürelerini, sorumlularını ve maliyetlerini yönetir | Süreç panosu, takvim, zamana bağlı maliyet |

MX sıralı bir aşama değil, diğer tüm modüllerin üzerinden geçen bir katmandır. Bölüm 8'de detaylı.

---

## 4. Değer Önerisi

Sektörde teklifler metrekare birim fiyatla veriliyor. Etüt yüzeysel. Batan firmaların çoğu bu aşamadaki hatalı tekliften batıyor.

**Farkımız:** teklif aşamasında geometriye dayalı gerçek metraj. Hedef sapma **%5**.

İkincil fayda: hak sahiplerine sunulan, her rakamın kaynağı görülebilen profesyonel doküman.

---

## 5. Etüt Modülü — Veri Mimarisi

### Katman 1 — Parsel ve Saha

| Veri | Kaynak | Not |
|---|---|---|
| Parsel geometrisi (sınır, alan) | Kadastro/tapu servisi export | Kullanıcı yükler |
| Parsel kimlik bilgileri | Aynı | |
| Cephe aldığı yollar ve genişlikleri | İmar planı / manuel | Kot ve çekme mesafesini etkiler |
| Komşu parsel durumu | Manuel | Bitişik nizamda kritik |
| Kot verisi | İki katmanlı — aşağıda | |

**Kot stratejisi (iki katmanlı):**

1. **Hızlı katman:** açık sayısal yükseklik modeli servisleri. Sapma 1–2 m. Sadece ön etüt.
2. **Kesin katman:** resmi kot krokisi veya harita ölçümü. Manuel yüklenir. İzin aşamasında zorunlu.

Sistem hangi katmanın kullanıldığını her rapor üzerinde göstermeli.

### Katman 2 — Kural Seti (bölge paketinden gelir)

Kurallar koda gömülmez, paketten okunur:

- Emsal ve taban alanı katsayıları
- Çekme mesafeleri
- Azami kat adedi / yükseklik ve yüksekliğin nereden ölçüleceği
- Yapı nizamı
- Emsal harici alan kuralları
- Otopark ihtiyacı hesabı
- Zorunlu servis mekanı eşikleri
- Yangın güvenliği gereksinimleri
- Düşey sirkülasyon (asansör, merdiven) asgari ölçüleri
- Sirkülasyon alanı asgari genişlikleri

**Kaynak hiyerarşisi:** ulusal yönetmelik (taban) → yerel yönetmelik (üzerine yazar) → plan notu (parsele özel).

### Katman 3 — Çekirdek

Merdiven, asansör(ler), hol, şaftlar. Ölçüler kural setinden türetilir. Kat planı üretiminin sabit noktasıdır.

### Katman 4 — Program (kullanıcı tanımlar)

> **Karar: bağımsız bölüm karmasını kullanıcı belirler, sistem önermez.**

Hak sahibi sayısı karmayı zaten belirliyor. Kullanıcı kat kat girer; sistem programı zarfa yerleştirir.

**Tipik kat mantığı:** Her katın bir kilit göstergesi vardır. Kilitli katlar tipik kat şablonuna referans verir. Kilit açılan kat bağımsızlaşır. Zemin, çatı ve bodrum doğal istisnalardır.

### Proje Başlangıç Sihirbazı

Plan üretiminden önce, sonucu köklü etkileyen kararlar sorulur. Kural katmanı cevapları ön-doldurur, kullanıcı onaylar veya değiştirir:

1. Hedeflenen otopark yeri sayısı (yönetmelik minimumu gösterilir)
2. Isıtma sistemi: merkezi mi, bağımsız mı → ısı merkezi ihtiyacı
3. Zemin katta ticari kullanım var mı
4. Bağımsız bölüm depoları yapılacak mı
5. Asansör sayısı
6. Çatı tipi ve çatı katı kullanımı
7. Yedek güç kapsamı: ortak alan mı, tam yedekleme mi
8. Kalite/donanım seviyesi (ekonomik / standart / üst segment)

---

## 6. Kat Planı Üretimi

### İlke: "geometri serbest, nesne anlamlı"

- **Geometri kısıtlanmaz.** Eğri duvar, açılı yerleşim, standart dışı form mümkün. Kullanıcı dikdörtgen hapishanesine sokulmaz.
- **Nesne semantiği korunur.** Çizilen her şey etiketli kalır: *dış duvar / 30 cm / yalıtımlı*. Anlam korunduğu sürece hem metraj çıkar hem BİM'e aktarılır.

Anlamsız serbest çizgiye izin verilirse M3'e otomatik aktarım imkânsızlaşır. Kırmızı çizgi budur.

### Akış

1. Kural setinden yapılaşabilir zarf hesaplanır
2. Çekirdek yerleştirilir
3. Kullanıcı programı kalan alana yerleştirilir
4. Islak hacimler katlar arası düşey hizalanır (şaft sürekliliği)
5. Manuel düzenleme — doğrudan manipülasyon veya ajana talimat

Kullanıcı herhangi bir kata basıp planı görebilmeli ve üzerinde oynayabilmeli.

---

## 7. Bodrum: Zorunlu Servis Mekanları + Otopark

Bodrum sadece otopark değildir. Servis mekanları bodrum alanının ciddi kısmını tüketir ve **otopark çözümünden önce** yerleşmelidir.

### 7.1 Servis Mekanı Motoru

**Sıra:** kural seti eşikleri hesaplar → sistem checklist sunar (zorunlular kilitli, tercihe bağlılar seçilebilir) → kullanıcı onaylar → mekanlar bodrum planına sabit blok girer → kalan alan otopark çözücüye devredilir.

| Mekan | Tetikleyici |
|---|---|
| Sığınak | Bağımsız bölüm sayısı / inşaat alanı eşiği |
| Elektrik odası / trafo | Talep gücü eşiği; dağıtım kurumu şartı |
| Su deposu + hidrofor | Kullanım suyu + yangın rezervi |
| Yangın pompa odası | Bina yüksekliği / alan eşiği |
| Yedek güç (jeneratör) odası | Kapsam kararına bağlı; havalandırma ve egzoz gerektirir |
| Isı merkezi / kazan dairesi | Merkezi ısıtma seçilirse |
| Görevli dairesi | Bağımsız bölüm sayısı eşiği |
| Çöp odası | Yönetmelik |
| Bisiklet park alanı | Yönetmelik |
| Bağımsız bölüm depoları | Tercih — otopark alanı yer, müzakere değeri katar |
| **Otopark rampası** | Fiziksel zorunluluk; eğim sınırı ve kot farkı uzunluğu belirler |
| Asansör kuyu dibi, şaftlar, merdiven | Çekirdekten otomatik |

Rampa en çok unutulan alan tüketicisidir; eğim sınırı yüzünden kot farkı arttıkça uzar.

### 7.2 Otopark — Kısıt Çözücü

Döngüsel bağımlılık:

```
Emsal → bağımsız bölüm sayısı → otopark ihtiyacı → bodrum kat sayısı
   ↑                                                        ↓
   └────── kazı hacmi + servis mekanları + maliyet ←────────┘
```

Sistem iteratif çözer: sihirbazdan hedef alınır, kural setinden minimum hesaplanır, servis mekanları düşülür, kalan alana park yerleşir, sığmazsa ek kat önerilir.

> **İlke: sistem senaryo üretir, karar vermez.**
> "1 bodrum → 2 park eksik, izin riski" ile "2 bodrum → tam, maliyet +X" yan yana sunulur.

---

## 8. Süreç ve İş Akışı Modülü (MX)

Kesişen katman. İki işi yapar: **süreci yönetir** ve **süreden maliyet üretir**.

### 8.1 Süreç Modeli

Her proje, bölge paketinden gelen bir **süreç şablonu** ile açılır. Şablon aşama ve adımlardan oluşur:

```
Aşama → Adım → Görev
```

Her adımın tanımlı alanları:

| Alan | Açıklama |
|---|---|
| Ad ve açıklama | |
| Ön koşul adımlar | Bağımlılık zinciri |
| Tahmini süre | Takvim günü / iş günü |
| Sorumlu rol | İç ekip, danışman, resmi kurum, hak sahibi |
| Durum | Beklemede / devam / tamamlandı / bloke / iptal |
| Gerçekleşen tarihler | Başlangıç, bitiş |
| **Bağlı maliyet kalemleri** | Bu adım hangi gideri doğuruyor |
| Bekleme riski | Kurum onayı gibi bizim kontrolümüzde olmayan adımlar işaretlenir |
| Ekler | Belge, karar, yazışma |

**Aşama kapıları (stage gate):** Bir aşamadan diğerine geçiş için sağlanması gereken koşullar tanımlanır. Örneğin projelendirmeye geçiş, paydaş anlaşma eşiğinin sağlanmasına bağlıdır. Sistem koşul sağlanmadan sonraki aşamayı açmaz, uyarır.

### 8.2 Görünümler

- **Süreç panosu:** aşama aşama, nerede olduğumuz, ne bekliyoruz
- **Takvim / Gantt:** bağımlılıklarla, kritik yol vurgulu
- **Gecikme paneli:** planlanan vs gerçekleşen, sapma günü, sapmanın maliyeti
- **Sorumlu bazlı liste:** kimde ne bekliyor

### 8.3 Zamana Bağlı Maliyet Motoru

> **Kritik içgörü: maliyet kalemlerinin önemli kısmı miktara değil, süreye bağlıdır.**

Bir referans raporda incelediğimiz üzere bu kalemler toplam maliyetin **%14'üne** ulaşabiliyor. Süre uzarsa bunlar otomatik büyümeli.

Maliyet kalemleri iki tipte tutulur:

| Tip | Hesap | Örnekler |
|---|---|---|
| **Miktar bağlı** | Metraj × birim fiyat | Beton, demir, duvar, seramik, doğrama |
| **Süre bağlı** | Süre × dönemsel bedel | Saha personeli maaş ve primleri, iş sağlığı hizmeti, saha elektrik/su, iskele kirası, teminat komisyonu, geçici barınma yardımı, finansman maliyeti, ekipman kirası |

Süre bağlı kalemler **süreç modülündeki adım sürelerine bağlanır.** İş programı uzarsa maliyet kendiliğinden güncellenir. Kullanıcı ayrıca elle süre girmez.

**Örnek zincir:** Onay adımı 2 ay gecikir → saha ekibi 2 ay fazla çalışır + teminat süresi 2 ay uzar + barınma yardımı 2 ay artar + finansman 2 ay işler → toplam maliyet otomatik yükselir → teklif marjı anında görülür.

Bu, hiçbir rakipte olmayan çıktı: **gecikmenin fiyatını anlık göstermek.**

### 8.4 Nakit Akışı

Süreç modeli + maliyet kalemleri birleşince zaman eksenli nakit akışı çıkar:

- Dönemsel gider eğrisi (S-eğrisi)
- Gelir/teşvik girişleri (bölge paketindeki program takvimlerinden)
- Net nakit pozisyonu ve en derin negatif nokta (azami finansman ihtiyacı)
- Finansman maliyeti bu eğriden hesaplanır ve maliyete geri beslenir

---

## 9. Metraj İlkesi — Sistemin Kalbi

> **Hiçbir miktar "m² × katsayı" ile üretilmez. Her miktar geometriden çıkar.**

Referans olarak incelediğimiz piyasa ürünü binayı kare varsayıyor ve cephe alanını çevre × yükseklik olarak hesaplıyor. Gerçek parselde bina kare çıkmaz; cephe yanlışsa yalıtım, kaplama, iskele, denizlik kalemlerinin hepsi yanlış olur. Aynı üründe iç duvar yüzeyi de plandan değil oda alanlarından katsayıyla türetiliyor.

**Bizim yaklaşımımız:**

| Miktar | Kaynak | Sahip |
|---|---|---|
| Duvar **gövde** hacmi | Duvar nesnesinin uzunluk × yükseklik × kalınlık değerinden | `Wall` |
| Cephe alanı | Gerçek cephe geometrisinden, yüzey yüzey | `Facade` |
| Doğrama adedi ve alanı | Yerleştirilmiş açıklık nesnelerinden | `Opening` |
| Kapı adedi | Mekan-mekan ilişkisinden | `Opening` |
| Döşeme, şap, kaplama alanı | Mekan poligonlarından | `Space` |
| **İç** sıva ve boya alanı | Mekanın iç yüzeyi (`çevre × net yükseklik`), açıklık düşümü kalem kuralından | `Space` |
| **Dış** sıva, mantolama, iskele | Cephe yüzeyi | `Facade` |
| Kazı hacmi | Bodrum plakası × kot farkı | `Floor` (bodrum) |
| Beton/demir/kalıp | Ampirik katsayı (etüt aşamasında meşru) — bkz. bölüm 10 | `Floor` |

> **SAHİPLİK KURALI.** Her fiziksel yüzeyin TEK sahibi vardır: gövde `Wall`'ın, iç yüzey
> bitişleri `Space`'in, dış yüzey `Facade`'ın. Banyo ile yatak odası arasındaki duvarın
> banyo yüzü seramik, yatak odası yüzü boyadır — bitiş MEKANA göre değişir; gövde ise tektir
> ve paylaştırılamaz. Bu kural olmadan sıva ve boya iki kez metraja girerdi.
> Ayrıntı: `etut-veri-modeli.md` bölüm 10.0.

### Boşluk düşümü kuralları — tek kaynak

Referans üründe tutarsızlık tespit ettik: aynı cephede yalıtım hesabında açıklıklar düşülmüş, kaplama ve boya hesabında düşülmemiş.

Bu tip hatalar **kuralın kalem bazında merkezî tanımlanmasıyla** önlenir. Her imalat kalemi için "açıklık düşülür mü, hangi eşiğin üstündeki açıklık düşülür" kuralı bir kez tanımlanır ve her yerde aynı uygulanır. Rapor bu kuralı gösterir.

---

## 10. Maliyet Motoru

### 10.1 Kalem bazlı, geometriye dayalı

Metrekare birim fiyat **kullanılmaz**. Her imalat kendi miktarı ve kendi fiyatıyla hesaplanır.

Servis mekanları da metraja girer: sığınak donanımı, trafo odası havalandırması, yangın pompası, depo yalıtımı. Bunlar unutulursa %5 hedefi tutmaz.

### 10.2 Yapısal imalatlarda ampirik katsayı

Etüt aşamasında kolon-kiriş boyutlarını gerçek modellemenin anlamı yok. Yaklaşım:

- **Metraj:** m² başına kalibre katsayı (beton m³/m², donatı kg/m², kalıp m²/m³)
- **Geometri:** kolon aksları kabaca yerleşir — otopark verimini doğrudan aks düzeni belirler
- Gerçek hesap M3'e bırakılır

**Kalibrasyon referansı (incelenen örnek projeden):** ~39 kg/m² donatı, ~0,46 m³/m² beton, ~3,1 m² kalıp/m³ beton. Kendi projelerinden çıkacak katsayılar bunlarla kıyaslanacak.

Not: aynı örnekte kalıp işçiliği tek başına beton-demir bloğunun %41'i. Yapısal maliyette işçilik, malzemeden büyük olabiliyor — katsayı setinde işçilik ayrı tutulmalı.

### 10.3 İmalat kalemi kataloğu

Bölge paketinden gelir. Ulusal bir birim fiyat/poz listesi varsa iskelet olarak kullanılır; kodlama hazır gelir, üzerine piyasa fiyatı yazılır. Yoksa kurum içi kodlama tanımlanır.

### 10.4 Nesne → Kalem eşleme tablosu

> **Metraj otomasyonunun kalbi bu tablo.**

Satırlar **sahiplik kuralına** uymak zorundadır (bölüm 9): aynı yüzey iki nesneden tetiklenemez.

| Nesne | Tetiklenen kalemler |
|---|---|
| **Dış duvar** (`Wall`, `wallType = dis`) | Duvar malzemesi + harç — **YALNIZCA GÖVDE** |
| **Islak hacim duvarı** (`Wall`, `wallType = islakHacim`) | Duvar malzemesi + harç — **YALNIZCA GÖVDE** |
| **Mekan** (`Space`) | İç sıva + boya + zemin kaplaması + şap + süpürgelik + tavan |
| **Islak mekan** (`Space`, `isWetArea`) | Yukarıdakiler + su yalıtımı + duvar seramiği + derz |
| **Cephe** (`Facade`) | Isı yalıtımı (mantolama) + dış sıva + dış boya + denizlik + iskele |
| **Kat** (`Floor`) | Beton + donatı + kalıp (ampirik katsayı) |
| **Sığınak** (`ServiceSpace`) | Özel kapı + havalandırma + donanım |

> **Düzeltme.** Bu tablo önceki sürümde dış duvara *"iç sıva + dış sıva + … + boya"*, ıslak
> hacim duvarına *"kaplama"* yüklüyordu. Aynı kalemleri `etut-veri-modeli.md` bölüm 4 zaten
> `Space`'e veriyordu — **sıva, boya ve seramik iki kez sayılıyordu** ve nesne tipleri farklı
> olduğu için hiçbir öz-denetim bunu yakalamıyordu. Sahiplik kuralı (bölüm 9) çift sayımı
> yapısal olarak imkânsız kılar.

Tablo bir kez kurulunca, plan değiştiğinde metraj otomatik güncellenir.

### 10.5 Fiyat kütüphanesi — zamana bağlı

- Merkezi kütüphane, her kalemin **tarihli fiyat geçmişi**
- Fiyat elle girilir (piyasa fiyatı)
- Yeni projede kütüphaneden çekilir, eskiyse uyarı: *"Bu fiyat 45 gün önce girilmiş, teyit edin"*
- Her projede fiyatlar yeniden gözden geçirilir

### 10.6 Maliyetten teklife

Sistem maliyette durmaz, teklif fiyatına kadar gider:

```
Doğrudan imalat maliyeti
+ Süre bağlı giderler
+ Proje giderleri (denetim, izin, sigorta — bölge paketinden)
+ Genel gider payı
+ Finansman maliyeti (nakit akışından)
+ Risk payı
+ Kâr marjı
= Teklif fiyatı (+ vergi)
```

Teklifin geçerlilik süresi ve süre sonrası güncelleme formülü tanımlanır.

> **Finansman maliyeti MVP'de hesaplanır.** Süreç adımlarından aylık gider dağılımı, gelir ve teşvik takviminden giriş kalemleri çıkar; net nakit pozisyonunun en derin noktası azami finansman ihtiyacını, o da finansman maliyetini verir. Tam Gantt gerekmez, basit S-eğrisi yeterlidir.

### 10.7 Duyarlılık analizi

Tek nokta tahmin yetmez. Sistem kritik değişkenlerin etkisini gösterir: ana malzeme fiyatı ±%20, süre +3 ay, döviz/endeks hareketi, bodrum kat sayısı ±1. Çıktı: teklif fiyatı ve kâr marjı bandı.

### 10.8 Elektrik ve mekanik — parametrik götürü

Bu iki blok kalem seviyesinde metrajlanırsa MVP şişer; sabit götürü geçilirse hedef sapma riske girer (referans projede elektrik ve ısıtma-soğutma toplamı ~%6,3).

**Çözüm: parametrik götürü.** Bağımsız bölüm başına sabit tutar değil, sürücü değişkenlere bağlı formül:

| Blok | Sürücüler |
|---|---|
| Elektrik tesisatı | Mekan sayısı, bağımsız bölüm sayısı, kat sayısı, ortak alan m² |
| Sıhhi tesisat | Islak hacim sayısı, donanım adedi, kat sayısı (düşey hat) |
| Isıtma/soğutma | Isıtılan m², mekan sayısı, sistem tipi, ısıtma elemanı tipi |
| Havalandırma | Islak hacim sayısı, şaft sayısı, kapalı otopark m² |

Katsayılar bölge paketinde tutulur, geriye dönük doğrulama testinden kalibre edilir. Kalem seviyesine geçiş Faz 3.

---

## 11. Standartlar

| Alan | Yaklaşım |
|---|---|
| Veri modeli | IFC nesne hiyerarşisi ile hizalı adlandırma — dış yazılımlara çeviri kaybı olmaz |
| İmalat sınıflandırma | Bölge paketindeki kodlama; uluslararası sınıflandırmalarla eşlenebilir |
| Mekan sınıflandırma | IfcSpace + kendi tipoloji kodumuz (servis mekanları dahil) |

Teknik not: IFC üzerinde çalışan olgun açık kaynak araçlar mevcut — tarayıcıda okuma/görselleştirme ve sunucu tarafında yazma. Ticari BİM yazılımına gitmeden kendi IFC çıktımızı üretmek teknik olarak mümkün.

---

## 12. Paydaş Portalı ve Yetkilendirme

**Yetkilendirme baştan kurulur.** Sonradan eklenmesi çok pahalıdır.

Hak sahibi **görür:** kendi bağımsız bölümü (plan, alan, konum), proje görselleri ve sunum, kendi payı, kendi talepleri ve durumları, sürecin kendisini ilgilendiren adımları.

Hak sahibi **görmez:** metraj, maliyet kalemleri, kâr marjı, diğer paydaşlarla yapılan anlaşma detayları.

**Talepler** serbest metin alınır, ekip okur, karar bizde kalır.

**Anlaşma tarafı (iç görünüm):** paydaş listesi, pay oranları, görüşme ve imza durumu, karar çoğunluğu göstergesi (eşik bölge paketinden gelir), teşvik programı uygunluk ve başvuru durumu, sözleşme şablonları ve versiyonları.

---

## 13. Rapor Çıktı Spesifikasyonu

Piyasadaki en iyi örnek incelendi. Alınacak dersler ve üstüne konacaklar:

### Korunacak özellikler

1. **Her satır denetlenebilir olmalı.** Sadece sonuç değil, girdi + birim fiyat + miktar birlikte gösterilir. "Bu rakam nereden çıktı" sorusunun cevabı raporun içinde olmalı. Güveni bu kurar.
2. **İnşaat dışı giderler dahil.** Denetim, sigorta primleri, saha personeli, abonelikler, teminat komisyonu, geçici barınma yardımı. Toplamın %14'ü kadar olabiliyor; götürü geçilirse hedef tutmaz.
3. **Kategori + yüzde payı özeti.** Ana blokların yüzde dağılımı ilk sayfada.
4. **Bağımsız bölüm tipolojisi dökümü.** Mekan mekan alan listesi.
5. **Donanım/marka seviyesi.** Kalite seviyesinin somut kanıtı; paydaş ikna etmede güçlü.

### Eklenecekler (referans üründe yok)

| Ek | Neden |
|---|---|
| **Paydaş paylaşım senaryosu** | Hak sahibinin sorduğu ilk soru |
| **Nakit akışı ve S-eğrisi** | Hangi ay ne kadar para gerekiyor — müteahhit için varoluşsal |
| **Azami finansman ihtiyacı** | Nakit eğrisinin en derin noktası |
| **Süreç takvimi** | Hangi adım ne zaman, kritik yol |
| **Duyarlılık analizi** | Tek nokta tahmin yerine bant |
| **Maliyetten teklife geçiş tablosu** | Marj görünürlüğü |
| **Metraj kaynağı şeffaflığı** | Her miktarın geometriden mi katsayıdan mı geldiği |
| **Versiyon karşılaştırma** | Teklif v1 ile v2 arasındaki fark |
| **Kat planları** | Referans üründe hiç plan yok — bizim en büyük görsel farkımız |

---

## 14. MVP Kapsamı

> **Tek MVP.** Plan motoru, geometriden metraj ve canlı maliyet paneli MVP'ye dahildir. İş paketi dökümü için: `mvp-spesifikasyonu.md`

MVP uçtan uca çalışan bir etüt sistemidir: parsel girilir, plan üretilir, metraj geometriden çıkar, maliyet ve paylaşım senaryosu hesaplanır, rapor alınır.

### Kapsam

| Alan | MVP'de |
|---|---|
| Etüt aşamaları A1–A13 | Tamamı |
| Etüt kademeleri K1/K2/K3 | Tamamı (aynı formların alt kümesi) |
| Zarf ve çekirdek üretimi | Var |
| Kat bölümleme — otomatik | Var |
| Kat bölümleme — manuel mod | Var (otomatik sonuç yetersizse yedek) |
| Birim içi mekan yerleşimi | Var (ilk 5 tipoloji şablonu) |
| Plan düzenleme + kısıt yayılımı | Var |
| Geometriden metraj | Var |
| Canlı maliyet paneli | Var |
| Otopark ve servis mekanı çözücü | Var |
| Süre bağlı maliyet + nakit akışı | Var (basit S-eğrisi) |
| Paylaşım senaryosu | Var (hesap; portal hariç) |
| İç fizibilite raporu | Var |
| Geriye dönük doğrulama testi | Var |

### Kapsam dışı

- Paydaş portalı ve dış erişim → Faz 2
- Hak sahibi sunum dosyası → Faz 2
- 3B görselleştirme → Faz 2
- Tam Gantt ve kritik yol, duyarlılık analizi → Faz 2
- IFC dışa aktarım, çoklu bölge paketi → Faz 3
- Elektrik/mekanik kalem seviyesi metraj → Faz 3 (MVP'de parametrik götürü, bkz. 10.8)
- BİM entegrasyonu → Faz 4
- M4–M7 modülleri → Faz 5–6

---

## 15. Yol Haritası

**Tek numaralandırma.** Diğer dokümanlardaki katman (L0–L4) ve iş paketi (İP-1…) adlandırmaları faz değildir.

| Faz | Kapsam | Not |
|---|---|---|
| **Faz 0 — Hazırlık** | Pilot bölge paketi, tipoloji şablonları, poz kataloğu ve nesne→kalem eşlemesi, kalite paketleri, süreç şablonu, kalibrasyon verisi | Alan uzmanı işi; kod geliştirmeyle **paralel** yürür |
| **Faz 1 — MVP** | Yukarıdaki kapsam | |
| **Faz 2** | Paydaş portalı ve anlaşma yönetimi, sunum dosyası, 3B görselleştirme, tam Gantt, duyarlılık analizi | |
| **Faz 3** | Çoklu bölge paketi, IFC dışa aktarım, elektrik/mekanik kalem seviyesi, gelişmiş plan düzenleme | |
| **Faz 4** | BİM entegrasyonu, otomatik projelendirme (M3) | |
| **Faz 5** | Onay ve izin (M4), ihale ve tedarik (M5) | |
| **Faz 6** | İcra (M6), teslim (M7) | |

> **Faz 0 uyarısı:** Bölge paketini çıkarmak 1–2 gün değil, yaklaşık bir haftalık iştir. Kod tarafı beklemesin diye erken başlamalı.

---

## 16. Referans Ürünler

**TestFit** — Parsel, karma, çekme mesafesi, otopark oranı girdisiyle kütle, yerleşim, çekirdek, otopark ve fizibilite üretiyor. Otopark otomasyonu tam bizim ilgi alanımız. Sınırı: detaylı dokümantasyon üretmiyor.

**Autodesk Forma** — Erken aşama saha analizi ve kütle; çevresel analiz güçlü.

**Diğerleri:** Finch, Hypar, Architechtures, Snaptrude.

**Maliyet tarafı referansı** — Piyasada kalem seviyesinde çok detaylı maliyet raporu üreten ürünler var; ancak geometriden değil skaler girdiden çalışıyorlar. Rapor formatı ve gider kapsamı örnek alınmalı, hesap yöntemi alınmamalı.

**Teknik kütüphaneler:** tarayıcı tarafı IFC görselleştirme, sunucu tarafı IFC okuma/yazma, açık kaynak plan editörleri (etkileşim modeli için).

---

## 17. Açık Sorular

1. **Pilot bölge hangisi?** İlk paket hangi idari birim için çıkarılacak?
2. **Teknoloji yığını** — web tabanlı varsayımı doğru mu?
3. **Plan motoru** — sıfırdan mı, mevcut açık kaynak editör üzerine mi?
4. **Paylaşım senaryosu formülü** — pay oranı mı, alan mı, hibrit mi?
5. **Kalem seti kapsamı** — MVP'de kaç kalemle başlanacak?
6. **Ampirik katsayılar** — geçmiş projelerden kalibrasyon için veri var mı?
7. **Kalite seviyesi paketleri** — malzeme seçimi marka seviyesine mi inecek, yoksa seviye paketleri mi?
8. **Süreç şablonu derinliği** — MVP'de kaç adımlık şablon? (20–30 adım yeterli olabilir)
9. **Satış tarafı** kapsama girecek mi?
10. **Tedarikçi/taşeron portalı** olacak mı, yoksa teklifler elle mi girilecek?

---

## 18. Bir Sonraki Adım

Faz 0:

1. Pilot bölge paketini çıkar — kural seti + servis mekanı eşikleri + gider kalemleri
2. Veri modelini kağıt üzerinde tasarla (nesne şeması, ilişkiler, 7 modülün ortak omurgası)
3. Nesne→kalem eşleme tablosunun ilk 20 satırını yaz
4. Boşluk düşümü kurallarını kalem bazında tanımla
5. Süreç şablonunun ilk taslağını çıkar (aşamalar, adımlar, süreler, süre bağlı giderler)
6. **Geçmiş bir projeyi bu modele elle gir** — bodrum servis mekanları ve süreç adımları dahil

Altıncı adım kritik: gerçek bir projeyi elle modele oturtmak, veri modelindeki eksikleri kod yazmadan önce ortaya çıkarır.
