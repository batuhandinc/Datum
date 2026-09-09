/**
 * KURAL TİPİ SÖZLEŞMELERİ — değişken beyaz listesi, birim, sonuç kısıtı.
 *
 * Bunlar KODUN sözleşmesidir, yerel kural DEĞİLDİR: `requirementFormula` her
 * bölgede araç sayısı üretir, `areaFormula` her bölgede m² üretir. Yerel olan
 * formülün KENDİSİDİR ve o pakettedir. Bu yüzden burada durmaları ilke 1'i
 * ihlal etmez.
 *
 * Beyaz liste KURAL TİPİNE ÖZELDİR: otopark formülünün gördüğü değişkenlerle
 * alan formülününki aynı değildir. Ortak tek bir liste, `demandPowerKW`'yi
 * otopark formülüne de açardı — anlamsız ama sessizce geçerli bir formül.
 */

export type FormulaUnit = "vehicle" | "squareMeter" | "kilowatt";

export interface FormulaContract {
  /** Formülün okuyabileceği değişkenler. Dışındaki her ad hatadır. */
  readonly variables: readonly string[];
  /** Sonucun birimi. Rapor ve uyarı metni bunu kullanır. */
  readonly unit: FormulaUnit;
  /**
   * `integer` ise sonuç YUKARI yuvarlanır.
   *
   * Yuvarlama yönü bir karardır: bunlar İHTİYAÇ değerleridir, aşağı yuvarlamak
   * eksik tedarik üretir. Paket yazarı farklı bir yuvarlama istiyorsa formülün
   * içinde `round()` veya `floor()` yazar — o zaman dıştaki yukarı yuvarlama
   * etkisiz kalır.
   */
  readonly resultKind: "integer" | "real";
  /** Sonucun alt sınırı. Altına düşen sonuç hesaplanmamış sayılır + uyarı. */
  readonly minimum: number;
}

/** `ParkingRule.requirementFormula` — yönetmeliğin istediği otopark adedi. */
export const PARKING_REQUIREMENT: FormulaContract = {
  variables: ["unitCount", "totalFloorArea", "commercialArea", "residentialUnitCount"],
  unit: "vehicle",
  resultKind: "integer",
  minimum: 0,
};

/** `RequiredSpaceRule.areaFormula` — servis mekanının asgari alanı. */
export const SERVICE_SPACE_AREA: FormulaContract = {
  variables: [
    "unitCount",
    "totalFloorArea",
    "personCount",
    "demandPowerKW",
    "buildingHeight",
  ],
  unit: "squareMeter",
  resultKind: "real",
  minimum: 0,
};

/**
 * FORMÜL TAŞIYAN KOLONLAR.
 *
 * Yayım kapısı (`publishVersion`) bu listeyi gezerek sürümdeki her formülü
 * doğrular. Yeni bir formül kolonu eklenirse BURAYA da eklenmelidir; bir test
 * bunu kilitler, aksi halde doğrulanmayan bir formül sessizce yayımlanır.
 */
export const FORMULA_SLOTS = [
  {
    /** Prisma delegate adı — `VERSION_SCOPED_MODELS` ile aynı yazım. */
    model: "parkingRule",
    field: "requirementFormula",
    contract: PARKING_REQUIREMENT,
    /** Kolon nullable mı? Değilse boş formül de hatadır. */
    optional: false,
  },
  {
    model: "requiredSpaceRule",
    field: "areaFormula",
    contract: SERVICE_SPACE_AREA,
    optional: true,
  },
] as const;

export type FormulaSlot = (typeof FORMULA_SLOTS)[number];
