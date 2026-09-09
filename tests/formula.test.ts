import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  MAX_AST_DEPTH,
  MAX_FORMULA_LENGTH,
  PARKING_REQUIREMENT,
  SERVICE_SPACE_AREA,
  evaluateFormula,
  validateFormula,
  type FormulaContract,
} from "@/lib/formula";

/**
 * FORMÜL MOTORU.
 *
 * Bölge paketi verisi kullanıcı girdisidir. Bu testler dilin KAPALI kaldığını
 * ve bozuk formülün okuma anında değil YAYIM anında yakalandığını kilitler.
 */

/** Doğrula + değerlendir; testlerin çoğu bu ikisini birlikte yapıyor. */
function run(
  source: string,
  context: Record<string, number | null>,
  contract: FormulaContract = PARKING_REQUIREMENT,
) {
  const v = validateFormula(source, contract);
  if (!v.ok) throw new Error(`beklenmeyen doğrulama hatası: ${v.error.code}@${v.error.at}`);
  return evaluateFormula(v.ast, contract, context);
}

function errorOf(source: string, contract: FormulaContract = PARKING_REQUIREMENT) {
  const v = validateFormula(source, contract);
  if (v.ok) throw new Error(`hata bekleniyordu, formül geçerli sayıldı: ${source}`);
  return v.error;
}

describe("dilbilgisi — kapalı küme", () => {
  it("aritmetik ve öncelik", () => {
    expect(run("2 + 3 * 4", {}).value).toBe(14);
    expect(run("(2 + 3) * 4", {}).value).toBe(20);
    expect(run("10 - 2 - 3", {}).value).toBe(5); // sola birleşmeli
    expect(run("100 / 5 / 2", {}).value).toBe(10);
  });

  it("birli eksi", () => {
    expect(run("10 + -3", {}).value).toBe(7);
    expect(run("--5", {}).value).toBe(5);
  });

  it("fonksiyonlar", () => {
    expect(run("ceil(4.1)", {}).value).toBe(5);
    expect(run("floor(4.9)", {}).value).toBe(4);
    expect(run("round(4.5)", {}).value).toBe(5);
    expect(run("abs(0 - 7)", {}).value).toBe(7);
    expect(run("min(3, 9, 5)", {}).value).toBe(3);
    expect(run("max(3, 9, 5)", {}).value).toBe(9);
  });

  it("üçlü ifade ve karşılaştırma", () => {
    const f = "unitCount >= 30 ? ceil(unitCount * 0.2) : 0";
    expect(run(f, { unitCount: 50 }).value).toBe(10);
    expect(run(f, { unitCount: 10 }).value).toBe(0);
  });

  it("ondalık sayı", () => {
    expect(run("ceil(unitCount * 1.5)", { unitCount: 3 }).value).toBe(5);
  });
});

describe("dilin DIŞINDA kalanlar reddedilir", () => {
  // eval/Function kullanılmadığının asıl kanıtı: bu ifadelerin hiçbiri
  // "çalışıp" bir sonuç üretemez, ayrıştırıcı onları tanımaz.
  const rejected: readonly [string, string][] = [
    ["process.env.SECRET", "üye erişimi"],
    ["globalThis", "bilinmeyen değişken"],
    ["Date.now()", "üye erişimi"],
    ["[1,2,3]", "dizi"],
    ['"metin"', "dize"],
    ["{a:1}", "nesne"],
    ["unitCount = 5", "atama"],
    ["unitCount && 1", "mantıksal operatör"],
    ["unitCount ** 2", "üs"],
    ["unitCount % 2", "mod"],
    ["a => a", "ok fonksiyonu"],
    ["require('fs')", "bilinmeyen fonksiyon"],
    ["unitCount; 5", "ardışık ifade"],
  ];

  it.each(rejected)("%s reddediliyor (%s)", (source) => {
    const v = validateFormula(source, PARKING_REQUIREMENT);
    expect(v.ok, `"${source}" geçerli sayıldı`).toBe(false);
  });

  it("bilinmeyen fonksiyon adı", () => {
    expect(errorOf("sqrt(4)").code).toBe("UNKNOWN_FUNCTION");
  });

  it("yanlış argüman sayısı", () => {
    expect(errorOf("ceil(1, 2)").code).toBe("ARITY_MISMATCH");
    expect(errorOf("min(1)").code).toBe("ARITY_MISMATCH");
  });

  it("kapanmayan parantez", () => {
    expect(errorOf("(1 + 2").code).toBe("UNEXPECTED_END");
  });

  it("boş formül", () => {
    expect(errorOf("   ").code).toBe("EMPTY");
  });
});

describe("determinizm — tarih, saat, rastgelelik yok", () => {
  it("zaman kaynaklarına erişilemiyor", () => {
    for (const src of ["now", "today", "random()", "Math.random()", "Date()"]) {
      expect(validateFormula(src, PARKING_REQUIREMENT).ok, src).toBe(false);
    }
  });

  it("aynı girdi aynı sonucu veriyor", () => {
    const f = "ceil(unitCount * 1.2) + max(totalFloorArea / 100, 2)";
    const ctx = { unitCount: 17, totalFloorArea: 940 };
    const first = run(f, ctx).value;
    for (let i = 0; i < 20; i++) expect(run(f, ctx).value).toBe(first);
  });
});

describe("değişken beyaz listesi KURAL TİPİNE özel", () => {
  it("otopark formülü demandPowerKW göremiyor", () => {
    const e = errorOf("demandPowerKW / 10", PARKING_REQUIREMENT);
    expect(e.code).toBe("UNKNOWN_VARIABLE");
    expect(e.token).toBe("demandPowerKW");
  });

  it("alan formülü demandPowerKW görebiliyor", () => {
    expect(validateFormula("demandPowerKW / 10", SERVICE_SPACE_AREA).ok).toBe(true);
  });

  it("alan formülü commercialArea göremiyor", () => {
    expect(errorOf("commercialArea", SERVICE_SPACE_AREA).code).toBe("UNKNOWN_VARIABLE");
  });

  it("iki listenin farklı olduğu gerçekten doğru", () => {
    // Aynı olsalardı yukarıdaki iki test anlamsız olurdu.
    expect([...PARKING_REQUIREMENT.variables].sort()).not.toEqual(
      [...SERVICE_SPACE_AREA.variables].sort(),
    );
  });
});

describe("sınırlar", () => {
  it("azami uzunluk", () => {
    const long = "1+".repeat(MAX_FORMULA_LENGTH) + "1";
    expect(errorOf(long).code).toBe("TOO_LONG");
  });

  it("azami AST derinliği", () => {
    // Zincirlenmiş toplama sola yaslı bir ağaç üretir: derinlik = terim sayısı.
    const deep = "1+".repeat(MAX_AST_DEPTH + 5) + "1";
    expect(deep.length).toBeLessThanOrEqual(MAX_FORMULA_LENGTH); // TOO_LONG'a takılmasın
    expect(errorOf(deep).code).toBe("DEPTH_EXCEEDED");
  });

  it("parantez derinlik ÜRETMEZ — gruplamadır, düğüm değil", () => {
    // `((((1))))` AST'de sadece `1`'dir. Derinlik sınırını parantezle test
    // etmek bu yüzden yanlış olurdu; sınırı gerçekten zorlayan iç içe
    // operatörlerdir.
    const parens = "(".repeat(MAX_AST_DEPTH + 5) + "1" + ")".repeat(MAX_AST_DEPTH + 5);
    expect(validateFormula(parens, PARKING_REQUIREMENT).ok).toBe(true);
  });
});

describe("tip denetimi", () => {
  it("boolean aritmetiğe giremiyor", () => {
    expect(errorOf("1 + (unitCount > 2)").code).toBe("TYPE_MISMATCH");
  });

  it("üçlünün koşulu boolean olmalı", () => {
    expect(errorOf("unitCount ? 1 : 2").code).toBe("TYPE_MISMATCH");
  });

  it("karşılaştırma zincirlenemiyor", () => {
    // `1 < 2 < 3` çoğu dilde sessizce yanlış sonuç verir; burada hata.
    expect(errorOf("1 < 2 < 3").code).toBe("UNEXPECTED_TOKEN");
  });
});

describe("çalışma zamanı — hata değil UYARI (ilke 7)", () => {
  it("sıfıra bölme uyarı üretiyor, Infinity yaymıyor", () => {
    const r = run("totalFloorArea / unitCount", { totalFloorArea: 100, unitCount: 0 });
    expect(r.value).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("FORMULA_DIVISION_BY_ZERO");
  });

  it("eksik girdi uyarı üretiyor ve değişkeni adlandırıyor", () => {
    const r = run("unitCount * 2", { unitCount: null });
    expect(r.value).toBeNull();
    const w = r.warnings.find((x) => x.code === "FORMULA_INPUT_MISSING");
    expect(w?.params?.variable).toBe("unitCount");
  });

  it("NaN sessizce yayılmıyor", () => {
    const r = run("unitCount * 2 + 10", { unitCount: null });
    expect(r.value).toBeNull(); // 10 DEĞİL
  });

  it("seçilmeyen kol değerlendirilmiyor", () => {
    // Yanlış koldaki sıfıra bölme uyarı üretmemeli.
    const r = run("unitCount > 0 ? unitCount : 1 / 0", { unitCount: 5 });
    expect(r.value).toBe(5);
    expect(r.warnings).toHaveLength(0);
  });
});

describe("sonuç sözleşmesi", () => {
  it("araç sayısı yukarı yuvarlanıyor ve tamsayı", () => {
    const r = run("unitCount * 0.5", { unitCount: 11 });
    expect(r.value).toBe(6);
    expect(Number.isInteger(r.value)).toBe(true);
  });

  it("alan formülü yuvarlanmıyor", () => {
    const r = run("totalFloorArea * 0.015", { totalFloorArea: 1000 }, SERVICE_SPACE_AREA);
    expect(r.value).toBeCloseTo(15, 6);
  });

  it("negatif sonuç kullanılmıyor + uyarı", () => {
    const r = run("unitCount - 100", { unitCount: 10 });
    expect(r.value).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("FORMULA_RESULT_BELOW_MINIMUM");
  });

  it("formüldeki açık yuvarlama dıştaki ceil'i etkisiz bırakıyor", () => {
    expect(run("floor(unitCount * 0.5)", { unitCount: 11 }).value).toBe(5);
  });
});

describe("özellik testleri", () => {
  it("geçerli sayılan hiçbir formül değerlendirmede patlamıyor", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 100000 }),
        (unitCount, totalFloorArea) => {
          const r = run("ceil(unitCount * 1.2) + max(totalFloorArea / 75, 1)", {
            unitCount,
            totalFloorArea,
          });
          expect(r.value === null || Number.isFinite(r.value)).toBe(true);
          if (r.value !== null) expect(r.value).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("rastgele metin ya geçerli ayrışır ya temiz hata verir — asla patlamaz", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (source) => {
        // Fırlatmamalı: validateFormula sonuç DÖNDÜRÜR.
        const v = validateFormula(source, PARKING_REQUIREMENT);
        expect(typeof v.ok).toBe("boolean");
      }),
      { numRuns: 500 },
    );
  });
});
