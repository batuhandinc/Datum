import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { createRuleReader } from "@/lib/rules/reader";
import { parseLocalPolygon } from "@/lib/geometry/schema";
import { parseRoadFrontages, parseSpecialConstraints } from "@/lib/zoning/schemas";
import type { JoinType } from "@/lib/geometry";
import { computeL0, type ConstraintEffect, type L0Input, type L0Output } from "./l0";

/**
 * L0 SERVİS KATMANI — hesabı veriye bağlar.
 *
 * Hesap (`l0.ts`) SAF kalır: veritabanı görmez. Bu dosya okur, çağırır, yazar.
 *
 * YAZMA KURALI: sonuçlar DAİMA `*ComputedValue` kolonlarına yazılır.
 * `maxFootprint`, `maxTotalFloorArea`, `buildableEnvelope` GENERATED kolonlardır
 * ve yazılamaz — Postgres reddeder, `WritablePayload` tipi de derlemede engeller.
 * Kullanıcının ezmesi `*OverrideValue`'ya gider ve generated kolon onu üstün tutar.
 */

const num = (d: Prisma.Decimal | null): number | null => (d === null ? null : Number(d));

export interface L0ComputeResult extends L0Output {
  readonly projectId: string;
  /** Sonuçlar veritabanına yazıldı mı? ZoningData yoksa yazılmaz. */
  readonly stored: boolean;
}

/**
 * Projenin L0 girdilerini toplar, hesabı çalıştırır ve sonucu saklar.
 *
 * Eksik girdi HATA DEĞİLDİR: hesap yine çalışır, eksik olan null döner ve
 * uyarı üretir (ilke 7). Bu yüzden fonksiyon yarım dolu bir formda da çağrılabilir.
 */
export async function computeAndStoreL0(
  projectId: string,
  client: PrismaClient = prisma,
): Promise<L0ComputeResult> {
  const scoped = scopedPrisma(client, currentOrganizationId());

  // Kiracı filtresi KÖKTEN uygulanır; alt varlıklar include ile gelir.
  const project = await scoped.project.findUnique({
    where: { id: projectId },
    include: { parcel: { include: { zoningData: true } } },
  });

  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const parcel = project.parcel;
  const zoning = parcel?.zoningData ?? null;

  const reader = await createRuleReader(projectId, client);
  const [ruleSet, catalog] = await Promise.all([
    reader.zoningRuleSet(),
    reader.specialConstraints(),
  ]);

  const input: L0Input = {
    parcelArea: num(parcel?.area ?? null),
    parcelGeometry: parseLocalPolygon(parcel?.geometry ?? null),

    groundCoverageRatio: num(zoning?.groundCoverageRatio ?? null),
    floorAreaRatio: num(zoning?.floorAreaRatio ?? null),
    setbackFront: num(zoning?.setbackFront ?? null),
    setbackSide: num(zoning?.setbackSide ?? null),
    setbackRear: num(zoning?.setbackRear ?? null),
    maxFloorCount: zoning?.maxFloorCount ?? null,
    maxHeight: num(zoning?.maxHeight ?? null),
    roadFrontages: parseRoadFrontages(zoning?.roadFrontages ?? null),
    specialConstraints: parseSpecialConstraints(zoning?.specialConstraints ?? null),

    offsetJoinType: (ruleSet?.offsetJoinType ?? null) as JoinType | null,
    constraintCatalog: catalog.map<ConstraintEffect>((c) => ({
      ruleKey: c.ruleKey,
      effectTarget: c.effectTarget,
      effectKind: c.effectKind,
    })),
    hasFarExemptionRules: ruleSet?.farExemptionRules != null,
  };

  const result = computeL0(input);

  // Kural okuyucunun uyarıları da sonuca taşınır (paket bağlı değil, kural yok…).
  const warnings = [...reader.warnings, ...result.warnings];

  if (!zoning) {
    // Henüz imar verisi girilmemiş: yazacak yer yok, hesap yine de döner.
    return { ...result, warnings, projectId, stored: false };
  }

  await client.zoningData.update({
    where: { id: zoning.id },
    data: {
      maxFootprintComputedValue: result.maxFootprint,
      maxTotalFloorAreaComputedValue: result.maxTotalFloorArea,
      buildableEnvelopeComputedValue:
        result.buildableEnvelope === null
          ? Prisma.DbNull
          : (result.buildableEnvelope as unknown as Prisma.InputJsonValue),
      // İP-2'de daima null — kuralı tanımlı değil (İP-3).
      basementGainFromLevelDifferenceComputedValue: null,
    },
  });

  return { ...result, warnings, projectId, stored: true };
}
