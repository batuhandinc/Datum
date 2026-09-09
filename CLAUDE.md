# Datum — Çalışma Kuralları

İnşaat projelerinin **etüt ve fizibilite** aşamasını otomatikleştiren web uygulaması.
Parselin imar verisi girilir → yapılaşabilir zarf hesaplanır → kat planı üretilir →
plandan **gerçek metraj** çıkar → kalem bazlı maliyet ve paylaşım senaryosu hesaplanır.

**Teknoloji:** Next.js (App Router) · PostgreSQL · Prisma · TypeScript

---

## 0. En önemli kural: şemayı uydurma

`etut-veri-modeli.md` **otoriter** şema dokümanıdır. Varlıklar, alanlar ve tipler orada tanımlı.

- Alan adları dokümandaki isimlerle **birebir aynı** olmalı. `floorAreaRatio` `floorAreaRatio`
  kalır. Bir alanı "iyileştirme", yeniden adlandırma, kısaltma açma, çoğullaştırma **yok**.
- Enum değerleri de birebir — Türkçe tanımlayıcılar dahil (`yeniYapi`, `ayrik`, `radye`,
  `ebeveynBanyo`). Bunlar **kimliktir**, arayüz metni değil; çevrilmez.
- Dokümanda olmayan alan **uydurulmaz**. Eksik veya çelişkili bir yer bulursan **sor**,
  doldurma. Tahmin edilen bir alan adı, sessizce yanlış bir şemadır.

Bir sapma zorunluysa (aşağıdaki ASCII kısıtı gibi) kod içinde `/// SAPMA:` ile işaretle
ve bu dosyadaki açık kararlar listesine ekle.

---

## 1. Değişmez ilkeler

`mvp-spesifikasyonu.md` §6. İhlal etme.

1. **Yerel hiçbir şey koda gömülmez.** Mevzuat, eşik, katsayı, kalem kodu — hepsi bölge
   paketinde **veri**. Koda yazılan bir sayı, ikinci bir bölge eklenemez demektir.
2. **Proje bölge paketi sürümünü dondurur.** Yönetmelik değişimi eski projeyi geriye dönük
   değiştirmez.
3. **Metrekare × birim fiyat hesabı yapılmaz.** Her miktar geometriden veya tanımlı formülden çıkar.
4. **Her nesne semantik kalır.** Serbest çizim yok; geometri serbest, nesne anlamlı.
5. **Her hesaplanan değer ezilebilir ve ezme işaretlenir.**
6. **Açıklık düşümü kuralı kalem bazında merkezî tanımlıdır**, her yerde aynı uygulanır.
7. **Kısıt ihlali engellemez, uyarır.**
8. **Adlandırma IFC hiyerarşisiyle hizalı** kalır (Block=IfcBuilding, Floor=IfcBuildingStorey,
   Unit=IfcSpatialZone, Space=IfcSpace…). Dışa aktarım Faz 3'te olsa da isimlendirme baştan doğru.
9. **Süre bağlı maliyetler süreç adımlarına bağlıdır**, elle girilmez.
10. **Rapor denetlenebilirdir** — girdi, birim fiyat, miktar, formül görünür.

---

## 2. Konvansiyonlar

- **Kod ve şema tanımlayıcıları İngilizce** (`grossArea`, `floorAreaRatio`, `setbackFront`).
- **Arayüz metinleri Türkçe, i18n katmanında** (`src/lib/i18n/tr.ts`).
  **Koda gömülü Türkçe metin yok.** Hata mesajları `DATUM_*` kodu döndürür, `errorMessage()` çevirir.
- Şema dosyalarındaki `///` açıklamaları yapısal: `@tier`, `@own`, `@src`.
  **`@src` BÖLÜME işaret eder, satıra değil** — `etut-veri-modeli.md§3`.
  Satır numarası kırılgandır: dokümana bir paragraf eklemek yüzlerce referansı
  birden bozar (v1.1 ve v1.2'de tam olarak bu oldu, 539 referansın 495'i
  yanlış satıra bakar hâle gelmişti). Bölüm numarası anlamsaldır ve kaymaz.
  Bir test alanın referans verilen bölümde gerçekten geçtiğini doğrular.
- Yorumlar ve doküman metni Türkçe.

**ASCII kısıtı:** Prisma enum değerleri `[A-Za-z][A-Za-z0-9_]*` olmak zorunda. Türkçe
aksanlı değerler normalize edildi ve şemada işaretlendi:
`brüt→brut` · `sürekli→surekli` · `sürme→surme`. `SpaceCategory` değerleri dokümanda
yalnızca Türkçe tablo başlığıydı, tanımlayıcı olarak önerildi.

---

## 3. Hesaplanan alan sözleşmesi

Her ezilebilir değer **dört** kolon taşır. Adlandırma **mekanik**:

```
<alan>ComputedValue    sistemin hesapladığı
<alan>OverrideValue    kullanıcının yazdığı (varsa)
<alan>OverrideReason   neden ezildiği
<alan>                 GENERATED ALWAYS AS (COALESCE(override, computed)) STORED
```

- Dördüncü kolon **yazılamaz**. Postgres reddeder; `WritablePayload<>` tipi de derleme
  zamanında engeller. **Asla** doğrudan yazmayı deneme — `ComputedValue` veya
  `OverrideValue` yaz.
- Tek doğruluk kaynağı **`prisma/computed-fields.ts`**. Yeni hesaplanan alan eklerken:
  1. şemaya dört kolonu ekle, 2. registry'ye kaydet, 3. `npm run codegen`, 4. yeni migration.
- Para ve alan alanları `@db.Decimal` — **float yok**. Üçlünün üç kolonu **aynı** precision/scale.
- **Provenance bu üçlüde tutulmaz.** Kaynak izlenebilirliği `QuantityLine` seviyesindedir
  (`sourceObjectType` · `sourceObjectId` · `formula`). Rapor şeffaflığı orada yaşar.
- `OverrideLedger` view'ı registry'den **üretilir** — elle yazılmadığı için bayatlayamaz.
  "Bu projedeki tüm ezmeler" tek sorgudur.

Şu an **61 hesaplanan alan, 20 model, 244 kolon**. Bir test dördünün de varlığını doğrular.
Sayaç kasıtlı olarak SABİTTİR: alan eklemek testi kırar ve dört adımlı ritüelin
atlanmadığını görmeye zorlar.

---

## 4. Kiracılık

`organizationId` **yalnızca kök varlıklarda**: `Project`, `RegionPackage`, `PriceListVersion`.
Başka hiçbir tabloda yok; alt varlıklar kiracılığı `Project` üzerinden miras alır.

Kök = bağımsız adreslenebilen ve kiracıya ait olan. `PriceListVersion` köktür çünkü
projeler ona işaret eder, o projeye değil. Liste `ORG_SCOPED_MODELS`
(`src/lib/db/client.ts`) ile **aynı** olmalı — bir test bunu doğrular; biri
unutulursa o tablo kiracı filtresinden kaçar.

- Uygulama kodu **daima** `db()` kullanır (`src/lib/db/tenant.ts`) — ham `prisma` değil.
  Extension kök varlık sorgularını otomatik filtreler.
- Alt varlık sorguları **kökten** yazılır: `db().project.findFirst({ include: … })`.
  Extension traversal ile filtreleyemez; alt tablodan doğrudan sorgu **kiracı sızdırır**.
- Kural "her tabloda organizationId" diye değişirse **tek migration'da, tüm tablolarda
  birden** değişmeli — asla tablo tablo. Bir test taşıyıcı listesini kilitler.
- Kimlik katmanı yok. Geldiğinde değişecek **tek yer** `currentOrganizationId()`.

---

## 5. Bölge paketi ve dondurma

```
RegionPackage (soy)  →  RegionPackageVersion (draft → published → deprecated)
                            └── 22 kural tablosu (regionPackageVersionId zorunlu)
Project.regionPackageVersionId  →  SET-ONCE
```

- Yeni sürüm **klonla** açılır, `draft` iken düzenlenir, `publishVersion()` ile yayımlanır.
- Yayımdan sonra kural satırları **fiziksel olarak değişmez** — koruma
  `prisma/sql/immutability.sql` içindeki PL/pgSQL trigger'larıdır, uygulama katmanı değil.
  `$executeRaw` da aynı duvara çarpar.
- Proje yalnızca `published` sürüme bağlanabilir. `null→değer` serbest; `değer→değer`
  yalnızca `applied` bir `ProjectPackageMigration` varsa.
- **Yeni kural tablosu eklerken DÖRT yeri birden güncelle:** şema ·
  `VERSION_SCOPED_MODELS` (`src/lib/region-package/version.ts`) ·
  `frozen_tables` (`prisma/sql/immutability.sql`) · **yeni migration'a trigger kurma
  bloğunu kopyala** (migration geçmişi temsil eder; en sonuncusu güncel listeyi taşımalı).
  İki test dördünün de aynı kümeyi gösterdiğini doğrular — biri unutulursa o tablo
  dondurulmamış olur ve **ilke 2 sessizce delinir**.

**Enum mü, katalog tablosu mu** (veri modeli 15.1):

> **Enum meşrudur** kod her üyeyi ayrı ayrı **uygulamak** zorundaysa — yeni bir değer
> zaten yeni kod gerektirir. *Örnek:* `OffsetJoinType`, `ConstraintEffectKind`.
>
> **Katalog tablosu zorunludur** değerler kodun yalnızca **sakladığı ve gösterdiği**
> açık uçlu yerel bir sözlükse. *Örnek:* `HeightReferenceCatalog`, `SpecialConstraintCatalog`.

İP-1'de `heightReferenceMethod` yanlış tarafa düşmüştü: uydurulmuş değerlere sahip bir kod
enum'uydu ve paket verisi onu kullanıyordu. v1.2'de kataloğa taşındı.

---

## 6. Kademe (K1/K2/K3)

İki ayrı mekanizma:

1. **`Project.tier`** — sıradan enum. **`@default` yok**: süreç modeli :351 sihirbazın ilk
   ekranında kademeyi açıkça sordurur. Varsayılan koymak dokümanın vermediği kararı uydurmaktır.
2. **Alan bazlı kademe** — şemada `/// @tier K2 …` açıklaması.

Kademe yalnızca **görünürlüğü** kapatır, asla `NOT NULL` üretmez — "kademe yükseltince
önceki veriler korunur" ancak böyle veritabanı seviyesinde doğru olur.

**Alan kademesi bölge paketine KONULMAZ.** Paketten gelseydi sürüm yükseltmesi eski bir
projenin K1 formundaki soruları geriye dönük değiştirirdi — doğrudan ilke 2 ihlali.

---

## 6b. İP-2 katmanları

```
src/lib/geometry/    SAF — Prisma/Next yok, sunucu ve tarayıcı aynı dosya
  measure · clipper · offset · frame · schema
src/lib/rules/       kural okuyucu — kural tablolarını okumanın TEK yolu
src/lib/envelope/    l0.ts (saf hesap) + service.ts (okur, çağırır, yazar)
src/lib/warnings.ts  Warning { code, params } — ilke 7'nin altyapısı
src/lib/fields/      ÜRETİLMİŞ kademe kataloğu (şemadaki @tier'lardan)
```

- **Kural okuma yalnızca `createRuleReader()` üzerinden.** Kural tabloları
  `ORG_SCOPED_MODELS`'te değil; doğrudan sorgu kiracı filtresinden geçmez ve
  sürüm filtresini unutan sorgu YANLIŞ paketi okuyup sessizce yanlış sayı üretir.
  Bir test bunu kilitler.
- **Kural yoksa `null` + uyarı** — asla koda gömülü varsayılan (ilke 1).
  `offsetJoinType` yoksa zarf hesaplanmaz; miter ile round arasında %8'e varan
  alan farkı var, varsayılan seçmek mevzuat yorumu uydurmak olurdu.
- **Geometri saf fonksiyondur**, veritabanı gerektirmez. İçe öteleme poligonu
  BÖLEBİLİR veya YOK EDEBİLİR — ikisi de geçerli sonuç, istisna değil.
  `buildableEnvelope` bu yüzden `MultiPolygon | null`.
- **L0'ın iki modu var:** `Parcel.geometry` K2 olduğu için K1'de poligon yok →
  skaler hesap; K2+ → geometrik.
- **Taban alanı aşımında sistem KARAR VERMEZ**, uyarır. Zarf kırpılmaz;
  küçültme yönü kullanıcınındır ve seçimi bir ezmedir.
- **Uyarı ≠ hata.** `ok: false` yalnızca gerçek hatalar için. Eksik alan asla
  kaydı engellemez (ilke 7); `warningMessage()` parametre enterpole eder,
  `errorMessage()` edemez.

---

## 6c. İP-3 katmanları

```
src/lib/formula/        SAF — kendi ayrıştırıcımız; eval/Function YOK
  ast · parser · validate · evaluate · contracts
src/lib/core/           l1.ts (saf) + service.ts — L0 desenini birebir taklit eder
src/lib/service-space/  engine.ts — eşik hesabı, alan formülü
src/lib/parking/        solver.ts — senaryolar + rampa
src/lib/program/        A5 repository ve tipoloji şablonu şeması
src/lib/startup/        8 soru + yazma katmanı
```

**Formül dili** (`etut-veri-modeli.md` §12.5):
- `eval`/`Function` **YOK**. Paket verisi kullanıcı girdisidir; onu çalıştırılabilir
  koda çevirmek paket yazan herkese sunucuda kod çalıştırma yetkisi vermek olurdu.
- Değişken beyaz listesi **kural tipine özel** — otopark formülü `demandPowerKW`
  göremez. Ortak liste anlamsız ama sessizce geçerli formüllere izin verirdi.
- **Doğrulama YAYIM anında**, okuma anında değil. Bozuk formül `publishVersion`'ı
  reddeder ve sürüm `draft` kalır. Okuma anında yakalansaydı paket çoktan
  dondurulmuş olurdu. Yeni formül kolonu eklerken `FORMULA_SLOTS`'a da ekle.
- Çalışma zamanı sorunları (sıfıra bölme, eksik girdi) **uyarı**, sonuç `null`.
  **Sessiz NaN yayılımı yok.**

**BİLİNMEYEN ≠ SIFIR.** Otopark çözücüsünde servis alanı veya rampa ayak izi
`null` ise senaryo **üretilmez**; 0 saymak havuzu şişirir ve senaryoyu iyimser
yapardı. `0` "yok" demektir, "bilmiyorum" değil.

**Şaft düşey sürekliliği yapısaldır, kural değil.** `Shaft.offsetX/offsetY`
çekirdeğe **görelidir**; mutlak konum `shaftAbsolutePosition()` ile türer.
Mutlak saklansaydı çekirdek taşınınca her kat ayrı güncellenmeli olurdu ve
biri unutulduğunda süreklilik sessizce kırılırdı.

**Otopark sayımı KATSAYIYA dayanır**, geometrik paketlemeye değil.
`spaceWidth × spaceLength` park yerinin kendi alanıdır; gerçek verimi kolon
kayıpları ve dönüş yarıçapları belirler. Otorite `ParkingRule.areaPerSpace`'tedir;
İP-4'te gelecek geometrik yerleşim onu **değiştirmez, doğrular**.

**Sistem senaryo üretir, KARAR VERMEZ.** Otopark senaryoları saklanmaz, her
okumada üretilir. Kalıcı olan yalnızca karar: `basementFloorCountOverrideValue`
+ gerekçe + `acceptedDeficitCount` (bilinçli eksik kabulü, İP-9 raporu için).

---

## 7. Kapsam kilidi

İş paketleri sıralıdır (`mvp-spesifikasyonu.md` §3). **Kapsamı genişletme.**

| | Paket | Durum |
|---|---|---|
| İP-1 | Temel altyapı | ✅ tamam |
| İP-2 | Sihirbaz ve kural motoru, L0 zarf | ✅ tamam |
| İP-3 | Program, çekirdek, servis mekanları, otopark | ✅ tamam |
| İP-4 | Plan motoru (**manuel mod otomatikten önce**) | sırada |
| İP-5 | Metraj motoru | |
| İP-6 | Maliyet ve nakit akışı | |
| İP-7 | Gelir, paylaşım, fizibilite | |
| İP-8 | Düzenleme ve canlı panel | |
| İP-9 | Rapor | |
| İP-10 | Geriye dönük doğrulama (**atlanmamalı**) | |

Şema tüm varlıkları kapsar (ilke 8 gereği adlandırma baştan doğru olsun diye), ama
**davranış** kendi paketinde yazılır. Alan tablosu olmayan varlıklar minimal stub'tır:
`id`, ebeveyn FK, zaman damgaları — **hiçbir spekülatif alan yok**.

---

## 8. Açık kararlar

Kod yazarken bunlardan birine dokunuyorsan **önce sor**.

| Konu | Durum |
|---|---|
| **`Project.priceReferenceDate` İP-6'da `priceListVersionId` ile değiştirilecek.** Bir tarih sürüm dondurmaz: geri tarihli bir fiyat satırı eklemek altı aylık projeyi yeniden fiyatlar — `etut-veri-modeli.md:28`'in tam olarak yasakladığı şey. `PriceListVersion` stub'ı ve nullable FK **eklendi** (maliyet baştan sürüm-bazlı yazılsın diye); içi İP-6'da dolacak. `priceReferenceDate` şimdilik duruyor. | **İP-6** |
| `QuantityLine` `isOverridden`+`overrideReason` kullanıyor (:534); §1.3 ise üçlüyü tanımlıyor. Dokümanda **iki farklı ezme şekli** var. Birebir korundu, uzlaştırılmadı. | İP-5 |
| `openingDeductionRule` değerleri snake_case, diğer tüm enum'lar camelCase (:519-522). | İP-5 |
| `ObjectCostMapping` "çoklu" satırları ifade edemiyor (bir nesne → çok kalem, :508). | İP-5 |
| `Wall` :508'de `objectType` olarak kullanılıyor ama **hiçbir yerde tanımlı değil**. | İP-5 |
| Kalite seviyesi 4 mü 3 mü — veri modeli :544 vs süreç modeli :194. | İP-6 |
| `UnitType` proje kapsamlı mı, organizasyon tipoloji kütüphanesi mi (§13.3). İP-3'te **proje kapsamlı** olarak uygulandı (`projectId` + `unitTypeCode`). | ✅ İP-3 |
| `FloorTemplate` varlığı ile `Floor.templateFloorId` aynı fikir mi? İP-3 **`Floor.templateFloorId`'yi** uyguladı; `FloorTemplate` kullanılmayan stub kaldı. | ✅ İP-3 |
| §7'nin 6 Türkçe başlıklı varlığı için İngilizce ad **önerildi**. `Elektrik Odası / Trafo` ve `Su Deposu ve Hidrofor` **ikişer nesne** adlandırıyor; tek varlıkta birleştirildi. | adlandırma |
| `Space.electricalPresetId` ve `Fixture.productRef` — doküman "fk" diyor ama **hedef varlığı tanımlamıyor**. Uydurma model açılmadı. | İP-3/İP-5 |
| `SurfaceFinish` katalog mu, Space'in çocuğu mu — §2 ile alan tabloları çelişiyor. Katalog varsayıldı. | İP-4 |
| `SoilData.shoringArea` süreç modeli A3'te (H), veri modelinde K2 (manuel). Veri modeli otoriter alındı; İP-3 buna dokunmadı. | İP-5 |
| **Çoğunluk göstergesi SAKLANMIYOR**, okurken hesaplanıyor. Doküman onu "hesaplanan" sayıyor ama üçlü açılmadı — payların saf toplamı, bayatlama riski yaratmaya değmez. Rapor kalıcılık isterse geri dönülür. | İP-9 |
| **Kot dış servisi (E sahipliği)** süreç modeli A2/A3'te var ama hiçbir iş paketinde yok; şemada `@own M`. | kapsam boşluğu |
| **`kat-plani-uretim-mimarisi.md` repoda yok.** L0 ve L1 yazıldı ama otoriter tanımları İP-4'e ait dokümanda olacaktı; elimizdeki tek tanım `mvp` §3. **İP-4'ten önce gerekli.** | İP-4 |
| Özel kısıtların dokuzunda `effectTarget/effectKind` = `none`. Bir kısıtın emsali mi taban alanını mı düşürdüğü yerel mevzuat sorusu — pilot paket dolduracak. | Faz 0 |
| **Rampa "kot farkı" = bodrum derinliği** varsayıldı (v1.3 §8). Doküman hem topografyayı hem bodrumu ima ediyordu; fizik bodrumu gerektiriyor. | varsayım |
| **Çekirdek derinlik varsayımı:** merdiven asansörlerle aynı derinlik bandına oturur. Merdivenin kendi ayak izi kol sayısı ve sahanlık derinliği ister; ikisi de tanımsız. | İP-4 |
| **Strateji öneri eşikleri (en-boy oranı) KODDA.** Algoritma sezgiseli, yerel mevzuat değil; çıktı zaten ezilebilir bir öneri. | kabul edildi |
| **Otopark iterasyon korkuluğu (8 bodrum) kodda.** Yönetmelik "en fazla kaç bodrum" demiyor; sonsuz döngüyü kesiyoruz ve sınıra çarpınca uyarıyoruz. | kabul edildi |
| **Kaçış mesafesi KUŞ UÇUŞU ölçülüyor.** Koridor boyu ölçüm gerçek plan geometrisi ister; kuş uçuşu daima küçük olduğu için aşımı gizlemez, geç yakalar. | İP-4 |
| **8 sorunun altısının pakette ön-dolum kaynağı YOK.** Dokümanın "kural katmanı ön-doldurur" ifadesi yalnızca otopark hedefi ve asansör sayısı için karşılıklı. | Faz 0 |
| **Soru 4 "bağımsız bölüm depoları"nın hedef alanı yok.** Arayüzde soruluyor ama saklanmıyor; uydurma alan açılmadı. | açık |
| **Soru 2 (ısıtma) ve 7 (yedek güç)** bir `ServiceSpace` satırı gerektiriyor; o satır servis mekanı onayında doğuyor. Sihirbazdan yazılmıyor. | İP-4 |
| `Shelter.alternativeUseWhenIdle = otopark` sayılmıyor; dokümanın etkisi tanımlı değil. | Faz 0 |

`etut-veri-modeli.md` **sürüm 1.1**'e güncellendi; kapatılan çelişkiler dosyanın başındaki
değişiklik listesinde.

---

## 9. Komutlar

```bash
npm run db:up          # Postgres (docker compose)
npm run db:local       # Docker YOKSA: PGlite'ı 5432'de Postgres olarak sun (açık kalmalı)
npm run db:migrate     # migration uygula
npm run db:seed        # tek organizasyon + boş draft bölge paketi
npm run db:fixture     # SENTETİK test paketi (gerçek mevzuat DEĞİL)
npm run dev

npm run codegen        # hesaplanan alan altyapısını üret
npm run codegen:check   # üretilenler güncel mi (CI)
npm test               # 393 test
npm run typecheck
node scripts/verify-migration.mjs   # migration'ı PGlite'ta çalıştır (Docker gerekmez)
```

**Veri katmanı testleri Docker gerektirmez.** `tests/helpers/db.ts` süreç içi PGlite üzerine
migration'ları uygular ve Prisma'yı `pglite-prisma-adapter` ile ona bağlar; GENERATED kolonlar,
`OverrideLedger` view'ı ve plpgsql trigger'ları gerçekten çalışır. Kiracı izolasyonu ve
değişmezlik böyle test edilir.

- **Sınır:** adapter `prisma migrate dev/deploy` desteklemiyor. Migration **üretimi** hâlâ
  gerçek Postgres ister; PGlite yalnızca **uygular**.
- Gerçek Postgres'in yerini tutmaz — uzantı, eşzamanlılık ve rol davranışı farklıdır.

**Uygulamayı Docker'sız çalıştırmak** (`npm run db:local`): testlerdeki PGlite süreç
içindedir ve dev sunucusu onu göremez. `scripts/dev-db.mjs` kalıcı bir PGlite'ı Postgres
**tel protokolüyle** 5432'de sunar — `.env`, uygulama kodu ve Prisma Studio değişmez.
Migration'lar ham SQL olarak uygulanır ve `_datum_local_migrations` tablosunda işaretlenir;
bu veritabanı **Prisma Migrate tarafından yönetilmez**. Kimlik doğrulaması **yoktur**,
yalnızca 127.0.0.1'i dinler — üretimde kullanılmaz.

**Migration yazarken:** generated kolonlar ve trigger'lar Prisma şemasından türetilemez.
`prisma migrate dev --create-only` ile oluştur, sonra `prisma/sql/` altındaki üç dosyayı
migration'a ekle. `prisma db push` **kullanma** — generated kolonları sıradan kolona
çevirir ve ezme mekanizmasını sessizce bozar.
