import { z } from "zod";

/**
 * İMAR JSON ALANLARININ ŞEKİLLERİ — veri modeli bölüm 3 (sürüm 1.2).
 *
 * Bu iki alan Json'dur ama ŞEKİLLERİ tanımlıdır; L0 doğrudan onlara dayanır.
 * Şekli zod ile sabitlemek, "birebir aynı alan adı" kuralının Json içine de
 * uzanmasını sağlar.
 */

/**
 * `ZoningData.roadFrontages`
 *
 * L0 ötelemesinin DOĞRUDAN girdisi: `setbackFront/Side/Rear` üç AYRI değerdir
 * ve hangi poligon kenarının hangi rolü taşıdığını söyleyen TEK yer burasıdır.
 * Doküman "cephe no" diyordu; 1.2'de bunun kenar indeksi olduğu sabitlendi.
 */
export const edgeRoleSchema = z.enum(["front", "side", "rear"]);

export const roadFrontageSchema = z.object({
  /** Dış halkadaki kenar indeksi: i. kenar = coordinates[0][i] → [i+1]. */
  edgeIndex: z.number().int().nonnegative(),
  role: edgeRoleSchema,
  roadName: z.string().optional(),
  /** Yol genişliği (m) — çekme mesafesini etkileyebilir, İP-3. */
  width: z.number().positive().optional(),
});

export const roadFrontagesSchema = z.array(roadFrontageSchema);

export type RoadFrontage = z.infer<typeof roadFrontageSchema>;
export type EdgeRole = z.infer<typeof edgeRoleSchema>;

/**
 * `ZoningData.specialConstraints`
 *
 * Kullanıcının işareti VE değeri. Katalog (paket verisi) etkinin ŞEKLİNİ
 * bildirir (`effectTarget`, `effectKind`); DEĞER parsele özeldir çünkü
 * "mania kotu" bu parselde 47,50 m'dir, başka parselde başka.
 */
export const specialConstraintSchema = z.object({
  /** `SpecialConstraintCatalog.ruleKey`'e mantıksal referans. */
  ruleKey: z.string().min(1),
  isChecked: z.boolean(),
  /** Kısıtın bu parseldeki sayısal değeri (mania kotu, terk oranı…). */
  value: z.number().finite().optional(),
  note: z.string().optional(),
});

export const specialConstraintsSchema = z.array(specialConstraintSchema);

export type SpecialConstraintValue = z.infer<typeof specialConstraintSchema>;

// ---------------------------------------------------------------- okuyucular

/** Bozuk veya eksik Json güvenle boş listeye düşer — kayıt engellenmez (ilke 7). */
export function parseRoadFrontages(value: unknown): RoadFrontage[] {
  if (value === null || value === undefined) return [];
  const parsed = roadFrontagesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseSpecialConstraints(value: unknown): SpecialConstraintValue[] {
  if (value === null || value === undefined) return [];
  const parsed = specialConstraintsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
