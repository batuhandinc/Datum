import type { PrismaClient } from "@prisma/client";

/**
 * ════════════════════════════════════════════════════════════════════════
 *  TEST FIXTURE — GERÇEK TİPOLOJİ KÜTÜPHANESİ DEĞİLDİR.
 * ════════════════════════════════════════════════════════════════════════
 *
 * `mvp-spesifikasyonu.md` §5: "Tipoloji şablonlarının tanımı (ilk 5 tip,
 * ilişki şeması)" bir ALAN UZMANI çıktısıdır ve Faz 0 işidir; İP-4'ü bloke
 * ettiği orada yazılı. Gerçek şablonlar proje sahibinden gelecek.
 *
 * Buradakiler L3'ün uçtan uca test edilebilmesi için vardır. Mimari olarak
 * makul ama UYDURMADIR ve gerçek bir tipoloji kütüphanesi olarak sunulamaz.
 *
 * KARIŞMAMASI İÇİN: `templateCode` sonuna " (TEST)" eklenir.
 *
 * ŞABLON YAPIYI TAŞIR, HEDEF ALANI DEĞİL. Yapraklardaki `weight` bir
 * AĞIRLIKTIR; mutlak alan `UnitType.spaceList`ten (A5 ekranından) gelir.
 * İki doğruluk kaynağı olsaydı kullanıcı salonu 33,5'ten 38'e çıkardığında
 * plan motoru eski hedefi kullanmaya devam ederdi.
 */

export const TEMPLATE_SUFFIX = " (TEST)";

/**
 * 2+1 — antre girişte, salon ve oda cephede, banyo şafta bitişik.
 *
 * İlişkiler KONTROL EDİLİR, ZORLANMAZ: yerleşim sağlayamazsa mekan yine
 * üretilir ve tanı `ihlal` der.
 */
const TWO_PLUS_ONE = {
  version: 1 as const,
  root: {
    kind: "split" as const,
    axis: "uzun" as const,
    children: [
      {
        // Servis bandı: antre + ıslak çekirdek. Girişe ve şafta yakın.
        kind: "split" as const,
        axis: "kisa" as const,
        children: [
          {
            kind: "space" as const,
            layoutKey: "antre",
            spaceType: "antre",
            weight: 1,
            relation: { entry: true },
          },
          {
            kind: "space" as const,
            layoutKey: "banyo",
            spaceType: "banyo",
            weight: 1,
            relation: { shaft: true },
          },
          {
            kind: "space" as const,
            layoutKey: "mutfak",
            spaceType: "mutfak",
            weight: 1.6,
            relation: { shaft: true, connectsTo: ["antre"] },
          },
        ],
      },
      {
        kind: "space" as const,
        layoutKey: "salon",
        spaceType: "salon",
        weight: 3.4,
        relation: { facade: true, connectsTo: ["antre"] },
      },
      {
        kind: "space" as const,
        layoutKey: "yatak1",
        spaceType: "ebeveynYatak",
        weight: 2.3,
        relation: { facade: true },
      },
      {
        kind: "space" as const,
        layoutKey: "yatak2",
        spaceType: "yatakOdasi",
        weight: 1.8,
        relation: { facade: true },
      },
    ],
  },
};

/** 3+1 — 2+1'in üzerine bir oda ve ikinci banyo. */
const THREE_PLUS_ONE = {
  version: 1 as const,
  root: {
    kind: "split" as const,
    axis: "uzun" as const,
    children: [
      {
        kind: "split" as const,
        axis: "kisa" as const,
        children: [
          {
            kind: "space" as const,
            layoutKey: "antre",
            spaceType: "antre",
            weight: 0.9,
            relation: { entry: true },
          },
          {
            kind: "space" as const,
            layoutKey: "hol",
            spaceType: "hol",
            weight: 0.9,
            relation: { connectsTo: ["antre"] },
          },
          {
            kind: "space" as const,
            layoutKey: "banyo",
            spaceType: "banyo",
            weight: 0.6,
            relation: { shaft: true, connectsTo: ["hol"] },
          },
          {
            kind: "space" as const,
            layoutKey: "ebeveynBanyo",
            spaceType: "ebeveynBanyo",
            weight: 0.5,
            relation: { shaft: true },
          },
          {
            kind: "space" as const,
            layoutKey: "mutfak",
            spaceType: "mutfak",
            weight: 1.6,
            relation: { shaft: true, connectsTo: ["antre"] },
          },
        ],
      },
      {
        kind: "space" as const,
        layoutKey: "salon",
        spaceType: "salon",
        weight: 3.4,
        relation: { facade: true, connectsTo: ["antre"] },
      },
      {
        kind: "space" as const,
        layoutKey: "yatak1",
        spaceType: "ebeveynYatak",
        weight: 2.3,
        relation: { facade: true, connectsTo: ["ebeveynBanyo"] },
      },
      {
        kind: "space" as const,
        layoutKey: "yatak2",
        spaceType: "yatakOdasi",
        weight: 1.8,
        relation: { facade: true, connectsTo: ["hol"] },
      },
      {
        kind: "space" as const,
        layoutKey: "yatak3",
        spaceType: "cocukOdasi",
        weight: 1.4,
        relation: { facade: true, connectsTo: ["hol"] },
      },
    ],
  },
};

const TEMPLATES = [
  { templateCode: `2+1 A${TEMPLATE_SUFFIX}`, version: "0.1.0-fixture", recipe: TWO_PLUS_ONE },
  { templateCode: `3+1 A${TEMPLATE_SUFFIX}`, version: "0.1.0-fixture", recipe: THREE_PLUS_ONE },
] as const;

/**
 * Kütüphaneyi yükler. Bölge paketine BAĞLI DEĞİLDİR ve dondurulmaz —
 * şablon mevzuat değil firma alışkanlığıdır, sürüm dondurma ona uygulanmaz.
 */
export async function loadTestUnitTypeTemplates(
  prisma: PrismaClient,
  organizationId: string,
): Promise<{ ids: string[] }> {
  const ids: string[] = [];
  for (const t of TEMPLATES) {
    const row = await prisma.unitTypeTemplate.upsert({
      where: {
        organizationId_templateCode_version: {
          organizationId,
          templateCode: t.templateCode,
          version: t.version,
        },
      },
      create: {
        organizationId,
        templateCode: t.templateCode,
        version: t.version,
        layoutRecipe: t.recipe,
      },
      update: { layoutRecipe: t.recipe },
      select: { id: true },
    });
    ids.push(row.id);
  }
  return { ids };
}

/** Bu şablon bir test fixture'ı mı? Arayüz ve raporlar bunu göstermeli. */
export function isTestFixtureTemplate(templateCode: string): boolean {
  return templateCode.endsWith(TEMPLATE_SUFFIX);
}
