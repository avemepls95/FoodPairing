import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';

interface FoodItem {
  name: string;
  category: string;
  red?: string[];
  orange?: string[];
  green?: string[];
  blue?: string[];
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: string;
  hidden?: boolean;
}

interface Link {
  source: string;
  target: string;
  value: 'red' | 'orange' | 'green' | 'blue';
}

interface GraphSettings {
  mode: 'strict' | 'extended'; // Два режима отображения
}

interface FilterOptions {
  showRed: boolean;
  showOrange: boolean;
  showGreen: boolean;
  showBlue: boolean;
}

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit {
  data: FoodItem[] = [
    {
      name: "облепиха",
      category: "Ягоды",
      orange: ["клубника", "апельсин", "сыр", "манго", "портвейн"],
      green: ["виноград", "клюква", "грейп", "салями", "папайя", "виски", "сидр"],
      blue: ["лавр", "какао", "гвоздика", "т. шоколад", "мандарин", "грени смит", 
             "клубника", "ананас", "ром", "к. вишня", "банан", "ч. чай"]
    },
    {
      name: "абсент",
      category: "Напитки",
      green: ["сл. вишня", "базилик", "п. мята", "шалфей", "мята", "бекон"],
      blue: ["лайм", "клюква", "мандарин", "канталуп", "эстрагон", "анис"]
    },
    {
      name: "попкорн",
      category: "Десерт",
      orange: ["кофе"],
      green: ["какао", "вафли", "арахис", "хлеб", "сыр", "томат", "кукуруза", "ч. чай"],
      blue: ["клубника", "бергамот", "мед", "ваниль", "яблоко", "салями", "тыква", "лосось"]
    },
    {
      name: "к. вишня",
      category: "Ягоды",
      red: ["базилик"],
      orange: ["корица"],
      green: ["сл. вишня", "клубника", "черника", "асаи", "клюква", "лавр", "эстрагон", "какао", "т. шоколад", "гвоздика", "маракуя", "яблоко", "ч. чай", "портвейн", "жасмин"],
      blue: ["облепиха", "бойсенбери", "малина", "слива", "ежевика", "лайм", "грейп", "лемонграсс", "шалфей", "сливочный сыр", "карамель", "лакрица", "анис", "нектарин", "персик", "банан", "абрикос", "з. чай", "кофе", "виски", "роза"], 
    },
    {
      name: "абрикос",
      category: "Фрукты",
      red: ["оливки", "персик", "нектарин", "коньяк", "джин", "водка"],
      orange: ["кр. сухое", "имб. пиво"],
      green: ["клубника", "малина", "эстрагон", "манго", "маракуйя", "ром"],
      blue: ["черника", "клюква", "виноград", "бергамот", "базилик", "чеддер", "салями", "банан", "слива", "ананас", "яблоко", "ч. чай", "портвейн", "шампанское", "бузина"]
    },
    {
      name: "апельсин",
      category: "Цитрус",
      red: [],
      orange: ["манго", "мандарин", "водка"],
      green: ["ч. чай", "грейпфрут", "гуава", "малина", "кр. сухое"],
      blue: ["ч. смородина", "личи", "эстрагон", "базилик", "кардамон", "морковь", "папайа", "яблоко", "портвейн", "клюква", "сл. вишня", "брусника", "черника", "роза", "бузина", "кардамон"]
    },
    {
      name: "елки",
      category: "Хвоя",
      red: ["можжевельник", "арахис", "джин"],
      orange: ["базилик"],
      green: ["ч. перец", "лемонграсс", "эастргон", "бекон", "салями", "морковь", "манго", "кардамон"],
      blue: ["сл. вишня", "лимон", "мандарин", "грейпфрут", "бергамот", "лавр", "анис", "корица", "чили", "абсент", "водка"]
    },
    {
      name: "киви",
      category: "Фрукты",
      red: ["ужевика", "дыня", "сл. вишня", "гуава", "манго", "яблоко", "банан"],
      orange: [],
      green: [],
      blue: ["фейхоа", "клубника", "сыр", "папайа", "сидр", "портвейн"]
    },
    {
      name: "к. вишня2",
      category: "Ягоды",
      red: ["бергамот", "базилик", "мелисса", "портвейн", "имб. пиво", "бузина", "корица", "томат"],
      orange: ["бренди", "ч. чай", "роза"],
      green: ["клюква", "виноград", "сл. вишня", "клубника", "лайм", "эстрагон", "мед", "т. шоколад", "бекон", "коньяк", "какао", "гвоздика"],
      blue: ["асаи", "маракуйя", "яблоко", "джин", "жасмин"]
    },
    {
      name: "лимон",
      category: "Цитрус",
      red: ["водка", "ч. чай"],
      orange: [],
      green: ["виноград", "мандарин", "банан", "томат"],
      blue: ["гранат", "малина", "брусника", "клубника", "виноград", "апельсин", "лайм", "мелисса", "эстрагон", "мед", "гр. орех", "салями", "груша", "гуава", "манго", "ром", "тимьян", "огурец"]
    },
    {
      name: "персик",
      category: "Фрукты",
      red: [],
      orange: ["нектарин"],
      green: ["малина", "слива", "эстрагон", "ч. чай", "абрикос"],
      blue: ["сл. вишня", "клюква", "клубника", "морковь", "гуава", "папайа", "яблоко"]
    },
    {
      name: "шоколад",
      category: "Десерт",
      red: [],
      orange: [],
      green: ["клубника", "арахис", "бекон", "сыр", "ч. чай"],
      blue: ["какао", "кокос"]
    },
    {
      name: "слива",
      category: "фрукты",
      red: [],
      orange: ["персик", "яблоко"],
      green: ["малина", "канталуп", "клубника", "сл. вишня", "виноград", "арахис", "сыр", "бекон", "нектарин", "груша", "маракуйя", "банан", "гуава", "ч. чай", "виски", "ром"],
      blue: ["земляника", "клюква", "базилик", "лавр", "т. шоколад", "огурец", "томат", "морковь", "абрикос", "манго", "з. чай"]
    },
    {
      name: "клубника",
      category: "Ягоды",
      red: ["сыр", "гуава", "ананас", "т. пиво"],
      orange: ["земляника", "мандарин", "кр. яблоко", "коньяк", "томат"],
      green: ["малина", "т. шоколад", "сыр", "манго", "портвейн"],
      blue: ["какао", "слив сыр", "томат", "бекон", "банан", "яблоко", "гуава", "виноград", "клюква", "сл. вишня", "фейхоа", "дыня", "зел. яблоко", "персик", "ч. чай"]
    }
  ];

  private svg: any;
  private simulation: d3.Simulation<Node, d3.SimulationLinkDatum<Node>> | undefined;
  graph: { nodes: Node[]; links: Link[] } = { nodes: [], links: [] };
  filteredLinks: Link[] = [];
  selectedProducts: string[] = [];
  searchTerm: string = '';
  groupedProducts: {category: string; items: {name: string, selected: boolean}[]}[] = [];

  filter: FilterOptions = {
    showRed: true,
    showOrange: true,
    showGreen: true,
    showBlue: true
  };

  settings: GraphSettings = {
    mode: 'extended' // По умолчанию расширенный режим
  };

  ngOnInit(): void {
    this.prepareGraphData();
    this.groupProducts();
    this.renderGraph();
  }

  private prepareGraphData(): void {
    const allNodes = new Map<string, Node>();
    
    this.data = this.data.filter(i => !!i.name);
    this.data.forEach(item => {
      allNodes.set(item.name, {
        id: item.name,
        name: item.name,
        category: item.category
      });

      ['red', 'orange', 'green', 'blue'].forEach(color => {
        const items = item[color as keyof FoodItem] as string[] || [];
        items.forEach(targetName => {
          if (!allNodes.has(targetName)) {
            allNodes.set(targetName, {
              id: targetName,
              name: targetName,
              category: 'Без категории'
            });
          }
        });
      });
    });

    this.graph.nodes = Array.from(allNodes.values());

    this.graph.links = [];
    this.data.forEach(sourceItem => {
      ['red', 'orange', 'green', 'blue'].forEach(color => {
        const items = sourceItem[color as keyof FoodItem] as string[] || [];
        items.forEach(targetName => {
          this.graph.links.push({
            source: sourceItem.name,
            target: targetName,
            value: color as 'red' | 'orange' | 'green' | 'blue'
          });
        });
      });
    });

    this.applyFilter();
  }

  applyFilter(): void {
    // 1. Фильтрация связей по цвету
    let visibleLinks = this.graph.links.filter(link => 
      this.shouldShowLink(link)
    );

    // 2. Применяем фильтр по продуктам (если есть выбранные)
    if (this.selectedProducts.length > 0) {
      const selectedSet = new Set(this.selectedProducts);
      
      if (this.settings.mode === 'strict') {
        // Режим 1: Только выбранные узлы и связи между ними
        visibleLinks = visibleLinks.filter(link => 
          selectedSet.has(link.source) && selectedSet.has(link.target)
        );
      } else {
        // Режим 2: Выбранные узлы + их непосредственные связи
        visibleLinks = visibleLinks.filter(link => 
          selectedSet.has(link.source) || selectedSet.has(link.target)
        );
      }
    }

    this.filteredLinks = visibleLinks;
    this.updateNodesVisibility();
    this.renderGraph();
  }

  private updateNodesVisibility(): void {
    const visibleNodes = new Set<string>();

    // Всегда показываем выбранные узлы (даже в strict режиме)
    this.selectedProducts.forEach(node => visibleNodes.add(node));

    // Добавляем узлы из видимых связей
    this.filteredLinks.forEach(link => {
      visibleNodes.add(link.source);
      visibleNodes.add(link.target);
    });

    this.graph.nodes.forEach(node => {
      node.hidden = !visibleNodes.has(node.id);
    });
  }

  toggleViewMode(): void {
    this.settings.mode = this.settings.mode === 'strict' ? 'extended' : 'strict';
    this.applyFilter();
  }

  private shouldShowLink(link: Link): boolean {
    switch (link.value) {
      case 'red': return this.filter.showRed;
      case 'orange': return this.filter.showOrange;
      case 'green': return this.filter.showGreen;
      case 'blue': return this.filter.showBlue;
      default: return false;
    }
  }

  private renderGraph(): void {
    d3.select('#graph-container').selectAll('*').remove();

    const width = document.getElementById('graph-container')?.clientWidth ?? 800;
    const height = 600;

    // Создаем SVG с контейнером для zoom
    this.svg = d3.select('#graph-container')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '700px')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const container = this.svg.append('g').classed('container', true);

    // Настройка zoom
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    this.svg.call(zoom);

    const visibleNodes = this.graph.nodes.filter(node => !node.hidden);
    const d3Links = this.filteredLinks.map(link => ({
      source: visibleNodes.find(n => n.id === link.source)!,
      target: visibleNodes.find(n => n.id === link.target)!,
      value: link.value
    }));

    // Симуляция с оптимизированными параметрами
    this.simulation = d3.forceSimulation<Node>(visibleNodes)
      .force('link', d3.forceLink(d3Links)
        .id(d => (d as Node).id)
        .distance(100)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
      )
      .force('collision', d3.forceCollide()
        .radius(35)
        .strength(0.8)
      )
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1))
      .alphaDecay(0.05)
      .velocityDecay(0.3);

    // Рисуем связи
    const link = container.append('g')
      .selectAll('line')
      .data(d3Links)
      .enter()
      .append('line')
      .attr('stroke', (d: { value: string; }) => this.getCompatibilityColor(d.value))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7);

    // Рисуем узлы
    const node = container.append('g')
      .selectAll('circle')
      .data(visibleNodes)
      .enter()
      .append('circle')
      .attr('r', 15)
      .attr('fill', (d: { category: string; }) => this.getCategoryColor(d.category))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    // Рисуем текст с переносами
    const text = container.append('g')
      .selectAll('g.text-node')
      .data(visibleNodes)
      .enter()
      .append('g')
      .classed('text-node', true)
      .call(this.wrapText, 60);

    // Обновление позиций
    this.simulation.on('tick', () => {
      // Ограничиваем позиции узлов
      visibleNodes.forEach(node => {
        node.x = Math.max(20, Math.min(width - 20, node.x ?? width / 2));
        node.y = Math.max(20, Math.min(height - 20, node.y ?? height / 2));
      });

      link
        .attr('x1', (d: { source: { x: any; }; }) => d.source.x ?? 0)
        .attr('y1', (d: { source: { y: any; }; }) => d.source.y ?? 0)
        .attr('x2', (d: { target: { x: any; }; }) => d.target.x ?? 0)
        .attr('y2', (d: { target: { y: any; }; }) => d.target.y ?? 0);

      node
        .attr('cx', (d: { x: any; }) => d.x ?? 0)
        .attr('cy', (d: { y: any; }) => d.y ?? 0);

      text
        .attr('transform', (d: { x: any; y: any; }) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });
  }

  private wrapText(selection: any, width: number) {
    selection.each(function(this: SVGGElement, d: Node) {
      const g = d3.select(this);
      g.selectAll('*').remove();
      
      const words = d.name.split(/\s+/);
      const lineHeight = 1.1;
      const fontSize = 10;
      let y = 25;
      
      let tspan = g.append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', `${fontSize}px`)
        .attr('fill', '#333')
        .selectAll('tspan')
        .data(words)
        .enter()
        .append('tspan')
        .attr('x', 0)
        .attr('y', (_, i) => y + i * fontSize * lineHeight)
        .text(word => word);
    });
  }

  getFilterValue(color: string): boolean {
    const key = `show${color.charAt(0).toUpperCase()}${color.slice(1)}` as keyof FilterOptions;
    return this.filter[key];
  }

  toggleFilter(color: string): void {
    const key = `show${color.charAt(0).toUpperCase()}${color.slice(1)}` as keyof FilterOptions;
    this.filter[key] = !this.filter[key];
    
    // Сохраняем выбранные продукты при обновлении
    const currentSelected = [...this.selectedProducts];
    this.applyFilter();
    this.selectedProducts = currentSelected;
  }

  getCompatibilityColor(value: string): string {
    const colors = {
      red: '#ff0000',
      orange: '#ffa500',
      green: '#008000',
      blue: '#0000ff'
    };
    return colors[value as keyof typeof colors] || '#cccccc';
  }

  getCategoryColor(category: string): string {
    const colors = {
      'Ягоды': '#ff6b6b',
      'Цитрус': '#feca57',
      'Фрукты': '#1dd1a1',
      'Хвоя': '#0c830cff',
      'Напитки': '#54a0ff',
      'Десерт': '#c49c9cff',
      'Без категории': '#8395a7'
    };
    return colors[category as keyof typeof colors] || '#8395a7';
  }

  private dragStarted(event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: Node): void {
    if (!event.active && this.simulation) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: Node): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragEnded(event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: Node): void {
    if (!event.active && this.simulation) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

 private groupProducts(): void {
  const categories = new Map<string, string[]>();
  
  this.graph.nodes.forEach(node => {
    const category = node.category || 'Без категории';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)?.push(node.name);
  });

  this.groupedProducts = Array.from(categories.entries()).map(([category, items]) => ({
    category,
    items: items.map(name => ({
      name,
      selected: this.selectedProducts.includes(name) // Используем актуальный массив выбранных
    })).sort((a, b) => a.name.localeCompare(b.name))
  })).sort((a, b) => a.category.localeCompare(b.category));
}

// Метод отображает только выбранные узлы (и связи между ними, если есть)
applyProductFilter2(): void {
  if (this.selectedProducts.length === 0) {
    this.applyFilter(); // Возвращаем обычную фильтрацию, если ничего не выбрано
    return;
  }

  // Создаем Set для быстрого поиска выбранных продуктов
  const selectedSet = new Set(this.selectedProducts);

  // Фильтруем связи - оставляем только те, где И source И target выбраны
  this.filteredLinks = this.graph.links.filter(link => 
    selectedSet.has(link.source) && selectedSet.has(link.target)
  );

  // Фильтруем узлы - оставляем только выбранные
  this.graph.nodes.forEach(node => {
    node.hidden = !selectedSet.has(node.id);
  });

  this.renderGraph();
}

// Обработчик выбора продукта
toggleProductSelection(product: string): void {
  // Создаем новый массив вместо мутации
  this.selectedProducts = this.selectedProducts.includes(product)
    ? this.selectedProducts.filter(p => p !== product)
    : [...this.selectedProducts, product];
  
  // Обновляем состояние в groupedProducts
  this.groupedProducts = this.groupedProducts.map(group => ({
    ...group,
    items: group.items.map(item => ({
      ...item,
      selected: this.selectedProducts.includes(item.name)
    }))
  }));

    this.applyFilter();
}

// Фильтрация для поиска
get filteredGroups() {
  if (!this.searchTerm) return this.groupedProducts;
  
  const term = this.searchTerm.toLowerCase();
  return this.groupedProducts
    .map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.name.toLowerCase().includes(term) ||
        group.category.toLowerCase().includes(term)
      )
    }))
    .filter(group => group.items.length > 0);
}
}