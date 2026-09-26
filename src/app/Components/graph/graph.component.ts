import { Component, HostListener, inject, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { NavComponent } from '../nav/nav.component';
import { buildGraph, GraphLink, GraphNode, Level, PairingTable, Product } from './graph-data';

interface Node extends GraphNode, d3.SimulationNodeDatum {
  hidden?: boolean;
}

type Link = GraphLink;

interface GraphSettings {
  mode: 'strict' | 'extended'; // Два режима отображения
}

interface FilterOptions {
  showRed: boolean;
  showYellow: boolean;
  showGreen: boolean;
  showBlue: boolean;
}

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [FormsModule, NavComponent],
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit {
  private zone = inject(NgZone);
  private svg: any;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | undefined;
  private simulation: d3.Simulation<Node, d3.SimulationLinkDatum<Node>> | undefined;
  filtersOpen = true;
  modeHelpOpen = false;
  graphEmpty = false;
  graph: { nodes: Node[]; links: Link[] } = { nodes: [], links: [] };
  filteredLinks: Link[] = [];
  selectedProducts: string[] = [];
  searchTerm: string = '';
  groupedProducts: {category: string; items: string[]}[] = [];

  filter: FilterOptions = {
    showRed: true,
    showYellow: false,
    showGreen: false,
    showBlue: false
  };

  // По убыванию сочетаемости
  readonly levels: { color: Level; label: string }[] = [
    { color: 'red', label: 'Красный' },
    { color: 'yellow', label: 'Жёлтый' },
    { color: 'green', label: 'Зелёный' },
    { color: 'blue', label: 'Синий' }
  ];

  settings: GraphSettings = {
    mode: 'extended' // По умолчанию расширенный режим
  };

  async ngOnInit(): Promise<void> {
    const [tables, products] = await Promise.all([
      fetch('data/tables.json').then(r => r.json() as Promise<PairingTable[]>),
      fetch('data/products.json').then(r => r.json() as Promise<Product[]>)
    ]);
    this.graph = buildGraph(tables, products);
    this.groupProducts();
    this.applyFilter();

    // Размер графа меняется при скрытии фильтров и повороте экрана
    new ResizeObserver(() => this.zone.runOutsideAngular(() => this.fitToView()))
      .observe(document.getElementById('graph-container')!);
  }

  // pointerdown, а не click: iOS Safari не отправляет click в document при тапе по некликабельному элементу
  @HostListener('document:pointerdown', ['$event'])
  closeModeHelpOnOutsideClick(event: PointerEvent): void {
    if (this.modeHelpOpen && !(event.target as Element).closest('.help')) {
      this.modeHelpOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  closeModeHelp(): void {
    this.modeHelpOpen = false;
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

    this.graphEmpty = visibleNodes.size === 0;
  }

  setMode(mode: GraphSettings['mode']): void {
    this.settings.mode = mode;
    this.applyFilter();
  }

  private shouldShowLink(link: Link): boolean {
    switch (link.value) {
      case 'red': return this.filter.showRed;
      case 'yellow': return this.filter.showYellow;
      case 'green': return this.filter.showGreen;
      case 'blue': return this.filter.showBlue;
      default: return false;
    }
  }

  // Вне зоны Angular: иначе каждый тик симуляции и событие drag/zoom запускают проверку изменений,
  // и список продуктов перерисовывается прямо во время клика
  private renderGraph(): void {
    this.zone.runOutsideAngular(() => this.drawGraph());
  }

  private drawGraph(): void {
    d3.select('#graph-container').selectAll('*').remove();

    const containerElement = document.getElementById('graph-container');
    const width = containerElement?.clientWidth || 800;
    const height = containerElement?.clientHeight || 600;

    // Создаем SVG с контейнером для zoom
    this.svg = d3.select('#graph-container')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('display', 'block');

    const container = this.svg.append('g').classed('container', true);

    // Настройка zoom. Нижняя граница маленькая: большой граф на телефоне вписывается с сильным уменьшением
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

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
      .velocityDecay(0.3)
      .stop();

    // Раскладка считается сразу до конца, без анимации: вписать граф в экран можно только по итоговым позициям.
    // Число тиков - столько, за сколько alpha опускается до alphaMin и симуляция сама бы остановилась
    const ticksToSettle = Math.ceil(Math.log(this.simulation.alphaMin()) / Math.log(1 - this.simulation.alphaDecay()));
    this.simulation.tick(ticksToSettle);

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

    // Обновление позиций (при перетаскивании узла симуляция перезапускается)
    const updatePositions = () => {
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
    };
    updatePositions();
    this.simulation.on('tick', updatePositions);

    this.fitToView();
  }

  // Масштаб и сдвиг, при которых все видимые узлы с подписями помещаются в контейнер. Крупнее 1:1 не увеличивает
  private fitToView(): void {
    const containerElement = document.getElementById('graph-container');
    const nodes = this.graph.nodes.filter(node => !node.hidden);
    if (!this.svg || !this.zoom || !containerElement?.clientWidth || !nodes.length) {
      return;
    }

    const width = containerElement.clientWidth;
    const height = containerElement.clientHeight;
    this.svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Отступы под радиус узла и подпись: по бокам - половина ширины длинного слова, снизу - до трёх строк
    const x0 = Math.min(...nodes.map(n => n.x ?? 0)) - 40;
    const x1 = Math.max(...nodes.map(n => n.x ?? 0)) + 40;
    const y0 = Math.min(...nodes.map(n => n.y ?? 0)) - 20;
    const y1 = Math.max(...nodes.map(n => n.y ?? 0)) + 55;

    const scale = Math.min(1, width / (x1 - x0), height / (y1 - y0));
    const transform = d3.zoomIdentity
      .translate(width / 2 - scale * (x0 + x1) / 2, height / 2 - scale * (y0 + y1) / 2)
      .scale(scale);
    this.svg.call(this.zoom.transform, transform);
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
        .attr('fill', '#1c1f24')
        // Белая обводка под буквами - подпись читается поверх линий
        .attr('stroke', '#fff')
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round')
        .attr('paint-order', 'stroke')
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
    this.applyFilter();
  }

  getCompatibilityColor(value: string): string {
    const colors = {
      red: '#e03131',
      yellow: '#f0a800',
      green: '#2f9e44',
      blue: '#3b5bdb'
    };
    return colors[value as keyof typeof colors] || '#cccccc';
  }

  getCategoryColor(category: string): string {
    const colors = {
      'Ягоды': '#ff6b6b',
      'Цитрус': '#feca57',
      'Фрукты': '#1dd1a1',
      'Травы': '#6ab04c',
      'Специи': '#e67e22',
      'Орехи': '#8d6e63',
      'Гастро': '#576574',
      'Напитки': '#54a0ff',
      'Десерт': '#c49c9cff',
      'Цветы': '#f368e0',
      'Растения': '#0c830cff',
      'Овощи': '#5f27cd',
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
    items: items.sort((a, b) => a.localeCompare(b))
  })).sort((a, b) => a.category.localeCompare(b.category));
}

toggleProductSelection(product: string): void {
  this.selectedProducts = this.selectedProducts.includes(product)
    ? this.selectedProducts.filter(p => p !== product)
    : [...this.selectedProducts, product];

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
        item.toLowerCase().includes(term) ||
        group.category.toLowerCase().includes(term)
      )
    }))
    .filter(group => group.items.length > 0);
}
}