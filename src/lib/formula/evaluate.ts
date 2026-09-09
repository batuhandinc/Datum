import type { Node } from "./ast";
import type { FormulaContract } from "./contracts";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * DEĞERLENDİRİCİ.
 *
 * Buraya gelen AST YAYIM ANINDA doğrulanmıştır: sözdizimi geçerli, tipler
 * tutuyor, her değişken beyaz listede. Dolayısıyla burada kalan tek sorun
 * ÇALIŞMA ZAMANI sorunudur ve hata değil UYARI üretir (ilke 7):
 *
 *   - bağlamda değeri olmayan (null) değişken
 *   - sıfıra bölme
 *   - sonucun sözleşmenin alt sınırının altına düşmesi
 *
 * Üçünde de sonuç `null` döner. SESSİZ NaN YAYILIMI YOKTUR: NaN bir sayı gibi
 * davranıp hesabın sonuna kadar gider ve orada "0" ya da boş görünürdü.
 */

export type FormulaContext = Readonly<Record<string, number | null | undefined>>;

export interface FormulaResult {
  /** Hesaplanamadıysa null — uyarı listesi nedenini söyler. */
  readonly value: number | null;
  readonly warnings: readonly Warning[];
}

/** İç değerlendirme: null = "hesaplanamadı", yayılır ama sessiz değildir. */
type Value = number | boolean | null;

class Evaluator {
  constructor(
    private readonly context: FormulaContext,
    private readonly warnings: WarningCollector,
  ) {}

  eval(node: Node): Value {
    switch (node.kind) {
      case "number":
        return node.value;

      case "variable": {
        const raw = this.context[node.name];
        if (raw === null || raw === undefined || !Number.isFinite(raw)) {
          this.warnings.addOnce("FORMULA_INPUT_MISSING", { variable: node.name });
          return null;
        }
        return raw;
      }

      case "unary": {
        const v = this.num(node.operand);
        return v === null ? null : -v;
      }

      case "binary": {
        const left = this.num(node.left);
        const right = this.num(node.right);
        if (left === null || right === null) return null;
        switch (node.op) {
          case "+":
            return left + right;
          case "-":
            return left - right;
          case "*":
            return left * right;
          case "/":
            if (right === 0) {
              // Infinity döndürmek sayı gibi görünür ve hesabın sonuna kadar
              // giderdi. Burada durur.
              this.warnings.addOnce("FORMULA_DIVISION_BY_ZERO");
              return null;
            }
            return left / right;
        }
      }

      case "compare": {
        const left = this.num(node.left);
        const right = this.num(node.right);
        if (left === null || right === null) return null;
        switch (node.op) {
          case "<":
            return left < right;
          case "<=":
            return left <= right;
          case ">":
            return left > right;
          case ">=":
            return left >= right;
          case "==":
            return left === right;
          case "!=":
            return left !== right;
        }
      }

      case "ternary": {
        const condition = this.eval(node.condition);
        if (condition === null) return null;
        // Yalnızca SEÇİLEN kol değerlendirilir: seçilmeyen kolda sıfıra bölme
        // varsa uyarı üretmemeli, o kol zaten çalışmıyor.
        return this.eval(condition ? node.whenTrue : node.whenFalse);
      }

      case "call": {
        const args: number[] = [];
        for (const a of node.args) {
          const v = this.num(a);
          if (v === null) return null;
          args.push(v);
        }
        switch (node.name) {
          case "min":
            return Math.min(...args);
          case "max":
            return Math.max(...args);
          case "ceil":
            return Math.ceil(args[0]!);
          case "floor":
            return Math.floor(args[0]!);
          case "round":
            return Math.round(args[0]!);
          case "abs":
            return Math.abs(args[0]!);
        }
      }
    }
  }

  private num(node: Node): number | null {
    const v = this.eval(node);
    return typeof v === "number" ? v : null;
  }
}

/**
 * Doğrulanmış bir AST'yi bağlamda değerlendirir.
 *
 * `resultKind: "integer"` ise sonuç YUKARI yuvarlanır — bunlar ihtiyaç
 * değerleridir ve aşağı yuvarlamak eksik tedarik üretir (bkz. `contracts.ts`).
 */
export function evaluateFormula(
  ast: Node,
  contract: FormulaContract,
  context: FormulaContext,
): FormulaResult {
  const collector = new WarningCollector();
  const raw = new Evaluator(context, collector).eval(ast);

  if (raw === null || typeof raw !== "number" || !Number.isFinite(raw)) {
    return { value: null, warnings: collector.all };
  }

  const value = contract.resultKind === "integer" ? Math.ceil(raw) : raw;

  if (value < contract.minimum) {
    collector.add("FORMULA_RESULT_BELOW_MINIMUM", { value, minimum: contract.minimum });
    return { value: null, warnings: collector.all };
  }

  return { value, warnings: collector.all };
}
