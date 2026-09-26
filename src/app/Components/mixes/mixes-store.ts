import { Injectable } from '@angular/core';
import { isMixValid, Mix, MixCategory } from './mix';

interface Backup {
  version: number;
  mixes: Mix[];
}

const STORAGE_KEY = 'food-pairing.mixes';
const STORAGE_VERSION = 1;

/**
 * Миксы хранятся в localStorage браузера: одно устройство - свой список.
 */
@Injectable({ providedIn: 'root' })
export class MixesStore {
  private mixes: Mix[] = this.read();

  list(): Mix[] {
    return this.mixes;
  }

  save(mix: Mix): void {
    const saved: Mix = { ...mix, updatedAt: new Date().toISOString() };
    const index = this.mixes.findIndex(m => m.id === saved.id);
    this.mixes = index < 0
      ? [...this.mixes, saved]
      : this.mixes.map(m => (m.id === saved.id ? saved : m));
    this.write();
  }

  remove(id: string): void {
    this.mixes = this.mixes.filter(mix => mix.id !== id);
    this.write();
  }

  replaceAll(mixes: Mix[]): void {
    this.mixes = mixes;
    this.write();
  }

  toBackupJson(): string {
    return JSON.stringify({ version: STORAGE_VERSION, mixes: this.mixes } satisfies Backup, null, 2);
  }

  /**
   * Разбирает файл резервной копии. Бросает исключение, если это не копия миксов.
   * Миксы, не проходящие правила (меньше двух вкусов, "попробовал" без оценки), в список не попадают.
   */
  parseBackup(json: string): Mix[] {
    const backup = JSON.parse(json) as Backup;
    if (!backup || !Array.isArray(backup.mixes)) {
      throw new Error('В файле нет списка миксов');
    }

    const mixes = backup.mixes.map(mix => {
      if (!Array.isArray(mix?.items) || mix.items.some(item => typeof item?.flavor !== 'string')) {
        throw new Error('В файле испорчен состав микса');
      }
      const category: MixCategory = mix.category === 'planned' ? 'planned' : 'tried';
      return {
        id: typeof mix.id === 'string' ? mix.id : crypto.randomUUID(),
        name: mix.name,
        items: mix.items.map(item => ({ brand: item.brand, flavor: item.flavor })),
        rating: category === 'tried' ? mix.rating : undefined,
        category,
        updatedAt: typeof mix.updatedAt === 'string' ? mix.updatedAt : new Date().toISOString()
      };
    }).filter(isMixValid);

    if (!mixes.length) {
      throw new Error('В файле нет ни одного подходящего микса');
    }

    return mixes;
  }

  private read(): Mix[] {
    // Хранилище недоступно в приватном режиме, а содержимое мог испортить импорт чужого файла
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Backup).mixes ?? [] : [];
    } catch {
      return [];
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, mixes: this.mixes } satisfies Backup));
    } catch {
      alert('Не удалось сохранить миксы: браузер запретил запись в хранилище');
    }
  }
}
