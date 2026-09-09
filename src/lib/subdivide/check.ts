import { aspectRatio, polygonArea, type LocalPolygon } from "@/lib/geometry";
import { WarningCollector, type Warning } from "@/lib/warnings";
import { contactLength, outerSegments, touches, type Segment } from "./boundary";
import { areaQuantizationBound, asMultiPolygon } from "./kernel";

/**
 * BÖLÜMLEME DOĞRULAYICISI — manuel ve otomatik modun ORTAK kapısı.
 *
 * SAF: Prisma/Next yok.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BU DOSYA "MANUEL ≡ OTOMATİK" GARANTİSİNİN İKİNCİ KATMANIDIR.
 *
 * Otomatik çözücü kendi çıktısını da buradan geçirir. Böylece iki mod aynı
 * ölçümleri, aynı sırayla, aynı eşiklere karşı alır; "otomatikte kontrol
 * ediliyor ama manuelde unutulmuş" diye bir durum YAPISAL olarak imkânsız
 * olur. (Birinci katman tek yazma yolu, üçüncüsü hesaplanan alan dörtlüsü.)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ÜÇ DURUMLU TANI — bu paketin en önemli ayrımı:
 *
 *   `saglandi`            ölçüldü, eşiğe uyuyor
 *   `ihlal`               ölçüldü, uymuyor
 *   `degerlendirilemedi`  ölçülemedi VEYA eşik yok
 *
 * EKSİK KURAL "SAĞLANDI" DEMEK DEĞİLDİR. Boolean bir sonuç, paketi boş bir
 * projede her kısıtı yeşil gösterirdi — sistemdeki en pahalı hata biçimi.
 *
 * KURALSIZ BİLİNEN OLGU İLE EŞİK GEREKTİREN HÜKÜM AYRIDIR. "Bu birim
 * çekirdeğe değiyor mu" ve "cepheye değiyor mu" saf TOPOLOJİDİR: paket satırı
 * gerektirmez ve paket boşken bile `ihlal` üretebilir. "Yeterince mi değiyor"
 * bir HÜKÜMDÜR ve eşik ister. İkisini birlikte kurala bağlamak, kapısız ve
 * penceresiz bir daireyi `violations: []` ile teslim etmek olurdu.
 */

export type CheckState = "saglandi" | "ihlal" | "degerlendirilemedi";

export type ConstraintKind =
  /** Çekirdeğe veya sirkülasyona temas — KURALSIZ olgu. */
  | "coreAccess"
  /** Cepheye temas — KURALSIZ olgu. */
  | "facade"
  /** Cephe uzunluğu ≥ paket asgarisi — HÜKÜM. */
  | "facadeLength"
  /** Alan sapması ≤ paket toleransı — HÜKÜM. */
  | "areaTolerance"
  /** En-boy oranı ≤ paket sınırı — HÜKÜM. */
  | "aspectRatio";

export interface ConstraintCheck {
  readonly constraint: ConstraintKind;
  readonly state: CheckState;
  /** Ölçülen değer; ölçülemediyse null. */
  readonly measured: number | null;
  /** Paket eşiği; kural yoksa null. */
  readonly limit: number | null;
}

export interface UnitDiagnostic {
  readonly unitId: string;
  readonly unitNo: string | null;
  /** NET hedef (mekan alanları toplamı). */
  readonly targetArea: number | null;
  /** BRÜT hedef = net × grossToNetFactor. Katsayı yoksa null. */
  readonly grossTarget: number | null;
  /** Gerçekleşen brüt alan; yerleşmediyse null. */
  readonly achievedArea: number | null;
  readonly placed: boolean;
  readonly checks: readonly ConstraintCheck[];
}

export interface SubdivisionUnit {
  readonly unitId: string;
  readonly unitNo: string | null;
  /**
   * NET hedef alan — `Σ Unit.spaces.area`.
   *
   * NULLABLE OLMAK ZORUNDA. "Hedef bilinmiyor" ifade edilemezse dört ayrı
   * yoldan sıfıra çöker: birimin `unitTypeCode`'u gevşek bir metin referansı
   * ve eşleşmeyebilir, şablonun Json'u bozuksa sessizce boş listeye düşer,
   * `spaceList` boş olabilir, `Space.area` nullable'dır. Sıfır sayılan bir
   * hedef, DİĞER birimlerin payını orantısız büyütür.
   */
  readonly targetArea: number | null;
  /** Birime düşen poligon; null = yerleşmedi. */
  readonly geometry: LocalPolygon | null;
}

/** `UnitLayoutRule`'un okunmuş hâli — hepsi nullable, hiçbiri kodda varsayılana düşmez. */
export interface UnitLayoutRuleInput {
  readonly grossToNetFactor: number | null;
  readonly areaTolerance: number | null;
  readonly minUnitFacadeLength: number | null;
  readonly maxUnitAspectRatio: number | null;
}

export interface SubdivisionInput {
  readonly plate: LocalPolygon | null;
  readonly core: LocalPolygon | null;
  /** Sirkülasyon poligonları (kat holü, koridor). */
  readonly circulation: readonly LocalPolygon[];
  /**
   * CEPHE olarak SINIFLANDIRILMIŞ kenarlar.
   *
   * Halka DEĞİL, alt küme: `bitisik`/`blok` nizamda komşu duvarı cephe
   * değildir. Plakanın halkasının tamamı verilseydi penceresiz bir birim
   * cephe denetiminden sessizce geçerdi.
   */
  readonly facade: readonly Segment[];
  readonly units: readonly SubdivisionUnit[];
  readonly rule: UnitLayoutRuleInput | null;
}

export interface SubdivisionReport {
  readonly units: readonly UnitDiagnostic[];
  /** Hiçbir birime verilemeyen alan (m²); plaka yoksa null. */
  readonly residualArea: number | null;
  /** Birimlerin plakayı kaplama oranı; plaka yoksa null. */
  readonly coverageRatio: number | null;
  readonly warnings: readonly Warning[];
}

const round = (v: number, digits = 2): number => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/** Erişim kaynakları: çekirdek + sirkülasyon. Birim bunlardan birine değmeli. */
function accessSegments(input: SubdivisionInput): Segment[] {
  const out: Segment[] = [];
  if (input.core) out.push(...outerSegments(input.core));
  for (const c of input.circulation) out.push(...outerSegments(c));
  return out;
}

/**
 * Plakanın dış halkasından CEPHE kenarlarını süzer.
 *
 * `partyEdgeIndices` komşu parsele bakan (ortak duvar olacak) kenarların
 * indeksleridir; `bitisik`/`blok` nizamda çekme mesafesi sıfır olan kenarlar
 * buraya girer. Boş verilirse tüm dış halka cephedir.
 */
export function facadeSegments(
  plate: LocalPolygon,
  partyEdgeIndices: readonly number[] = [],
): Segment[] {
  const party = new Set(partyEdgeIndices);
  return outerSegments(plate).filter((_, i) => !party.has(i));
}

/**
 * Bölümlemeyi doğrular ve BİRİM BAŞINA tanı satırı üretir.
 *
 * ENGELLEMEZ (ilke 7): hiçbir ihlal sonucu geçersiz kılmaz. Kullanıcı bilinçli
 * olarak kural dışına çıkabilir; sistemin işi ölçüp göstermektir.
 */
export function checkSubdivision(input: SubdivisionInput): SubdivisionReport {
  const w = new WarningCollector();
  const access = accessSegments(input);
  const rule = input.rule;

  if (rule === null) w.addOnce("UNIT_LAYOUT_RULE_MISSING", { count: 0 });
  if (rule !== null && rule.grossToNetFactor === null) w.addOnce("L2_GROSS_TO_NET_MISSING");

  const label = (u: SubdivisionUnit): string => u.unitNo ?? u.unitId;

  const units: UnitDiagnostic[] = input.units.map((u) => {
    const grossTarget =
      u.targetArea !== null && rule?.grossToNetFactor != null
        ? u.targetArea * rule.grossToNetFactor
        : null;

    if (u.targetArea === null) w.add("L2_UNIT_TARGET_UNKNOWN", { unitNo: label(u) });

    if (u.geometry === null) {
      w.add("L2_UNIT_UNPLACED", { unitNo: label(u) });
      // Yerleşmemiş birim de SATIRINI KORUR — boş ekran yok, sessiz kayıp yok.
      return {
        unitId: u.unitId,
        unitNo: u.unitNo,
        targetArea: u.targetArea,
        grossTarget,
        achievedArea: null,
        placed: false,
        checks: (
          ["coreAccess", "facade", "facadeLength", "areaTolerance", "aspectRatio"] as const
        ).map((constraint) => ({
          constraint,
          state: "degerlendirilemedi" as const,
          measured: null,
          limit: null,
        })),
      };
    }

    const achievedArea = polygonArea(u.geometry);
    const checks: ConstraintCheck[] = [];

    // ---- 1. Çekirdek/sirkülasyon teması — KURALSIZ olgu ----
    const hasAccess = access.length > 0 ? touches(u.geometry, access) : null;
    if (hasAccess === false) w.add("L2_UNIT_NO_CORE_ACCESS", { unitNo: label(u) });
    checks.push({
      constraint: "coreAccess",
      // Erişim kaynağı hiç yoksa (çekirdek üretilememiş) ölçüm yapılamaz.
      state: hasAccess === null ? "degerlendirilemedi" : hasAccess ? "saglandi" : "ihlal",
      measured: hasAccess === null ? null : round(contactLength(u.geometry, access)),
      limit: null,
    });

    // ---- 2. Cephe teması — KURALSIZ olgu ----
    const facadeContact =
      input.facade.length > 0 ? contactLength(u.geometry, input.facade) : null;
    if (facadeContact === 0) w.add("L2_UNIT_NO_FACADE", { unitNo: label(u) });
    checks.push({
      constraint: "facade",
      state:
        facadeContact === null ? "degerlendirilemedi" : facadeContact > 0 ? "saglandi" : "ihlal",
      measured: facadeContact === null ? null : round(facadeContact),
      limit: null,
    });

    // ---- 3. Cephe uzunluğu — HÜKÜM, eşik ister ----
    const minFacade = rule?.minUnitFacadeLength ?? null;
    if (facadeContact !== null && minFacade !== null) {
      const ok = facadeContact >= minFacade;
      if (!ok) {
        w.add("L2_UNIT_FACADE_SHORT", {
          unitNo: label(u),
          measured: round(facadeContact),
          limit: minFacade,
        });
      }
      checks.push({
        constraint: "facadeLength",
        state: ok ? "saglandi" : "ihlal",
        measured: round(facadeContact),
        limit: minFacade,
      });
    } else {
      checks.push({
        constraint: "facadeLength",
        state: "degerlendirilemedi",
        measured: facadeContact === null ? null : round(facadeContact),
        limit: minFacade,
      });
    }

    // ---- 4. Alan sapması — HÜKÜM, hem hedef hem tolerans ister ----
    const tolerance = rule?.areaTolerance ?? null;
    if (grossTarget !== null && grossTarget > 0 && tolerance !== null) {
      const rawDeviation = Math.abs(achievedArea - grossTarget);
      // KUANTALAMA SINIRININ ALTINDAKİ SAPMA GERÇEK DEĞİLDİR. Yok sayılmazsa
      // eğik her plakada her birim sahte bir "hedef tutmadı" uyarısı üretir
      // ve gerçek sapma gürültünün içinde kaybolur.
      const noise = areaQuantizationBound(asMultiPolygon(u.geometry));
      const deviation = rawDeviation <= noise ? 0 : rawDeviation;
      const ratio = deviation / grossTarget;
      const ok = ratio <= tolerance;
      if (!ok) {
        w.add("L2_UNIT_AREA_OFF_TARGET", {
          unitNo: label(u),
          achieved: round(achievedArea),
          target: round(grossTarget),
          deviation: round(ratio * 100, 1),
        });
      }
      checks.push({
        constraint: "areaTolerance",
        state: ok ? "saglandi" : "ihlal",
        measured: round(ratio, 4),
        limit: tolerance,
      });
    } else {
      checks.push({
        constraint: "areaTolerance",
        state: "degerlendirilemedi",
        measured: null,
        limit: tolerance,
      });
    }

    // ---- 5. En-boy oranı — HÜKÜM, eşik ister ----
    const ratio = aspectRatio(u.geometry);
    const maxRatio = rule?.maxUnitAspectRatio ?? null;
    if (ratio !== null && maxRatio !== null) {
      const ok = ratio <= maxRatio;
      if (!ok) {
        w.add("L2_UNIT_ASPECT_RATIO", {
          unitNo: label(u),
          measured: round(ratio),
          limit: maxRatio,
        });
      }
      checks.push({
        constraint: "aspectRatio",
        state: ok ? "saglandi" : "ihlal",
        measured: round(ratio),
        limit: maxRatio,
      });
    } else {
      checks.push({
        constraint: "aspectRatio",
        state: "degerlendirilemedi",
        measured: ratio === null ? null : round(ratio),
        limit: maxRatio,
      });
    }

    return {
      unitId: u.unitId,
      unitNo: u.unitNo,
      targetArea: u.targetArea,
      grossTarget,
      achievedArea: round(achievedArea, 3),
      placed: true,
      checks,
    };
  });

  // ---- Kaplama ve artık ----
  let residualArea: number | null = null;
  let coverageRatio: number | null = null;
  if (input.plate) {
    const plateArea = polygonArea(input.plate);
    const coreArea = input.core ? polygonArea(input.core) : 0;
    const circulationArea = input.circulation.reduce((s, c) => s + polygonArea(c), 0);
    const unitArea = units.reduce((s, u) => s + (u.achievedArea ?? 0), 0);
    const raw = plateArea - coreArea - circulationArea - unitArea;
    // Kuantalama gürültüsü artık sayılmasın.
    const noise = areaQuantizationBound(asMultiPolygon(input.plate));
    residualArea = Math.abs(raw) <= noise ? 0 : round(raw, 3);
    coverageRatio = plateArea > 0 ? round(unitArea / plateArea, 4) : null;
    // Birim yoksa "hiçbir birime verilemedi" demek gürültüdür: verilecek birim
    // henüz tanımlanmamıştır. Artık DEĞERİ yine hesaplanır ve raporlanır.
    if (residualArea > 0 && input.units.length > 0) {
      w.add("L2_RESIDUAL_AREA", { area: residualArea });
    }
  }

  // "Program plakadan X m² büyük" NİCEL bir iddiadır ve bilinmeyen bir
  // miktarla kurulamaz: brüt/net katsayısı yoksa hiçbir birimin brüt hedefi
  // bilinmez ve toplam 0 çıkar — "0 m² büyük" diye anlamsız bir cümle doğardı.
  // Yerleşmeyen birimlerin kendi satırları (`L2_UNIT_UNPLACED`) bilgiyi zaten
  // taşıyor; nicel özet yalnızca ölçülebiliyorsa verilir.
  const unplacedWithTarget = units.filter((u) => !u.placed && u.grossTarget !== null);
  if (unplacedWithTarget.length > 0 && input.plate) {
    const shortfall = unplacedWithTarget.reduce((s, u) => s + (u.grossTarget ?? 0), 0);
    w.addOnce("L2_PROGRAM_EXCEEDS_PLATE", {
      shortfall: round(shortfall),
      count: unplacedWithTarget.length,
    });
  }

  return { units, residualArea, coverageRatio, warnings: w.all };
}
