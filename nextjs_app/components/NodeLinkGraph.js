'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';

// Colors for main fields
const FIELD_COLORS = {
  'Computer Vision': '#22d3ee',
  'Natural Language Processing': '#f472b6',
  'Robotics': '#4ade80',
  'Theory': '#fbbf24',
};

export default function NodeLinkGraph({
  nodeLinkData,
  selectedCountry,
  selectedSubfield,
  onSubfieldSelect,
}) {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 230 });
  const [expandedField, setExpandedField] = useState(null);

  // Get graph data for selected country
  const graphData = useMemo(() => {
    if (!selectedCountry || !nodeLinkData[selectedCountry]) {
      // Return default structure if no country selected
      return {
        nodes: [
          { id: 'Computer Vision', type: 'main', count: 0 },
          { id: 'Natural Language Processing', type: 'main', count: 0 },
          { id: 'Robotics', type: 'main', count: 0 },
          { id: 'Theory', type: 'main', count: 0 },
        ],
        links: [],
      };
    }
    return nodeLinkData[selectedCountry];
  }, [nodeLinkData, selectedCountry]);

  // Filter nodes based on expanded state
  const filteredData = useMemo(() => {
    if (!expandedField) {
      // Show only main nodes
      return {
        nodes: graphData.nodes.filter((n) => n.type === 'main'),
        links: [],
      };
    }

    // Show main nodes + subfields of expanded field
    const mainNodes = graphData.nodes.filter((n) => n.type === 'main');
    const subNodes = graphData.nodes.filter(
      (n) => n.type === 'sub' && n.parent === expandedField
    );
    const links = graphData.links.filter((l) => l.source === expandedField);

    return {
      nodes: [...mainNodes, ...subNodes],
      links,
    };
  }, [graphData, expandedField]);

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

  // Draw graph
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Size scale for nodes based on count
    const maxCount = d3.max(filteredData.nodes, (d) => d.count) || 1;
    const sizeScale = d3.scaleSqrt()
      .domain([0, maxCount])
      .range([15, 45]);

    // Position main nodes in a row
    const mainNodes = filteredData.nodes.filter((n) => n.type === 'main');
    const subNodes = filteredData.nodes.filter((n) => n.type === 'sub');

    const mainSpacing = width / (mainNodes.length + 1);
    mainNodes.forEach((node, i) => {
      node.x = mainSpacing * (i + 1);
      node.y = height / 3;
      node.fx = node.x;
      node.fy = node.y;
    });

    // Position sub nodes below their parent
    if (expandedField) {
      const parentNode = mainNodes.find((n) => n.id === expandedField);
      if (parentNode && subNodes.length > 0) {
        const subSpacing = Math.min(80, (width - 40) / (subNodes.length + 1));
        const startX = parentNode.x - (subNodes.length - 1) * subSpacing / 2;
        
        subNodes.forEach((node, i) => {
          node.x = startX + i * subSpacing;
          node.y = height * 0.75;
        });
      }
    }

    // Draw links
    const links = g.selectAll('.link-line')
      .data(filteredData.links)
      .join('path')
      .attr('class', 'link-line')
      .attr('d', (d) => {
        const source = filteredData.nodes.find((n) => n.id === d.source);
        const target = filteredData.nodes.find((n) => n.id === d.target);
        if (!source || !target) return '';
        
        // Curved path
        const midY = (source.y + target.y) / 2;
        return `M${source.x},${source.y} Q${source.x},${midY} ${target.x},${target.y}`;
      })
      .attr('stroke', (d) => FIELD_COLORS[d.source] || '#1e2a45')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4);

    // Draw nodes
    const nodeGroups = g.selectAll('.node-group')
      .data(filteredData.nodes)
      .join('g')
      .attr('class', (d) => `node-group node-${d.type}`)
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer');

    // Main node circles
    nodeGroups.filter((d) => d.type === 'main')
      .append('circle')
      .attr('r', (d) => sizeScale(d.count))
      .attr('fill', (d) => FIELD_COLORS[d.id] || '#64748b')
      .attr('fill-opacity', (d) => d.id === expandedField ? 0.9 : 0.6)
      .attr('stroke', (d) => d.id === expandedField ? '#fff' : FIELD_COLORS[d.id])
      .attr('stroke-width', (d) => d.id === expandedField ? 2 : 1)
      .on('click', (event, d) => {
        event.stopPropagation();
        setExpandedField(expandedField === d.id ? null : d.id);
      });

    // Sub node circles
    nodeGroups.filter((d) => d.type === 'sub')
      .append('circle')
      .attr('r', (d) => Math.max(8, sizeScale(d.count) * 0.6))
      .attr('fill', (d) => {
        const parentColor = FIELD_COLORS[d.parent];
        return d3.color(parentColor)?.brighter(0.5).toString() || '#64748b';
      })
      .attr('fill-opacity', (d) => d.id === selectedSubfield ? 0.9 : 0.5)
      .attr('stroke', (d) => d.id === selectedSubfield ? '#fff' : 'none')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        event.stopPropagation();
        onSubfieldSelect(d.id);
      });

    // Labels for main nodes
    nodeGroups.filter((d) => d.type === 'main')
      .append('text')
      .attr('class', 'node-label')
      .attr('y', (d) => sizeScale(d.count) + 14)
      .text((d) => {
        const name = d.id.replace('Natural Language Processing', 'NLP');
        return name;
      })
      .attr('font-size', 11)
      .attr('font-weight', 500);

    // Labels for sub nodes
    nodeGroups.filter((d) => d.type === 'sub')
      .append('text')
      .attr('class', 'node-label')
      .attr('y', (d) => Math.max(8, sizeScale(d.count) * 0.6) + 12)
      .text((d) => {
        const name = d.id;
        return name.length > 15 ? name.slice(0, 14) + '…' : name;
      })
      .attr('font-size', 9);

    // Count labels inside main nodes
    nodeGroups.filter((d) => d.type === 'main' && d.count > 0)
      .append('text')
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0a0e1a')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .text((d) => {
        if (d.count >= 1000000) return `${(d.count / 1000000).toFixed(1)}M`;
        if (d.count >= 1000) return `${(d.count / 1000).toFixed(0)}K`;
        return d.count;
      });

    // Tooltip
    nodeGroups
      .append('title')
      .text((d) => `${d.id}: ${d.count?.toLocaleString() || 0} papers`);

  }, [filteredData, dimensions, expandedField, selectedSubfield, onSubfieldSelect]);

  // Empty/placeholder state
  if (!selectedCountry) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-viz-muted text-sm">
        <svg className="w-16 h-16 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="3" />
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <line x1="12" y1="9" x2="7" y2="7" />
          <line x1="12" y1="9" x2="17" y2="7" />
          <line x1="12" y1="15" x2="7" y2="17" />
          <line x1="12" y1="15" x2="17" y2="17" />
        </svg>
        <p>Select a country to explore research fields</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        onClick={() => setExpandedField(null)}
      />
      {expandedField && (
        <div className="absolute top-2 right-2 text-xs text-viz-muted font-mono">
          Click field to collapse
        </div>
      )}
    </div>
  );
}