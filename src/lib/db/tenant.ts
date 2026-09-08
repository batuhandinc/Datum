import { prisma, scopedPrisma, type ScopedPrismaClient } from "./client";

/**
 * TEK ORGANİZASYON — çok kiracıya hazırlık.
 *
 * etut-veri-modeli.md §1.1 (:15-22):
 *   "Şimdilik tek firma kullanacak, ileride başkaları kullanacak.
 *    Tek organizasyon seed edilir, ARAYÜZDE HİÇ GÖRÜNMEZ.
 *    Sonradan çok kiracıya geçiş: kimlik katmanı eklenir, VERİ GÖÇÜ GEREKMEZ."
 *
 * MVP'de kimlik katmanı YOK. Bu modül, ileride kimlik katmanı eklendiğinde
 * değişecek TEK yerdir: `currentOrganizationId()` oturumdan okumaya başlar,
 * çağıran hiçbir kod değişmez.
 */

export const SEEDED_ORGANIZATION_ID = "org_datum_default";
export const SEEDED_ORGANIZATION_NAME = "Datum";

/**
 * Geçerli organizasyon. MVP'de daima seed edilen tek organizasyon.
 * Kimlik katmanı geldiğinde burası oturumdan okuyacak.
 */
export function currentOrganizationId(): string {
  return SEEDED_ORGANIZATION_ID;
}

/** Organizasyona kilitlenmiş istemci. Uygulama kodu HER ZAMAN bunu kullanır. */
export function db(): ScopedPrismaClient {
  return scopedPrisma(prisma, currentOrganizationId());
}

/** Ham istemci — yalnızca seed ve migration gibi kiracı-üstü işler için. */
export { prisma as unscopedPrisma };
