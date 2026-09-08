# Etüt Süreç Modeli

**Sürüm:** 1.0
**Tarih:** 7 Eylül 2026
**Amaç:** Sektördeki etüt sürecinin adım adım tanımı ve sistem mimarimizdeki karşılığı. Proje oluşturma sihirbazının iskeletidir.

---

## 1. Etüt Nedir, Sektörde Nasıl Yapılıyor

Etüt, "bu arsada ne yapabilirim, kaça mal olur, kazanır mıyım" sorularının inşaata başlamadan cevaplandığı aşamadır.

**Mevcut sektör pratiği:** Etüt çoğunlukla dağınık yürüyor. İmar durumu bir kâğıtta, malik listesi bir Excel'de, maliyet hesabı başka bir Excel'de, hepsi tek bir kişinin kafasında birleşiyor. Karar sıklıkla "m² × birim fiyat" ile veriliyor. Süreç adımları takip edilmediği için gecikmeler geç fark ediliyor ve gecikmenin maliyeti hiç hesaplanmıyor.

**Bizim yaklaşımımız:** Etüt tek bir yapılandırılmış veri seti üzerinde yürür. Her adım bir öncekinin çıktısını kullanır. Hiçbir veri iki kez girilmez. Süreç adımları ve süreleri kayıt altındadır, süre bağlı maliyetler bunlardan otomatik doğar.

---

## 2. Temel Yapısal Öneri: Kademeli Etüt

> Her parsel için tam etüt yapmak sürdürülemez. Etüt üç kademede yürümeli, her kademe sonunda bir karar kapısı olmalı.

| Kademe | Süre | Amaç | Çıktı | Kapı |
|---|---|---|---|---|
| **K1 — Ön Eleme** | 15–30 dk | Bu parsel bakmaya değer mi? | Kaba yapılaşma hakkı, kaba gelir/maliyet oranı | Ele / devam |
| **K2 — Ön Etüt** | Yarım–1 gün | Teklif verilebilir mi? | Program, kaba plan, ±%15 maliyet, paylaşım taslağı | Teklif verme / verme |
| **K3 — Detaylı Etüt** | 3–10 gün | Sözleşmeye esas rakam | Gerçek metraj, ±%5 maliyet, nakit akışı, süreç takvimi | Sözleşme / vazgeç |

Aynı veri modeli üçünde de kullanılır; sadece doldurulan alan sayısı ve doğruluk seviyesi artar. Kullanıcı K1'de 15 alan doldurur, K3'te 300 alan.

**Sistemde karşılığı:** her veri alanının bir "kademe etiketi" olur. Sihirbaz K1'de sadece K1 alanlarını sorar. Kullanıcı kademe yükselttiğinde yeni alanlar açılır, önceki veriler korunur.

Bu yapı ayrıca huni (funnel) verisi üretir: kaç parsele baktık, kaçı K2'ye geçti, kaçı sözleşmeye döndü.

---

## 3. Etüt Aşamaları

Her aşama için: sektörde nasıl yapıldığı, sistemdeki karşılığı, veri sahipliği.

**Veri sahipliği kodları:**
`M` = Manuel giriş · `B` = Belge yükleme · `H` = Sistem hesaplar · `P` = Bölge paketinden gelir · `E` = Dış servis

---

### A1 — Parsel Tespiti ve Tapu İncelemesi

**Amaç:** Parselin kimliğini, mülkiyet yapısını ve hukuki engellerini ortaya koymak.

**Sektörde:** Tapu kaydı çıkarılır, malik sayısı ve hisse yapısı incelenir. Şerh, ipotek, haciz, irtifak hakkı taranır. Bunlar projeyi baştan bitirebilecek engellerdir; en başta bakılır.

| Veri | Tip | Kademe |
|---|---|---|
| İl / ilçe / mahalle | M | K1 |
| Ada / parsel no | M | K1 |
| Parsel alanı | M / B | K1 |
| Parsel geometrisi (sınır poligonu) | B | K2 |
| Mülkiyet tipi (tek malik / hisseli / kat mülkiyeti) | M | K1 |
| Malik sayısı | M | K1 |
| Hisse dağılımı | M | K2 |
| Takyidat: şerh, ipotek, haciz, irtifak | M / B | K2 |
| Mevcut yapı var mı, varsa yaşı ve durumu | M | K1 |
| Mevcut bağımsız bölüm sayısı ve alanları | M | K2 |
| Yapı durum tespiti (dönüşüm kapsamındaysa) | M / B | K2 |

**Karar kapısı:** Hukuki engel var mı? İpotek/haciz temizlenebilir mi? Mülkiyet yapısı çalışılabilir mi?

**Modül:** M1 Etüt · Katman 1 (Parsel ve Saha)

---

### A2 — İmar Durumu Araştırması

**Amaç:** Bu parselde ne kadar ve nasıl inşaat yapılabileceğini kesinleştirmek. Etüdün en belirleyici aşamasıdır — buradaki hata her şeyi bozar.

**Sektörde:** Belediyeden imar durum belgesi alınır, plan notları okunur. Deneyimli müteahhit plan notlarını satır satır okur; asıl sürprizler oradadır.

| Veri | Tip | Kademe |
|---|---|---|
| İmar durum belgesi | B | K2 |
| Plan notları | B / M | K2 |
| Yapı nizamı (ayrık / bitişik / blok) | M | K1 |
| Taban alanı katsayısı | M | K1 |
| Emsal (inşaat alanı katsayısı) | M | K1 |
| Emsal hesap yöntemi (brüt/net alan üzerinden) | P | K1 |
| Çekme mesafeleri (ön/yan/arka) | M | K1 |
| Azami kat adedi veya yükseklik | M | K1 |
| Yüksekliğin ölçüm referansı | P | K2 |
| Emsal harici alan kuralları | P | K2 |
| Cephe aldığı yollar ve genişlikleri | M | K2 |
| Özel kısıtlar: koruma alanı, mania kotu, askeri/orman/kıyı sınırı, afet riski | M | K2 |
| Otopark ihtiyaç kuralı | P | K1 |
| Kot krokisi / referans kot | B / E | K2 |
| Parsel köşe kotları | M / E | K3 |

**Hesaplananlar (H):** Azami taban alanı · Azami toplam inşaat alanı · Yapılaşabilir zarf · Kot farkına göre kazanılabilir bodrum

**Karar kapısı:** Yapılaşma hakkı yeterli mi? Özel kısıt projeyi bitiriyor mu?

**Modül:** M1 · Katman 1 + Katman 2 (Kural Seti)

---

### A3 — Zemin ve Saha Etüdü

**Amaç:** Temel sistemini, kazı yöntemini ve bunların maliyetini belirlemek. Maliyette en büyük sürprizler buradan çıkar.

**Sektörde:** Zemin etüt raporu yaptırılır (sondaj + laboratuvar). Yeraltı su seviyesi ve komşu bina mesafeleri iksa ihtiyacını doğurur; iksa bütçeyi tek başına sarsabilir.

| Veri | Tip | Kademe |
|---|---|---|
| Zemin etüt raporu | B | K3 |
| Zemin sınıfı | M | K2 |
| Zemin emniyet gerilmesi | M | K3 |
| Yeraltı su seviyesi | M | K2 |
| Sıvılaşma / oturma riski | M | K3 |
| Temel sistemi kararı | M | K2 |
| Kazık / fore kazık ihtiyacı | M | K2 |
| İksa ihtiyacı ve yöntemi | M | K2 |
| Komşu binalara mesafe ve durumu | M | K2 |
| Topografya, kot farkı | M / E | K2 |
| Hafriyat çıkış mesafesi ve döküm sahası | M | K2 |
| Altyapı bağlantı noktaları (elektrik/su/gaz/kanal) | M | K3 |
| Şantiye erişimi, yol genişliği, vinç kurulabilirliği | M | K2 |

**Hesaplananlar (H):** Kazı hacmi · İksa yüzeyi · Temel beton ve donatı miktarı

**Karar kapısı:** Zemin maliyeti projeyi taşıyor mu?

**Modül:** M1 · Katman 1

---

### A4 — Hak Sahibi Analizi

**Amaç:** Kiminle, hangi payla, hangi beklentiyle anlaşacağımızı netleştirmek. Dönüşüm projelerinde teknik etüt kadar belirleyicidir.

**Sektörde:** Malik listesi çıkarılır, tek tek görüşülür, eğilim ölçülür. Karar çoğunluğuna ulaşılamayan proje ilerlemez.

| Veri | Tip | Kademe |
|---|---|---|
| Hak sahibi listesi ve iletişim | M | K2 |
| Pay oranları | M | K2 |
| Mevcut bağımsız bölüm alanları | M | K2 |
| Beklenti / talep notları | M | K2 |
| Anlaşma eğilimi (olumlu/kararsız/itirazcı) | M | K2 |
| Karar çoğunluğu eşiği | P | K2 |
| Geçici barınma yardımı hak sahipliği ve süresi | M | K3 |
| Teşvik programı uygunluğu | M / P | K3 |

**Hesaplananlar (H):** Anlaşma oranı ve eşiğe uzaklık · Barınma yardımı toplam maliyeti · Teşvik geliri ve takvimi

**Karar kapısı:** Karar çoğunluğu ulaşılabilir görünüyor mu?

**Modül:** M2 Paydaş ve Anlaşma (etüt aşamasında veri toplama düzeyinde)

---

### A5 — Program ve Kütle Etüdü

**Amaç:** Zarfın içine ne sığdığını belirlemek. Etüdün teknik kalbi.

**Sektörde:** Mimar kaba bir avan çalışır, kaç daire çıktığına bakılır. Genellikle 2–3 alternatif denenir.

| Veri | Tip | Kademe |
|---|---|---|
| Kat yükseklikleri (bodrum/zemin/normal) | M | K1 |
| Bodrum kat sayısı (başlangıç) | M | K1 |
| Zemin katta ticari kullanım | M | K1 |
| Bağımsız bölüm karması (kat kat, tip ve adet) | M | K2 |
| Bağımsız bölüm tipolojileri (mekan mekan alan) | M | K2 |
| Çekirdek tercihleri (asansör sayısı, merdiven tipi) | M | K2 |
| Hedef otopark sayısı | M | K1 |
| Zorunlu servis mekanları onayı | M + P | K2 |
| Depo yapılacak mı | M | K2 |
| Çatı tipi ve kullanımı | M | K2 |

**Hesaplananlar (H):** Yapılaşabilir zarf · Otopark ihtiyacı ve gereken bodrum kat sayısı · Servis mekanı alanları · Tipik kat planı · Net/brüt alan ve verimlilik oranı · Toplam inşaat alanı

**Karar kapısı:** Çıkan daire sayısı ve karma, hak sahibi ihtiyacını karşılıyor mu? Müteahhide pay kalıyor mu?

**Modül:** M1 · Katman 3 (Çekirdek) + Katman 4 (Program) · Plan üretim motoru

---

### A6 — Kalite ve Donanım Seviyesi

**Amaç:** Neyin yapılacağını malzeme seviyesinde tanımlamak. Maliyetin ikinci belirleyicisi.

**Sektörde:** Genelde "lüks yapacağız" denip geçilir, sonra metraj aşamasında tek tek karar verilir. Belirsizlik burada maliyet hatasına dönüşür.

| Veri | Tip | Kademe |
|---|---|---|
| Genel kalite seviyesi (ekonomik / standart / üst) | M | K1 |
| Cephe sistemi ve oranları | M | K2 |
| Isıtma/soğutma sistemi | M | K1 |
| Doğrama tipi ve cam türü | M | K2 |
| Islak hacim kaplamaları | M | K3 |
| Zemin kaplamaları (mekan bazında) | M | K3 |
| Mutfak / banyo donanımı | M | K3 |
| Kapı tipleri | M | K3 |
| Asansör sınıfı | M | K2 |
| Ortak alan ve giriş kalite seviyesi | M | K3 |
| Peyzaj kapsamı | M | K3 |

**Sistem yaklaşımı:** Kalite seviyesi paketleri tanımlanır; paket seçilince tüm alanlar ön-dolar, kullanıcı istisnaları değiştirir. K1'de tek seçim, K3'te kalem kalem.

**Modül:** M1 · Spesifikasyon katmanı → Maliyet motoruna girdi

---

### A7 — Metraj

**Amaç:** Gerçek miktarları çıkarmak.

**Sektörde:** Etüt aşamasında genelde yapılmaz; m² birim fiyatla geçilir. Bizim ana farkımız burası.

**Girdi:** A5'ten gelen geometri + A6'dan gelen spesifikasyon
**Kaynak:** Nesne → imalat kalemi eşleme tablosu

**Hesaplananlar (H):** Duvar alanı ve hacmi · Cephe alanı · Doğrama adedi ve alanı · Kapı adedi · Döşeme/şap/kaplama alanları · Sıva alanı (açıklık düşümü kuralına göre) · Kazı ve iksa miktarı · Beton/donatı/kalıp (ampirik katsayı) · Servis mekanı imalatları

**Manuel müdahale:** Her kalem elle düzeltilebilir; sistem düzeltmeyi ve gerekçesini kaydeder.

**Modül:** M1 · Metraj motoru

---

### A8 — Süre ve İş Programı Etüdü

**Amaç:** Projenin ne kadar süreceğini ve sürenin maliyetini belirlemek.

**Sektörde:** "13 ayda biter" denir, dayanağı deneyimdir. Gecikmenin maliyeti hesaplanmaz.

| Veri | Tip | Kademe |
|---|---|---|
| Süreç şablonu seçimi | P | K2 |
| Aşama ve adım süreleri | M / P | K2 |
| Bağımlılıklar | P | K2 |
| Beklenen izin süreleri | M / P | K2 |
| Sezon/hava kısıtı | M | K3 |
| Tahliye ve yıkım süresi | M | K2 |

**Hesaplananlar (H):** Toplam proje süresi · Kritik yol · İnşaat süresi · Süre bağlı maliyet kalemleri · Gecikme senaryolarının maliyeti

**Modül:** MX Süreç ve İş Akışı

---

### A9 — Maliyet Etüdü

**Amaç:** Toplam maliyeti kalem seviyesinde ortaya koymak.

| Bileşen | Kaynak |
|---|---|
| Doğrudan imalat maliyeti | A7 metrajı × fiyat kütüphanesi |
| Süre bağlı giderler | A8 süreleri × dönemsel bedel |
| Proje giderleri (denetim, izin, sigorta, danışmanlık) | Bölge paketi + manuel |
| Hak sahibi giderleri (barınma yardımı, taşınma, teminat) | A4 verisi |
| Yıkım ve tahliye | Manuel / hesaplanan |
| Genel gider payı | Oran (M) |
| Finansman maliyeti | Nakit akışından (H) |
| Risk payı | Oran (M) |

**Hesaplananlar (H):** Toplam maliyet · Kategori dağılımı ve yüzdeleri · m² başına maliyet (rapor için, hesap için değil) · Nakit akışı ve azami finansman ihtiyacı

**Modül:** M1 Maliyet motoru + MX zamana bağlı maliyet

---

### A10 — Gelir ve Değerleme Etüdü

**Amaç:** Projenin gelir tarafını koymak. Kârlılık hesabı bu olmadan yapılamaz.

| Veri | Tip | Kademe |
|---|---|---|
| Bölge satış birim değerleri (tip ve kat bazında) | M | K1 |
| Kat/cephe/manzara katsayıları | M | K2 |
| Ticari alan birim değeri | M | K2 |
| Satış takvimi varsayımı | M | K3 |
| Kira geliri (varsa) | M | K3 |

**Hesaplananlar (H):** Satılabilir alan · Toplam gelir projeksiyonu · Gelirin zamana yayılımı

**Modül:** M1 · Fizibilite katmanı

---

### A11 — Paylaşım Senaryosu

**Amaç:** Hak sahibi ile müteahhit arasındaki dağılımı kurmak. Hak sahibinin sorduğu ilk soru budur.

| Veri | Tip | Kademe |
|---|---|---|
| Paylaşım yöntemi (pay oranı / alan / hibrit) | M | K2 |
| Müteahhit pay oranı hedefi | M | K1 |
| Hak sahibi başına verilecek bağımsız bölüm | M / H | K2 |
| İlave alan bedeli / iade bedeli | M / H | K3 |
| Ek ödeme ve mahsup kuralları | M | K3 |

**Hesaplananlar (H):** Hak sahibi başına düşen alan ve daire · Müteahhide kalan satılabilir alan · Fark ödemeleri · Senaryo karşılaştırma

**Modül:** M1 · Fizibilite + M2 Paydaş

---

### A12 — Fizibilite Sonucu ve Karar

**Hesaplananlar (H):** Toplam gelir − toplam maliyet = brüt kâr · Kâr marjı · Sermaye getirisi · Azami finansman ihtiyacı · Başabaş noktası · Duyarlılık bandı (malzeme ±%20, süre +3 ay, satış fiyatı ±%15)

**Risk kaydı (M):** Tespit edilen riskler, olasılık, etki, önlem.

**Karar kapısı:** Teklif verilsin mi? Hangi şartlarla?

**Modül:** M1 · Fizibilite katmanı

---

### A13 — Sunum ve Teklif

**Çıktılar:** Hak sahibi sunum dosyası (maliyet ve marj gizli) · İç fizibilite raporu (tam) · Teklif mektubu ve geçerlilik süresi · Sözleşme taslağı girdileri

**Modül:** M1 rapor motoru + M2

---

## 4. Aşama Kapıları

Süreç modülü (MX) her kapıda koşul kontrolü yapar ve koşul sağlanmadan sonraki aşamayı açmaz:

| Kapı | Koşul |
|---|---|
| A1 → A2 | Hukuki engel yok, mülkiyet yapısı çalışılabilir |
| A2 → A3 | Yapılaşma hakkı hesaplandı, özel kısıt engelleyici değil |
| A3 → A5 | Temel sistemi ve kazı yöntemi kararlaştırıldı |
| A5 → A7 | Program onaylandı, plan üretildi, otopark çözüldü |
| A7 → A9 | Metraj tamam, spesifikasyon tanımlı |
| A9 → A12 | Maliyet, süre ve gelir hesaplandı |
| A12 → A13 | Karar kapısı geçildi |

Kapı koşulu sağlanmadan ilerlenmek istenirse sistem engellemez, **uyarır ve eksik listesini gösterir.** Hızlı çalışmayı bloke etmemeli.

---

## 5. Sihirbaz Akışı (Yeni Proje Oluştur)

Sistemde "Yeni Proje" akışının ekran sırası:

```
1.  Proje kimliği        → ad, tip, kademe seçimi (K1/K2/K3)
2.  Parsel ve tapu       → A1
3.  İmar durumu          → A2   [otomatik: yapılaşma hakkı hesaplanır]
    ─── K1 kapanır: kaba fizibilite gösterilir ───
4.  Zemin ve saha        → A3
5.  Hak sahipleri        → A4
6.  Program ve kütle     → A5   [otomatik: zarf, otopark, servis mekanları, plan]
7.  Kalite seviyesi      → A6
    ─── K2 kapanır: ön maliyet ve paylaşım taslağı ───
8.  Metraj gözden geçirme → A7  [otomatik üretilir, elle düzeltilir]
9.  Süreç ve takvim      → A8
10. Maliyet ve fiyatlar  → A9
11. Gelir varsayımları   → A10
12. Paylaşım senaryosu   → A11
    ─── K3 kapanır: tam fizibilite + rapor ───
```

**İlkeler:**
- Her ekran kaydedilebilir, yarım bırakılabilir
- Hesaplanan alanlar ekranda anlık güncellenir (sağ panelde canlı özet)
- Kullanıcı hesaplanan bir değeri elle ezebilir; sistem bunu işaretler ve raporda gösterir
- Zorunlu alan azdır; eksik alan uyarı üretir, ilerlemeyi durdurmaz

---

## 6. MVP Kapsamı

> **Tek MVP, plan motoru dahil.** Tüm etüt aşamaları MVP'dedir.

| Aşama | MVP | Not |
|---|---|---|
| A1 Parsel ve tapu | ✅ Tam | |
| A2 İmar durumu | ✅ Tam | Zarf hesabı dahil |
| A3 Zemin ve saha | ✅ Tam | Kazı ve iksa metrajı dahil |
| A4 Hak sahipleri | ✅ Tam | Liste, paylar, çoğunluk göstergesi (portal hariç) |
| A5 Program ve kütle | ✅ Tam | **Otomatik plan üretimi dahil** + manuel bölümleme yedek modu |
| A6 Kalite seviyesi | ✅ Paket düzeyinde | Kalem bazlı istisna girilebilir |
| A7 Metraj | ✅ Tam | **Geometriden çıkarım.** Elektrik/mekanik parametrik götürü |
| A8 Süreç ve takvim | ✅ Basit şablon | Süre bağlı maliyet + S-eğrisi. Tam Gantt Faz 2 |
| A9 Maliyet | ✅ Tam | Finansman maliyeti dahil |
| A10 Gelir | ✅ Tam | |
| A11 Paylaşım | ✅ Tam | Hesap MVP'de; **paydaş portalı Faz 2** |
| A12 Fizibilite | ✅ Tam | Duyarlılık analizi Faz 2 |
| A13 Rapor | ✅ İç rapor | Hak sahibi sunum dosyası Faz 2 |

**Kademe desteği:** K1, K2 ve K3'ün üçü de MVP'dedir — aynı form setinin alan alt kümeleridir, ek geliştirme maliyeti düşüktür.

---

## 7. Sonraki Adım

Bu doküman onaylanınca çıkarılacaklar:

1. **Veri şeması** — tablolar, alanlar, tipler, ilişkiler, kademe etiketleri
2. **Sihirbaz alan listesi** — ekran ekran, doğrulama kuralları ile
3. **Hesaplama kuralları** — hangi alan neyden türüyor
4. **Claude Code devir paketi** — yukarıdakiler + teknoloji kararları
