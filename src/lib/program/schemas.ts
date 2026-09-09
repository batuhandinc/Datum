import { z } from "zod";

/**
 * A5 PROGRAM — Json şekil sözleşmeleri.
 *
 * `etut-veri-modeli.md` §5 `UnitType`: "Şablon mekan listesini taşır,
 * örneklenince kopyalanır. Örnek: '3+1 A tipi' → salon 33,5 · mutfak 15,6 ·
 * oda 23 · oda 18 · oda 4 · banyo 6 · banyo 5 · hol 9 · balkon 5 = 119 m².
 * Bu şablon 10 kez örneklenir."
 *
 * SEVİYE G1 (§1.5): şablon yalnızca HEDEF ALAN taşır. Çevre `çevre ≈ k × √alan`
 * ile `SpaceShapeFactorRule`'dan türer; gerçek geometri plan motorundan (İP-4)
 * gelir. `width`/`length` (G2) opsiyoneldir ve şablonda YOKTUR.
 *
 * `spaceType` burada DİZE olarak doğrulanır, enum olarak değil: bu modül
 * tarayıcıya da gidebilir ve Prisma istemcisini oraya taşımak istemiyoruz.
 * Enum üyeliğini repository katmanı denetler ve tanınmayan değeri
 * `DATUM_UNKNOWN_SPACE_TYPE` ile reddeder.
 */

export const templateSpaceSchema = z.object({
  /** `SpaceType` enum değeri — üyelik repository'de denetlenir. */
  spaceType: z.string().min(1),
  /** Kullanıcının verdiği ad ("Ebeveyn Banyo"). Yoksa tip adı gösterilir. */
  name: z.string().optional(),
  /** Hedef alan (m²). G1 seviyesinin tek girdisi. */
  area: z.number().finite().positive(),
});

export const templateSpaceListSchema = z.array(templateSpaceSchema);

export type TemplateSpace = z.infer<typeof templateSpaceSchema>;

/** Bozuk veya eksik Json güvenle boş listeye düşer — kayıt engellenmez (ilke 7). */
export function parseTemplateSpaces(value: unknown): TemplateSpace[] {
  if (value === null || value === undefined) return [];
  const parsed = templateSpaceListSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** Şablonun toplam hedef alanı. Boş şablonda 0. */
export function templateTotalArea(spaces: readonly TemplateSpace[]): number {
  return spaces.reduce((sum, s) => sum + s.area, 0);
}

/**
 * Serbest metin mekan listesini ayrıştırır: her satır `mekanTipi alan`.
 *
 * Örnek: `salon 33.5` · `yatakOdasi 18` · `banyo 6`
 *
 * Ayrıştırılamayan satır SESSİZCE ATLANMAZ — hata fırlatır. Sessizce düşen
 * bir mekan, toplam hedef alanı yanlış gösterir ve ayrışma raporunu bozardı.
 */
export function parseSpaceLines(raw: string): TemplateSpace[] {
  const out: TemplateSpace[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const match = /^([A-Za-z][A-Za-z0-9_]*)\s+([0-9]+(?:[.,][0-9]+)?)$/.exec(trimmed);
    if (!match) throw new Error(`DATUM_SPACE_LINE_INVALID: ${trimmed}`);
    out.push({ spaceType: match[1]!, area: Number(match[2]!.replace(",", ".")) });
  }
  return out;
}

/** Şablonu ekranda düzenlenebilir metne çevirir — `parseSpaceLines`'ın tersi. */
export function formatSpaceLines(spaces: readonly TemplateSpace[]): string {
  return spaces.map((s) => `${s.spaceType} ${s.area}`).join("\n");
}
