import { PrismaClient } from "@prisma/client";

/**
 * KÖK VARLIKLAR — organizationId taşıyanlar.
 *
 * etut-veri-modeli.md §1.1 (:17) "Kök varlıklara organizationId alanı baştan konur"
 * mvp-spesifikasyonu.md (:42) "organizationId tüm kök varlıklarda"
 *
 * Başka hiçbir varlık bu alanı taşımaz; kiracılığı Project üzerinden miras alır.
 *
 * KAYDA GEÇEN RİSK: §1.1 (:19) sorguların "kütüphane seviyesinde, elle değil"
 * filtrelenmesini istiyor. Aşağıdaki extension bunu YALNIZCA bu iki model için
 * yapabilir — literal bir organizationId kolonu olmayan alt varlıklarda
 * traversal ile filtreleyemez. Bu yüzden alt varlık sorguları DAİMA kök
 * üzerinden yazılmalıdır:
 *
 *     db.unit.findMany({ where: { floor: { block: { project: { ... } } } } })   // ✗ elle
 *     scoped.project.findFirst({ where: { id }, include: { blocks: ... } })      // ✓ kökten
 *
 * Kural "her tabloda organizationId" diye değişirse TEK MIGRATION'DA, TÜM
 * TABLOLARDA BİRDEN değişmeli — asla tablo tablo.
 */
export const ORG_SCOPED_MODELS = ["Project", "RegionPackage", "PriceListVersion"] as const;

const SCOPED = new Set<string>(ORG_SCOPED_MODELS);

/** Where enjekte edilen okuma/toplu-yazma işlemleri. */
const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

/** findUnique organizationId kabul etmez — findFirst'e çevrilir. */
const UNIQUE_OPS = new Set(["findUnique", "findUniqueOrThrow"]);

/** data'ya organizationId enjekte edilen işlemler. */
const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);

type AnyArgs = Record<string, unknown>;

/**
 * Tek organizasyona kilitlenmiş bir Prisma istemcisi döndürür.
 * Kök varlık sorguları organizationId ile OTOMATİK filtrelenir.
 */
export function scopedPrisma(base: PrismaClient, organizationId: string) {
  return base.$extends({
    name: "organizationScope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!SCOPED.has(model)) return query(args);

          const a = (args ?? {}) as AnyArgs;

          if (UNIQUE_OPS.has(operation)) {
            // findUnique yalnızca benzersiz alan kabul eder; organizationId
            // eklenemez. findFirst'e çevirip filtreyi öyle uyguluyoruz.
            const where = { ...((a.where as AnyArgs) ?? {}), organizationId };
            const next = { ...a, where };
            const op = operation === "findUnique" ? "findFirst" : "findFirstOrThrow";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (base as any)[model.charAt(0).toLowerCase() + model.slice(1)][op](next);
          }

          if (WHERE_OPS.has(operation)) {
            const where = { ...((a.where as AnyArgs) ?? {}), organizationId };
            return query({ ...a, where } as typeof args);
          }

          if (CREATE_OPS.has(operation)) {
            const data = a.data;
            if (Array.isArray(data)) {
              return query({
                ...a,
                data: data.map((d) => ({ ...(d as AnyArgs), organizationId })),
              } as typeof args);
            }
            return query({
              ...a,
              data: { ...((data as AnyArgs) ?? {}), organizationId },
            } as typeof args);
          }

          if (operation === "update" || operation === "delete" || operation === "upsert") {
            // Tekil update/delete benzersiz anahtarla çalışır. Kiracı sızıntısını
            // önlemek için önce kaydın bu organizasyona ait olduğu doğrulanır.
            const where = (a.where as AnyArgs) ?? {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const delegate = (base as any)[model.charAt(0).toLowerCase() + model.slice(1)];
            const owned = await delegate.findFirst({
              where: { ...where, organizationId },
              select: { id: true },
            });
            if (!owned) {
              throw new Error(
                `DATUM_TENANT_SCOPE: ${model} kaydı bu organizasyonda bulunamadı.`,
              );
            }
            if (operation === "upsert") {
              return query({
                ...a,
                create: { ...((a.create as AnyArgs) ?? {}), organizationId },
              } as typeof args);
            }
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}

export type ScopedPrismaClient = ReturnType<typeof scopedPrisma>;

// --------------------------------------------------------------- singleton

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
