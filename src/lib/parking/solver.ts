import { evaluateFormula, validateFormula, PARKING_REQUIREMENT } from "@/lib/formula";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * OTOPARK KISIT ÇÖZÜCÜ — saf hesap.
 *
 * `etut-portali-proje-dokumani.md` §7.2'nin döngüsel bağımlılığı:
 *
 *   emsal → bağımsız bölüm sayısı → otopark ihtiyacı → bodrum kat sayısı
 *      ↑                                                        ↓
 *      └────── kazı hacmi + servis mekanları + maliyet ←────────┘
 *
 * SIRA SABİTTİR (kullanıcının açık talimatı): servis mekanları ÖNCE yerleşir,
 * kalan alan otoparka gider. Tersi yapılırsa hesap her seferinde çöker.
 *
 * İLKE: SİSTEM SENARYO ÜRETİR, KARAR VERMEZ. Senaryolar yan yana sunulur;
 * seçim kullanıcınındır ve bir EZMEdir (`basementFloorCountOverrideValue`).
 * Senaryolar SAKLANMAZ — her okumada yeniden üretilir (sürüm 1.3 kararı).
 *
 * SAYIM KATSAYIYA DAYANIR, geometrik paketlemeye değil: `spaceWidth × spaceLength`
 * park yerinin KENDİ alanıdır, gerçek verimi kolon kayıpları ve dönüş
 * yarıçapları belirler ve türetilen sayı sistematik olarak iyimser çıkar.
 * Otorite `ParkingRule.areaPerSpace`'tedir; İP-4'te gelecek geometrik yerleşim
 * onu DEĞİŞTİRMEZ, DOĞRULAR.
 */

/** `ParkingRule`'un çözücüyü ilgilendiren alanları. */
export interface ParkingRuleInput {
  readonly requirementFormula: string;
  readonly areaPerSpace: number | null;
  readonly accessibleAreaPerSpace: number | null;
  readonly bicycleAreaPerSpace: number | null;
  readonly accessibleRatio: number | null;
  readonly bicycleRatio: number | null;
  readonly maxRampSlope: number | null;
}

export interface ParkingSolverInput {
  /** Formülün okuduğu program ölçüleri. */
  readonly unitCount: number | null;
  readonly totalFloorArea: number | null;
  readonly commercialArea: number | null;
  readonly residentialUnitCount: number | null;

  /** Bir bodrum katının brüt alanı (zarfın plaka alanı). */
  readonly basementFloorArea: number | null;
  /** Zorunlu servis mekanlarının asgari alan toplamı. Bilinmiyorsa null. */
  readonly serviceSpaceArea: number | null;
  /** Çekirdeğin ayak izi — her bodrum katında yer kaplar. */
  readonly coreArea: number | null;
  /** Rampanın ayak izi. Yalnızca EN ÜST bodrum katından düşülür. */
  readonly rampFootprintArea: number | null;

  readonly rule: ParkingRuleInput | null;
  /** Kullanıcının hedefi (sihirbaz 1. soru). Karşılaştırmada gösterilir. */
  readonly targetCount: number | null;
  /** Kaç bodrum katına kadar senaryo üretilsin (algoritmik korkuluk). */
  readonly maxBasementFloors?: number;
}

export interface ParkingScenario {
  readonly basementFloorCount: number;
  /** Servis, çekirdek ve rampa düşüldükten sonra kalan alan (m²). */
  readonly usableArea: number;
  readonly plannedCount: number;
  readonly accessibleSpaceCount: number;
  readonly bicycleSpaceCount: number;
  /** `requiredCount − plannedCount`. Negatifse fazla var. */
  readonly deficitCount: number;
  readonly meetsRequirement: boolean;
}

export interface ParkingSolverOutput {
  readonly requiredCount: number | null;
  readonly targetCount: number | null;
  readonly scenarios: readonly ParkingScenario[];
  readonly warnings: readonly Warning[];
}

/**
 * Yakınsama korkuluğu.
 *
 * ALGORİTMİK bir sınırdır, yerel kural değil: yönetmelik "en fazla kaç bodrum"
 * demiyor, biz sonsuz döngüye girmemek için duruyoruz. Sınıra çarpılırsa
 * uyarı üretilir ve kullanıcı ihtiyacın karşılanmadığını görür.
 */
const DEFAULT_MAX_BASEMENT_FLOORS = 8;

export function computeParkingScenarios(input: ParkingSolverInput): ParkingSolverOutput {
  const w = new WarningCollector();

  if (!input.rule) {
    w.addOnce("PARKING_RULE_MISSING", { count: 0 });
    return { requiredCount: null, targetCount: input.targetCount, scenarios: [], warnings: w.all };
  }
  const rule = input.rule;

  // --- 1. İhtiyaç: paket formülünden ---
  let requiredCount: number | null = null;
  const parsed = validateFormula(rule.requirementFormula, PARKING_REQUIREMENT);
  if (!parsed.ok) {
    w.add("PARKING_FORMULA_INVALID", { code: parsed.error.code });
  } else {
    const evaluated = evaluateFormula(parsed.ast, PARKING_REQUIREMENT, {
      unitCount: input.unitCount,
      totalFloorArea: input.totalFloorArea,
      commercialArea: input.commercialArea,
      residentialUnitCount: input.residentialUnitCount,
    });
    requiredCount = evaluated.value;
    w.merge(evaluated.warnings);
  }

  // --- 2. Arz: katsayı olmadan sayım YAPILMAZ (ilke 1) ---
  if (rule.areaPerSpace === null || rule.areaPerSpace <= 0) {
    w.addOnce("PARKING_AREA_PER_SPACE_MISSING");
    return { requiredCount, targetCount: input.targetCount, scenarios: [], warnings: w.all };
  }

  if (input.basementFloorArea === null || input.basementFloorArea <= 0) {
    w.addOnce("PARKING_BASEMENT_AREA_MISSING");
    return { requiredCount, targetCount: input.targetCount, scenarios: [], warnings: w.all };
  }

  if (input.serviceSpaceArea === null) {
    // Servis mekanı alanı bilinmiyorsa 0 saymak havuzu ŞİŞİRİR ve senaryoyu
    // iyimser yapar. Hesaplamamak dürüst olandır.
    w.addOnce("PARKING_SERVICE_AREA_UNKNOWN");
    return { requiredCount, targetCount: input.targetCount, scenarios: [], warnings: w.all };
  }

  const maxFloors = input.maxBasementFloors ?? DEFAULT_MAX_BASEMENT_FLOORS;
  const scenarios: ParkingScenario[] = [];

  for (let floors = 1; floors <= maxFloors; floors++) {
    const gross = input.basementFloorArea * floors;

    // SIRA: servis mekanları ÖNCE düşülür, kalan alan otoparka gider.
    // Çekirdek her katta yer kaplar; rampa yalnızca bir kez (giriş katında).
    const usable =
      gross -
      input.serviceSpaceArea -
      (input.coreArea ?? 0) * floors -
      (input.rampFootprintArea ?? 0);

    if (usable <= 0) continue;

    // Engelli ve bisiklet AYNI havuzdan ama KENDİ katsayılarıyla düşülür.
    const accessibleTarget =
      requiredCount !== null && rule.accessibleRatio !== null
        ? Math.ceil(requiredCount * rule.accessibleRatio)
        : 0;
    const bicycleTarget =
      requiredCount !== null && rule.bicycleRatio !== null
        ? Math.ceil(requiredCount * rule.bicycleRatio)
        : 0;

    const accessibleArea = accessibleTarget * (rule.accessibleAreaPerSpace ?? rule.areaPerSpace);
    const bicycleArea = bicycleTarget * (rule.bicycleAreaPerSpace ?? 0);

    const remaining = usable - accessibleArea - bicycleArea;
    const normalCount = remaining > 0 ? Math.floor(remaining / rule.areaPerSpace) : 0;

    // Engelli park yerleri de otopark sayısına dahildir.
    const plannedCount = normalCount + accessibleTarget;

    scenarios.push({
      basementFloorCount: floors,
      usableArea: round(usable, 2),
      plannedCount,
      accessibleSpaceCount: accessibleTarget,
      bicycleSpaceCount: bicycleTarget,
      deficitCount: requiredCount === null ? 0 : requiredCount - plannedCount,
      meetsRequirement: requiredCount !== null && plannedCount >= requiredCount,
    });

    if (requiredCount !== null && plannedCount >= requiredCount) break;
  }

  if (scenarios.length === 0) {
    w.addOnce("PARKING_NO_SCENARIO");
  } else if (requiredCount !== null && !scenarios[scenarios.length - 1]!.meetsRequirement) {
    // Korkuluğa çarptık: ihtiyaç hiçbir senaryoda karşılanmadı.
    w.add("PARKING_LIMIT_REACHED", { floors: maxFloors });
  }

  return { requiredCount, targetCount: input.targetCount, scenarios, warnings: w.all };
}

/**
 * RAMPA.
 *
 * `length = kot farkı ÷ eğim sınırı`. "Kot farkı" bodrum DERİNLİĞİDİR: rampa
 * zeminden en alt bodruma iner (etut-veri-modeli.md §8, sürüm 1.3).
 * `SiteData.topographyLevelDifference` rampanın giriş kotunu etkiler ama
 * boyunu belirlemez.
 */
export interface RampInput {
  readonly basementFloorCount: number | null;
  readonly basementFloorHeight: number | null;
  readonly maxRampSlope: number | null;
  readonly width: number | null;
}

export interface RampOutput {
  readonly length: number | null;
  readonly footprintArea: number | null;
  readonly warnings: readonly Warning[];
}

export function computeRamp(input: RampInput): RampOutput {
  const w = new WarningCollector();

  if (input.maxRampSlope === null || input.maxRampSlope <= 0) {
    w.addOnce("RAMP_SLOPE_MISSING");
    return { length: null, footprintArea: null, warnings: w.all };
  }
  if (input.basementFloorCount === null || input.basementFloorHeight === null) {
    w.addOnce("RAMP_DEPTH_MISSING");
    return { length: null, footprintArea: null, warnings: w.all };
  }

  const drop = input.basementFloorCount * input.basementFloorHeight;
  const length = round(drop / input.maxRampSlope, 3);

  // Genişlik yoksa uzunluk yine hesaplanır; ayak izi hesaplanamaz.
  const footprintArea = input.width === null ? null : round(length * input.width, 3);
  if (input.width === null) w.addOnce("RAMP_WIDTH_MISSING");

  return { length, footprintArea, warnings: w.all };
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
