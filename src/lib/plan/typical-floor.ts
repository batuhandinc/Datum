import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import type { Warning } from "@/lib/warnings";

/**
 * TİPİK KAT ÇOĞALTMA — kilitli kat şablon katın planından türer.
 *
 * İP-3 `Floor.isLocked` + `templateFloorId`'yi kurdu; burada PLAN kilide uyar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ŞABLON KATIN **FİİLİ** GEOMETRİSİ KOPYALANIR.
 *
 * Yani `COALESCE(override, computed)` — GENERATED kolonun kendisi. Yalnızca
 * `ComputedValue` kopyalansaydı, kullanıcı şablon katta bir duvarı taşıdığı
 * anda (yani tipik kullanımda) kilitli katlar ESKİ hâli alır ve düşey hiza
 * SESSİZCE kırılırdı.
 *
 * Kopya hedefte `ComputedValue`'ya gider: kilitli katın planı TÜRETİLMİŞ bir
 * değerdir, kullanıcının kendi ezmesi değil. Kilitli katta yine de bir ezme
 * yapılabilir — ama o zaman kat gerçekten ayrışmış olur ve `OverrideLedger`
 * bunu gösterir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * EŞLEŞTİRME KONUMLA DEĞİL, `(unitTypeCode, targetArea)` DİZİSİYLE.
 * `Unit.unitNo` sırasına güvenmek 4. kattaki 2+1'e 3+1'in poligonunu verirdi;
 * sayı eşitliği tip eşitliği değildir. Dizi uyuşmazsa KOPYALAMA YAPILMAZ ve
 * uyarı üretilir — yanlış plan üretmektense hiç üretmemek.
 */

type Client = PrismaClient;

export interface PropagateResult {
  readonly copiedUnits: number;
  readonly copiedSpaces: number;
  readonly warnings: readonly Warning[];
  readonly stored: boolean;
}

interface UnitSignature {
  readonly id: string;
  readonly key: string;
}

/** Birimin kimlik imzası — tipoloji kodu + hedef alan (3 hane yuvarlanmış). */
function signatureOf(unit: {
  unitTypeCode: string | null;
  spaces: readonly { area: Prisma.Decimal | null }[];
}): string {
  const known = unit.spaces
    .map((s) => (s.area === null ? null : Number(s.area)))
    .filter((a): a is number => a !== null);
  const total = known.length === 0 ? null : known.reduce((a, b) => a + b, 0);
  return `${unit.unitTypeCode ?? "?"}|${total === null ? "?" : total.toFixed(3)}`;
}

/**
 * Kilitli bir katın planını şablon katından türetir.
 *
 * `Floor.isLocked` false ise hiçbir şey yapılmaz — kilitsiz kat kendi planına
 * SAHİPTİR ve üzerine yazmak kullanıcının işini silmek olurdu.
 */
export async function propagateTypicalFloor(
  projectId: string,
  floorId: string,
  client: Client = prisma,
): Promise<PropagateResult> {
  const visible = await scopedPrisma(client, currentOrganizationId()).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!visible) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const w: Warning[] = [];

  const target = await client.floor.findFirst({
    where: { id: floorId, block: { projectId } },
    include: { units: { include: { spaces: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } } },
  });
  if (!target) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);

  if (!target.isLocked || target.templateFloorId === null) {
    return { copiedUnits: 0, copiedSpaces: 0, warnings: w, stored: false };
  }

  const template = await client.floor.findFirst({
    where: { id: target.templateFloorId, block: { projectId } },
    include: { units: { include: { spaces: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } } },
  });
  if (!template) {
    w.push({ code: "TYPICAL_TEMPLATE_MISSING", params: { floorNo: target.floorNo } });
    return { copiedUnits: 0, copiedSpaces: 0, warnings: w, stored: false };
  }

  // --- İmza eşleşmesi ---
  const templateSig: UnitSignature[] = template.units.map((u) => ({
    id: u.id,
    key: signatureOf(u),
  }));
  const targetSig: UnitSignature[] = target.units.map((u) => ({ id: u.id, key: signatureOf(u) }));

  const mismatch =
    templateSig.length !== targetSig.length ||
    templateSig.some((t, i) => t.key !== targetSig[i]!.key);

  if (mismatch) {
    // YANLIŞ PLAN ÜRETMEKTENSE HİÇ ÜRETMEMEK. Sayı eşit olsa bile tipler
    // farklıysa 2+1'e 3+1'in poligonu düşerdi — hem de sessizce.
    w.push({
      code: "TYPICAL_SIGNATURE_MISMATCH",
      params: {
        floorNo: target.floorNo,
        template: templateSig.map((s) => s.key).join(", "),
        target: targetSig.map((s) => s.key).join(", "),
      },
    });
    return { copiedUnits: 0, copiedSpaces: 0, warnings: w, stored: false };
  }

  // --- Kopyalama ---
  let copiedUnits = 0;
  let copiedSpaces = 0;

  for (let i = 0; i < template.units.length; i += 1) {
    const src = template.units[i]!;
    const dst = target.units[i]!;

    // FİİLİ geometri: `src.geometry` GENERATED kolondur, yani
    // COALESCE(override, computed). Kullanıcının şablon kattaki ezmesi
    // böylece kilitli katlara TAŞINIR.
    await client.unit.update({
      where: { id: dst.id },
      data: {
        geometryComputedValue:
          src.geometry === null
            ? Prisma.DbNull
            : (src.geometry as unknown as Prisma.InputJsonValue),
        grossAreaComputedValue: src.grossArea,
      },
    });
    copiedUnits += 1;

    // Mekanlar `layoutKey` ile eşlenir — konumla değil.
    const byKey = new Map(
      src.spaces.filter((s) => s.layoutKey !== null).map((s) => [s.layoutKey!, s]),
    );
    for (const dstSpace of dst.spaces) {
      const srcSpace =
        dstSpace.layoutKey === null ? null : (byKey.get(dstSpace.layoutKey) ?? null);
      if (srcSpace === null) continue;
      await client.space.update({
        where: { id: dstSpace.id },
        data: {
          geometryComputedValue:
            srcSpace.geometry === null
              ? Prisma.DbNull
              : (srcSpace.geometry as unknown as Prisma.InputJsonValue),
          perimeterComputedValue: srcSpace.perimeter,
        },
      });
      copiedSpaces += 1;
    }
  }

  return { copiedUnits, copiedSpaces, warnings: w, stored: true };
}

/**
 * Kilit açılınca ne olur?
 *
 * HİÇBİR ŞEY SİLİNMEZ. `setFloorLock(false)` yalnızca `isLocked` ve
 * `templateFloorId`'yi temizler (İP-3, `program/repository.ts`); kopyalanmış
 * geometri `ComputedValue`'da DURUR ve kat artık kendi planına sahiptir.
 *
 * "Kilit açılınca bağımsızlaşır, önceki veri korunur" ancak böyle doğru olur:
 * bağ kopar, veri kalır. Bu fonksiyon yalnızca o davranışı BELGELEMEK için
 * vardır — çağrılması gerekmez.
 */
export const UNLOCK_PRESERVES_DATA = true;
