'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

// Color scales
const PAPER_COUNT_COLORS = ['#0a0e1a', '#0c4a6e', '#0891b2', '#22d3ee', '#a5f3fc'];
const GROWTH_COLORS = ['#be123c', '#881337', '#0a0e1a', '#0e7490', '#22d3ee'];

// ISO 3166-1 numeric to alpha-2 mapping (comprehensive)
const NUMERIC_TO_ALPHA2 = {
  "4": "AF", "8": "AL", "12": "DZ", "20": "AD", "24": "AO", "28": "AG", "32": "AR",
  "36": "AU", "40": "AT", "44": "BS", "48": "BH", "50": "BD", "51": "AM", "56": "BE",
  "64": "BT", "68": "BO", "70": "BA", "72": "BW", "76": "BR", "84": "BZ", "90": "SB",
  "96": "BN", "100": "BG", "104": "MM", "108": "BI", "112": "BY", "116": "KH", "120": "CM",
  "124": "CA", "140": "CF", "144": "LK", "148": "TD", "152": "CL", "156": "CN", "158": "TW",
  "170": "CO", "178": "CG", "180": "CD", "188": "CR", "191": "HR", "192": "CU", "196": "CY",
  "203": "CZ", "204": "BJ", "208": "DK", "214": "DO", "218": "EC", "222": "SV", "226": "GQ",
  "231": "ET", "232": "ER", "233": "EE", "242": "FJ", "246": "FI", "250": "FR", "262": "DJ",
  "266": "GA", "268": "GE", "270": "GM", "275": "PS", "276": "DE", "288": "GH", "300": "GR",
  "320": "GT", "324": "GN", "328": "GY", "332": "HT", "340": "HN", "344": "HK", "348": "HU",
  "352": "IS", "356": "IN", "360": "ID", "364": "IR", "368": "IQ", "372": "IE", "376": "IL",
  "380": "IT", "384": "CI", "388": "JM", "392": "JP", "398": "KZ", "400": "JO", "404": "KE",
  "408": "KP", "410": "KR", "414": "KW", "417": "KG", "418": "LA", "422": "LB", "426": "LS",
  "428": "LV", "430": "LR", "434": "LY", "440": "LT", "442": "LU", "450": "MG", "454": "MW",
  "458": "MY", "462": "MV", "466": "ML", "470": "MT", "478": "MR", "480": "MU", "484": "MX",
  "496": "MN", "498": "MD", "499": "ME", "504": "MA", "508": "MZ", "512": "OM", "516": "NA",
  "524": "NP", "528": "NL", "540": "NC", "548": "VU", "554": "NZ", "558": "NI", "562": "NE",
  "566": "NG", "578": "NO", "586": "PK", "591": "PA", "598": "PG", "600": "PY", "604": "PE",
  "608": "PH", "616": "PL", "620": "PT", "630": "PR", "634": "QA", "642": "RO", "643": "RU",
  "646": "RW", "682": "SA", "686": "SN", "688": "RS", "694": "SL", "702": "SG", "703": "SK",
  "704": "VN", "705": "SI", "706": "SO", "710": "ZA", "716": "ZW", "724": "ES", "728": "SS",
  "729": "SD", "732": "EH", "740": "SR", "752": "SE", "756": "CH", "760": "SY", "762": "TJ",
  "764": "TH", "768": "TG", "780": "TT", "784": "AE", "788": "TN", "792": "TR", "795": "TM",
  "800": "UG", "804": "UA", "807": "MK", "818": "EG", "826": "GB", "834": "TZ", "840": "US",
  "854": "BF", "858": "UY", "860": "UZ", "862": "VE", "887": "YE", "894": "ZM"
};

export default function MapView({
  data,
  summary,
  geoData,
  selectedYear,
  selectedCountry,
  comparedCountries,
  hoveredCountry,
  viewMode,
  selectedSubfield,
  subfieldData,
  onCountrySelect,
  onCountryHover,
}) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Build country names and summary lookup from our data
  const { countryNames, summaryMap } = useMemo(() => {
    const names = new Map();
    const sMap = new Map();
    summary.forEach(s => {
      names.set(s.country_code, s.country);
      sMap.set(s.country_code, s);
    });
    return { countryNames: names, summaryMap: sMap };
  }, [summary]);

  // Get alpha-2 code from TopoJSON numeric ID
  const getCountryCode = (feature) => {
    const numId = String(feature.id);
    return NUMERIC_TO_ALPHA2[numId] || null;
  };

  // Get display name for a feature
  const getDisplayName = (feature) => {
    const code = getCountryCode(feature);
    if (code && countryNames.has(code)) {
      return countryNames.get(code);
    }
    if (feature.properties?.name) {
      return feature.properties.name;
    }
    return code || 'Unknown';
  };

  // Get papers for selected year
  const yearData = useMemo(() => {
    const map = new Map();
    const source = (selectedSubfield && subfieldData.length) 
      ? subfieldData.filter(d => d.subfield === selectedSubfield)
      : data;
    
    source.filter(d => d.year === selectedYear)
      .forEach(d => map.set(d.country_code, d.papers));
    
    return map;
  }, [data, subfieldData, selectedYear, selectedSubfield]);

  // Calculate YoY growth rates
  const growthData = useMemo(() => {
    const map = new Map();
    const prevYear = selectedYear - 1;
    
    const current = new Map();
    const prev = new Map();
    
    data.filter(d => d.year === selectedYear)
      .forEach(d => current.set(d.country_code, d.papers));
    data.filter(d => d.year === prevYear)
      .forEach(d => prev.set(d.country_code, d.papers));
    
    current.forEach((papers, code) => {
      const prevPapers = prev.get(code);
      if (prevPapers && prevPapers > 0) {
        const growth = ((papers - prevPapers) / prevPapers) * 100;
        map.set(code, growth);
      }
    });
    
    return map;
  }, [data, selectedYear]);

  // Color scale based on viewMode
  const colorScale = useMemo(() => {
    if (viewMode === 'growth') {
      const values = Array.from(growthData.values());
      if (values.length === 0) return () => '#0a0e1a';
      return d3.scaleSequential(d3.interpolateRdYlGn)
        .domain([-30, 60]);
    } else {
      const values = Array.from(yearData.values()).filter(v => v > 0);
      if (values.length === 0) return () => '#0a0e1a';
      return d3.scaleSequentialLog(d3.interpolateRgbBasis(PAPER_COUNT_COLORS))
        .domain([1, d3.max(values)]);
    }
  }, [yearData, growthData, viewMode]);

  // Get color for a country code
  const getColor = (code) => {
    if (!code) return '#0a0e1a';
    
    if (viewMode === 'growth') {
      const growth = growthData.get(code);
      if (growth === undefined) return '#0a0e1a';
      return colorScale(growth);
    } else {
      const papers = yearData.get(code);
      if (!papers || papers <= 0) return '#0a0e1a';
      return colorScale(papers);
    }
  };

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

  // Main drawing effect
  useEffect(() => {
    if (!svgRef.current || !geoData) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll('*').remove();

    // Convert TopoJSON to GeoJSON
    const countries = topojson.feature(geoData, geoData.objects.countries);

    // Projection
    const projection = d3.geoNaturalEarth1()
      .fitSize([width - 20, height - 50], countries);

    const path = d3.geoPath().projection(projection);

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#0a0e1a');

    // Graticule
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#1e2a45')
      .attr('stroke-width', 0.3);

    // Draw countries
    const countryPaths = svg.selectAll('.country')
      .data(countries.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', d => getColor(getCountryCode(d)))
      .attr('stroke', d => {
        const code = getCountryCode(d);
        if (code === selectedCountry) return '#f472b6';
        if (comparedCountries.includes(code)) return '#22d3ee';
        return '#1e2a45';
      })
      .attr('stroke-width', d => {
        const code = getCountryCode(d);
        if (code === selectedCountry) return 2;
        if (comparedCountries.includes(code)) return 1.5;
        return 0.5;
      })
      .style('cursor', 'pointer');

    // Tooltip
    const tooltip = d3.select(tooltipRef.current);

    countryPaths
      .on('mouseenter', function(event, d) {
        const code = getCountryCode(d);
        const name = getDisplayName(d);
        const papers = yearData.get(code);
        const growth = growthData.get(code);
        const info = summaryMap.get(code);

        onCountryHover(code);
        
        d3.select(this).raise()
          .attr('stroke', '#22d3ee')
          .attr('stroke-width', 2);

        let html = `<div class="country-name">${name}</div>`;
        html += `<div class="stat-row"><span class="stat-label">Papers (${selectedYear})</span>`;
        html += `<span class="stat-value">${papers?.toLocaleString() || 'N/A'}</span></div>`;
        
        if (growth !== undefined) {
          const color = growth >= 0 ? '#4ade80' : '#f87171';
          html += `<div class="stat-row"><span class="stat-label">YoY Growth</span>`;
          html += `<span class="stat-value" style="color:${color}">${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%</span></div>`;
        }
        
        if (info) {
          html += `<div class="stat-row"><span class="stat-label">Total Papers</span>`;
          html += `<span class="stat-value">${info.total_papers?.toLocaleString()}</span></div>`;
        }

        tooltip.style('opacity', 1)
          .style('left', (event.offsetX + 15) + 'px')
          .style('top', (event.offsetY + 15) + 'px')
          .html(html);
      })
      .on('mousemove', event => {
        tooltip.style('left', (event.offsetX + 15) + 'px')
          .style('top', (event.offsetY + 15) + 'px');
      })
      .on('mouseleave', function(event, d) {
        const code = getCountryCode(d);
        onCountryHover(null);
        tooltip.style('opacity', 0);
        
        d3.select(this)
          .attr('stroke', code === selectedCountry ? '#f472b6' : 
                         comparedCountries.includes(code) ? '#22d3ee' : '#1e2a45')
          .attr('stroke-width', code === selectedCountry ? 2 : 
                               comparedCountries.includes(code) ? 1.5 : 0.5);
      })
      .on('click', (event, d) => {
        const code = getCountryCode(d);
        if (code) onCountrySelect(code);
      });

    // Legend
    const legendW = 180;
    const legendH = 12;
    const legendX = width - legendW - 20;
    const legendY = height - 40;

    const defs = svg.append('defs');
    const gradientId = `legend-gradient-${viewMode}`;
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%').attr('x2', '100%');

    if (viewMode === 'growth') {
      gradient.append('stop').attr('offset', '0%').attr('stop-color', d3.interpolateRdYlGn(0));
      gradient.append('stop').attr('offset', '50%').attr('stop-color', d3.interpolateRdYlGn(0.5));
      gradient.append('stop').attr('offset', '100%').attr('stop-color', d3.interpolateRdYlGn(1));
    } else {
      PAPER_COUNT_COLORS.forEach((color, i) => {
        gradient.append('stop')
          .attr('offset', `${(i / (PAPER_COUNT_COLORS.length - 1)) * 100}%`)
          .attr('stop-color', color);
      });
    }

    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendW)
      .attr('height', legendH)
      .attr('fill', `url(#${gradientId})`)
      .attr('rx', 2);

    // Legend labels
    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 5)
      .attr('fill', '#94a3b8')
      .attr('font-size', 10)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(viewMode === 'growth' ? '-30%' : '0');

    svg.append('text')
      .attr('x', legendX + legendW)
      .attr('y', legendY - 5)
      .attr('fill', '#94a3b8')
      .attr('font-size', 10)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('text-anchor', 'end')
      .text(viewMode === 'growth' ? '+60%' : d3.max(Array.from(yearData.values()))?.toLocaleString() || '');

    svg.append('text')
      .attr('x', legendX + legendW / 2)
      .attr('y', legendY + legendH + 12)
      .attr('fill', '#64748b')
      .attr('font-size', 9)
      .attr('font-family', 'Space Grotesk, sans-serif')
      .attr('text-anchor', 'middle')
      .text(viewMode === 'growth' ? 'Year-over-Year Growth' : 'Paper Count (log scale)');

  }, [geoData, dimensions, yearData, growthData, viewMode, selectedCountry, comparedCountries, 
      colorScale, countryNames, summaryMap, selectedYear, onCountrySelect, onCountryHover]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />
      <div ref={tooltipRef} className="map-tooltip" />
    </div>
  );
}