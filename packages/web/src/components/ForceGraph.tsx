import React, { useRef, useEffect, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import type { GraphNode, GraphEdge } from '../types.js';

const LAYER_COLORS: Record<string, string> = {
  entry: '#f0883e', core: '#58a6ff', util: '#8b949e',
  type: '#3fb950', config: '#d2a8ff', test: '#f778ba',
};

function nodeColor(node: GraphNode): string {
  return LAYER_COLORS[node.layer ?? ''] ?? '#8b949e';
}

function nodeRadius(node: GraphNode): number {
  return Math.max(6, Math.min(20, 4 + node.inDegree * 3));
}

function nodeLabel(id: string): string {
  const parts = id.split('/');
  const filename = parts[parts.length - 1];
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onNodeClick: (node: GraphNode) => void;
  onNodeDoubleClick: (node: GraphNode) => void;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, edges, selectedNode, onNodeClick, onNodeDoubleClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoomBehavior);

    // Prepare edge data with source/target as ids
    const linkData = edges.map(e => ({ ...e, source: e.from, target: e.to }));
    const nodeData = nodes.map(n => ({ ...n }));

    // Simulation
    const simulation = forceSimulation<GraphNode>(nodeData)
      .force('link', forceLink(linkData).id((d: any) => d.id).distance(80))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<GraphNode>().radius(d => nodeRadius(d) + 5));

    simulationRef.current = simulation;

    // Edges
    const link = g.append('g')
      .attr('stroke', '#30363d')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke-width', 1);

    // Nodes
    const node = g.append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodeData)
      .join('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => nodeColor(d))
      .attr('stroke', d => selectedNode && d.id === selectedNode.id ? '#ffffff' : 'none')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => onNodeClick(d))
      .on('dblclick', (_event, d) => onNodeDoubleClick(d));

    // Drag
    node.call(
      (select as any)
        ? (selection: any) => {
            let dragSubject: GraphNode | null = null;
            selection
              .on('mousedown.drag', (event: MouseEvent, d: GraphNode) => {
                dragSubject = d;
                d.fx = d.x;
                d.fy = d.y;
                const onMove = (e: MouseEvent) => {
                  if (!dragSubject) return;
                  const transform = (svg.node() as any).__zoom ?? zoomIdentity;
                  dragSubject.fx = (e.clientX - transform.x) / transform.k;
                  dragSubject.fy = (e.clientY - transform.y) / transform.k;
                  simulation.alpha(0.3).restart();
                };
                const onUp = () => {
                  if (dragSubject) {
                    dragSubject.fx = null;
                    dragSubject.fy = null;
                    dragSubject = null;
                  }
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                event.stopPropagation();
              });
          }
        : () => {}
    );

    // Labels
    const label = g.append('g')
      .selectAll('text')
      .data(nodeData)
      .join('text')
      .text(d => nodeLabel(d.id))
      .attr('font-size', 10)
      .attr('fill', '#8b949e')
      .attr('dx', d => nodeRadius(d) + 4)
      .attr('dy', 3)
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node
        .attr('cx', d => d.x ?? 0)
        .attr('cy', d => d.y ?? 0);
      label
        .attr('x', (d: any) => d.x ?? 0)
        .attr('y', (d: any) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, selectedNode, onNodeClick, onNodeDoubleClick]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
};
