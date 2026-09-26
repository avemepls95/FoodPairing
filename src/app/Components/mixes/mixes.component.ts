import { Component, ElementRef, inject, OnInit, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavComponent } from '../nav/nav.component';
import { isMixValid, Mix, MixCategory, MIX_MIN_ITEMS } from './mix';
import { MixesStore } from './mixes-store';

@Component({
  selector: 'app-mixes',
  standalone: true,
  imports: [FormsModule, NavComponent],
  templateUrl: './mixes.component.html',
  styleUrls: ['./mixes.component.css']
})
export class MixesComponent implements OnInit {
  private store = inject(MixesStore);
  private formDialog = viewChild.required<ElementRef<HTMLDialogElement>>('formDialog');

  readonly stars = [1, 2, 3, 4, 5];
  readonly minItems = MIX_MIN_ITEMS;

  mixes: Mix[] = [];
  tab: MixCategory = 'tried';
  bestFirst = true;
  draft: Mix | undefined;
  isNewMix = false;

  ngOnInit(): void {
    this.mixes = this.store.list();
  }

  get visibleMixes(): Mix[] {
    const mixes = this.mixes.filter(mix => mix.category === this.tab);
    return this.tab === 'tried'
      ? mixes.sort((a, b) => (this.bestFirst ? 1 : -1) * ((b.rating ?? 0) - (a.rating ?? 0)))
      : mixes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  count(category: MixCategory): number {
    return this.mixes.filter(mix => mix.category === category).length;
  }

  hasBrands(mix: Mix): boolean {
    return mix.items.some(item => !!item.brand);
  }

  addMix(): void {
    this.isNewMix = true;
    this.openDialog({
      id: crypto.randomUUID(),
      items: [{ flavor: '' }, { flavor: '' }],
      category: this.tab,
      updatedAt: new Date().toISOString()
    });
  }

  editMix(mix: Mix): void {
    this.isNewMix = false;
    this.openDialog({ ...mix, items: mix.items.map(item => ({ ...item })) });
  }

  closeDialog(): void {
    this.formDialog().nativeElement.close();
    this.draft = undefined;
  }

  // У модального окна клик мимо содержимого приходит на сам dialog
  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.formDialog().nativeElement) {
      this.closeDialog();
    }
  }

  addItem(): void {
    this.draft?.items.push({ flavor: '' });
  }

  removeItem(index: number): void {
    this.draft?.items.splice(index, 1);
  }

  setCategory(category: MixCategory): void {
    if (!this.draft) {
      return;
    }
    this.draft.category = category;
    if (category === 'planned') {
      this.draft.rating = undefined;
    }
  }

  get draftValid(): boolean {
    return !!this.draft && isMixValid(this.draft);
  }

  saveDraft(): void {
    if (!this.draft || !this.draftValid) {
      return;
    }
    this.store.save({
      ...this.draft,
      name: this.draft.name?.trim() || undefined,
      items: this.draft.items
        .filter(item => item.flavor.trim())
        .map(item => ({ brand: item.brand?.trim() || undefined, flavor: item.flavor.trim() }))
    });
    this.tab = this.draft.category;
    this.mixes = this.store.list();
    this.closeDialog();
  }

  removeMix(mix: Mix): void {
    if (confirm(`Удалить микс "${mix.name || mix.items.map(item => item.flavor).join(' + ')}"?`)) {
      this.store.remove(mix.id);
      this.mixes = this.store.list();
    }
  }

  exportBackup(): void {
    const file = new Blob([this.store.toBackupJson()], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mixes-${new Date().toISOString().slice(0, 10)}.json`;
    // Safari скачивает по такой ссылке, только если она есть в документе
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async importBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    try {
      const mixes = this.store.parseBackup(await file.text());
      if (confirm(`Заменить текущий список (${this.mixes.length}) на миксы из файла (${mixes.length})?`)) {
        this.store.replaceAll(mixes);
        this.mixes = this.store.list();
      }
    } catch (error) {
      alert(`Не удалось прочитать файл: ${(error as Error).message}`);
    }
  }

  // Модальное окно: пока форма открыта, до остальных миксов не добраться
  private openDialog(draft: Mix): void {
    this.draft = draft;
    this.formDialog().nativeElement.showModal();
  }
}
