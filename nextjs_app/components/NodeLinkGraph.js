'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';

// Colors for main fields - includes all possible field names
const FIELD_COLORS = {
  'Computer Vision': '#22d3ee',
  'Natural Language Processing': '#f472b6',
  'Robotics': '#4ade80',
  'Theory': '#fbbf24',
  'Reinforcement Learning': '#fbbf24',  // Same color as Theory
};

export default function NodeLinkGraph({
  nodeLinkData,
  selectedCountry,
  selectedSubfield,
  onSubfieldSelect,
}) {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 230 });
  const [expandedFields, setExpandedFields] = useState([]);

  const graphData = useMemo(() => {
    if (!selectedCountry || !nodeLinkData || !nodeLinkData[selectedCountry]) {
      return { nodes: [], links: [] };
    }
    return nodeLinkData[selectedCountry];
  }, [nodeLinkData, selectedCountry]);

  // Reset when country changes
  useEffect(() => {
    setExpandedFields([]);
  }, [selectedCountry]);

  // Resize observer
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Main draw effect - KEY: we handle click inside, but create a new function reference each time expandedFields changes
  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll('*').remove();

    // Get all main nodes from data
    const mainNodes = graphData.nodes.filter(n => n.type === 'main');
    
    // Get sub nodes based on current expanded state
    const subNodes = graphData.nodes.filter(n => 
      n.type === 'sub' && expandedFields.includes(n.parent)
    );
    
    const visibleNodes = [...mainNodes, ...subNodes].map(n => ({ ...n }));
    
    // Filter links to only show those connecting to visible sub nodes
    const visibleLinks = graphData.links
      .filter(l => expandedFields.includes(l.source))
      .map(l => ({ ...l }));

    const g = svg.append('g');

    // Size scale
    const maxCount = d3.max(visibleNodes, d => d.count) || 1;
    const sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([20, 50]);

    // Force simulation
    const simulation = d3.forceSimulation(visibleNodes)
      .force('link', d3.forceLink(visibleLinks).id(d => d.id).distance(60).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => sizeScale(d.count) + 5));

    // Draw links
    const link = g.selectAll('.link')
      .data(visibleLinks)
      .join('path')
      .attr('class', 'link')
      .attr('stroke', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        return FIELD_COLORS[sourceId] || '#1e2a45';
      })
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('fill', 'none');

    // Draw nodes
    const node = g.selectAll('.node')
      .data(visibleNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }));

    // Main circles with click handler
    node.filter(d => d.type === 'main').each(function(d) {
      const circle = d3.select(this).append('circle')
        .attr('r', sizeScale(d.count))
        .attr('fill', FIELD_COLORS[d.id] || '#64748b')
        .attr('fill-opacity', expandedFields.includes(d.id) ? 1 : 0.7)
        .attr('stroke', expandedFields.includes(d.id) ? '#fff' : (FIELD_COLORS[d.id] || '#64748b'))
        .attr('stroke-width', expandedFields.includes(d.id) ? 3 : 1.5);
      
      // Use a closure to capture the current d.id
      const fieldId = d.id;
      circle.on('click', (event) => {
        event.stopPropagation();
        setExpandedFields(prev => {
          if (prev.includes(fieldId)) {
            return prev.filter(f => f !== fieldId);
          } else {
            return [...prev, fieldId];
          }
        });
      });
    });

    // Sub circles
    node.filter(d => d.type === 'sub')
      .append('circle')
      .attr('r', d => Math.max(8, sizeScale(d.count) * 0.4))
      .attr('fill', d => {
        const color = FIELD_COLORS[d.parent];
        return color ? d3.color(color).brighter(0.6).toString() : '#64748b';
      })
      .attr('fill-opacity', d => d.id === selectedSubfield ? 1 : 0.7)
      .attr('stroke', d => d.id === selectedSubfield ? '#fff' : 'none')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        event.stopPropagation();
        onSubfieldSelect(d.id);
      });

    // Main labels
    node.filter(d => d.type === 'main')
      .append('text')
      .attr('dy', d => sizeScale(d.count) + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', 9)
      .attr('font-weight', 500)
      .attr('pointer-events', 'none')
      .text(d => {
        if (d.id === 'Natural Language Processing') return 'NLP';
        if (d.id === 'Reinforcement Learning') return 'RL';
        return d.id;
      });

    // Sub labels
    node.filter(d => d.type === 'sub')
      .append('text')
      .attr('dy', d => Math.max(8, sizeScale(d.count) * 0.4) + 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', 7)
      .attr('pointer-events', 'none')
      .text(d => d.id.length > 12 ? d.id.slice(0, 11) + '…' : d.id);

    // Count inside main nodes
    node.filter(d => d.type === 'main' && d.count > 0)
      .append('text')
      .attr('dy', 3)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0a0e1a')
      .attr('font-size', 8)
      .attr('font-weight', 600)
      .attr('pointer-events', 'none')
      .text(d => {
        if (d.count >= 1000000) return `${(d.count/1000000).toFixed(1)}M`;
        if (d.count >= 1000) return `${Math.round(d.count/1000)}K`;
        return d.count;
      });

    // Tick
    simulation.on('tick', () => {
      visibleNodes.forEach(d => {
        const r = d.type === 'main' ? sizeScale(d.count) : Math.max(8, sizeScale(d.count) * 0.4);
        d.x = Math.max(r + 5, Math.min(width - r - 5, d.x));
        d.y = Math.max(r + 5, Math.min(height - r - 20, d.y));
      });
      
      link.attr('d', d => {
        const sx = d.source.x, sy = d.source.y;
        const tx = d.target.x, ty = d.target.y;
        const dx = tx - sx, dy = ty - sy;
        const dr = Math.sqrt(dx*dx + dy*dy);
        return `M${sx},${sy}Q${(sx+tx)/2},${(sy+ty)/2 - dr*0.2} ${tx},${ty}`;
      });
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [graphData, dimensions, expandedFields, selectedSubfield, onSubfieldSelect]);

  if (!selectedCountry) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-viz-muted text-sm">
        <svg className="w-14 h-14 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="3" />
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
        <p>Select a country to explore</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />
      <div className="absolute top-1 right-2 text-[10px] text-viz-muted font-mono">
        Click to expand · Drag to move
      </div>
    </div>
  );
}