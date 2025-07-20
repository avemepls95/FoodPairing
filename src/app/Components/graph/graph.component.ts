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
  // Данные продуктов
  data: FoodItem[] = [
    {
      name: "облепиха",
      category: "ягоды",
      orange: ["клубника", "апельсин", "сыр", "манго", "портвейн"],
      green: ["виноград", "клюква", "грейп", "салями", "папайя", "виски", "сидр"],
      blue: ["лавр", "какао", "гвоздика", "т. шоколад", "мандарин", "грени смит", 
             "клубника", "ананас", "ром", "к. вишня", "банан", "ч. чай"]
    },
    {
      name: "абсент",
      category: "напитки",
      green: ["сл. вишня", "базилик", "п. мята", "шалфей", "мята", "бекон"],
      blue: ["лайм", "клюква", "мандарин", "канталуп", "эстрагон", "анис"]
    }
  ];

  private svg: any;
  private simulation: d3.Simulation<Node, d3.SimulationLinkDatum<Node>> | undefined;
  graph: { nodes: Node[]; links: Link[] } = { nodes: [], links: [] };
  filteredLinks: Link[] = [];

  filter: FilterOptions = {
    showRed: true,
    showOrange: true,
    showGreen: true,
    showBlue: true
  };

  ngOnInit(): void {
    this.prepareGraphData();
    this.renderGraph();
  }

  private prepareGraphData(): void {
    const allNodes = new Map<string, Node>();
    
    // Собираем все узлы
    this.data.forEach(item => {
      allNodes.set(item.name, {
        id: item.name,
        name: item.name,
        category: item.category
      });

      // Добавляем связанные узлы
      ['red', 'orange', 'green', 'blue'].forEach(color => {
        const items = item[color as keyof FoodItem] as string[] || [];
        items.forEach(targetName => {
          if (!allNodes.has(targetName)) {
            allNodes.set(targetName, {
              id: targetName,
              name: targetName,
              category: '?'
            });
          }
        });
      });
    });

    this.graph.nodes = Array.from(allNodes.values());

    // Создаем связи
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

  private applyFilter(): void {
    const visibleNodes = new Set<string>();
    
    // Фильтруем связи и собираем видимые узлы
    this.filteredLinks = this.graph.links.filter(link => {
      const shouldShow = this.shouldShowLink(link);
      if (shouldShow) {
        visibleNodes.add(link.source);
        visibleNodes.add(link.target);
      }
      return shouldShow;
    });

    // Помечаем скрытые узлы
    this.graph.nodes.forEach(node => {
      node.hidden = !visibleNodes.has(node.id);
    });

    this.renderGraph();
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

    this.svg = d3.select('#graph-container')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '600px')
      .attr('viewBox', '0 0 800 600');

    // Получаем только видимые узлы
    const visibleNodes = this.graph.nodes.filter(node => !node.hidden);

    // Преобразуем связи для D3 (string -> Node)
    const d3Links = this.filteredLinks.map(link => ({
      source: visibleNodes.find(n => n.id === link.source)!,
      target: visibleNodes.find(n => n.id === link.target)!,
      value: link.value
    }));

    // Создаем симуляцию только с видимыми узлами
  this.simulation = d3.forceSimulation<Node>(visibleNodes)
    .force('link', d3.forceLink(d3Links)
      .id(d => (d as Node).id)
      .distance(100) // Оптимальное расстояние между связанными узлами
    )
    .force('charge', d3.forceManyBody()
      .strength(-200) // Увеличили силу отталкивания
    )
    .force('collision', d3.forceCollide()
      .radius(35) // Радиус с учетом текста
      .strength(1) // Максимальная сила столкновений
    )
    .force('center', d3.forceCenter(400, 300));

    // Рисуем связи
    const link = this.svg.append('g')
      .selectAll('line')
      .data(d3Links)
      .enter()
      .append('line')
      .attr('stroke', (d: { value: string }) => this.getCompatibilityColor(d.value))
      .attr('stroke-width', 2);

    // Рисуем узлы
    const node = this.svg.append('g')
      .selectAll('circle')
      .data(visibleNodes)
      .enter()
      .append('circle')
      .attr('r', 15)
      .attr('fill', (d: Node) => this.getCategoryColor(d.category))
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    // Подписи узлов
    const text = this.svg.append('g')
      .selectAll('text')
      .data(visibleNodes)
      .enter()
      .append('text')
      .attr('dy', -20)
      .attr('text-anchor', 'middle')
      .text((d: Node) => d.name)
      .attr('fill', '#333')
      .attr('font-size', '12px');

      const zoom = d3.zoom()
  .scaleExtent([0.5, 2])
  .on('zoom', (event) => {
    this.svg.selectAll('g').attr('transform', event.transform);
  });

this.svg.call(zoom);

    // Обновление позиций
    this.simulation.on('tick', () => {
      // Ограничиваем позиции узлов
      node.each((d: { x: number; y: number; }) => {
        d.x = Math.max(30, Math.min(770, d.x ?? 400));
        d.y = Math.max(30, Math.min(570, d.y ?? 300));
      });

      link
        .attr('x1', (d: { source: Node }) => d.source.x ?? 0)
        .attr('y1', (d: { source: Node }) => d.source.y ?? 0)
        .attr('x2', (d: { target: Node }) => d.target.x ?? 0)
        .attr('y2', (d: { target: Node }) => d.target.y ?? 0);

      node
        .attr('cx', (d: Node) => d.x ?? 0)
        .attr('cy', (d: Node) => d.y ?? 0);

      text
        .attr('x', (d: Node) => d.x ?? 0)
        .attr('y', (d: Node) => d.y ?? 0);
    });
  }

  toggleFilter(color: string): void {
    const key = `show${color.charAt(0).toUpperCase()}${color.slice(1)}` as keyof FilterOptions;
    this.filter[key] = !this.filter[key];
    this.applyFilter();
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
      'ягоды': '#ff6b6b',
      'специи': '#feca57',
      'фрукты': '#1dd1a1',
      'овощи': '#54a0ff',
      'напитки': '#5f27cd'
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

  getFilterValue(color: string): boolean {
    const key = `show${color.charAt(0).toUpperCase()}${color.slice(1)}` as keyof FilterOptions;
    return this.filter[key];
  }
}