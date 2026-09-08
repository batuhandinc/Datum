# Etüt Veri Modeli ve Detay Spesifikasyonu

**Sürüm:** 1.1
**Tarih:** 8 Eylül 2026 (1.0: 7 Eylül 2026)
**Amaç:** Kat planı üretimi ve gerçek metraj için gereken veri derinliğini tanımlamak. Claude Code devir paketinin şema tarafıdır.

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
    │   │   └── ServiceSpace[] (sığınak, trafo, hidrofor…)
    │   ├── Core ────────── Elevator[], Stair[], Shaft[]
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
| geometry | geojson | K2 |
| ownershipType | enum | K1 (tekMalik · hisseli · katMulkiyeti · katIrtifaki) |
| ownerCount | int | K1 |
| encumbrances | json[] | K2 (şerh, ipotek, haciz, irtifak — tip + açıklama + engel mi) |
| hasExistingBuilding | bool | K1 |
| existingBuildingAge / floors / unitCount | int | K1 |
| existingTotalArea | decimal | K2 |
| demolitionRequired | bool | K1 |
| structuralAssessmentStatus | enum | K2 |

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
| heightReferenceMethod | enum | K2 (paketten) |
| roadFrontages | json[] | K2 (cephe no, yol adı, genişlik) |
| referenceLevel | decimal | K2 (kot) |
| cornerLevels | json[] | K3 (köşe kotları) |
| levelDataSource | enum | K2 (resmiKroki · demServisi · manuel) |
| **specialConstraints** | json[] | K2 |

**specialConstraints kontrol listesi** (paket tanımlı, kullanıcı işaretler):
koruma/sit alanı · mania kotu · askeri yasak bölge · orman sınırı · kıyı kenar çizgisi · afet riski (heyelan/taşkın/sıvılaşma) · kamulaştırma şerhi · yol genişletme · enerji nakil hattı · arkeolojik sondaj şartı · yeşil alan terki

> Sürprizler imar belgesinde değil plan notlarındadır. Bu liste bir kez kurulunca hiçbiri atlanmaz.

**Hesaplananlar:** maxFootprint · maxTotalFloorArea · buildableEnvelope · basementGainFromLevelDifference

### SoilData

| Alan | Tip | Kademe |
|---|---|---|
| reportFile | file | K3 |
| soilClass | text | K2 |
| bearingCapacity | decimal | K3 |
| groundwaterLevel | decimal (m) | K2 |
| liquefactionRisk | enum | K3 |
| foundationType | enum | K2 (radye · tekil · sürekli · kazikli) |
| pileRequired / pileCount / pileDepth / pileDiameter | — | K2–K3 |
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
| area | decimal (m²) | K2 | |
| width / length | decimal (m) | K2 | G2 seviyesi — **opsiyonel** (bkz. bölüm 1.5) |
| geometry | polygon | K3 | G3 seviyesi |
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
| Servis | (ayrı varlık — bkz. bölüm 6) |

**Mekandan doğan metraj:**

| Miktar | Formül |
|---|---|
| Zemin kaplama alanı | `area` |
| Şap alanı | `area` |
| Süpürgelik uzunluğu | `perimeter − kapı genişlikleri` |
| Duvar brüt yüzeyi | `perimeter × clearHeight` |
| Sıva/boya alanı | duvar brüt − açıklık alanları (kalem kuralına göre) |
| Duvar seramiği alanı | `perimeter × wallCladdingHeight` − açıklıklar |
| Tavan alanı | `area` |
| Kartonpiyer mtül | `perimeter` |
| Su yalıtımı alanı | `area + perimeter × 0,2` (dönüş payı) |
| Alçıpan alanı | tavan tipine göre `area` |

> **Kullanıcının sorduğu örnek:** "Bağımsız bölümde kaç m² banyo var" bilgisi tek başına yetmez. `area` yer seramiğini ve su yalıtımını verir; duvar seramiğini `perimeter × wallCladdingHeight` verir. Yani `perimeter` metrajın vazgeçilmez girdisidir — ama normal akışta onu **plan motoru** (G3) üretir, kullanıcı değil.
>
> **Düzeltme (sürüm 1.1):** Bu paragraf önceki sürümde "en × boy girişi (G2) zorunlu tutulmalı" diyordu ve bölüm 1.5 satır 66 ile çelişiyordu. Karara bağlandı: **G2 opsiyoneldir** (bkz. bölüm 13, madde 1). `width`/`length` nullable kalır; `perimeter` dolu olan en yüksek geometri seviyesinden türer.

### Opening (açıklık)

| Alan | Tip | Not |
|---|---|---|
| openingType | enum | pencere · kapi · balkonKapisi · vitrin · garajKapisi |
| spaceId | fk | hangi mekanda |
| adjacentSpaceId | fk | iç kapılarda karşı mekan |
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
| grossArea | decimal | H |
| netArea | decimal | H — mekan alanları toplamı |
| balconyArea | decimal | H |
| commonAreaShare | decimal | H |
| **wetAreaTotal** | decimal | H — ıslak mekan alanları toplamı |
| landShareRatio | decimal | K3 — arsa payı |
| assignedStakeholderId | fk | K3 — hangi hak sahibine |
| salePrice | decimal | K3 |

**UnitType (tipoloji şablonu):** Aynı tip birden çok kez tekrarlanır. Şablon mekan listesini taşır, örneklenince kopyalanır. Örnek: "3+1 A tipi" → salon 33,5 · mutfak 15,6 · oda 23 · oda 18 · oda 4 · banyo 6 · banyo 5 · hol 9 · balkon 5 = 119 m². Bu şablon 10 kez örneklenir.

### Floor

| Alan | Tip | Kademe |
|---|---|---|
| floorNo | int | K1 — bodrum negatif |
| floorType | enum | K1 — bodrum · zemin · normal · cekmeKat · catiArasi |
| isLocked | bool | K2 — tipik kat kilidi |
| templateFloorId | fk | K2 — kilitliyse referans |
| grossHeight / clearHeight | decimal | K1 |
| grossArea | decimal | H |
| hasCommercial | bool | K1 |

### Block

Çok bloklu projeler için. Tek bloklu projede otomatik tek blok oluşur, arayüzde görünmez.

---

## 6. Çekirdek

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
| runsThroughFloors | int[] |

---

## 7. Servis Mekanları

Bölge paketindeki eşiklerden zorunluluk türer; sistem checklist sunar, kullanıcı onaylar. Her biri bodrum planına sabit blok girer.

### ServiceSpace (ortak alanlar)

Temel alanlar: `serviceType` · `isMandatory` (H) · `area` · `width/length` · `clearHeight` · `location` (hangi kat) · `floorFinish` · `wallFinish` · `hasVentilation` · `hasDrainage` · `hasFireRating` · `doorType`

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

### ParkingSpace / Ramp

Park yeri: `width × length` (paket minimumu) · `isAccessible` · `isMechanical` · `assignedUnitId`

Rampa: `slope` (paket maksimumu) · `width` · `length` (H: kot farkı ÷ eğim) · `isCovered` · `hasHeating` · `shutterType` · `turningRadius`

> Rampa uzunluğu kot farkından türer ve bodrum alanının ciddi kısmını yer. En çok unutulan kalemdir.

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

### 10.1 Nesne → Kalem eşleme

`ObjectCostMapping` tablosu: `objectType` · `objectVariant` · `costItemCode` · `quantityFormula` · `conditions`

Örnek satırlar:

| Nesne | Varyant | Kalem | Formül |
|---|---|---|---|
| Space | zemin kaplama = seramik | Seramik yer döşemesi | `area` |
| Space | zemin kaplama = seramik | Seramik yapıştırıcı | `area × 0,2 torba` |
| Space | isWetArea = true | Su yalıtımı | `area + perimeter × 0,2` |
| Space | wallCladdingHeight > 0 | Duvar seramiği | `perimeter × wallCladdingHeight − açıklık` |
| Space | ceilingType = kartonpiyer | Kartonpiyer | `perimeter` |
| Opening | frameMaterial = pvc | PVC doğrama | `(2×(w+h)) × count` |
| Opening | glazingType = isicam | Isıcam | `w × h × count` |
| Wall | dış, yalıtımlı | Duvar bloğu + harç + sıva ×2 + yalıtım + boya | çoklu |
| Elevator | — | Asansör ünitesi + kuyu perdesi + yalıtım | çoklu |

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

### 10.3 Yapısal imalatlar — ampirik katsayı

`StructuralCoefficientSet`: `concreteVolumePerArea` (m³/m²) · `rebarWeightPerVolume` (kg/m³) · `formworkAreaPerVolume` (m²/m³) · `formworkLaborRate` · katsayılar kat adedine ve temel tipine göre ayrışır.

**Kalibrasyon referansı (incelenen örnek proje):** ~0,46 m³/m² beton · ~85 kg/m³ donatı · ~3,1 m² kalıp/m³ · kalıp işçiliği yapısal maliyetin ~%41'i.

### 10.4 QuantityLine

Her metraj satırı taşır: `costItemCode` · `description` · `quantity` · `unit` · `sourceObjectType` · `sourceObjectId` · `formula` · `isOverridden` · `overrideReason`

> **Şeffaflık ilkesi:** Her miktar hangi nesneden, hangi formülle çıktığını gösterir. Rapor bunu görünür kılar.

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
| `ZoningRuleSet` | emsal hesap yöntemi, yükseklik ölçüm referansı, emsal harici kurallar |
| `RequiredSpaceRule` | mekan tipi, tetikleyici (bağımsız bölüm sayısı / alan / güç / yükseklik), eşik, alan formülü |
| `ParkingRule` | ihtiyaç formülü, park yeri boyutları, rampa eğim sınırı, engelli oranı |
| `CoreRule` | asansör eşikleri, minimum kabin ölçüleri, merdiven genişlikleri, kaçış mesafeleri |
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
| `SpecialConstraintCatalog` | 11 maddelik özel kısıt kontrol listesinin tanımı | Bölüm 3 "paket tanımlı, kullanıcı işaretler" diyor ama listenin nerede durduğunu söylemiyor |
| `FacadeMaterialCatalog` | cephe malzeme tipleri ve varsayılan oranları | Bölüm 9'daki malzeme listesi bölgeye göre değişir |
| `SpaceTypeCategoryMap` | `spaceType` → `category` eşlemesi | `Space.category` hesaplanan alan ve tipten türer. **Varsayılan eşleme evrenseldir; bölge paketi yalnızca ezebilir.** |
| `ParametricLumpSumRule` | disiplin · sürücü değişken · formül · katsayı | Bölüm 13 madde 4 kapalı bir karar: elektrik ve mekanik metraj **parametrik götürü**, sabit tutar değil. Katsayılarının evi yoktu; İP-10 bunları kalibre edecek |

---

## 13. Açık Kararlar

1. **Mekan geometri seviyesi zorunluluğu** — ✅ *Karara bağlandı:* G2 (en × boy) **opsiyoneldir.** Plan motoru MVP'de olduğu için normal akışta gerçek geometri G3'ten gelir; G2 yalnızca plan üretilmeden hızlı maliyet istendiğinde veya üretilmiş bir mekanın boyutu elle ezilirken kullanılır. `width`/`length` nullable kalır. Bölüm 4'teki çelişkili paragraf düzeltildi.
2. **Çok bloklu proje MVP'de olsun mu?** — ✅ *Karara bağlandı:* veri modelinde var, arayüzde gizli. Tek bloklu projede otomatik tek blok oluşur (bkz. bölüm 5). `Core`, `Facade[]` ve `Roof` bu yüzden `Block` altındadır.
3. **UnitType şablonu ne kadar katı?** Örneklenen bir bağımsız bölüm şablondan ayrışabilsin mi? Öneri: evet, ayrışma işaretlensin. *(İP-4)*
   - **Alt karar, hâlâ açık:** `UnitType` proje kapsamlı mı, yoksa organizasyon seviyesinde tekrar kullanılabilir bir tipoloji kütüphanesi mi? İP-1'de proje kapsamlı varsayıldı.
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
