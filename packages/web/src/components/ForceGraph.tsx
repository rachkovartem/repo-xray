import React, { useRef, useEffect, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { type DirNode, type DirEdge, type GraphNode, type GraphEdge, getNodeHealth } from '../types.js';

// ─── Directory-level graph ───

interface DirGraphProps {
  nodes: DirNode[];
  edges: DirEdge[];
  onDirClick: (dirId: string) => void;
}

export const DirGraph: React.FC<DirGraphProps> = ({ nodes, edges, onDirClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const onDirClickRef = useRef(onDirClick);
  onDirClickRef.current = onDirClick;

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    svg.selectAll('*').remove();

    const g = svg.append('g');

    let currentScale = 1;
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        currentScale = event.transform.k;
        // Scale text inversely so it stays readable at any zoom
        g.selectAll('text').attr('transform', `scale(${1 / currentScale})`);
      });
    svg.call(zoomBehavior);

    const nodeData = nodes.map(n => ({ ...n }));
    const linkData = edges.map(e => ({ ...e, source: e.from, target: e.to }));

    const maxFiles = Math.max(...nodes.map(n => n.fileCount));

    function radius(n: DirNode) {
      return Math.max(20, Math.min(60, 15 + (n.fileCount / maxFiles) * 45));
    }

    const simulation = forceSimulation<DirNode>(nodeData as any)
      .force('link', forceLink(linkData as any).id((d: any) => d.id).distance(180).strength(0.4))
      .force('charge', forceManyBody().strength(-600))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<DirNode>().radius((d: any) => radius(d) + 20));

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#484f58')
      .attr('stroke-opacity', (d: any) => Math.min(0.8, 0.15 + d.weight * 0.05))
      .attr('stroke-width', (d: any) => Math.min(4, 0.5 + d.weight * 0.3));

    // Node groups
    const nodeGroup = g.append('g')
      .selectAll<SVGGElement, DirNode>('g')
      .data(nodeData)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => onDirClickRef.current(d.id));

    nodeGroup.append('circle')
      .attr('r', (d: any) => radius(d))
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7);

    nodeGroup.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('fill', d => d.color)
      .attr('font-size', d => d.fileCount > 10 ? 14 : 12)
      .attr('font-weight', 600)
      .attr('pointer-events', 'none');

    nodeGroup.append('text')
      .text(d => `${d.fileCount} files`)
      .attr('text-anchor', 'middle')
      .attr('dy', 14)
      .attr('fill', '#8b949e')
      .attr('font-size', 11)
      .attr('pointer-events', 'none');

    nodeGroup.append('text')
      .text(d => {
        const total = d.totalInDegree + d.totalOutDegree;
        return total > 0 ? `↔ ${total}` : '';
      })
      .attr('text-anchor', 'middle')
      .attr('dy', 28)
      .attr('fill', '#6e7681')
      .attr('font-size', 10)
      .attr('pointer-events', 'none');

    // Hover
    nodeGroup
      .on('mouseenter', function(_event, d) {
        select(this).select('circle')
          .attr('fill-opacity', 0.3)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', 3);

        const connectedDirs = new Set<string>();
        for (const e of edges) {
          if (e.from === d.id) connectedDirs.add(e.to);
          if (e.to === d.id) connectedDirs.add(e.from);
        }

        nodeGroup.select('circle')
          .attr('fill-opacity', (n: any) => n.id === d.id || connectedDirs.has(n.id) ? 0.3 : 0.05)
          .attr('stroke-opacity', (n: any) => n.id === d.id || connectedDirs.has(n.id) ? 1 : 0.15);

        nodeGroup.selectAll('text')
          .attr('opacity', function() {
            const parent = (this as any).parentNode?.__data__;
            return parent?.id === d.id || connectedDirs.has(parent?.id) ? 1 : 0.15;
          });

        link
          .attr('stroke', (e: any) => {
            const src = typeof e.source === 'object' ? e.source.id : e.source;
            const tgt = typeof e.target === 'object' ? e.target.id : e.target;
            return src === d.id || tgt === d.id ? d.color : '#484f58';
          })
          .attr('stroke-opacity', (e: any) => {
            const src = typeof e.source === 'object' ? e.source.id : e.source;
            const tgt = typeof e.target === 'object' ? e.target.id : e.target;
            return src === d.id || tgt === d.id ? 0.9 : 0.05;
          });
      })
      .on('mouseleave', () => {
        nodeGroup.select('circle')
          .attr('fill-opacity', 0.15)
          .attr('stroke-opacity', 0.7)
          .attr('stroke-width', 2);
        nodeGroup.selectAll('text').attr('opacity', 1);
        link
          .attr('stroke', '#484f58')
          .attr('stroke-opacity', (d: any) => Math.min(0.8, 0.15 + d.weight * 0.05));
      });

    // Drag
    nodeGroup.call((selection: any) => {
      let subject: any = null;
      selection.on('mousedown.drag', (event: MouseEvent, d: any) => {
        subject = d;
        d.fx = d.x; d.fy = d.y;
        const onMove = (e: MouseEvent) => {
          if (!subject) return;
          const t = (svg.node() as any).__zoom ?? zoomIdentity;
          subject.fx = (e.clientX - t.x) / t.k;
          subject.fy = (e.clientY - t.y) / t.k;
          simulation.alpha(0.3).restart();
        };
        const onUp = () => {
          if (subject) { subject.fx = null; subject.fy = null; subject = null; }
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        event.stopPropagation();
      });
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
};

// ─── File-level graph ───

interface FileGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  dirColor: string;
  selectedNodeId: string | null;
  onNodeClick: (node: GraphNode) => void;
}

export const FileGraph: React.FC<FileGraphProps> = ({ nodes, edges, dirColor, selectedNodeId, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  // Update selection visuals without re-running simulation
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    const healthColors: Record<string, string> = { critical: '#f85149', warning: '#d29922' };
    svg.selectAll<SVGCircleElement, GraphNode>('circle.node-circle')
      .attr('fill-opacity', d => d.id === selectedNodeId ? 0.6 : 0.3)
      .attr('stroke', d => {
        if (d.id === selectedNodeId) return '#ffffff';
        const h = getNodeHealth(d).level;
        return healthColors[h] ?? dirColor;
      })
      .attr('stroke-width', d => d.id === selectedNodeId ? 2.5 : 1.5);
  }, [selectedNodeId, dirColor]);

  // Simulation — only re-run when nodes/edges change, NOT on selection change
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow-file')
      .attr('viewBox', '0 -3 6 6').attr('refX', 16).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-3L6,0L0,3').attr('fill', '#484f58');

    const g = svg.append('g');
    let currentScale = 1;
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 6])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        currentScale = event.transform.k;
        g.selectAll('text').attr('transform', `scale(${1 / currentScale})`);
      });
    svg.call(zoomBehavior);

    const nodeIds = new Set(nodes.map(n => n.id));
    const internalEdges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
    const externalEdges = edges.filter(e => !(nodeIds.has(e.from) && nodeIds.has(e.to)));

    const nodeData = nodes.map(n => ({ ...n }));
    const linkData = internalEdges.map(e => ({ ...e, source: e.from, target: e.to }));

    const externalConnections = new Map<string, number>();
    for (const e of externalEdges) {
      if (nodeIds.has(e.from)) externalConnections.set(e.from, (externalConnections.get(e.from) ?? 0) + 1);
      if (nodeIds.has(e.to)) externalConnections.set(e.to, (externalConnections.get(e.to) ?? 0) + 1);
    }

    function radius(n: GraphNode) {
      const ext = externalConnections.get(n.id) ?? 0;
      return Math.max(8, Math.min(28, 6 + (n.inDegree + n.outDegree + ext) * 1.5));
    }

    function label(id: string) {
      const parts = id.split('/');
      const f = parts[parts.length - 1];
      const dot = f.lastIndexOf('.');
      return dot > 0 ? f.slice(0, dot) : f;
    }

    const simulation = forceSimulation<GraphNode>(nodeData)
      .force('link', forceLink(linkData as any).id((d: any) => d.id).distance(100).strength(0.5))
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<GraphNode>().radius(d => radius(d) + 10));

    const link = g.append('g')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#484f58')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrow-file)');

    const nodeGroup = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodeData)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => onNodeClickRef.current(d));

    // Health glow — render BEFORE the main circle so it's behind
    const healthColors: Record<string, string> = { critical: '#f85149', warning: '#d29922' };
    nodeGroup.filter(d => getNodeHealth(d).level !== 'ok')
      .append('circle')
      .attr('class', 'health-glow')
      .attr('r', d => radius(d) + 8)
      .attr('fill', 'none')
      .attr('stroke', d => healthColors[getNodeHealth(d).level] ?? 'none')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.7)
      .attr('pointer-events', 'none');

    // Pulsing animation for critical nodes
    nodeGroup.filter(d => getNodeHealth(d).level === 'critical')
      .append('circle')
      .attr('class', 'health-pulse')
      .attr('r', d => radius(d) + 12)
      .attr('fill', 'none')
      .attr('stroke', '#f85149')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.3)
      .attr('pointer-events', 'none');

    nodeGroup.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => radius(d))
      .attr('fill', d => {
        const h = getNodeHealth(d).level;
        if (h === 'critical') return '#f85149';
        if (h === 'warning') return '#d29922';
        return dirColor;
      })
      .attr('fill-opacity', d => d.id === selectedNodeIdRef.current ? 0.6 : 0.3)
      .attr('stroke', d => {
        if (d.id === selectedNodeIdRef.current) return '#ffffff';
        const h = getNodeHealth(d).level;
        if (h === 'critical') return '#f85149';
        if (h === 'warning') return '#d29922';
        return dirColor;
      })
      .attr('stroke-width', d => d.id === selectedNodeIdRef.current ? 2.5 : 1.5)
      .attr('stroke-opacity', 0.8);

    nodeGroup.filter(d => (externalConnections.get(d.id) ?? 0) > 0 && getNodeHealth(d).level === 'ok')
      .append('circle')
      .attr('r', d => radius(d) + 4)
      .attr('fill', 'none')
      .attr('stroke', '#6e7681')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('pointer-events', 'none');

    nodeGroup.append('text')
      .text(d => label(d.id))
      .attr('text-anchor', 'middle')
      .attr('dy', d => radius(d) + 14)
      .attr('fill', '#e6edf3')
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('pointer-events', 'none');

    // Hover
    nodeGroup
      .on('mouseenter', function(_event, d) {
        const connected = new Set<string>();
        for (const e of internalEdges) {
          if (e.from === d.id) connected.add(e.to);
          if (e.to === d.id) connected.add(e.from);
        }

        nodeGroup.select('.node-circle')
          .attr('fill-opacity', (n: any) => n.id === d.id || connected.has(n.id) ? 0.6 : 0.08);
        nodeGroup.selectAll('text')
          .attr('opacity', function() {
            const p = (this as any).parentNode?.__data__;
            return p?.id === d.id || connected.has(p?.id) ? 1 : 0.2;
          });

        link
          .attr('stroke-opacity', (e: any) => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            return s === d.id || t === d.id ? 0.9 : 0.08;
          })
          .attr('stroke', (e: any) => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            return s === d.id || t === d.id ? dirColor : '#484f58';
          });
      })
      .on('mouseleave', () => {
        nodeGroup.select('.node-circle')
          .attr('fill-opacity', (d: any) => d.id === selectedNodeIdRef.current ? 0.6 : 0.3);
        nodeGroup.selectAll('text').attr('opacity', 1);
        link.attr('stroke-opacity', 0.4).attr('stroke', '#484f58');
      });

    // Drag
    nodeGroup.call((selection: any) => {
      let subject: any = null;
      selection.on('mousedown.drag', (event: MouseEvent, d: any) => {
        subject = d;
        d.fx = d.x; d.fy = d.y;
        const onMove = (e: MouseEvent) => {
          if (!subject) return;
          const t = (svg.node() as any).__zoom ?? zoomIdentity;
          subject.fx = (e.clientX - t.x) / t.k;
          subject.fy = (e.clientY - t.y) / t.k;
          simulation.alpha(0.3).restart();
        };
        const onUp = () => {
          if (subject) { subject.fx = null; subject.fy = null; subject = null; }
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        event.stopPropagation();
      });
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges, dirColor]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
};
