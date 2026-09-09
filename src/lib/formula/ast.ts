/**
 * FORMÜL AST'İ VE HATA KODLARI.
 *
 * `ParkingRule.requirementFormula` ve `RequiredSpaceRule.areaFormula` düz metin
 * kolonlardır (etut-veri-modeli.md §12.5). Bu modül onları güvenle okur.
 *
 * `eval` ve `Function` KULLANILMAZ. Paket verisi kullanıcı girdisidir; onu
 * çalıştırılabilir koda çevirmek, bölge paketi yazan herkese sunucuda kod
 * çalıştırma yetkisi vermek olurdu. Dilbilgisi KAPALI bir kümedir: üye erişimi,
 * fonksiyon tanımı, atama, dizi ve dize yoktur.
 *
 * DETERMİNİZM: dilde tarih, saat ve rastgelelik yoktur. Aynı girdi her zaman
 * aynı sonucu verir — ilke 2'nin gereği, çünkü dondurulmuş bir paket dondurulmuş
 * sonuç üretmelidir.
 */

export type BinaryOp = "+" | "-" | "*" | "/";
export type CompareOp = "<" | "<=" | ">" | ">=" | "==" | "!=";

/** Dilin TAMAMI. Bu listeye eklemek yeni koddur — kasıtlı olarak öyle. */
export const FUNCTIONS = ["min", "max", "ceil", "floor", "round", "abs"] as const;
export type FunctionName = (typeof FUNCTIONS)[number];

export type Node =
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "variable"; readonly name: string; readonly at: number }
  | { readonly kind: "unary"; readonly op: "-"; readonly operand: Node }
  | { readonly kind: "binary"; readonly op: BinaryOp; readonly left: Node; readonly right: Node }
  | { readonly kind: "compare"; readonly op: CompareOp; readonly left: Node; readonly right: Node }
  | {
      readonly kind: "ternary";
      readonly condition: Node;
      readonly whenTrue: Node;
      readonly whenFalse: Node;
    }
  | {
      readonly kind: "call";
      readonly name: FunctionName;
      readonly args: readonly Node[];
      readonly at: number;
    };

/**
 * Ayrıştırma ve doğrulama hataları.
 *
 * Bunlar UYARI DEĞİL, HATADIR: bozuk bir formül yayımı reddeder. Kod olarak
 * döner, Türkçe metin taşımaz (konvansiyon: koda gömülü Türkçe metin yok).
 */
export type FormulaErrorCode =
  | "EMPTY"
  | "TOO_LONG"
  | "DEPTH_EXCEEDED"
  | "UNEXPECTED_CHARACTER"
  | "UNEXPECTED_TOKEN"
  | "UNEXPECTED_END"
  | "TRAILING_INPUT"
  | "UNKNOWN_FUNCTION"
  | "ARITY_MISMATCH"
  | "UNKNOWN_VARIABLE"
  | "TYPE_MISMATCH"
  | "NUMBER_NOT_FINITE";

export interface FormulaError {
  readonly code: FormulaErrorCode;
  /** Kaynak metindeki konum (0 tabanlı). */
  readonly at: number;
  /** Hataya konu olan belirteç veya ad — tanımlayıcıdır, çeviri metni değil. */
  readonly token?: string;
}

export class FormulaSyntaxError extends Error {
  constructor(readonly detail: FormulaError) {
    super(`${detail.code}@${detail.at}${detail.token ? `:${detail.token}` : ""}`);
    this.name = "FormulaSyntaxError";
  }
}

/** Girdi sınırları — sonsuz veya patolojik ifadeleri baştan keser. */
export const MAX_FORMULA_LENGTH = 500;
export const MAX_AST_DEPTH = 32;

/** AST derinliği. Sınır aşımı ayrıştırma sonrası ayrı bir adımda denetlenir. */
export function astDepth(node: Node): number {
  switch (node.kind) {
    case "number":
    case "variable":
      return 1;
    case "unary":
      return 1 + astDepth(node.operand);
    case "binary":
    case "compare":
      return 1 + Math.max(astDepth(node.left), astDepth(node.right));
    case "ternary":
      return (
        1 +
        Math.max(astDepth(node.condition), astDepth(node.whenTrue), astDepth(node.whenFalse))
      );
    case "call":
      return 1 + Math.max(0, ...node.args.map(astDepth));
  }
}

/** Formülün okuduğu değişken adları (tekilleştirilmiş, kaynak sırasında). */
export function collectVariables(node: Node, into: string[] = []): string[] {
  switch (node.kind) {
    case "number":
      break;
    case "variable":
      if (!into.includes(node.name)) into.push(node.name);
      break;
    case "unary":
      collectVariables(node.operand, into);
      break;
    case "binary":
    case "compare":
      collectVariables(node.left, into);
      collectVariables(node.right, into);
      break;
    case "ternary":
      collectVariables(node.condition, into);
      collectVariables(node.whenTrue, into);
      collectVariables(node.whenFalse, into);
      break;
    case "call":
      for (const a of node.args) collectVariables(a, into);
      break;
  }
  return into;
}
