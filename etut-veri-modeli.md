# Etüt Veri Modeli ve Detay Spesifikasyonu

**Sürüm:** 1.5
**Tarih:** 10 Eylül 2026 (1.4: 10 Eylül · 1.3: 9 Eylül · 1.2: 9 Eylül · 1.1: 8 Eylül · 1.0: 7 Eylül 2026)
**Amaç:** Kat planı üretimi ve gerçek metraj için gereken veri derinliğini tanımlamak. Claude Code devir paketinin şema tarafıdır.

**Sürüm 1.5 değişiklikleri** — İP-5 (metraj motoru) yazılmadan önce:

1. **Bölüm 10.0 — SAHİPLİK KURALI eklendi.** Her fiziksel yüzeyin TEK sahibi var: gövde `Wall`'ın, iç yüzey bitişleri `Space`'in, dış yüzey `Facade`'ın. Bu kural olmadan sıva ve boya **iki kez** talep ediliyordu (bölüm 10.1 `Wall` satırı ile bölüm 4 tablosu çakışıyordu)
2. Bölüm 10.1 — `Wall` satırı düzeltildi: yalnızca gövde. Sıva/boya `Space`'e, yalıtım `Facade`'a taşındı
3. Bölüm 4 — "Mekandan doğan metraj" tablosundan **açıklık düşümü çıkarıldı**. Düşüm formülde değil, MOTORDA uygulanır (bölüm 10.2); formülde bırakmak merkezî kuralı delerdi
4. Bölüm 5 — `Floor`'a `plateGeometry`. Kat başına plaka modellenmiyordu; `Floor.grossArea`'nın türetmesi bu yüzden tanımsızdı ve çekme kat ile bodrumun plakası zarf DEĞİLDİR
5. Bölüm 12 — `ZoningRuleSet`'e `basementSetback` ve `setbackFloorSetback`
6. Bölüm 12 — `CostItemCatalog`'a doğrulama durumu (`verificationStatus` · `verificationSource` · `supersededBy`) ve `functionClass`; `unit` tiplendi
7. Bölüm 12 — `ObjectCostMapping`'e `producedUnit` · `conversionFactor` · `conversionMode` · `surface`; `conditions`'ın ŞEKLİ tanımlandı
8. Bölüm 10.4 — `QuantityLine` ezme şekli **karara bağlandı**: hesaplanan alan dörtlüsü. İP-1'in açıkça İP-5'e bıraktığı çelişki kapandı
9. Bölüm 10.4 — `QuantityLine`'a izlenebilirlik alanları: `sourceObjectKey` · `surface` · uygulanan düşüm kuralı ve eşiği · uygulanan çevrim katsayısı · kalemin doğrulama durumu · miktar kaynağı · geometri seviyesi
10. Bölüm 10.5 — **çakışma denetimi** tanımlandı: aynı fiziksel yüzeye aynı işlev sınıfından iki kalem düşemez

**Sürüm 1.4 değişiklikleri** — İP-4 (plan motoru: L2 bölümleme, L3 tipoloji, L4 detay) yazılmadan önce:

1. Bölüm 5 — `Unit`'e `geometry` eklendi. L2'nin çıktısının şemada evi yoktu; birim poligonu saklanamıyordu
2. Bölüm 4 — `Space.geometry` **hesaplanan dörtlüye** çevrildi. `@own H` işaretliydi ama üçlüsü açılmamıştı, yani plan motorunun ürettiği geometri **ezilemiyordu** (ilke 5 ihlali)
3. Bölüm 4 — `Space`'e `layoutKey` eklendi. Şablon yaprağını mekan satırına bağlayan **kararlı anahtar**; olmadan aynı tipten iki yatak odasının geometrisi yeniden çözümde sessizce yer değiştirir
4. Bölüm 4 — **`Wall` alan tablosu eklendi.** Bölüm 10.1 onu `objectType` olarak kullanıyordu ama hiçbir yerde tanımlı değildi. Mekan sınırlarından **türetilir**, ayrıca çizilmez
5. Bölüm 5 — **`ColumnGrid` alan tablosu eklendi.** Kaba aks ızgarası; otopark verimi doğrulaması ve yapısal katsayı girdisi için
6. Bölüm 5 — `CommonSpace` alan tablosu eklendi. Sirkülasyonun **semantik evi**; bir fark kümesine imalat kalemi bağlanamaz
7. Bölüm 5 — `Floor.grossArea`'nın hangi katlarda hesaplanabildiği yazıldı (çekme kat ve bodrumun plakası zarf değildir). Planın kaynağı (otomatik · manuel · tipik kat) **saklanmaz**: `isLocked` ve `geometryOverrideValue`'dan tamamen türer, saklamak bayatlama riski olurdu
8. Bölüm 5 — `UnitType`'a `sourceTemplateId` + `sourceTemplateVersion`; `Unit`'e `linkedUnitId` (dubleks)
9. Bölüm 13 — **`UnitTypeTemplate`** eklendi: organizasyon seviyesinde tipoloji kütüphanesi. Bölüm 13 madde 3'ün alt kararı böylece kapandı
10. Bölüm 6 — `Shaft.offsetX/offsetY` **hesaplanan dörtlüye** çevrildi. K3 manuel alandı ve hiçbir motor yazmıyordu; bu hâliyle şaft konumu her projede bilinmiyor ve **tüm ıslak hacim kısıtları değerlendirilemez** kalıyordu
11. Bölüm 12.6 — `UnitLayoutRule` ve `BuildingElementRule` eklendi. Plan motorunun okuduğu yedi değerin hiçbirinin pakette evi yoktu
12. Bölüm 15.4 — L2–L4 zinciri eklendi (L0 ve L1'in devamı)

**Sürüm 1.3 değişiklikleri** — İP-3 (program, çekirdek, servis mekanları, otopark) yazılmadan önce:

1. Bölüm 6 — `Core` alan tablosu eklendi. Bölüm 2'de adı geçiyordu ama alanı yoktu; "çekirdek yerleşiyor" ölçütünün saklanacağı yer tanımsızdı
2. Bölüm 6 — `Shaft`'a çekirdeğe **göreli** konum eklendi (`offsetX`, `offsetY`). Düşey süreklilik böylece kontrol değil, **yapısal garanti** olur
3. Bölüm 5 — `Block` alan tablosu eklendi; `buildingHeight` üç kural eşiğinin girdisiydi ve evi yoktu
4. Bölüm 7 — `ServiceSpace`'e `requiredArea` eklendi; `RequiredSpaceRule.areaFormula`'nın sonucunu yazacak kolon yoktu
5. Bölüm 8 — `ParkingLayout`'a `acceptedDeficitCount` eklendi (bilinçli eksik kabulü, İP-9 raporunda görünür)
6. Bölüm 8 — `Ramp`'a `footprintArea` eklendi; "bodrum alanının ciddi kısmını yer" ifadesinin sayısal karşılığı yoktu
7. Bölüm 12 — `ParkingRule`'a `areaPerSpace`, `accessibleAreaPerSpace`, `bicycleAreaPerSpace` eklendi
8. Bölüm 12.5 — **formül sözleşmesi** tanımlandı: dilbilgisi, kural tipi başına değişken beyaz listesi, birim, yayım kapısı
9. Bölüm 4 — "Servis | (bkz. bölüm 6)" yanlış çapraz referansı düzeltildi (servis mekanları **bölüm 7**)
10. Bölüm 15 — L1 zinciri eklendi (L0'ın devamı)
11. Bölüm 5 — proje başlangıç sihirbazının 8 sorusunun **bu dokümanda olmadığı** kaydedildi; kaynağı `etut-portali-proje-dokumani.md` bölüm 5'tir

**Sürüm 1.2 değişiklikleri** — İP-2 (sihirbaz, kural motoru, L0 zarf) yazılmadan önce:

1. Bölüm 3 — `Parcel`'e coğrafi referans alanları eklendi (yerel metrik çerçeveyi dünyaya bağlar)
2. Bölüm 3 — `roadFrontages` şeması tanımlandı; kenar indeksi ve rol taşıyor (L0 ötelemesinin girdisi)
3. Bölüm 3 — `specialConstraints` şeması tanımlandı; işaretin yanında **değer** de taşıyor
4. Bölüm 3 — `buildableEnvelope` sözleşmesi düzeltildi: `MultiPolygon | null` (öteleme bölebilir/yok edebilir)
5. Bölüm 3 — mevcut bağımsız bölüm alanlarının kademe çelişkisi kapatıldı (K1)
6. Bölüm 3 — `pile*` alanlarının "K2–K3" aralığı ayrıştırıldı
7. Bölüm 12 — `ZoningRuleSet`'e `offsetJoinType` eklendi; yükseklik referansı katalog anahtarına döndü
8. Bölüm 12.3 — `HeightReferenceCatalog` ve `StakeholderConsentRule` eklendi
9. Bölüm 12.3 — `SpecialConstraintCatalog`'a etki alanları eklendi (`effectTarget`, `effectKind`)
10. Bölüm 15 — enum/katalog ayrımı kuralı yazıldı

**Sürüm 1.1 değişiklikleri** — İP-1 şeması yazılmadan önce tespit edilen çelişki ve eksikler:

1. Bölüm 2 — `Core`, `Facade[]`, `Roof` proje seviyesinden `Block` altına alındı; `Roof`/`Ramp` çoğullaştırıldı; bozuk ağaç düzeltildi
2. Bölüm 3 — `Stakeholder` alan tablosu eklendi (A4'ten türetildi)
3. Bölüm 4 — "G2 zorunlu tutulmalı" paragrafı bölüm 1.5 ile çelişiyordu; opsiyonel olarak düzeltildi
4. Bölüm 12 — `RegionPackage` / `RegionPackageVersion` ayrımı yapıldı; kural tabloları sürüme bağlandı
5. Bölüm 12.3 — evi olmayan paket içeriği için 7 tablo eklendi
6. Bölüm 13 — madde 1 ve 2 karara bağlandı

**Teknoloji kararları:** Next.js · PostgreSQL · Prisma · Tek kiracı (çok kiracıya hazır) · Bölge paketi ayrı katman

---

## 1. Temel Tasarım Kararları

### 1.1 Çok kiracıya hazırlık

Şimdilik tek firma kullanacak, ileride başkaları kullanacak. Ucuz hazırlık:

- Kök varlıklara `organizationId` alanı baştan konur
- Tek organizasyon seed edilir, arayüzde hiç görünmez
- Sorgular bu alanı filtreler (kütüphane seviyesinde, elle değil)
- Kimlik doğrulama basit kalır

Sonradan çok kiracıya geçiş: kimlik katmanı eklenir, veri göçü gerekmez.

### 1.2 Bölge paketi sürüm dondurma

> **Kritik:** Proje, bağlandığı bölge paketinin **sürümünü dondurur.**

Yönetmelik değişince eski projelerin hesabı geriye dönük değişmemeli. Teklif verdiğin bir proje altı ay sonra farklı rakam göstermemeli.

Uygulama: `Project.regionPackageVersionId` tutulur. Kullanıcı isterse "yeni sürüme geçir" der, sistem farkları gösterir.

### 1.3 Hesaplanan değerlerin ezilebilirliği

Her hesaplanan alan üç bilgi taşır:

| Alan | Anlam |
|---|---|
| `computedValue` | Sistemin hesapladığı |
| `overrideValue` | Kullanıcının yazdığı (varsa) |
| `overrideReason` | Neden ezildiği |

Rapor ezilmiş değerleri işaretler. Bu, güvenin ve denetlenebilirliğin temeli.

### 1.4 Kademe etiketi

Her alan `tier` taşır: `K1` (ön eleme) · `K2` (ön etüt) · `K3` (detaylı etüt). Sihirbaz kademeye göre alan gösterir.

### 1.5 Geometri kademelenmesi

Mekan boyutu üç seviyede tutulur, hangisi doluysa o kullanılır:

| Seviye | Girdi | Çevre hesabı |
|---|---|---|
| **G1** | Sadece alan (m²) | Şekil faktörüyle tahmin: `çevre ≈ k × √alan`, k tipe göre (dikdörtgen ~4,2) |
| **G2** | En × boy | `çevre = 2 × (en + boy)` — kesin |
| **G3** | Poligon geometrisi | Gerçek çevre, gerçek alan |

> **Neden önemli:** Banyo seramiği duvar alanından çıkar, duvar alanı çevreden çıkar. Sadece m² bilmek metrajı yaklaşık yapar.

**Sıralama (plan motoru MVP'de olduğu için):**

1. Kullanıcı programı tanımlarken sadece **hedef alanları** girer → G1
2. Plan motoru çalışır → gerçek poligonlar üretilir → **G3**
3. G2 (en × boy) yalnızca iki durumda kullanılır: kullanıcı plan üretmeden hızlı maliyet istediğinde, veya üretilen bir mekanın boyutunu elle ezmek istediğinde

**Yani G2 zorunlu değil, yedek yol.** Normal akışta kullanıcı mekan boyutu girmez; plandan gelir.

---

## 2. Varlık Hiyerarşisi

```
Organization
├── RegionPackage ──────── soy (ad, ülke, idari birim)
│   └── RegionPackageVersion ── sürüm · geçerlilik tarihi · durum
│       └── kural tabloları (bkz. bölüm 12)
├── UnitTypeTemplate[] ─── tipoloji kütüphanesi (1.4) — projeye KOPYALANIR
└── Project
    ├── Parcel ──────────── ZoningData, SoilData, SiteData
    ├── Stakeholder[] ───── hak sahipleri, paylar
    ├── Block[]
    │   ├── Floor[]
    │   │   ├── FloorTemplate (tipik kat referansı)
    │   │   ├── Unit[] (bağımsız bölüm)
    │   │   │   └── Space[] (mekan)
    │   │   │       ├── Opening[] (pencere/kapı)
    │   │   │       ├── SurfaceFinish (zemin/duvar/tavan)
    │   │   │       └── Fixture[] (donanım)
    │   │   ├── CommonSpace[] (ortak alan mekanları)
    │   │   ├── Wall[] (duvar — mekan sınırlarından TÜRER, 1.4)
    │   │   └── ServiceSpace[] (sığınak, trafo, hidrofor…)
    │   ├── Core ────────── Elevator[], Stair[], Shaft[]
    │   ├── ColumnGrid ──── kaba aks ızgarası (1.4)
    │   ├── Facade[] ────── FacadeMaterial[]
    │   └── Roof
    ├── ParkingLayout ───── ParkingSpace[], Ramp[]
    ├── Landscape
    ├── SpecificationSet ── kalite paketi + istisnalar
    ├── ProcessInstance ─── Stage[] → Step[]
    ├── QuantityTakeoff ─── QuantityLine[]
    ├── CostEstimate ────── CostLine[]
    └── FeasibilityResult
```

> **Düzeltme (sürüm 1.1).** Önceki sürümde `Core`, `Facade[]` ve `Roof` proje seviyesindeydi
> ve `Roof` ile `Ramp` tekil yazılmıştı. Çok bloklu proje veri modelinde kaldığı için
> (bkz. bölüm 13, madde 2) iki blok tek çatıyı ve tek çekirdeği paylaşamaz; ayrıca
> `Elevator`/`Stair`/`Shaft` hiçbir ebeveyn taşımıyordu ve `facadeNo` iki blokta çakışırdı.
> Bu üçü `Block` altına alındı, `Ramp` çoğullaştırıldı.
> `ParkingLayout` proje seviyesinde kalır — otopark bloklar arası paylaşılır.

---

## 3. Proje ve Parsel

### Project

| Alan | Tip | Kademe | Not |
|---|---|---|---|
| name | text | K1 | |
| projectType | enum | K1 | yeniYapi · kentselDonusum · ilaveKat · guclendirme |
| status | enum | K1 | taslak · onEleme · onEtut · detayliEtut · teklifVerildi · sozlesme · iptal |
| tier | enum | K1 | K1 · K2 · K3 |
| regionPackageVersionId | fk | K1 | dondurulmuş sürüm |
| currency | text | K1 | paketten gelir, ezilebilir |
| priceReferenceDate | date | K1 | fiyatların referans tarihi |
| notes | text | — | |

### Parcel

| Alan | Tip | Kademe |
|---|---|---|
| province / district / neighborhood | text | K1 |
| block / parcelNo / sheetNo | text | K1 |
| area | decimal (m²) | K1 |
| geometry | geojson | K2 (**yerel metrik** — aşağıya bakınız) |
| centerLatitude / centerLongitude | decimal | K2 (yerel çerçevenin origin'i) |
| epsgCode | text | K2 (kaynak verinin projeksiyonu, ör. EPSG:5254) |
| rotation | decimal (derece) | K2 (yerel eksen ile grid kuzeyi arası açı) |
| ownershipType | enum | K1 (tekMalik · hisseli · katMulkiyeti · katIrtifaki) |
| ownerCount | int | K1 |
| encumbrances | json[] | K2 (şerh, ipotek, haciz, irtifak — tip + açıklama + engel mi) |
| hasExistingBuilding | bool | K1 |
| existingBuildingAge / floors / unitCount | int | K1 |
| existingTotalArea | decimal | K2 |
| demolitionRequired | bool | K1 |
| structuralAssessmentStatus | enum | K2 |

> **Kademe düzeltmesi (1.2).** Süreç modeli A1 "mevcut bağımsız bölüm sayısı ve alanları"nı
> **K2** sayıyordu, bu tablo **K1**. Veri modeli otoriterdir → **K1** geçerli.
> `existingTotalArea` K2 olarak kalır (alan toplamı ön etütte netleşir).

#### Koordinat sistemi (1.2)

`geometry` GeoJSON **şeklindedir** ama içeriği **yerel metrik** koordinattır:
origin parselin ağırlık merkezi, birim metre, eksen kaynak projeksiyonun grid ekseni.
RFC 7946'nın WGS84 enlem/boylam varsayımı **geçerli değildir**.

Ayrım nesne içinde `"crs": "local-metric"` alanıyla açık edilir — bir haritalama
kütüphanesine besleyip sessizce yanlış sonuç almak mümkün olmasın.

```jsonc
{ "crs": "local-metric", "type": "Polygon",
  "coordinates": [[[0,0],[30,0],[30,12],[12,12],[12,25],[0,25],[0,0]]] }
```

**Neden yerel metrik:** alan ve öteleme hesabı enlem/boylamda yapılamaz. Türk kadastro
verisi zaten ulusal projeksiyonda (TUREF/TM, EPSG:5253-5259) metrik gelir; resmî parsel
alanı da o grid koordinatlarından hesaplanır. Grid'i olduğu gibi kullanmak **hukuken
tutarlı olan**dır — WGS84'e çevirip "gerçek" alan hesaplamak resmî alanla uyuşmaz.

`centerLatitude`/`centerLongitude`/`epsgCode` yerel çerçeveyi dünyaya geri bağlar;
`rotation` İP-2'de daima **0**'dır (yerel eksen kaynak grid'e hizalıdır).

### ZoningData

| Alan | Tip | Kademe |
|---|---|---|
| documentFile | file | K2 |
| planNotes | text | K2 |
| buildingOrder | enum | K1 (ayrik · bitisik · blok · ikizNizam) |
| groundCoverageRatio | decimal | K1 (taban alanı katsayısı) |
| floorAreaRatio | decimal | K1 (emsal) |
| farCalculationBasis | enum | K1 (paketten: brüt · net) |
| setbackFront / Side / Rear | decimal (m) | K1 |
| maxFloorCount | int | K1 |
| maxHeight | decimal (m) | K1 |
| heightReferenceRuleKey | text | K2 (paketten — `HeightReferenceCatalog` anahtarı) |
| roadFrontages | json[] | K2 (kenar indeksi, rol, yol adı, genişlik) |
| referenceLevel | decimal | K2 (kot) |
| cornerLevels | json[] | K3 (köşe kotları) |
| levelDataSource | enum | K2 (resmiKroki · demServisi · manuel) |
| **specialConstraints** | json[] | K2 |

**specialConstraints kontrol listesi** (paket tanımlı, kullanıcı işaretler):
koruma/sit alanı · mania kotu · askeri yasak bölge · orman sınırı · kıyı kenar çizgisi · afet riski (heyelan/taşkın/sıvılaşma) · kamulaştırma şerhi · yol genişletme · enerji nakil hattı · arkeolojik sondaj şartı · yeşil alan terki

> Sürprizler imar belgesinde değil plan notlarındadır. Bu liste bir kez kurulunca hiçbiri atlanmaz.

#### Json şekilleri (1.2)

Üç `json[]` alanının şekli tanımlandı; L0 ötelemesi ve kısıt etkileri bunlara dayanıyor.

```jsonc
// roadFrontages — hangi POLİGON KENARI hangi çekme mesafesini kullanacak.
// setbackFront/Side/Rear üç skaler; kenarı role bağlayan tek yer burasıdır.
// Rol verilmemiş kenarlar "side" sayılır ve bu bir UYARI üretir.
roadFrontages: [{ edgeIndex: 0, role: "front", roadName: "Atatürk Cad.", width: 12.0 }]
//               role ∈ front | side | rear

// specialConstraints — kullanıcının işareti VE değeri.
// Katalog etkinin ŞEKLİNİ bildirir (effectTarget/effectKind), değer parsele özeldir:
// "mania kotu" bu parselde 47,50 m'dir ve maxHeight'ı capler.
specialConstraints: [{ ruleKey: "maniaKotu", isChecked: true, value: 47.5, note: "…" }]
```

**Hesaplananlar:** maxFootprint · maxTotalFloorArea · buildableEnvelope · basementGainFromLevelDifference

> **`buildableEnvelope` sözleşmesi (1.2 düzeltmesi).** Tipi `Polygon` değil,
> **`MultiPolygon | null`**'dır. İçe öteleme içbükey ve L şeklindeki parsellerde poligonu
> **ikiye bölebilir** (ölçüldü: U parseli, 3,5 m çekme → 2 parça) veya **tamamen yok
> edebilir** (küçük parsel + büyük çekme → 0 parça). Tekil `Polygon` varsayımı bu iki
> durumda veri kaybına yol açardı. Yok olma bir **hata değil**, geçerli bir sonuçtur:
> boş `MultiPolygon` + uyarı döner.
>
> `buildableEnvelope` **ötelenmiş poligonun kendisidir**, taban alanı katsayısına
> indirgenmiş hâli değil. `maxFootprint` ayrı bir sayısal limittir; aşım sessiz bir
> kırpma değil, kullanıcıya sunulan bir senaryodur (bkz. bölüm 15).

### SoilData

| Alan | Tip | Kademe |
|---|---|---|
| reportFile | file | K3 |
| soilClass | text | K2 |
| bearingCapacity | decimal | K3 |
| groundwaterLevel | decimal (m) | K2 |
| liquefactionRisk | enum | K3 |
| foundationType | enum | K2 (radye · tekil · sürekli · kazikli) |
| pileRequired | bool | K2 |
| pileCount / pileDepth / pileDiameter | int / decimal / decimal | K3 |
| shoringRequired / shoringMethod / shoringArea | — | K2 |
| adjacentBuildingDistances | json[] | K2 |

### SiteData

| Alan | Tip | Kademe |
|---|---|---|
| topographyLevelDifference | decimal | K2 |
| excavationHaulDistance | decimal (km) | K2 |
| disposalSiteFee | decimal | K2 |
| siteAccessRoadWidth | decimal | K2 |
| craneFeasible | bool | K2 |
| utilityConnections | json | K3 (elektrik/su/gaz/kanal: mesafe, durum) |
| siteFencePerimeter | decimal | K2 |
| fencedSides | int | K2 |

### Stakeholder (hak sahibi)

> **Eklendi (sürüm 1.1).** Bu varlık bölüm 2 hiyerarşisinde adı geçiyor ve `Unit.assignedStakeholderId`
> ona FK veriyordu, ama alan tablosu hiç verilmemişti. Alanlar **süreç modeli A4 tablosundan**
> türetildi (`etut-surec-modeli.md`, A4 Hak Sahibi Analizi). İngilizce tanımlayıcılar bu varlık
> için önerilmiştir — dokümanda önceden tanımlı olmadıkları için "birebir aynı" kuralının
> kaynağı yoktur.

| Alan | Tip | Kademe | A4 karşılığı |
|---|---|---|---|
| name | text | K2 | Hak sahibi listesi |
| contactPhone / contactEmail | text | K2 | …ve iletişim |
| shareRatio | decimal | K2 | Pay oranları |
| existingUnitArea | decimal (m²) | K2 | Mevcut bağımsız bölüm alanları |
| expectationNotes | text | K2 | Beklenti / talep notları |
| agreementStance | enum | K2 | Anlaşma eğilimi (olumlu · kararsiz · itirazci) |
| housingAidEligible | bool | K3 | Geçici barınma yardımı hak sahipliği |
| housingAidMonths | int | K3 | …ve süresi |
| incentiveProgramEligible | bool | K3 | Teşvik programı uygunluğu (M/P) |

**Hesaplananlar:** anlaşma oranı ve eşiğe uzaklık · barınma yardımı toplam maliyeti · teşvik geliri

> "Karar çoğunluğu eşiği" (A4'te `P` işaretli) **bu varlığın alanı değildir** — bölge paketi
> eşiğidir ve `RequiredSpaceRule` benzeri bir kural tablosunda durur.

---

## 4. Mekan Modeli — Sistemin Kalbi

Metrajın kalitesi buradan çıkar. Her bağımsız bölüm mekanlardan oluşur; her mekan kendi metrajını üretir.

### Space

| Alan | Tip | Kademe | Not |
|---|---|---|---|
| name | text | K2 | "Salon", "Ebeveyn Banyo" |
| spaceType | enum | K2 | aşağıdaki tipoloji |
| category | enum | H | tipten türer |
| area | decimal (m²) | K2 | **hedef alan.** Kullanıcı girer; plan motoru **ezmez** — bkz. aşağıdaki not *(1.4)* |
| width / length | decimal (m) | K2 | G2 seviyesi — **opsiyonel** (bkz. bölüm 1.5) |
| geometry | polygon | H | G3 seviyesi. **Hesaplanan dörtlü** *(1.4)* — L3 üretir, kullanıcı ezer |
| layoutKey | text | H | şablon yaprak anahtarı *(1.4)* — `(unitId, layoutKey)` tekil |
| perimeter | decimal (m) | H | G1/G2/G3'e göre |
| clearHeight | decimal (m) | K2 | net tavan yüksekliği |
| isWetArea | bool | H | tipten türer, ezilebilir |
| floorFinishId | fk | K2 | kalite paketinden ön-dolar |
| skirtingType / skirtingHeight | enum/dec | K3 | |
| wallFinishId | fk | K2 | |
| wallCladdingHeight | decimal (m) | K2 | ıslak hacimde seramik yüksekliği; 0 = tam yükseklik değil |
| ceilingType | enum | K2 | duzAlci · alcipan · kartonpiyer · havuzTavan · yok |
| ceilingCorniceLength | decimal (m) | H | = çevre (kartonpiyer varsa) |
| waterproofing | bool | K2 | |
| heatingElement | enum | K2 | radyator · yerdenIsitma · yok |
| heatingElementSize | decimal | H | radyatör mtül veya döşeme m² |
| hasAirConditioner | bool | K2 | |
| ventilationType | enum | K3 | dogal · saft · mekanik |
| electricalPreset | fk | K2 | priz/anahtar/aydınlatma adetleri paketten |

**Mekan tipolojisi ve kategorileri:**

| Kategori | Tipler |
|---|---|
| Yaşam | salon · oturmaOdasi · yatakOdasi · ebeveynYatak · calismaOdasi · cocukOdasi |
| Islak | mutfak · banyo · ebeveynBanyo · wc · lavaboNis · camasirOdasi |
| Sirkülasyon | hol · antre · koridor · icMerdiven |
| Depolama | giyinmeOdasi · kiler · depo · ankastreDolapNis |
| Dış | balkon · fransizBalkon · teras · bahce · camBalkon |
| Ortak | katHolu · merdivenHolu · binaGirisi · sigmanakKoridor |
| Servis | (ayrı varlık — bkz. bölüm 7) *(1.3: referans 6 idi, yanlıştı)* |

**Mekandan doğan metraj:**

**Mekan İÇ YÜZEY bitişlerinin sahibidir** (bölüm 10.0). Gövde `Wall`'ın, dış yüzey `Facade`'ındır — aşağıdaki hiçbir kalem oralardan tekrar tetiklenmez.

Formüller **BRÜT** üretir; açıklık düşümü motorda, kalemin kuralına göre uygulanır (bölüm 10.2).

| Miktar | Formül (brüt) |
|---|---|
| Zemin kaplama alanı | `area` |
| Şap alanı | `area` |
| Süpürgelik uzunluğu | `perimeter − kapı genişlikleri` |
| Duvar brüt yüzeyi | `perimeter × clearHeight` |
| Sıva/boya alanı | `perimeter × clearHeight` |
| Duvar seramiği alanı | `perimeter × wallCladdingHeight` |
| Tavan alanı | `area` |
| Kartonpiyer mtül | `perimeter` |
| Su yalıtımı alanı | `area + perimeter × 0,2` (dönüş payı) |
| Alçıpan alanı | tavan tipine göre `area` |

> **Düzeltme (sürüm 1.5).** "Sıva/boya" ve "duvar seramiği" satırları önceki sürümlerde `− açıklıklar` taşıyordu. Düşüm **formülden çıkarıldı**: kalem bazında merkezî tanımlıdır (ilke 6) ve motorda tek noktada uygulanır. Süpürgelikteki `− kapı genişlikleri` KALIR — o bir UZUNLUK düşümüdür, açıklık ALANI düşümü değildir; ikisi farklı mekanizmadır.

> **Kullanıcının sorduğu örnek:** "Bağımsız bölümde kaç m² banyo var" bilgisi tek başına yetmez. `area` yer seramiğini ve su yalıtımını verir; duvar seramiğini `perimeter × wallCladdingHeight` verir. Yani `perimeter` metrajın vazgeçilmez girdisidir — ama normal akışta onu **plan motoru** (G3) üretir, kullanıcı değil.
>
> **Düzeltme (sürüm 1.1):** Bu paragraf önceki sürümde "en × boy girişi (G2) zorunlu tutulmalı" diyordu ve bölüm 1.5 satır 66 ile çelişiyordu. Karara bağlandı: **G2 opsiyoneldir** (bkz. bölüm 13, madde 1). `width`/`length` nullable kalır; `perimeter` dolu olan en yüksek geometri seviyesinden türer.

#### `area` HEDEFTİR, gerçekleşen alan geometriden türer *(1.4)*

`Space.area` kullanıcının A5'te girdiği **hedeftir** ve K2/M kalır. Plan motoru onu **yazmaz**. Gerçekleşen alan `geometry`'den ölçülür (bölüm 1.5: "hangisi doluysa o kullanılır") ve ikisi arasındaki fark bir **uyarıdır, ezme değildir.**

**Neden:** `area`'yı hesaplanan alana çevirmek iki şeyi birden kırardı. (a) Kullanıcının girdiği her hedef bir *ezme* olurdu; 10 birim × 9 mekan = 90 gerekçesiz ezme satırı ve "bu projedeki tüm ezmeler tek sorgudur" diye kurulan `OverrideLedger` normal program girişinin gürültüsüne boğulurdu (ilke 10 aşınması). (b) Ayrışma göstergesi ölürdü: örneklenen birimin ayrışması `Σ Space.area` ile şablon toplamı karşılaştırılarak, 0,01 m² toleransla ölçülüyor; gerçek geometrik alan aynı kolona yazıldığı an **her birim** kalıcı olarak "ayrışmış" görünürdü.

### Wall (duvar) *(1.4)*

Bölüm 10.1 `Wall`'ı bir `objectType` olarak kullanıyordu ama hiçbir yerde tanımlamıyordu; İP-4'ün L4 katmanı duvar kalınlıklarını atadığı ve İP-5 metrajı duvar alanı ve hacmi istediği için tanım gerekti.

**Duvar TÜRETİLİR, ayrıca çizilmez.** Kullanıcı duvar çizmez; iki mekanın paylaştığı sınır duvara dönüşür. Tek doğruluk kaynağı geometri kalır — duvar ayrıca çizilebilseydi mekan sınırı ile duvar ekseni birbirinden bağımsız iki gerçek olurdu ve hangisinin doğru olduğu tanımsız kalırdı.

| Alan | Tip | Kademe | Not |
|---|---|---|---|
| floorId | fk | — | duvar iki **birimi** ayırabilir, bu yüzden ebeveyn `Floor` |
| wallKey | text | H | kararlı kimlik; `(floorId, wallKey)` tekil. Birim ayrımı taşır |
| wallType | enum | H | `dis · ic · islakHacim · saft · birimAyirici` — **mekan ilişkisinden** türer |
| geometry | polyline | H | duvar **ekseni** (yerel metrik) |
| length | decimal (m) | H | eksenden |
| thickness | decimal (m) | H | `BuildingElementRule`'dan tipe göre; kural yoksa **üretilmez + uyarı** |
| spaceAId / spaceBId | fk | H | hangi iki mekanı ayırıyor; dış duvarda B boştur |

**`netArea` ve `volume` SAKLANMAZ.** Açıklık düşümü kalem bazında merkezî tanımlıdır (ilke 6, bölüm 10.2); duvarın net yüzeyi kaleme göre değişir ve tek bir sayıya indirilemez. İP-5 hesaplar.

**Doğan metraj:** duvar bloğu · harç · sıva (iki yüz) · yalıtım · boya — hepsi `ObjectCostMapping`'in `Wall` satırlarından.

### Opening (açıklık)

| Alan | Tip | Not |
|---|---|---|
| openingType | enum | pencere · kapi · balkonKapisi · vitrin · garajKapisi |
| spaceId | fk | hangi mekanda |
| adjacentSpaceId | fk | iç kapılarda karşı mekan |
| hostWallId | fk | hangi duvarda *(1.4)* — aşağıdaki nota bakınız |
| isExterior | bool | cepheye mi bakıyor |
| width / height | decimal (m) | |
| count | int | aynı tipten kaç adet |
| frameMaterial | enum | pvc · aluminyum · ahsap · celik |
| frameType | enum | tekKanat · ciftKanat · sürme · vasistas |
| glazingType | enum | tekCam · isicam · tripleCam · lamine |
| hasSill | bool | denizlik |
| hasArchitrave | bool | pervaz |
| shutterType | enum | panjur · stor · yok |
| doorType | enum | celikKapi · ahsapKapi · camKapi · yanginKapisi |

**Doğan metraj:** doğrama profil mtül · cam alanı · aksesuar adedi · denizlik mtül · pervaz mtül · silikon · kapı adedi (tipe göre)

**Ayrıca:** açıklık alanları duvar metrajından düşülür — kural kalem bazında tanımlı (bkz. bölüm 10.2).

**`hostWallId` neden bir FK, kenar indeksi değil** *(1.4)*: açıklığın hangi duvara ait olduğu bir **kimlik** sorusudur. Halkanın kaçıncı kenarı olduğuyla tutmak kombinatorik bir tutamaçtır — kullanıcı poligonu yeniden çizdiğinde veya L3 farklı bir oturtma seçtiğinde köşe sırası değişir ve açıklık **sessizce başka duvara taşınır**. `Wall.wallKey` kararlı olduğu için FK kararlıdır.

### Fixture (donanım)

| Alan | Tip |
|---|---|
| fixtureType | enum: klozet · gommeRezervuar · lavabo · lavaboDolabi · dusTeknesi · dusakabin · kuvet · evye · ocak · firin · davlumbaz · batarya · havlupan · aynaDolap · mutfakDolabi · tezgah · portmanto · dresuar |
| spaceId | fk |
| count | int |
| lengthMeters | decimal — mutfak dolabı/tezgah için |
| specLevel | enum — kalite paketinden |
| productRef | fk — marka/model (opsiyonel) |

---

## 5. Bağımsız Bölüm ve Kat

### Unit (bağımsız bölüm)

| Alan | Tip | Kademe |
|---|---|---|
| unitNo | text | K2 |
| unitTypeCode | text | K2 — "3+1 A", tipoloji kodu |
| floorId | fk | K2 |
| usageType | enum | K1 — konut · ticari · ofis · depo |
| isDuplex | bool | K2 |
| linkedUnitId | fk | K2 — dublekste diğer kattaki yarısı *(1.4)* |
| geometry | polygon | H — **L2'nin çıktısı** *(1.4)*, yerel metrik |
| grossArea | decimal | H |
| netArea | decimal | H — mekan alanları toplamı |
| balconyArea | decimal | H |
| commonAreaShare | decimal | H |
| **wetAreaTotal** | decimal | H — ıslak mekan alanları toplamı |
| landShareRatio | decimal | K3 — arsa payı |
| assignedStakeholderId | fk | K3 — hangi hak sahibine |
| salePrice | decimal | K3 |

**UnitType (tipoloji şablonu):** Aynı tip birden çok kez tekrarlanır. Şablon mekan listesini taşır, örneklenince kopyalanır. Örnek: "3+1 A tipi" → salon 33,5 · mutfak 15,6 · oda 23 · oda 18 · oda 4 · banyo 6 · banyo 5 · hol 9 · balkon 5 = 119 m². Bu şablon 10 kez örneklenir.

`UnitType` **proje kapsamlıdır.** Organizasyon seviyesindeki kütüphaneden (`UnitTypeTemplate`, bölüm 13) kopyalanır ve kopyalama izlenebilir kalır *(1.4)*:

| Alan | Tip | Not |
|---|---|---|
| sourceTemplateId | fk | hangi kütüphane şablonundan türedi |
| sourceTemplateVersion | text | kopyalama anındaki sürümü |
| layoutRecipe | json | bölme reçetesi — kopyalanır, projede dondurulur |
| relationAssertions | json | ilişki iddiaları — kontrol edilir, zorlanmaz |

**Dubleks** *(1.4)*: iki kata yayılan birim **iki `Unit` satırıdır** (alt kat + üst kat), `isDuplex: true` ve `linkedUnitId` ile bağlanır; bağlantıyı `icMerdiven` mekanı taşır. Tek satırla iki kat, `Unit.floorId`'yi çoğullaştırmayı gerektirir ve `Floor → Unit → Space` ağacını kırardı.

### Floor

| Alan | Tip | Kademe |
|---|---|---|
| floorNo | int | K1 — bodrum negatif |
| floorType | enum | K1 — bodrum · zemin · normal · cekmeKat · catiArasi |
| isLocked | bool | K2 — tipik kat kilidi |
| templateFloorId | fk | K2 — kilitliyse referans |
| plateGeometry | polygon | H — **katın KENDİ plakası** *(1.5)* |
| grossHeight / clearHeight | decimal | K1 |
| grossArea | decimal | H — `plateGeometry`'nin alanı *(1.5)* |
| hasCommercial | bool | K1 |

#### Kat başına plaka *(1.5)*

1.4'e kadar kat başına plaka **modellenmiyordu**: elimizdeki tek poligon `ZoningData.buildableEnvelope` idi ve o proje başına tekti. Oysa **çekme katın plakası zarftan dar, bodrumunki genellikle geniştir** — bodrum çoğu yönetmelikte çekme mesafelerine tabi değildir. `grossArea`'nın türetmesi bu yüzden tanımsız kalmıştı ve metraj ile emsal kullanımı ona dayanacaktı.

| Kat tipi | Plaka |
|---|---|
| `bodrum` | parsel ⊖ `basementSetback`, **parselle kesiştirilir** |
| `cekmeKat` | zarf ⊖ `setbackFloorSetback` |
| `zemin` · `normal` | zarf (`buildableEnvelope`'un en büyük parçası) |
| `catiArasi` | zarf *(açık karar — kullanılabilir alan farkı tanımsız)* |

**Bodrum plakası parsel sınırını AŞAMAZ.** `basementSetback = 0` **geçerli bir değerdir** ("çekme yok") ve `null` ("bilinmiyor") ile karıştırılmamalıdır.

**Kural yoksa plaka `null` + uyarı, o katın metrajı HESAPLANMAZ.** `offsetJoinType` ve `areaPerSpace` emsallerinin aynısı: sıfır bir plaka üretmek metrajı sessizce sıfırlardı.

### CommonSpace (ortak alan) *(1.4)*

Kat holü, koridor, merdiven holü, bina girişi. **Sirkülasyonun semantik evidir.**

| Alan | Tip | Kademe |
|---|---|---|
| floorId | fk | — |
| spaceType | enum | H — `katHolu · merdivenHolu · koridor · binaGirisi` |
| geometry | polygon | H — L2 üretir |
| area / perimeter | decimal | H — geometriden |

**Neden bir nesne, türetilmiş bir fark kümesi değil:** İP-4'ün bitiş ölçütü "**semantik olarak eksiksiz** bir tipik kat planı" ve ilke 4 "her nesne semantik kalır". `ObjectCostMapping` bir `objectType`'a bağlanır; `plaka ∖ çekirdek ∖ ⋃birim` ifadesine bağlanamaz. Katın en büyük ortak alanı nesnesiz kalırsa koridorun zemin kaplaması, duvar yüzeyi ve kapıları İP-5'te türetilemez.

### ColumnGrid (kolon aks ızgarası) *(1.4)*

| Alan | Tip | Kademe |
|---|---|---|
| blockId | fk | — |
| spacingX / spacingY | decimal (m) | H — `BuildingElementRule`'dan |
| axes | json | H — aks çizgileri (yerel metrik) |
| columnCount | int | H — ızgara ile plakanın kesişiminden |

**KABADIR.** Amacı otopark verimi doğrulaması ve yapısal ampirik katsayıya girdi vermektir; **gerçek statik hesap değildir** ve **kolon kesiti hesaplanmaz**. Aks aralığı paketten gelir; kural yoksa ızgara üretilmez + uyarı.

> **İP-3'ten devreden söz burada ödenir.** `ParkingRule.areaPerSpace` notu (bölüm 12.5): *"İP-4'te kolon aksları geldiğinde geometrik yerleşim bu katsayıyı **değiştirmez, doğrular**."* Aks ızgarasından ölçülen bodrum kapasitesi katsayıdan belirgin saparsa **uyarı** üretilir. **Otorite katsayıda kalır.**

### Block

Çok bloklu projeler için. Tek bloklu projede otomatik tek blok oluşur, arayüzde görünmez.

| Alan | Tip | Kademe | Not |
|---|---|---|---|
| name | text | K2 | tek bloklu projede gizli |
| sortOrder | int | — | |
| isDefault | bool | — | otomatik oluşan tek blok |
| buildingHeight | decimal (m) | H | Σ `Floor.grossHeight` *(1.3)* |

**`buildingHeight` neden eklendi** *(1.3)*: `CoreRule.elevatorRequiredHeightThreshold`, `CoreRule.fireElevatorHeightThreshold` ve `FireSafetyRule.firePumpHeightThreshold` bir **bina yüksekliği** değeri okuyor; bu değerin şemada evi yoktu. Blok başınadır — çok bloklu projede bloklar farklı yükseklikte olabilir.

> **Proje başlangıç sihirbazı (8 soru)** bu dokümanda **tanımlı değildir**; kaynağı `etut-portali-proje-dokumani.md` bölüm 5'in sonudur. Sorulardan yalnızca ikisinin (hedef otopark sayısı, asansör sayısı) bölge paketinde ön-dolum kaynağı vardır. *(1.3)*

---

## 6. Çekirdek

### Core (çekirdek) *(1.3)*

Merdiven, asansör(ler), hol ve şaftların oluşturduğu mekânsal gruplama. **Kat planı üretiminin sabit noktasıdır** (`etut-portali-proje-dokumani.md` bölüm 5, katman 3). `Block` başına tekildir.

| Alan | Tip | Kademe | Not |
|---|---|---|---|
| blockId | fk | — | `Block` başına tek çekirdek |
| coreStrategy | enum | H | `merkezi · kenar · cift` — L1 **önerir**, kullanıcı ezer |
| geometry | polygon | H | yerel metrik. **Basit form:** dikdörtgen veya L. Optimize serbest form plan motorunun (İP-4) işidir |
| area | decimal (m²) | H | poligondan |
| requiredElevatorCount | int | H | `CoreRule` eşiklerinden (kat/yükseklik) |

**Çekirdek proje geneli sabittir.** Konumu değişirse **tüm katlar** etkilenir; sistem onay ister. Konum bir ezmedir (`geometryOverrideValue` + gerekçe).

**Paketten gelen kurallar** `CoreRule`'da: asansör zorunluluk eşikleri · minimum kabin ölçüleri · merdiven genişlikleri · kaçış mesafesi.

**Neden strateji enum, katalog değil (bkz. 15.1):** kod üç yerleşimi de ayrı ayrı *uygular*; yeni bir strateji zaten yeni kod demektir.

### Elevator (asansör)

| Alan | Tip | Kademe | Not |
|---|---|---|---|
| count | int | K1 | |
| elevatorType | enum | K2 | insan · yuk · sedye · yangin |
| capacityPersons | int | K2 | |
| capacityKg | int | H | ≈ kişi × 75 |
| speed | decimal (m/s) | K3 | |
| stopCount | int | H | kat sayısından |
| travelHeight | decimal (m) | H | |
| cabinWidth / cabinDepth / cabinHeight | decimal | K2 | sedye asansöründe paket minimumu |
| shaftWidth / shaftDepth | decimal | K2 | |
| pitDepth / overheadHeight | decimal | K3 | |
| doorType | enum | K3 | otomatikTeleskopik · merkeziAcilim |
| doorWidth | decimal | K3 | |
| machineRoomType | enum | K2 | makineDairesiz · ustMakineDairesi · altMakineDairesi |
| driveType | enum | K3 | halatli · hidrolik |
| cabinFinishLevel | enum | K2 | kalite paketinden |
| hasEmergencyRescue | bool | K3 | kurtarma sistemi |
| hasBackupPower | bool | K3 | jeneratör bağlantısı |
| certificationCost | decimal | K3 | |

**Paketten gelen kurallar:** asansör zorunluluk eşiği (kat/yükseklik) · minimum adet · sedye asansörü zorunluluğu ve minimum kabin ölçüsü · yangın asansörü eşiği

**Doğan metraj:** asansör ünite maliyeti · kuyu perde betonu ve donatısı · kuyu su yalıtımı · makine dairesi imalatları · kat kapısı çevresi kaplama · sertifikasyon

### Stair (merdiven)

| Alan | Tip |
|---|---|
| stairType | enum: ana · yangin · servis · icDuplex |
| flightType | enum: duzKollu · araSahanlikli · U · daire |
| stepWidth / riserHeight / treadDepth | decimal |
| totalStepCount | int (H) |
| landingArea | decimal |
| railingType | enum + length (H) |
| treadMaterial | enum: mermer · granit · seramik |
| isPressurized | bool — yangın merdiveni basınçlandırma |

**Doğan metraj:** basamak mtül · sahanlık m² · korkuluk mtül · süpürgelik mtül · yangın kapısı adedi

### Shaft (şaft)

| Alan | Tip |
|---|---|
| shaftType | enum: tesisat · havalandirma · cop · asansor · duman |
| width / depth | decimal |
| runsThroughFloors | int[] — `Floor.floorNo` değerleri *(1.3)* |
| offsetX / offsetY | decimal (m) — **çekirdek orijinine göreli** konum *(1.3)*, **hesaplanan dörtlü** *(1.4)* |

**Şaft konumu neden göreli** *(1.3)*: şaftlar tüm katlarda **aynı** konumda olmak zorundadır (düşey süreklilik). Mutlak konum saklansaydı çekirdek taşınınca her katta ayrı ayrı güncellenmesi gerekir, biri unutulduğunda süreklilik sessizce kırılırdı. Göreli konumda mutlak yer `çekirdek + offset` ile **türetilir** — süreklilik korunması gereken bir kural değil, **yapısal bir sonuçtur**.

**Konum neden hesaplanan alana çevrildi** *(1.4)*: 1.3'te `offsetX/offsetY` K3 manuel alanlardı ve **hiçbir motor onları yazmıyordu.** Sonuç: her projede şaft konumu bilinmiyor, dolayısıyla L3'ün *"banyo şafta bitişik"* iddiası dahil **bütün ıslak hacim kısıtları "değerlendirilemedi" çıkıyordu** — sistem ıslak hacimleri topladığını sanırken hiçbir şey onları toplamıyordu. L1 çekirdek poligonunu zaten üretiyor; şaftları onun içine **önerir**, kullanıcı ezer.

---

## 7. Servis Mekanları

Bölge paketindeki eşiklerden zorunluluk türer; sistem checklist sunar, kullanıcı onaylar. Her biri bodrum planına sabit blok girer.

### ServiceSpace (ortak alanlar)

Temel alanlar: `serviceType` · `isMandatory` (H) · `requiredArea` (H) *(1.3)* · `area` · `width/length` · `clearHeight` · `location` (hangi kat) · `floorFinish` · `wallFinish` · `hasVentilation` · `hasDrainage` · `hasFireRating` · `doorType`

**`requiredArea`** *(1.3)*: `RequiredSpaceRule.areaFormula`'nın sonucu. Formül tanımlıydı ama sonucunu yazacak kolon yoktu. `area` kullanıcının yerleştirdiği fiili alandır; `requiredArea` paketin istediği asgari alandır. İkisi ayrıdır ve rapor ikisini de gösterir.

**Programa dahil olma** *(1.3)*: ayrı bir "onaylandı" alanı **yoktur** — *satırın varlığı dahil olmak demektir*. Zorunlular onayda otomatik oluşur, tercihe bağlılar kullanıcı işaretleyince; işaret kaldırılınca satır silinir. `isMandatory` yalnızca checklist'te **kilitli** olup olmadığını söyler.

### Sığınak (özel alan seti)

| Alan | Tip | Not |
|---|---|---|
| isRequired | bool (H) | paket eşiğinden |
| requiredCapacityPersons | int (H) | bağımsız bölüm sayısı × paket katsayısı |
| areaPerPerson | decimal (P) | paketten |
| totalArea | decimal (H) | kişi × m²/kişi |
| shelterType | enum | serpinti · siginak |
| wcCount / showerCount | int | |
| hasKitchenette | bool | |
| gasProofDoorCount | int (H) | alandan türer |
| gasProofDoorType | enum | |
| ventilationSystemType | enum | filtreli · dogal |
| ventilationUnitCount | int | |
| emergencyExitCount | int | |
| floorFinishType | enum | |
| wallStructureThickness | decimal | özel donatı gerektirir |
| hasBackupPower | bool | |
| alternativeUseWhenIdle | enum | otopark · depo · sosyalAlan |

### Elektrik Odası / Trafo

`isTransformerRequired` (talep gücünden) · `demandPowerKW` (H: bağımsız bölüm × paket katsayısı + ortak alan) · `transformerCapacityKVA` · `transformerCount` · `hasSeparateEntrance` · `hasVentilation` · `roomArea` · `distributionPanelCount`

### Su Deposu ve Hidrofor

`domesticWaterVolume` (H: bağımsız bölüm × kişi × litre) · `fireReserveVolume` (P) · `totalVolume` · `tankMaterial` · `hydrophoreCount/Power` · `submersiblePumpCount` · `waterproofingArea` (H)

### Yangın Sistemi

`isFirePumpRequired` (bina yüksekliği eşiği) · `pumpRoomArea` · `pumpCount/Power` · `sprinklerRequired` · `sprinklerCoverageArea` · `hydrantCount` · `fireCabinetCount` · `detectorCount` (H: alandan) · `alarmPanelCount` · `pressurizationFanCount`

### Jeneratör

`scope` (yok · ortakAlan · tamYedekleme) · `capacityKVA` (H) · `fuelTankVolume` · `roomArea` · `exhaustSystemLength` · `soundproofingArea` · `ventilationOpeningArea`

### Isı Merkezi

`heatingSystemType` (merkezi · bireysel · bolgesel) · `boilerType` · `boilerCapacityKcal` (H: ısı kaybı hesabından yaklaşık) · `boilerCount` · `roomArea` · `chimneyHeight/Diameter` · `heatMeterCount` (H: bağımsız bölüm sayısı) · `hotWaterMethod`

### Diğer Servis Mekanları

Görevli dairesi (eşikten) · Çöp odası · Bisiklet park alanı · Temizlik odası · Yönetim odası · Sosyal alan/toplantı

---

## 8. Otopark

### ParkingLayout

| Alan | Tip | Not |
|---|---|---|
| requiredCount | int (H) | paket kuralından: bağımsız bölüm sayısı veya alan bazlı |
| targetCount | int (M) | kullanıcı hedefi |
| plannedCount | int (H) | yerleşimden |
| deficitCount | int (H) | fark — risk göstergesi |
| parkingType | enum | acik · kapali · yariAcik · mekanik |
| basementFloorCount | int (H/M) | çözücüden veya elle |
| accessibleSpaceCount | int (H) | engelli park — paket oranından |
| electricChargingCount | int | |
| bicycleSpaceCount | int (H) | paketten |
| maneuveringAisleWidth | decimal (P) | |
| markingLength | decimal (H) | yer çizgileri |
| acceptedDeficitCount | int (M) | **kabul edilen eksik** *(1.3)* |

**`deficitCount` = `requiredCount − plannedCount`** *(1.3)*. `targetCount` kullanıcının hedefidir ve eksiği tanımlamaz — eksik, **yönetmelik ihtiyacına** göre ölçülür.

**`acceptedDeficitCount`** *(1.3)*: kullanıcı eksikli bir senaryoyu bilerek seçerse, **seçim anındaki** eksik buraya yazılır. "2 park eksik olduğu bilinerek 1 bodrum seçildi" bir **risk kabulüdür**; `deficitCount` sonradan program değişince kayar, kabul edilen sayı kaymaz. İP-9 raporu bunu gösterir. Hesaplanan değil, karar anında yazılan bir kayıttır — bu yüzden ezme üçlüsü açılmaz.

**Senaryolar saklanmaz** *(1.3)*: otopark senaryoları her okumada yeniden üretilir. Kalıcı olan yalnızca **karar**: `basementFloorCountOverrideValue` + gerekçe + `acceptedDeficitCount`.

### ParkingSpace / Ramp

Park yeri: `width × length` (paket minimumu) · `isAccessible` · `isMechanical` · `assignedUnitId`

Rampa: `slope` (paket maksimumu) · `width` · `length` (H: kot farkı ÷ eğim) · `footprintArea` (H) *(1.3)* · `isCovered` · `hasHeating` · `shutterType` · `turningRadius`

> Rampa uzunluğu kot farkından türer ve bodrum alanının ciddi kısmını yer. En çok unutulan kalemdir.

**`footprintArea = length × width`** *(1.3)*: yukarıdaki cümlenin sayısal karşılığı yoktu. Rampa ayak izi, otopark çözücüsünün kullanılabilir alan havuzundan **düşülür**.

**"Kot farkı" hangi değerdir** *(1.3)*: bodrum rampası zeminden **en alt bodruma** iner, dolayısıyla düşülen kot = bodrum kat sayısı × bodrum kat yüksekliği (bölüm 5, `Floor.grossHeight`). `SiteData.topographyLevelDifference` rampanın **giriş kotunu** etkiler ama boyunu bu belirlemez. Doküman ikisini de ima ediyordu, hiçbirini tanımlamıyordu; bodrum derinliği fiziksel olarak zorunlu olandır.

---

## 9. Cephe, Çatı, Peyzaj

### Facade

Her cephe ayrı kayıt — **kare bina varsayımı yapılmaz.**

| Alan | Tip |
|---|---|
| facadeNo / orientation | int / enum |
| width | decimal (H — geometriden) |
| height | decimal (H) |
| grossArea | decimal (H) |
| openingArea | decimal (H — açıklıklardan) |
| netArea | decimal (H) |
| materials | json[] — malzeme + oran (%) |
| insulationType / thickness | enum / decimal |
| insulationArea | decimal (H — kaleme göre açıklık düşümü) |
| scaffoldingArea / months | decimal / int |

Malzeme tipleri: kompozit · söve · dekoratifSıva · boya · doğalTaş · seramik · giydirmeCephe · ahşap

### Roof

`roofType` (kirma · duz · teras · celikKarkas) · `structureMaterial` · `structureWeight` (H) · `coveringType` · `coveringArea` (H) · `insulationType/thickness/area` · `waterproofingType/area` · `gutterType/length` · `downspoutCount` · `hasConcreteSlab` · `parapetHeight/Length` · `hasSkylight`

### Landscape

`gardenWallLength/Height` · `lawnArea` · `plantingBudget` · `irrigationSystem` · `hardscapeArea` · `outdoorLightingCount` · `playgroundArea` · `fenceLength`

---

## 10. Metraj Motoru

### 10.0 SAHİPLİK KURALI *(1.5)*

> **Her fiziksel yüzeyin TEK sahibi vardır.**

| Sahip | Kapsam |
|---|---|
| **`Wall`** | YALNIZCA gövde: duvar bloğu, harç. Her duvar bir kez sayılır. **Hiçbir bitiş kalemi tetiklemez** |
| **`Space`** | İÇ yüzey bitişleri: iç sıva, saten, boya, duvar seramiği, süpürgelik, tavan, kartonpiyer, zemin kaplaması, şap, su yalıtımı |
| **`Facade`** | DIŞ yüzey: mantolama, dış sıva, dış kaplama, dış boya, denizlik, iskele |

**Neden bu kural var.** Banyo ile yatak odası arasındaki duvarın banyo yüzü seramik, yatak odası yüzü boyadır — **bitiş MEKANA göre değişir**. Duvar gövdesi ise tektir ve iki mekana paylaştırılamaz. Dış yüzün hiçbir mekanı yoktur.

**Neden gerekliydi.** 1.4'e kadar bölüm 10.1 `Wall`'a *"sıva ×2 + boya"* yükleyip bölüm 4 aynı kalemleri `Space`'e de yüklüyordu. Aynı sıva **iki kez** metraja giriyordu ve hiçbir öz-denetim bunu yakalamıyordu, çünkü nesne tipleri farklıydı. Sahiplik kuralı çift sayımı bir kontrol meselesi olmaktan çıkarıp **yapısal olarak imkânsız** kılar — şaft düşey sürekliliğinde (bölüm 6) yapılan hamlenin aynısıdır.

**Sonuç:** bir kalemin hangi nesneden tetikleneceği bir tercih değil, bu tablodan çıkan bir **zorunluluktur**. `ObjectCostMapping` satırları buna uymak zorundadır.

### 10.1 Nesne → Kalem eşleme

`ObjectCostMapping` tablosu: `objectType` · `objectVariant` · `costItemCode` · `quantityFormula` · `conditions`

Örnek satırlar:

| Nesne | Varyant | Kalem | Formül |
|---|---|---|---|
| Space | zemin kaplama = seramik | Seramik yer döşemesi | `area` |
| Space | zemin kaplama = seramik | Seramik yapıştırıcı | `area × 0,2 torba` |
| Space | isWetArea = true | Su yalıtımı | `area + perimeter × 0,2` |
| Space | wallCladdingHeight > 0 | Duvar seramiği | `perimeter × wallCladdingHeight` |
| Space | ceilingType = kartonpiyer | Kartonpiyer | `perimeter` |
| Space | — | İç sıva · boya | `perimeter × clearHeight` |
| Opening | frameMaterial = pvc | PVC doğrama | `(2×(w+h)) × count` |
| Opening | glazingType = isicam | Isıcam | `w × h × count` |
| Wall | wallType = dis | Duvar bloğu + harç | çoklu — **YALNIZCA GÖVDE** |
| Facade | — | Mantolama + dış sıva + dış boya + iskele | çoklu |
| Elevator | — | Asansör ünitesi + kuyu perdesi + yalıtım | çoklu |

> **Düzeltme (sürüm 1.5).** Önceki sürümde `Wall` satırı *"Duvar bloğu + harç + sıva ×2 + yalıtım + boya"* diyordu. Bu, bölüm 4'ün `Space`'e verdiği sıva ve boyayla **çakışıyordu** ve aynı yüzey iki kez metraja giriyordu. Bölüm 10.0'ın sahiplik kuralı bunu kesti: gövde `Wall`'ın, iç yüzey `Space`'in, dış yüzey `Facade`'ındır.
>
> **Formüllerden açıklık düşümü çıkarıldı.** "Duvar seramiği" satırı 1.4'e kadar `− açıklık` taşıyordu. Düşüm artık formülde değil, MOTORDA uygulanır (bölüm 10.2): formül BRÜT üretir, motor kalemin kuralına göre düşer. Formülde bırakmak, merkezî kuralı formül yazarının insafına bırakırdı — unutulabilir ya da iki kez uygulanabilirdi.

### 10.2 Açıklık düşümü — merkezî kural

> Referans üründe tespit edilen hata: aynı cephede yalıtım hesabında açıklıklar düşülmüş, kaplama ve boyada düşülmemiş.

Her kalem için `openingDeductionRule` tanımlanır:

| Kural | Anlam |
|---|---|
| `none` | Açıklık düşülmez |
| `full` | Tüm açıklıklar düşülür |
| `above_threshold` | Eşik üstü açıklıklar düşülür (eşik paketten, örn. 0,5 m²) |
| `half_above_threshold` | Eşik üstü açıklıkların yarısı düşülür |

Kural bir kez tanımlanır, her yerde aynı uygulanır, raporda gösterilir.

#### TEK UYGULAMA NOKTASI *(1.5)*

> **Formül BRÜT üretir. Düşümü MOTOR uygular.**

Düşüm formülün içinde yazılmaz ve formülün gördüğü değişkenler arasında açıklık alanı **yoktur**. Böylece formül yazarının düşümü unutması ya da iki kez uygulaması **imkânsız** olur.

```
brüt    = formül(nesne bağlamı)
açıklık = o yüzeydeki açıklıkların alanı
eşik    = sözleşme eşiği (proje) ?? kalemin eşiği (paket)
düşülen = kalemin openingDeductionRule'una göre
net     = brüt − düşülen        (yalnızca ALAN birimli kalemlerde)
```

**Alan dışı birimde düşüm anlamsızdır.** Zemin kaplaması, şap, cam, kapı, tavan gibi kalemlerde kural `none` olmalıdır; birimi `adet` veya `metre` olan bir kalemde `full` düşüm tanımlıysa bu bir **katalog hatasıdır** ve yayım anında reddedilir.

**Sözleşme eşiği proje parametresidir.** "Eşik üstü düşülür" değerinin bir kısmı resmî tarif değil **sözleşme pratiğidir**. Varsayılan paketten gelir (`CostItemCatalog.openingDeductionThreshold`); proje düzeyinde ezilebilir (`QuantityTakeoff.contractOpeningThreshold`). Her metraj satırı **hangi eşiğin uygulandığını** taşır.

### 10.3 Yapısal imalatlar — ampirik katsayı

`StructuralCoefficientSet`: `concreteVolumePerArea` (m³/m²) · `rebarWeightPerVolume` (kg/m³) · `formworkAreaPerVolume` (m²/m³) · `formworkLaborRate` · katsayılar kat adedine ve temel tipine göre ayrışır.

**Kalibrasyon referansı (incelenen örnek proje):** ~0,46 m³/m² beton · ~85 kg/m³ donatı · ~3,1 m² kalıp/m³ · kalıp işçiliği yapısal maliyetin ~%41'i.

### 10.4 QuantityLine

| Alan | Not |
|---|---|
| `costItemCode` · `description` · `unit` | kalem kimliği |
| **`quantity`** | **hesaplanan alan dörtlüsü** *(1.5)* — aşağıdaki karara bakınız |
| `sourceObjectType` · `sourceObjectId` | hangi nesneden |
| **`sourceObjectKey`** | *(1.5)* nesnenin KARARLI anahtarı (`Wall.wallKey`, `Space.layoutKey`) |
| **`surface`** | *(1.5)* hangi fiziksel yüzey — çakışma denetiminin girdisi (10.5) |
| `formula` | uygulanan formül |
| **`appliedDeductionRule` · `appliedDeductionThreshold`** | *(1.5)* hangi düşüm kuralı, hangi eşik |
| **`appliedConversionFactor`** | *(1.5)* birim çevrimi uygulandıysa hangi katsayı |
| **`itemVerificationStatus`** | *(1.5)* kalemin doğrulama durumu (12.7) |
| **`quantitySource`** | *(1.5)* `geometri · katsayi · parametrik · elle` |
| **`geometryLevel`** | *(1.5)* `G1 · G2 · G3` — hangi geometri seviyesinden ölçüldü |

> **Şeffaflık ilkesi:** Her miktar hangi nesneden, hangi formülle çıktığını gösterir. Rapor bunu görünür kılar.

**Ezme şekli karara bağlandı** *(1.5)*: `quantity` **hesaplanan alan dörtlüsüdür** (bölüm 1.3). 1.4'e kadar bu varlık `isOverridden` + `overrideReason` kullanıyordu ve dokümanda **iki farklı ezme şekli** vardı; İP-1 çelişkiyi birebir koruyup uzlaştırmayı İP-5'e bırakmıştı.

Dörtlü seçildi çünkü: (a) ezme veritabanı seviyesinde garanti olur — `quantity` GENERATED'dır ve yazılamaz, yani "ezmeyi işaretlemeyi unutmak" imkânsızlaşır; (b) `OverrideLedger` metraj ezmelerini de **otomatik** görür, böylece *"bu projedeki tüm ezmeler tek sorgudur"* iddiası metrajı da kapsar ve rapor (ilke 10) eksik kalmaz. `isOverridden` kaldırıldı.

**Nesne kimliği neden `sourceObjectKey` ister** *(1.5)*: plan motoru duvarları her koşuda **silip yeniden üretir**, dolayısıyla `Wall.id` kalıcı değildir. `sourceObjectId`'ye bağlanan bir izlenebilirlik ilk yeniden hesapta çürür. Kararlı olan `wallKey`'dir (bölüm 4) ve rapor izi ona bağlanır.

**Miktar hesaplanamazsa `null` olur, sıfır DEĞİL** *(1.5)* — ve satır yine oluşur. Satırı hiç üretmemek sessizlik, sıfır yazmak yalan olurdu; `null` "ölçülemedi" demektir ve rapor boşluğu gösterir.

### 10.5 Çakışma denetimi *(1.5)*

Öz-denetim yetmez. Doğru soru *"bir kalem birden fazla nesne tipince tetikleniyor mu"* değil:

> **AYNI FİZİKSEL YÜZEYE aynı işlev sınıfından iki kalem birden düşüyor mu?**

Örnek tuzak: **iç sıva pozu ile saten pozu aynı duvara aynı anda tetiklenirse çift sıva olur** — ve ikisi de `Space`'ten geldiği için nesne tipi denetimi bunu yakalamaz.

**İşlev sınıfları:** `govde` · `siva` · `kaplama` · `boya` · `yalitim`.

Denetim, üretilen satırları `(nesne, yüzey)` ile gruplar ve her grupta aynı işlev sınıfından birden fazla kalem varsa **uyarır** (engellemez — ilke 7).

Bu beş sınıfın hiçbirine girmeyen kalemler (kapı, cam, armatür, asansör, tesisat, kazı) `functionClass` taşımaz ve **denetime girmez**: bir kapıya *"aynı yüzeyde iki kapı olamaz"* demenin anlamı yoktur. Denetim yalnızca **yüzey kalemlerine** uygulanır.

---

## 11. Spesifikasyon (Kalite) Sistemi

### SpecificationPackage (bölge paketinde)

Seviyeler: `ekonomik` · `standart` · `ustSegment` · `luks`

Her paket kalem kalem varsayılan taşır:

| Kapsam | Örnek varsayılan alanlar |
|---|---|
| Zemin kaplamaları | mekan tipi → malzeme + birim fiyat aralığı |
| Duvar bitişleri | mekan tipi → malzeme + seramik yüksekliği |
| Tavan | mekan tipi → tavan tipi |
| Doğrama | profil + cam türü |
| Kapılar | mekan tipi → kapı tipi |
| Sıhhi donanım | marka/model seviyesi |
| Mutfak | dolap tipi, tezgah malzemesi |
| Cephe | malzeme karması |
| Asansör | kabin seviyesi |
| Elektrik | priz/anahtar adetleri, marka seviyesi |
| Ortak alan | giriş kaplaması seviyesi |

**Kullanım:** Kullanıcı K1'de tek seçim yapar, tüm alanlar dolar. K3'te istisnaları tek tek değiştirir. Sistem "paket varsayılanı" ile "değiştirilmiş" alanları ayırt eder ve raporda gösterir.

---

## 12. Bölge Paketi İçeriği

### 12.1 Paket ve sürüm

> **Düzeltme (sürüm 1.1).** Önceki sürümde `RegionPackage` hem paketi hem sürümü taşıyordu
> ("ad, sürüm, ülke, idari birim, geçerlilik tarihi"), ama bölüm 1.2 ve bölüm 3
> `Project.regionPackageVersionId` diyerek ayrı bir sürüm varlığı ima ediyordu. İkisi
> bağdaşmıyordu. `Project.regionPackageVersionId` esas alındı ve paket ikiye ayrıldı.

| Tablo | İçerik |
|---|---|
| `RegionPackage` | **soy:** ad, ülke, idari birim |
| `RegionPackageVersion` | **sürüm:** sürüm no, geçerlilik tarihi, durum (`draft` · `published` · `deprecated`) |

Aşağıdaki kural tablolarının hepsi **sürüme** bağlanır (`regionPackageVersionId`), pakete değil.
Yayımlanmış bir sürümün satırları değişmezdir; değişiklik yeni sürüm doğurur. Proje bağlandığı
sürümü dondurur (bkz. bölüm 1.2).

### 12.2 Kural tabloları

| Tablo | İçerik |
|---|---|
| `ZoningRuleSet` | emsal hesap yöntemi, yükseklik ölçüm referansı (**katalog anahtarı**), emsal harici kurallar, **çekme ötelemesi köşe davranışı** (`offsetJoinType`) |
| `RequiredSpaceRule` | mekan tipi, tetikleyici (bağımsız bölüm sayısı / alan / güç / yükseklik), eşik, alan formülü |
| `ParkingRule` | ihtiyaç formülü, park yeri boyutları, rampa eğim sınırı, engelli oranı, **araç başına alan katsayıları** *(1.3)* |
| `CoreRule` | asansör eşikleri, minimum kabin ölçüleri, merdiven genişlikleri, kaçış mesafeleri, **sirkülasyon asgari genişliği** *(1.3)* |
| `FireSafetyRule` | pompa/sprinkler/basınçlandırma eşikleri, yangın merdiveni şartları |
| `CostItemCatalog` | kalem kodu, ad, birim, kategori, açıklık düşüm kuralı |
| `CostCategoryTree` | kaba/ince/diğer kırılımı (bölgeye göre değişir) |
| `ProjectExpenseTemplate` | denetim bedeli, sigorta primi, abonelik, teminat komisyonu formülleri |
| `SpecificationPackage` | kalite seviyeleri ve varsayılanları |
| `ProcessTemplate` | aşama/adım/süre/bağımlılık şablonu |
| `IncentiveProgram` | uygunluk koşulu, hesaplama kuralı, başvuru adımları, ödeme takvimi |
| `StructuralCoefficientSet` | ampirik katsayılar |
| `TaxAndIndexRule` | vergi oranları, endeksleme serisi |

### 12.3 Sürüm 1.1'de eklenen tablolar

> **Neden eklendi.** İlke 1 "yerel hiçbir şey koda gömülmez" diyor, ama dokümanın kendi
> formüllerindeki bazı katsayıların yukarıdaki tablolarda evi yoktu. Ev verilmeseydi ya koda
> gömüleceklerdi (ilke ihlali) ya da ilgili iş paketi tıkanacaktı.

| Tablo | İçerik | Neden gerekli |
|---|---|---|
| `ObjectCostMapping` | `objectType` · `objectVariant` · `costItemCode` · `quantityFormula` · `conditions` | Bölüm 10.1'de tanımlı ama bölüm 12'de listelenmemişti; kalem kodu ve formül taşıdığı için paket verisidir ve sürüme bağlanmalıdır |
| `SpaceShapeFactorRule` | `spaceType` → `k` şekil faktörü | Bölüm 1.5'teki `çevre ≈ k × √alan` katsayısı ("k tipe göre, dikdörtgen ~4,2") |
| `UtilityCoefficientSet` | trafo talep gücü, kişi/daire ve litre/kişi, dedektör kapsama alanı, jeneratör boyutlandırma, kazan ısı kaybı katsayıları | Bölüm 7'deki servis mekanı formüllerinin "paket katsayısı" dediği ama tanımlamadığı değerler |
| `SpecialConstraintCatalog` | 11 maddelik kontrol listesinin tanımı + **etki şekli** (`effectTarget`, `effectKind`) | Bölüm 3 "paket tanımlı, kullanıcı işaretler" diyor ama listenin nerede durduğunu söylemiyor. Etki alanları 1.2'de eklendi — aşağıya bakınız |
| `FacadeMaterialCatalog` | cephe malzeme tipleri ve varsayılan oranları | Bölüm 9'daki malzeme listesi bölgeye göre değişir |
| `SpaceTypeCategoryMap` | `spaceType` → `category` eşlemesi | `Space.category` hesaplanan alan ve tipten türer. **Varsayılan eşleme evrenseldir; bölge paketi yalnızca ezebilir.** |
| `ParametricLumpSumRule` | disiplin · sürücü değişken · formül · katsayı | Bölüm 13 madde 4 kapalı bir karar: elektrik ve mekanik metraj **parametrik götürü**, sabit tutar değil. Katsayılarının evi yoktu; İP-10 bunları kalibre edecek |

### 12.4 Sürüm 1.2'de eklenen tablolar

| Tablo | İçerik | Neden gerekli |
|---|---|---|
| `HeightReferenceCatalog` | `ruleKey` · `labelKey` · `sortOrder` | Yükseklik ölçüm referansı **açık uçlu yerel bir sözlüktür**; 1.1'de kod enum'uydu ve değerleri uydurulmuştu — ilke 1 ihlali. Farklı ölçüm referanslı bir bölge eklemek kod + migration gerektiriyordu |
| `StakeholderConsentRule` | `majorityThreshold` · `objectionPeriodDays` | A4'ün "karar çoğunluğu eşiği" `P` işaretli ve `mvp`:53 çoğunluk göstergesini İP-2 kapsamına koyuyor, ama 20 tablonun hiçbirinde evi yoktu. `proje-dokumani`:49 zaten "paydaş anlaşma kuralları: karar çoğunluğu eşiği, itiraz süreleri" diyor |

#### Özel kısıtların etkisi (1.2)

1.1'de `SpecialConstraintCatalog` yalnızca `labelKey` + `isBlocking` taşıyordu: kullanıcı
işaretliyor ama **L0'a hiçbir etkisi olmuyordu** — kontrol listesi kozmetik kalıyordu.
Oysa "mania kotu" bir **sayıdır** ve `maxHeight`'ı capler; "yeşil alan terki" `maxFootprint`'i
düşürür.

Katalog etkinin **şeklini** bildirir, **değer** parsele özeldir ve `ZoningData.specialConstraints`
içinde durur:

| Alan | Değerler | Anlam |
|---|---|---|
| `effectTarget` | `maxHeight` · `maxFootprint` · `floorAreaRatio` · `none` | Hangi hesaplanan değeri etkiliyor |
| `effectKind` | `cap` · `multiply` · `subtract` · `none` | Nasıl etkiliyor |

Örnek: `maniaKotu` → `effectTarget: maxHeight`, `effectKind: cap`; kullanıcı bu parsel için
`value: 47.5` girer → `maxHeight` 47,5 m ile sınırlanır.

Bu ikisi **enum olarak kalır**, katalog tablosuna dönmez: kod her üyeyi ayrı ayrı
*uygulamak* zorundadır (bkz. bölüm 15).

### 12.5 Sürüm 1.3'te eklenenler

#### `ParkingRule` — araç başına alan katsayıları

| Alan | Birim | Not |
|---|---|---|
| `areaPerSpace` | m²/araç | normal park yeri |
| `accessibleAreaPerSpace` | m²/araç | engelli park yeri |
| `bicycleAreaPerSpace` | m²/yer | bisiklet |

**Neden `spaceWidth × spaceLength` yetmiyor:** o çarpım park yerinin **kendi** alanıdır, gerçek verim değil. Aradaki farkı kolon kayıpları, rampa başı ölü alanlar, sütun aralığı ve dönüş yarıçapları belirler — hiçbiri o üç değerden türetilemez ve türetilen sayı **sistematik olarak iyimser** çıkar. `spaceWidth` / `spaceLength` / `maneuveringAisleWidth` **silinmez**; plan motoru (İP-4) gerçek yerleşimi çizerken kullanacaktır.

**Otorite katsayıdadır.** İP-4'te kolon aksları geldiğinde geometrik yerleşim bu katsayıyı **değiştirmez, doğrular**: fiili yerleşim katsayıdan belirgin saparsa uyarı üretilir. Katsayı, İP-10 geriye dönük doğrulamada kalibre edilecek kalemler listesindedir.

**Kural yoksa sayım yapılmaz + uyarı.** Koda gömülü varsayılan yoktur (ilke 1).

#### Formül sözleşmesi

`ParkingRule.requirementFormula` ve `RequiredSpaceRule.areaFormula` metin alanlarıdır. Dilbilgisi ve değerlendirme kuralları:

**Dilbilgisi (kapalı küme):** sayı · değişken adı · `+ - * /` · parantez · karşılaştırma (`< <= > >= == !=`) · üçlü `? :` · `min max ceil floor round abs`. Üye erişimi, fonksiyon tanımı, atama, dizi ve dize **yoktur**.

**Kural tipi başına değişken beyaz listesi ve birim** — kodun sözleşmesidir, yerel kural değildir; bu yüzden pakette değil kodda yaşar:

| Formül alanı | Görebildiği değişkenler | Birim | Sonuç kısıtı |
|---|---|---|---|
| `ParkingRule.requirementFormula` | `unitCount` · `totalFloorArea` · `commercialArea` · `residentialUnitCount` | araç | tamsayı ≥ 0 |
| `RequiredSpaceRule.areaFormula` | `unitCount` · `totalFloorArea` · `personCount` · `demandPowerKW` · `buildingHeight` | m² | ≥ 0 |

Otopark formülünün gördüğü değişkenlerle alan formülününki **aynı değildir**.

**Doğrulama yayım anındadır, okuma anında değil.** Sürüm `published`'a çevrilmeden önce her formül ayrıştırılır ve sözleşmesine karşı doğrulanır; bozuk formül yayımı **reddeder** ve sürüm `draft` kalır. Böylece bozuk bir formül, projeler onu okumaya başlamadan yakalanır. Okuma anında formülün geçerli olduğu **garantidir**; orada yalnızca çalışma zamanı sorunları (sıfıra bölme, eksik değişken değeri) uyarı üretir ve sonuç `null` kalır.

**Determinizm:** tarih, saat ve rastgelelik erişimi yoktur — aynı girdi her zaman aynı sonucu verir (ilke 2'nin gereği: dondurulmuş paket dondurulmuş sonuç üretmeli).

### 12.6 Sürüm 1.4'te eklenenler — plan motorunun kuralları

Plan motorunun okuduğu yedi değerin hiçbirinin 22 kural tablosunda evi yoktu. İlke 1 gereği hiçbiri koda gömülemez: birim alan toleransı bir kabul eşiğidir, asgari oda genişliği ve pencere oranı yerel mevzuattır, duvar kalınlığı iklim bölgesine ve yapı geleneğine bağlıdır, aks aralığı yapısal alışkanlıktır.

**Sınır iki tablo arasında ÖLÇEKtedir:** biri birim ölçeğinde bölümlemeyi (L2), diğeri yapı elemanı ölçeğinde detayı (L3/L4) yönetir.

#### `UnitLayoutRule` — birim ölçeği

| Alan | Birim | Not |
|---|---|---|
| `grossToNetFactor` | — | brüt birim alanı ÷ net mekan alanları toplamı |
| `areaTolerance` | oran | hedeften kabul edilen sapma (bölüm 9'un açık kararı burada kapanır) |
| `minUnitFacadeLength` | m | pencere alabilmesi için asgari cephe teması |
| `maxUnitAspectRatio` | — | "aşırı uzun dar birim olmasın" |

**`grossToNetFactor` neden zorunlu:** kullanıcının hedefi NET'tir (mekan alanları toplamı), plaka BRÜT'tür. Aradaki farkı duvar kalınlıkları, birim içi sirkülasyon payı ve ölçü alışkanlığı belirler. Bu katsayı **bölmeyle uydurulamaz**: `plaka ÷ Σhedef` yazmak, programın plakayı tam doldurduğunu **varsaymak** demektir ve program plakanın %60'ıysa bütün daireleri sessizce %66 şişirir. Kural yoksa **L2 hesaplamaz + uyarı** — `offsetJoinType` ile aynı sertlik.

#### `BuildingElementRule` — yapı elemanı ölçeği

| Alan | Birim | Not |
|---|---|---|
| `spaceType` | enum | hangi mekan tipi için |
| `minArea` | m² | asgari oda alanı |
| `minClearWidth` | m | asgari net genişlik |
| `daylightRatio` | oran | pencere alanı ÷ taban alanı |
| `wallThickness` | m | `wallType`'a göre (dis · ic · islakHacim · saft · birimAyirici) |
| `minDoorWidth` | m | kapı ölçüsü — yangın ve erişilebilirlik mevzuatı |
| `columnSpanX` / `columnSpanY` | m | kaba aks aralığı |

**Adı neden `SpaceDimension` değil:** duvar kalınlığı ve aks aralığı bir **mekan** ölçüsü değil, bir **yapı elemanı** ölçüsüdür; "mekan boyutu" başlığı altında durmaları yanıltıcı olurdu.

Her ikisi de sürüme bağlanır ve yayımdan sonra değişmezlik trigger'ı kapsamındadır. **Kural tablosu sayısı 22 → 24.**

### 12.7 Sürüm 1.5'te eklenenler — metraj motorunun kuralları

#### `ZoningRuleSet` — kat plakası ötelemeleri

| Alan | Birim | Not |
|---|---|---|
| `basementSetback` | m | bodrum çekme mesafesi. **`0` geçerli**, `null` bilinmiyor |
| `setbackFloorSetback` | m | çekme kat ötelemesi |

İkisi de yerel mevzuattır ve koda gömülemez (ilke 1). Yoksa o katın plakası hesaplanmaz.

#### `CostItemCatalog` — katalog güven seviyesi

Poz kataloğu bir süre daha güvenilir olmayacak. Bu **sessiz hata değil, YÖNETİLEN RİSK** olmalıdır.

| Alan | Değerler | Davranış |
|---|---|---|
| `verificationStatus` | `verified` · `unverified` · `deprecated` | `deprecated` metrajda **KULLANILMAZ**, hata verir ve `supersededBy` önerilir. `unverified` kullanılır ama satırda görünür ve raporda gösterilir |
| `verificationSource` | metin | kodun nereden doğrulandığı |
| `supersededBy` | kalem kodu | kaldırılmış kodun yerine geçen |
| `functionClass` | `govde` · `siva` · `kaplama` · `boya` · `yalitim` · **yok** | çakışma denetiminin girdisi (10.5). Yüzey kalemi değilse taşınmaz |

**Maskeli kod reddedilir.** `XX`, `XXXX` gibi yer tutucu içeren kodlar yayım anında reddedilir: *kod doğrulanmamışsa alan BOŞ bırakılır, uydurma kod girilmez.* Tekrarlanan kalem kodu zaten sürüm içinde tekildir.

`unit` tiplenmiştir: kod her birimi **ayrı ayrı uygular** — çevrim geçerliliği ve düşüm geçerliliği birimin alan mı, uzunluk mu, adet mi olduğuna bağlıdır (bkz. bölüm 15.1).

#### `ObjectCostMapping` — birim çevirimi ve yüzey

| Alan | Not |
|---|---|
| `producedUnit` | formülün ÜRETTİĞİ birim |
| `conversionFactor` | çevrim katsayısı |
| `conversionMode` | `carp` · `tavanaBol` |
| `surface` | `mekanDuvari` · `mekanTavani` · `mekanZemini` · `cepheYuzeyi` · `duvarGovdesi` |
| `conditions` | **şekli tanımlandı**: `{ "formula": "<mantıksal ifade>" }` |

**Neden çevirici gerekli.** Bazı pozların birimi nesnenin ürettiğinden farklıdır:

| Kalem | Nesne üretir | Poz birimi | Çevrim |
|---|---|---|---|
| Doğrama | m² | **kg** (profil ağırlığıyla ödenir) | kg/m² profil ağırlığı |
| Su deposu | m³ | **adet** (m³ yalnızca kapasite etiketi) | `tavanaBol` — `ceil(hacim ÷ kapasite)` |
| Süpürgelik · radyatör | m | m | — |
| Donatı | kg | **ton** | ×0,001 |

**Çevirici yoksa ve birimler farklıysa sistem HESAPLAMAZ ve uyarır.** Sessizce 1 katsayısı varsayılmaz — **bin kat hatanın kaynağı tam olarak budur.** Uygulanan katsayı metraj satırına yazılır. Katsayı paket sürümüne bağlıdır, yani dondurma kapsamındadır (ilke 2).

**Koşullar aynı dilbilgisiyle yazılır** (bölüm 12.5): karşılaştırma ve üçlü zaten var, sonuç mantıksaldır ve **yayım anında doğrulanır**. Ayrı bir JSON yüklem dili ikinci bir ayrıştırıcı ve ikinci bir güvenlik yüzeyi olurdu.

---

## 13. Açık Kararlar

1. **Mekan geometri seviyesi zorunluluğu** — ✅ *Karara bağlandı:* G2 (en × boy) **opsiyoneldir.** Plan motoru MVP'de olduğu için normal akışta gerçek geometri G3'ten gelir; G2 yalnızca plan üretilmeden hızlı maliyet istendiğinde veya üretilmiş bir mekanın boyutu elle ezilirken kullanılır. `width`/`length` nullable kalır. Bölüm 4'teki çelişkili paragraf düzeltildi.
2. **Çok bloklu proje MVP'de olsun mu?** — ✅ *Karara bağlandı:* veri modelinde var, arayüzde gizli. Tek bloklu projede otomatik tek blok oluşur (bkz. bölüm 5). `Core`, `Facade[]` ve `Roof` bu yüzden `Block` altındadır.
3. **UnitType şablonu ne kadar katı?** — ✅ *Karara bağlandı (1.4):* örneklenen bağımsız bölüm şablondan **ayrışabilir** ve ayrışma işaretlenir (İP-3'te uygulandı).
   - **Alt karar** — ✅ *Karara bağlandı (1.4):* **ikisi birden.** `UnitType` proje kapsamlı kalır; onu besleyen **`UnitTypeTemplate`** organizasyon seviyesinde bir kütüphanedir ve kullanıldığında projeye **kopyalanır** (`sourceTemplateId` + `sourceTemplateVersion` ile izlenebilir).

   **Neden pakette değil:** bir tipoloji şablonu mevzuat değil, **firma alışkanlığıdır** — bölgeye değil, tasarımı yapana aittir. Pakete konsaydı "salonu 2 m² büyüttük" yeni bir paket **sürümü** gerektirirdi ve ilke 2, yönetmelik değişimiyle mimari tercihi aynı kefeye koyardı.

   **Neden kopyalanır, referans verilmez:** kütüphanedeki şablonu iyileştirmek **biten bir projeyi geriye dönük değiştirmemelidir** — ilke 2'nin ruhu, mevzuata değil mimari alışkanlığa uygulanmış hâli.

   **Kütüphane boşsa L3 çalışmaz + uyarı.** Sistem tipoloji uydurmaz; ilke 1'in şablon tarafındaki karşılığıdır.

   | `UnitTypeTemplate` alanı | Tip | Not |
   |---|---|---|
   | organizationId | fk | **kök varlıktır** — kiracıya aittir |
   | templateCode / version | text | "3+1 A", "2.0" |
   | layoutRecipe | json | bölme reçetesi: düğüm = kesme, yaprak = mekan |
   | relationAssertions | json | "salon cephe alır", "banyo şafta bitişik" — **kontrol edilir, zorlanmaz** |
4. **Elektrik ve mekanik metraj seviyesi** — ✅ *Karara bağlandı:* MVP'de **parametrik götürü** (sürücü değişkenlere bağlı formül, sabit tutar değil). Kalem seviyesi Faz 3. Bkz. ana doküman 10.8.
5. **Mekan geometri sırası** — ✅ *Karara bağlandı:* Program tanımında hedef alan (G1), plan motorundan gerçek geometri (G3). G2 yedek yol.
6. **Ampirik katsayılar** — kalibrasyon için geçmiş proje verisi var mı?

---

## 14. Sonraki Adım

1. Bu şemanın Prisma karşılığının yazılması
2. Sihirbaz ekran ekran alan listesi (hangi ekranda hangi alan, doğrulama kuralları)
3. Hesaplama kuralları kataloğu (hangi alan neyden türüyor, formülüyle)
4. Pilot bölge paketinin doldurulması
5. Claude Code devir paketi

---

## 15. L0 Zarf Hesabı ve Enum/Katalog Ayrımı *(1.2)*

### 15.1 Enum mü, katalog tablosu mu

İlke 1 "yerel hiçbir şey koda gömülmez" der. Ama her değer kümesi yerel değildir; ayrım şudur:

> **Enum meşrudur:** kod her üyeyi ayrı ayrı **uygulamak** zorundaysa.
> Yeni bir değer zaten yeni kod gerektirir; enum bunu görünür kılar.
> *Örnek:* `offsetJoinType` (`miter`|`round`) — iki farklı öteleme algoritması yazıyoruz.
> `effectKind` (`cap`|`multiply`|`subtract`) — üç farklı aritmetik.
>
> **Katalog tablosu zorunludur:** değerler kodun yalnızca **sakladığı ve gösterdiği**
> açık uçlu bir sözlükse. Yeni bir değer kod değişikliği gerektirmemelidir.
> *Örnek:* yükseklik ölçüm referansı, özel kısıt listesi, cephe malzemeleri.

1.1'de `heightReferenceMethod` yanlış tarafa düşmüştü: değerleri uydurulmuş bir kod enum'uydu
ve `ZoningRuleSet` — yani paket verisi — onu kullanıyordu. 1.2'de kataloğa taşındı.

### 15.2 L0 zinciri

```
parsel poligonu → çekme mesafesi ötelemesi → taban alanı kontrolü → kat adedi → zarf
```

**İki mod.** `geometry` K2 olduğu için K1'de poligon yoktur:

| Kademe | Hesap | Çıktı |
|---|---|---|
| K1 | Skaler | `maxFootprint = alan × TAKS` · `maxTotalFloorArea = alan × emsal` |
| K2+ | Geometrik | Yukarıdakiler + `buildableEnvelope` (öteleme) |

**Kenar bazlı öteleme.** Tek tip uniform öteleme yanlıştır: `setbackFront/Side/Rear` üç ayrı
değerdir. Hangi kenarın hangi rolü taşıdığı `roadFrontages[].role` ile belirlenir.
Köşe davranışı `ZoningRuleSet.offsetJoinType`'tan gelir — **koda gömülü varsayılan yoktur**;
paket bu değeri vermiyorsa zarf hesaplanmaz ve uyarı üretilir.

> Ölçüm: L şeklinde bir parselde 3 m çekme `miter` ile 222,00 m², `round` ile 223,93 m²
> verir; 5 m çekmede fark %8,1'e çıkar. Bu bir kütüphane ayrıntısı değil, mevzuat
> yorumudur — bu yüzden pakettedir.

**Taban alanı aşımı.** Ötelenmiş poligonun alanı `maxFootprint`'i aşarsa sistem **karar vermez,
senaryo sunar** (bkz. ana doküman 7.2 "sistem senaryo üretir, karar vermez"):
düzgün içe küçültme, veya seçilen kenardan geri çekme. Seçim yapılmadan zarf ötelenmiş
poligon olarak kalır ve "taban alanı aşılıyor" uyarısını taşır — ilke 7: engelleme, uyar.
Kullanıcının seçimi bir **ezme**dir (`buildableEnvelopeOverrideValue` + gerekçe).

**Kat adedi.** `maxFloorCount`'tan gelir. Yalnızca `maxHeight` doluysa kat adedi
**hesaplanmaz**: yükseklikten kat adedi çıkarmak kat yüksekliğini gerektirir, o da A5'te
(İP-3) girilir. Bu durumda uyarı üretilir.

**Bodrum kazanımı.** `basementGainFromLevelDifference` İP-2'de **hesaplanmaz** — kuralı bu
dokümanların hiçbirinde tanımlı değil ve `mvp`:55'in L0 zincirinde de yer almıyor.
Alan null kalır, uyarı üretilir, kural tanımlandığında İP-3'te doldurulur.

**Emsal harici alanlar.** `maxTotalFloorArea` İP-2'de emsal harici kazançları **içermez** —
onlar ancak program girildikten sonra (A5, İP-3) bilinir. Sonuç bu uyarıyla birlikte sunulur.

### 15.3 L1 zinciri — çekirdek yerleşimi *(1.3)*

L0 zarfı verir; L1 zarfın **sabit noktasını** yerleştirir. `mvp-spesifikasyonu.md` bölüm 3 İP-3
tek satırla tanımlıyor ("strateji önerisi (merkezî / kenar / çift), merdiven + asansör + şaft");
L0–L4'ün otoriter dokümanı (`kat-plani-uretim-mimarisi.md`) henüz repoda yok.

```
zarf → çekirdek stratejisi → çekirdek poligonu → şaft göreli konumları → kaçış mesafesi kontrolü
```

| Adım | Girdi | Çıktı |
|---|---|---|
| 1 | `buildableEnvelope`'un en büyük parçası | plaka |
| 2 | plaka en-boy oranı + birim sayısı | `coreStrategy` **önerisi** |
| 3 | `CoreRule` ölçüleri + `requiredElevatorCount` | çekirdek poligonu (dikdörtgen veya L) |
| 4 | çekirdek orijini | `Shaft.offsetX/offsetY` |
| 5 | en uzak birim → çekirdek mesafesi | `CoreRule.maxEscapeDistance` aşılırsa **uyarı** |

**Strateji bir öneridir, karar değildir.** Kullanıcı hem stratejiyi hem poligonu ezebilir.
En-boy oranı eşikleri bir **algoritma sezgiselidir**, yerel mevzuat değildir — bu yüzden kodda
kalır; çıktısı zaten ezilebilir bir öneridir.

**`CoreRule` yoksa çekirdek üretilmez** + uyarı (ilke 1): asansör adedi, merdiven genişliği ve
kaçış mesafesi yerel mevzuattır, uydurulamaz.

**Kaçış mesafesi aşımı engellemez, uyarır** (ilke 7). Ölçüm İP-3'te kuş uçuşudur; koridor boyu
ölçüm gerçek plan geometrisi gerektirir ve İP-4'e aittir.

### 15.4 L2–L4 zinciri — plan üretimi *(1.4)*

L1 sabit noktayı verir; L2 kalan alanı bölümler, L3 birimin içini doldurur, L4 detaylandırır.
Otoriter tanım `kat-plani-uretim-mimarisi.md` bölüm 2'dedir.

```
çekirdek → sirkülasyon → kalan alan → birim poligonları (L2)
        → tipoloji şablonu esnetilir → mekan poligonları (L3)
        → mekan sınırları duvara döner → açıklıklar → aks ızgarası (L4)
```

| Adım | Girdi | Çıktı |
|---|---|---|
| 1 | `buildableEnvelope`'un en büyük parçası + `Core.geometry` | plaka, çekirdek düşülmüş |
| 2 | `CoreRule.minCirculationWidth` + strateji | `CommonSpace.geometry` (sirkülasyon) |
| 3 | `Σ Space.area` × `UnitLayoutRule.grossToNetFactor` | birim hedefleri (brüt) |
| 4 | kalan alan + hedefler | `Unit.geometry` |
| 5 | `UnitType.layoutRecipe` + birim poligonu | `Space.geometry`, `Space.layoutKey` |
| 6 | mekan sınırları + `BuildingElementRule.wallThickness` | `Wall` satırları |
| 7 | ilişki iddiaları + `daylightRatio` | `Opening` satırları (`hostWallId` ile) |
| 8 | `columnSpanX/Y` | `ColumnGrid` → otopark katsayısı **doğrulanır** |

**Sistem programı ÖLÇEKLEMEZ.** Her birim kendi hedefine kesilir. Program plakaya sığmıyorsa
kuyruktaki birimler yerleşmez ve satırları uyarıyla kalır; plakayı doldurmuyorsa fark
**artık alan** olarak raporlanır. `etut-portali-proje-dokumani.md` bölüm 5 katman 4:
*"bağımsız bölüm karmasını **kullanıcı belirler**, sistem önermez… sistem programı zarfa
**yerleştirir**"* — yerleştirmek ölçeklemek değildir. Ölçeklendiği anda birim alan toleransı
ölçülemez hâle gelir, çünkü sapma daima sıfır çıkar.

**Kuralsız bilinen olgu ile eşik gerektiren hüküm ayrıdır.** "Bu birim çekirdeğe değiyor mu" ve
"cepheye değiyor mu" saf topolojidir, paket satırı gerektirmez ve paket boşken bile **ihlal**
üretebilir. "Yeterince mi değiyor" bir hükümdür ve eşik ister; eşik yoksa sonuç
**"değerlendirilemedi"**dir — *"sağlandı" değildir.* Eksik bir kuralın sessizce yeşil ışık
yakması, sistemdeki en pahalı hata biçimidir.

**Eşikler geometriyi YÖNLENDİRMEZ, yalnızca uyarı üretir.** Bir kod sabiti kesme yönünü
seçseydi, sabiti değiştirmek paket sürümü **dondurulmuş** eski bir projeye farklı bir plan —
dolayısıyla farklı bir metraj ve farklı bir maliyet — üretirdi. Bu doğrudan ilke 2 ihlalidir.
L1'deki en-boy oranı sezgiseli emsal değildir: orada çıktı kullanıcının hemen gözden geçirdiği,
ezilebilir bir **öneriydi**.

**L2 çekirdeği asla oynatmaz.** `kat-plani` bölüm 2 L2 adım 4 *"kısıt ihlali kalırsa alternatif
çekirdek konumuyla yeniden denenir"* diyor; bölüm 6 ise çekirdeğin proje geneli sabit olduğunu
ve taşınması için onay gerektiğini söylüyor. İkisi bağdaşmaz. L2 ihlallerin çekirdeğin hangi
yüzünde kümelendiğini **raporlar**; aday konum üretip skorlamak `kat-plani` bölüm 8'de
**Faz 3**'tür (optimizasyon katmanı), onay akışı **İP-8**'dir.

**Manuel ve otomatik mod aynı satırları üretir.** İkisi de aynı yazma yolundan ve aynı
doğrulayıcıdan geçer; fark yalnızca **hangi kaynak kolonun dolduğudur**: otomatik
`geometryComputedValue`, manuel `geometryOverrideValue` + gerekçe. `Unit.geometry` her iki
durumda aynı kolondur ve L3, L4 ile metraj hangisinden geldiğini bilmez. Ezme burada yalnızca
işaretleme değil, **taşıyıcıdır**: kullanıcının çizdiği bölümleme `OverrideValue`'da durduğu
için L2 yeniden koştuğunda yok edilmez.

**Şablona sığmayan mekan G1'e düşer** (bölüm 1.5). Birim başına değil, **mekan başına**:
geçerli hücre alamayan mekan hedef alanıyla kalır, `geometry` null olur ve `perimeter`
`k × √alan` ile `SpaceShapeFactorRule`'dan türer. Metraj yine çıkar, rapor hangi mekanların
G1'de kaldığını gösterir.
