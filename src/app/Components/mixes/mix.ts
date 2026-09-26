export type MixCategory = 'tried' | 'planned';

export interface MixItem {
  brand?: string;
  flavor: string;
}

export interface Mix {
  id: string;
  name?: string;
  items: MixItem[];
  /** Только у категории "попробовал", от 1 до 5 */
  rating?: number;
  category: MixCategory;
  updatedAt: string;
}

export const MIX_MIN_ITEMS = 2;

export function isMixValid(mix: Mix): boolean {
  const items = mix.items.filter(item => item.flavor.trim());
  return items.length >= MIX_MIN_ITEMS && (mix.category !== 'tried' || !!mix.rating);
}
