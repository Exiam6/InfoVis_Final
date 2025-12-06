'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';

// Color palette for compared countries - MUST match Controls.js
const COUNTRY_COLORS = [
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#4ade80', // green
  '#fbbf24', // yellow
  '#a78bfa', // purple
  '#fb7185', // rose
];

export default function TimeSeriesPanel({
  data,
  subfieldData,
  comparedCountries,
  selectedCountry,
  selectedSubfield,
  yearRange,
  onYearRangeChange,
  onCountrySelect,
}) {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 220 });

  // Process time series data - only show compared countries
  const timeSeriesData = useMemo(() => {
    if (!data.length) return [];

    const sourceData = selectedSubfield && subfieldData.length
      ? subfieldData.filter((d) => d.subfield === selectedSubfield)
      : data;

    // Only show compared countries (no default top 5)
    if (comparedCountries.length === 0) {
      return [];
    }

    return comparedCountries.map((code, i) => {
      const countryData = sourceData
        .filter((d) => d.country_code === code)
        .sort((a, b) => a.year - b.year);

      return {
        code,
        name: countryData[0]?.country || code,
        color: COUNTRY_COLORS[i % COUNTRY_COLORS.length],
        values: countryData.map((d) => ({
          year: d.year,
          papers: d.papers,
        })),
      };
    });
  }, [data, subfieldData, comparedCountries, selectedSubfield]);

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

  // Draw chart
  useEffect(() => {
    if (!svgRef.current || !timeSeriesData.length) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll('*').remove();

    const margin = { top: 20, right: 100, bottom: 35, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([2010, 2025])
      .range([0, innerWidth]);

    const allValues = timeSeriesData.flatMap((d) => d.values.map((v) => v.papers));
    const yMax = d3.max(allValues) || 1;

    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerHeight, 0])
      .nice();

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1e2a45')
      .attr('stroke-dasharray', '2,4');

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format('d'))
      .ticks(8);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('class', 'axis-tick')
      .select('.domain')
      .attr('stroke', '#1e2a45');

    // Y Axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => {
        if (d >= 1000000) return `${d / 1000000}M`;
        if (d >= 1000) return `${d / 1000}K`;
        return d;
      });

    g.append('g')
      .call(yAxis)
      .attr('class', 'axis-tick')
      .select('.domain')
      .attr('stroke', '#1e2a45');

    // Y Axis label
    g.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .text('Papers');

    // Line generator
    const line = d3.line()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.papers))
      .curve(d3.curveMonotoneX);

    // Draw lines
    timeSeriesData.forEach((series, i) => {
      const isHighlighted = series.code === selectedCountry;

      // Line
      g.append('path')
        .datum(series.values)
        .attr('class', `time-series-line ${isHighlighted ? 'highlighted' : ''}`)
        .attr('d', line)
        .attr('stroke', series.color)
        .attr('stroke-opacity', isHighlighted ? 1 : 0.8)
        .attr('stroke-width', isHighlighted ? 3 : 2)
        .attr('fill', 'none');

      // Dots
      g.selectAll(`.dot-${i}`)
        .data(series.values)
        .join('circle')
        .attr('class', `time-series-dot dot-${i}`)
        .attr('cx', (d) => xScale(d.year))
        .attr('cy', (d) => yScale(d.papers))
        .attr('r', isHighlighted ? 4 : 3)
        .attr('fill', series.color)
        .attr('stroke', '#0a0e1a')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', () => onCountrySelect(series.code));
    });

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth + 10}, 0)`);

    timeSeriesData.forEach((series, i) => {
      const isHighlighted = series.code === selectedCountry;

      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 22})`)
        .attr('class', 'legend-item')
        .style('cursor', 'pointer')
        .on('click', () => onCountrySelect(series.code));

      legendItem.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', series.color)
        .attr('opacity', isHighlighted ? 1 : 0.8);

      legendItem.append('text')
        .attr('x', 16)
        .attr('y', 10)
        .attr('fill', isHighlighted ? '#e2e8f0' : '#94a3b8')
        .attr('font-size', 11)
        .attr('font-weight', isHighlighted ? 600 : 400)
        .attr('font-family', 'Space Grotesk, sans-serif')
        .text(series.name.length > 10 ? series.name.slice(0, 10) + '…' : series.name);
    });

    // Year range indicator
    if (yearRange) {
      const [y1, y2] = yearRange;
      g.append('rect')
        .attr('x', xScale(y1))
        .attr('y', 0)
        .attr('width', xScale(y2) - xScale(y1))
        .attr('height', innerHeight)
        .attr('fill', '#22d3ee')
        .attr('fill-opacity', 0.05)
        .attr('stroke', '#22d3ee')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3);
    }

    // Hover interaction
    const hoverLine = g.append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0);

    const hoverText = g.append('text')
      .attr('y', -5)
      .attr('fill', '#e2e8f0')
      .attr('font-size', 12)
      .attr('font-family', 'JetBrains Mono, monospace')
      .style('opacity', 0);

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const year = Math.round(xScale.invert(mx));
        
        if (year >= 2010 && year <= 2025) {
          hoverLine
            .attr('x1', xScale(year))
            .attr('x2', xScale(year))
            .style('opacity', 1);

          hoverText
            .attr('x', xScale(year))
            .text(year)
            .style('opacity', 1);
        }
      })
      .on('mouseleave', () => {
        hoverLine.style('opacity', 0);
        hoverText.style('opacity', 0);
      });

  }, [timeSeriesData, dimensions, selectedCountry, yearRange, onCountrySelect]);

  // Empty state - show prompt to select countries
  if (!timeSeriesData.length) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-viz-muted text-sm">
        <svg className="w-12 h-12 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-4 4 4 5-6" />
        </svg>
        <p>Click countries on the map to compare trends</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}