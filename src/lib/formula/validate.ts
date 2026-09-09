import {
  FormulaSyntaxError,
  collectVariables,
  type FormulaError,
  type Node,
} from "./ast";
import { parseFormula } from "./parser";
import type { FormulaContract } from "./contracts";

/**
 * ANLAMSAL DOĞRULAMA — sözdizimi geçtikten sonra.
 *
 * İki şeye bakar:
 *   1. her değişken sözleşmenin beyaz listesinde mi
 *   2. tipler tutuyor mu (aritmetik sayı ister, üçlünün koşulu boolean ister)
 *
 * Tip denetimi ayrı bir adım çünkü ayrıştırıcı bağlam taşımıyor: `a + (b < c)`
 * sözdizimsel olarak kusursuz ama anlamsız. Çalışma zamanında NaN üretmek
 * yerine YAYIM ANINDA patlar.
 */

type ValueType = "number" | "boolean";

function typeOf(node: Node): ValueType {
  switch (node.kind) {
    case "number":
      return "number";

    case "variable":
      // Değişkenler DAİMA sayıdır: bağlam sayısal ölçülerden oluşur.
      return "number";

    case "unary": {
      expectType(node.operand, "number");
      return "number";
    }

    case "binary": {
      expectType(node.left, "number");
      expectType(node.right, "number");
      return "number";
    }

    case "compare": {
      expectType(node.left, "number");
      expectType(node.right, "number");
      return "boolean";
    }

    case "ternary": {
      expectType(node.condition, "boolean");
      // İki kol da sayı olmalı: dilde boolean döndüren bir formül yok,
      // sonuç her zaman ölçülebilir bir değerdir.
      expectType(node.whenTrue, "number");
      expectType(node.whenFalse, "number");
      return "number";
    }

    case "call": {
      const arity = ARITY[node.name];
      const ok =
        arity === "variadic" ? node.args.length >= 2 : node.args.length === arity;
      if (!ok) {
        throw new FormulaSyntaxError({
          code: "ARITY_MISMATCH",
          at: node.at,
          token: `${node.name}/${node.args.length}`,
        });
      }
      for (const a of node.args) expectType(a, "number");
      return "number";
    }
  }
}

const ARITY: Record<string, 1 | "variadic"> = {
  min: "variadic",
  max: "variadic",
  ceil: 1,
  floor: 1,
  round: 1,
  abs: 1,
};

function expectType(node: Node, want: ValueType): void {
  const got = typeOf(node);
  if (got === want) return;
  throw new FormulaSyntaxError({
    code: "TYPE_MISMATCH",
    at: nodePosition(node),
    token: `${got}!=${want}`,
  });
}

function nodePosition(node: Node): number {
  switch (node.kind) {
    case "variable":
    case "call":
      return node.at;
    case "unary":
      return nodePosition(node.operand);
    case "binary":
    case "compare":
      return nodePosition(node.left);
    case "ternary":
      return nodePosition(node.condition);
    default:
      return 0;
  }
}

export type ValidationResult =
  | { readonly ok: true; readonly ast: Node; readonly variables: readonly string[] }
  | { readonly ok: false; readonly error: FormulaError };

/**
 * Formülü ayrıştırır ve sözleşmesine karşı doğrular.
 *
 * FIRLATMAZ — sonucu döndürür; çağıran (yayım kapısı) hatayı kendi
 * bağlamıyla birlikte raporlar.
 */
export function validateFormula(source: string, contract: FormulaContract): ValidationResult {
  let ast: Node;
  try {
    ast = parseFormula(source);
    typeOf(ast);
  } catch (e) {
    if (e instanceof FormulaSyntaxError) return { ok: false, error: e.detail };
    throw e;
  }

  const variables = collectVariables(ast);
  for (const name of variables) {
    if (!contract.variables.includes(name)) {
      const at = firstVariablePosition(ast, name);
      return { ok: false, error: { code: "UNKNOWN_VARIABLE", at, token: name } };
    }
  }

  return { ok: true, ast, variables };
}

function firstVariablePosition(node: Node, name: string): number {
  switch (node.kind) {
    case "variable":
      return node.name === name ? node.at : -1;
    case "unary":
      return firstVariablePosition(node.operand, name);
    case "binary":
    case "compare":
      return pick(
        firstVariablePosition(node.left, name),
        firstVariablePosition(node.right, name),
      );
    case "ternary":
      return pick(
        firstVariablePosition(node.condition, name),
        firstVariablePosition(node.whenTrue, name),
        firstVariablePosition(node.whenFalse, name),
      );
    case "call":
      return pick(...node.args.map((a) => firstVariablePosition(a, name)));
    default:
      return -1;
  }
}

function pick(...positions: number[]): number {
  const found = positions.filter((p) => p >= 0);
  return found.length === 0 ? -1 : Math.min(...found);
}
