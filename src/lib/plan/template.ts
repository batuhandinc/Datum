import { z } from "zod";

/**
 * TİPOLOJİ ŞABLONU — bölme reçetesi + ilişki iddiaları.
 *
 * SAF: Prisma/Next yok (tarayıcı tarafında da doğrulanabilir).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN BÖLME AĞACI, SERBEST GRAF DEĞİL.
 *
 * Serbest bir komşuluk grafını geometriye çevirmek genel halde bir arama
 * problemidir ve SONLANMA GARANTİSİ YOKTUR. İlke 2 determinizmi ZORUNLU
 * kılıyor (dondurulmuş paket dondurulmuş sonuç üretmeli), dolayısıyla
 * "yeterince iyi olunca dur" diyen bir arama kullanılamaz.
 *
 * NEDEN NORMALİZE YERLEŞİM DE DEĞİL. Sabit oranlı bir yerleşim, L2'nin
 * ürettiği keyfi şekilli (çoğu zaman L biçimli) birim poligonuna esnetilemez.
 *
 * REÇETE AĞACI ikisinin ortasıdır: YAPI şablondan gelir — mimari bilgi
 * buradadır ve çıktı öngörülebilir olur — GEOMETRİ ise `cutByArea` ile
 * birimin gerçek poligonuna oturur. L2 ile AYNI çekirdek, farklı parametre.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * İLİŞKİ İDDİALARI KONTROL EDİLİR, ZORLANMAZ. "Salon cephe alır" bir
 * KISITLAMA değil, bir İDDİADIR: yerleşim onu sağlayamazsa mekan yine üretilir
 * ve tanı `ihlal` der. Zorlanan bir kısıt, sağlanamadığında ya çözümü
 * durdurur (ilke 7 ihlali) ya da sessizce gevşetilir (daha kötüsü).
 */

/** Bölme ekseni — hücrenin UZUN kenarına göre. */
export const splitAxisSchema = z.enum([
  /** Hücrenin uzun ekseni boyunca böl (parçalar yan yana dizilir). */
  "uzun",
  /** Kısa ekseni boyunca böl. */
  "kisa",
]);

export type SplitAxis = z.infer<typeof splitAxisSchema>;

/**
 * İlişki iddiası — mekanın çevresinden ne beklediği.
 *
 * `entry` girişte olmayı, `facade` cepheye değmeyi, `shaft` şafta bitişik
 * olmayı ister. Hiçbiri geometriyi ZORLAMAZ; hepsi ölçülüp raporlanır.
 */
export const relationSchema = z.object({
  /** Bu yaprak birimin giriş kenarına değmeli mi? */
  entry: z.boolean().optional(),
  /** Cepheye değmeli mi? */
  facade: z.boolean().optional(),
  /** Şafta bitişik olmalı mı? (ıslak hacimler) */
  shaft: z.boolean().optional(),
  /** Hangi mekanlara doğrudan bağlanmalı — `layoutKey` listesi. */
  connectsTo: z.array(z.string().min(1)).optional(),
});

export type Relation = z.infer<typeof relationSchema>;

/** Reçete yaprağı — bir MEKAN. */
export const leafSchema = z.object({
  kind: z.literal("space"),
  /** Şablon içinde TEKİL anahtar; `Space.layoutKey`'e yazılır. */
  layoutKey: z.string().min(1),
  /** Prisma `SpaceType` değeri. Enum burada DEĞİL: bu modül tarayıcıya gidebilir. */
  spaceType: z.string().min(1),
  name: z.string().optional(),
  /**
   * Hedef alanın PAYI (ağırlık), mutlak alan DEĞİL.
   *
   * Mutlak alan olsaydı iki doğruluk kaynağı doğardı: `UnitType.spaceList`
   * zaten hedef alanları taşıyor ve A5 ekranı onu yazıyor. Şablon YAPIYI
   * taşır, hedefi değil.
   */
  weight: z.number().finite().positive(),
  relation: relationSchema.optional(),
});

export type LeafNode = z.infer<typeof leafSchema>;

/** Reçete düğümü — bir KESME. */
export interface BranchNode {
  readonly kind: "split";
  readonly axis: SplitAxis;
  readonly children: readonly RecipeNode[];
}

export type RecipeNode = LeafNode | BranchNode;

export const recipeNodeSchema: z.ZodType<RecipeNode> = z.lazy(() =>
  z.union([
    leafSchema,
    z.object({
      kind: z.literal("split"),
      axis: splitAxisSchema,
      children: z.array(recipeNodeSchema).min(2),
    }),
  ]),
);

export const layoutRecipeSchema = z.object({
  version: z.literal(1),
  root: recipeNodeSchema,
});

export type LayoutRecipe = z.infer<typeof layoutRecipeSchema>;

/**
 * Bozuk veya eksik Json `null` döner — BOŞ REÇETE DEĞİL.
 *
 * `parseTemplateSpaces` bozuk Json'da sessizce `[]` dönüyor ve bu, mekan
 * listesi için savunulabilir. Reçete için DEĞİL: boş bir reçete "mekansız
 * daire" demektir ve sessizce sıfır metraj üretir. `null` çağıranı
 * "şablon okunamadı" uyarısı vermeye ZORLAR.
 */
export function parseLayoutRecipe(value: unknown): LayoutRecipe | null {
  const parsed = layoutRecipeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Reçetedeki yaprakları SOLDAN SAĞA, deterministik sırada toplar. */
export function recipeLeaves(node: RecipeNode): LeafNode[] {
  if (node.kind === "space") return [node];
  return node.children.flatMap(recipeLeaves);
}

/** Reçetenin toplam ağırlığı. */
export function totalWeight(node: RecipeNode): number {
  return recipeLeaves(node).reduce((s, l) => s + l.weight, 0);
}

/**
 * Reçete tutarlı mı?
 *
 * Dönen liste BOŞ değilse şablon BOZUKTUR ve plan üretilmemelidir — bu bir
 * kısıt ihlali değil, GEÇERSİZ GİRDİdir. `layoutKey` tekilliği özellikle
 * kritik: iki yaprak aynı anahtarı taşırsa `Space` satırları birbirine
 * karışır ve geometriler sessizce yer değiştirir.
 */
export function validateRecipe(recipe: LayoutRecipe): string[] {
  const problems: string[] = [];
  const leaves = recipeLeaves(recipe.root);

  if (leaves.length === 0) problems.push("DATUM_RECIPE_EMPTY");

  const seen = new Set<string>();
  for (const leaf of leaves) {
    if (seen.has(leaf.layoutKey)) problems.push(`DATUM_RECIPE_DUPLICATE_KEY:${leaf.layoutKey}`);
    seen.add(leaf.layoutKey);
  }

  // `connectsTo` var olmayan bir anahtara işaret ediyorsa iddia hiç
  // değerlendirilemez — sessizce "sağlandı" saymak yerine bozuk sayılır.
  for (const leaf of leaves) {
    for (const target of leaf.relation?.connectsTo ?? []) {
      if (!seen.has(target)) problems.push(`DATUM_RECIPE_UNKNOWN_TARGET:${target}`);
    }
  }

  return problems;
}
