import { evaluateFormula, validateFormula, SERVICE_SPACE_AREA } from "@/lib/formula";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * SERVİS MEKANI MOTORU — saf hesap.
 *
 * `etut-portali-proje-dokumani.md` §7.1'in sırası, kullanıcının açık talimatı:
 *
 *   eşik hesabı → checklist → onay → bodrum planına blok → KALAN ALAN OTOPARKA
 *
 * Bu dosya ilk adımı yapar: paket eşiklerinden hangi mekanların ZORUNLU
 * olduğunu ve her birinin ASGARİ ALANINI hesaplar. Onay ve yerleşim üst
 * katmanların işidir.
 *
 * ONAY DURUMU İÇİN ALAN AÇILMAZ: satırın varlığı programa dahil olmak
 * demektir (etut-veri-modeli.md §7, sürüm 1.3). Bu motor yalnızca checklist'i
 * ÜRETİR; hangi satırın yaratılacağına kullanıcı karar verir.
 */

/**
 * Tetikleyici türleri — dokümanın saydığı dört sürücü
 * ("bağımsız bölüm sayısı / alan / güç / yükseklik", §12.2).
 *
 * Kod her birini ayrı ayrı UYGULAR (hangi sürücüyle karşılaştıracağını seçer),
 * dolayısıyla kapalı bir kümedir (§15.1). Paketten tanımadığımız bir tetikleyici
 * gelirse zorunluluk HESAPLANMAZ + uyarı — sessizce "zorunlu değil" saymak
 * yönetmelik gereğini kaybettirirdi.
 */
export const TRIGGER_TYPES = [
  "unitCount",
  "totalFloorArea",
  "demandPowerKW",
  "buildingHeight",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

/** `UtilityCoefficientSet`'in bu motoru ilgilendiren katsayıları. */
export interface UtilityCoefficients {
  readonly demandPowerPerUnit: number | null;
  readonly demandPowerPerCommonArea: number | null;
  readonly personsPerUnit: number | null;
}

/** Paketten gelen tek bir zorunlu mekan kuralı. */
export interface RequiredSpaceRuleInput {
  readonly ruleKey: string;
  readonly serviceSpaceType: string;
  readonly triggerType: string;
  readonly threshold: number;
  readonly areaFormula: string | null;
}

export interface ServiceSpaceInput {
  /** Program girdileri. */
  readonly unitCount: number | null;
  readonly totalFloorArea: number | null;
  readonly buildingHeight: number | null;
  readonly commonArea: number | null;
  readonly rules: readonly RequiredSpaceRuleInput[];
  readonly coefficients: UtilityCoefficients | null;
}

/** Formüllerin ve eşiklerin okuduğu türetilmiş ölçüler. */
export interface ServiceDrivers {
  readonly unitCount: number | null;
  readonly totalFloorArea: number | null;
  readonly buildingHeight: number | null;
  readonly personCount: number | null;
  readonly demandPowerKW: number | null;
}

export interface ServiceSpaceRequirement {
  readonly ruleKey: string;
  readonly serviceSpaceType: string;
  /** Eşik sağlandı mı? Değerlendirilemediyse null. */
  readonly isMandatory: boolean | null;
  /** `areaFormula`'nın sonucu (m²). Formül yoksa veya hesaplanamadıysa null. */
  readonly requiredArea: number | null;
  readonly triggerType: string;
  readonly threshold: number;
  /** Eşikle karşılaştırılan değer — raporda "neden zorunlu" sorusunu yanıtlar. */
  readonly driverValue: number | null;
}

export interface ServiceSpaceOutput {
  readonly drivers: ServiceDrivers;
  readonly requirements: readonly ServiceSpaceRequirement[];
  /** Zorunlu mekanların asgari alan toplamı — otopark havuzundan düşülür. */
  readonly mandatoryAreaTotal: number | null;
  readonly warnings: readonly Warning[];
}

/**
 * Türetilmiş sürücüler.
 *
 * `personCount` ve `demandPowerKW` doğrudan girilmez; paket katsayılarından
 * TÜRER (`UtilityCoefficientSet` — doküman §12.3 bunu "bölüm 7'deki servis
 * mekanı formüllerinin 'paket katsayısı' dediği ama tanımlamadığı değerler"
 * diye tarif ediyor). Katsayı yoksa sürücü null kalır ve onu okuyan formül
 * hesaplanmaz.
 */
export function deriveDrivers(input: ServiceSpaceInput): ServiceDrivers {
  const c = input.coefficients;
  const units = input.unitCount;

  const personCount =
    c?.personsPerUnit != null && units != null ? units * c.personsPerUnit : null;

  let demandPowerKW: number | null = null;
  if (c?.demandPowerPerUnit != null && units != null) {
    demandPowerKW = units * c.demandPowerPerUnit;
    if (c.demandPowerPerCommonArea != null && input.commonArea != null) {
      demandPowerKW += input.commonArea * c.demandPowerPerCommonArea;
    }
  }

  return {
    unitCount: units,
    totalFloorArea: input.totalFloorArea,
    buildingHeight: input.buildingHeight,
    personCount,
    demandPowerKW,
  };
}

/**
 * Sürücüleri formül bağlamına çevirir.
 *
 * `ServiceDrivers` bilerek indeks imzasız bir arayüz: alan adları
 * `SERVICE_SPACE_AREA.variables` beyaz listesiyle birebir eşleşmeli ve yeni
 * bir sürücü eklendiğinde derleyici burayı göstermeli.
 */
function toContext(d: ServiceDrivers): Record<string, number | null> {
  return {
    unitCount: d.unitCount,
    totalFloorArea: d.totalFloorArea,
    personCount: d.personCount,
    demandPowerKW: d.demandPowerKW,
    buildingHeight: d.buildingHeight,
  };
}

function driverValue(drivers: ServiceDrivers, trigger: TriggerType): number | null {
  switch (trigger) {
    case "unitCount":
      return drivers.unitCount;
    case "totalFloorArea":
      return drivers.totalFloorArea;
    case "demandPowerKW":
      return drivers.demandPowerKW;
    case "buildingHeight":
      return drivers.buildingHeight;
  }
}

export function computeServiceSpaces(input: ServiceSpaceInput): ServiceSpaceOutput {
  const w = new WarningCollector();
  const drivers = deriveDrivers(input);

  if (input.coefficients === null) w.addOnce("UTILITY_COEFFICIENTS_MISSING", { count: 0 });
  if (input.rules.length === 0) w.addOnce("REQUIRED_SPACE_RULES_EMPTY");

  const requirements: ServiceSpaceRequirement[] = [];
  let mandatoryTotal = 0;
  let anyMandatoryAreaMissing = false;

  for (const rule of input.rules) {
    const isKnownTrigger = (TRIGGER_TYPES as readonly string[]).includes(rule.triggerType);

    if (!isKnownTrigger) {
      // Sessizce "zorunlu değil" saymak yönetmelik gereğini kaybettirirdi.
      w.add("SERVICE_TRIGGER_UNKNOWN", {
        ruleKey: rule.ruleKey,
        triggerType: rule.triggerType,
      });
      requirements.push({
        ruleKey: rule.ruleKey,
        serviceSpaceType: rule.serviceSpaceType,
        isMandatory: null,
        requiredArea: null,
        triggerType: rule.triggerType,
        threshold: rule.threshold,
        driverValue: null,
      });
      continue;
    }

    const value = driverValue(drivers, rule.triggerType as TriggerType);
    const isMandatory = value === null ? null : value >= rule.threshold;

    if (value === null) {
      w.add("SERVICE_DRIVER_MISSING", {
        ruleKey: rule.ruleKey,
        triggerType: rule.triggerType,
      });
    }

    // Alan formülü: yayım kapısından geçmiş olmalı. Yine de doğrulanıyor —
    // bu fonksiyon fixture ve test verisiyle de çağrılabiliyor.
    let requiredArea: number | null = null;
    if (rule.areaFormula) {
      const parsed = validateFormula(rule.areaFormula, SERVICE_SPACE_AREA);
      if (!parsed.ok) {
        w.add("SERVICE_AREA_FORMULA_INVALID", {
          ruleKey: rule.ruleKey,
          code: parsed.error.code,
        });
      } else {
        const evaluated = evaluateFormula(parsed.ast, SERVICE_SPACE_AREA, toContext(drivers));
        requiredArea = evaluated.value;
        w.merge(evaluated.warnings);
      }
    }

    if (isMandatory === true) {
      if (requiredArea === null) anyMandatoryAreaMissing = true;
      else mandatoryTotal += requiredArea;
    }

    requirements.push({
      ruleKey: rule.ruleKey,
      serviceSpaceType: rule.serviceSpaceType,
      isMandatory,
      requiredArea,
      triggerType: rule.triggerType,
      threshold: rule.threshold,
      driverValue: value,
    });
  }

  const hasMandatory = requirements.some((r) => r.isMandatory === true);

  return {
    drivers,
    requirements,
    // Bir zorunlu mekanın alanı bilinmiyorsa TOPLAM DA bilinmiyordur.
    // Eksik olanı 0 saymak otopark havuzunu şişirirdi.
    mandatoryAreaTotal: !hasMandatory ? 0 : anyMandatoryAreaMissing ? null : round(mandatoryTotal, 3),
    warnings: w.all,
  };
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
