export type Level = 'red' | 'yellow' | 'green' | 'blue';

/**
 * Одна таблица-картинка как есть: названия в том написании, что на картинке.
 * Цвет ячейки: R, O, G, B или P (бледная - минимальная сочетаемость, в граф не попадает).
 */
export interface PairingTable {
  file: string;
  header: string;
  columns: { category: string; cells: [string, string][] }[];
}

/**
 * Продукт справочника. aliases - другие написания из таблиц (сокращения, опечатки).
 */
export interface Product {
  name: string;
  category: string;
  aliases?: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  category: string;
}

export interface GraphLink {
  source: string;
  target: string;
  value: Level;
}

const levelByColor: Record<string, Level> = { R: 'red', O: 'yellow', G: 'green', B: 'blue' };
const levelRank: Record<Level, number> = { red: 4, yellow: 3, green: 2, blue: 1 };

// В таблицах одно и то же пишется по-разному: "Ч.смородина", "ч. смородина", "ч, смородина"
export function toKey(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е').replace(/,/g, '.').replace(/\s+/g, '');
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/**
 * Связь между парой продуктов одна, даже если пара встречается в нескольких таблицах
 * (A в таблице B, B в таблице A, вторая таблица того же продукта) - берётся самый сильный уровень.
 */
export function buildGraph(tables: PairingTable[], products: Product[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const productByKey = new Map<string, Product>();
  products.forEach(p => [p.name, ...(p.aliases ?? [])].forEach(a => productByKey.set(toKey(a), p)));

  const nodes = new Map<string, GraphNode>();
  const resolve = (text: string, columnCategory: string): string => {
    const product = productByKey.get(toKey(text));
    if (!product) console.warn(`Нет в products.json: "${text}"`);
    const name = product?.name ?? text.trim().toLowerCase();
    if (!nodes.has(name)) {
      nodes.set(name, { id: name, name, category: product?.category ?? capitalize(columnCategory) });
    }
    return name;
  };

  const links = new Map<string, GraphLink>();
  tables.forEach(table => {
    const source = resolve(table.header, 'Без категории');
    table.columns.forEach(column => column.cells.forEach(([text, color]) => {
      const value = levelByColor[color];
      if (!value) return;
      const target = resolve(text, column.category);
      if (target === source) return;
      const key = [source, target].sort().join('|');
      const existing = links.get(key);
      if (!existing || levelRank[value] > levelRank[existing.value]) {
        links.set(key, { source, target, value });
      }
    }));
  });

  return { nodes: Array.from(nodes.values()), links: Array.from(links.values()) };
}
