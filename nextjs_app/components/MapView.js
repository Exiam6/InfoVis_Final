'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

// Color scales
const PAPER_COUNT_COLORS = ['#0a0e1a', '#0c4a6e', '#0891b2', '#22d3ee', '#a5f3fc'];
const GROWTH_COLORS = ['#be123c', '#881337', '#1e1b4b', '#0e7490', '#22d3ee'];

// ISO 3166-1 numeric to alpha-2 mapping
const NUMERIC_TO_ALPHA2 = {
  "004": "AF", "008": "AL", "012": "DZ", "020": "AD", "024": "AO", "028": "AG", "032": "AR",
  "036": "AU", "040": "AT", "044": "BS", "048": "BH", "050": "BD", "051": "AM", "056": "BE",
  "064": "BT", "068": "BO", "070": "BA", "072": "BW", "076": "BR", "084": "BZ", "090": "SB",
  "096": "BN", "100": "BG", "104": "MM", "108": "BI", "112": "BY", "116": "KH", "120": "CM",
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

  // Process data for the selected year
  const yearData = useMemo(() => {
    if (!data.length) return new Map();
    
    let filtered = data.filter((d) => d.year === selectedYear);
    
    // If subfield is selected, use subfield data instead
    if (selectedSubfield && subfieldData.length) {
      filtered = subfieldData.filter(
        (d) => d.year === selectedYear && d.subfield === selectedSubfield
      );
    }
    
    return new Map(filtered.map((d) => [d.country_code, d.papers]));
  }, [data, subfieldData, selectedYear, selectedSubfield]);

  // Create color scale
  const colorScale = useMemo(() => {
    if (viewMode === 'growth') {
      // Use growth ratio from summary
      const growthValues = summary
        .filter((d) => d.growth_ratio && isFinite(d.growth_ratio))
        .map((d) => d.growth_ratio);
      
      const extent = d3.extent(growthValues);
      return d3.scaleSequential(d3.interpolateRgbBasis(GROWTH_COLORS))
        .domain([extent[0], extent[1]]);
    } else {
      // Use paper counts
      const values = Array.from(yearData.values()).filter((v) => v > 0);
      const maxVal = d3.max(values) || 1;
      
      return d3.scaleSequentialLog(d3.interpolateRgbBasis(PAPER_COUNT_COLORS))
        .domain([1, maxVal]);
    }
  }, [yearData, summary, viewMode]);

  // Get value for a country
  const getValue = (countryCode) => {
    if (viewMode === 'growth') {
      const country = summary.find((d) => d.country_code === countryCode);
      return country?.growth_ratio || null;
    }
    return yearData.get(countryCode) || null;
  };

  // Get color for a country
  const getColor = (countryCode) => {
    const value = getValue(countryCode);
    if (value === null || value === 0) return '#0a0e1a';
    return colorScale(value);
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

  // Draw map
  useEffect(() => {
    if (!svgRef.current || !geoData) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create projection
    const projection = d3.geoNaturalEarth1()
      .fitSize([width - 20, height - 20], { type: 'Sphere' })
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Convert TopoJSON to GeoJSON
    const countries = topojson.feature(geoData, geoData.objects.countries);

    // Country code mapping (TopoJSON uses numeric IDs)
    const getCountryCode = (feature) => {
      // Try ISO_A2 property first
      if (feature.properties?.ISO_A2 && feature.properties.ISO_A2 !== '-99') {
        return feature.properties.ISO_A2;
      }
      // Fall back to numeric ID mapping
      const numericId = feature.id || feature.properties?.id;
      if (numericId && NUMERIC_TO_ALPHA2[numericId]) {
        return NUMERIC_TO_ALPHA2[numericId];
      }
      return null;
    };

    // Draw graticule
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule())
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#1e2a45')
      .attr('stroke-width', 0.3)
      .attr('stroke-opacity', 0.5);

    // Draw sphere outline
    svg.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', pathGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#1e2a45')
      .attr('stroke-width', 1);

    // Draw countries
    const countryPaths = svg.selectAll('.country-path')
      .data(countries.features)
      .join('path')
      .attr('class', (d) => {
        const code = getCountryCode(d);
        let classes = 'country-path';
        if (code === selectedCountry) classes += ' selected';
        if (comparedCountries.includes(code)) classes += ' compared';
        return classes;
      })
      .attr('d', pathGenerator)
      .attr('fill', (d) => {
        const code = getCountryCode(d);
        return getColor(code);
      })
      .attr('stroke', (d) => {
        const code = getCountryCode(d);
        if (code === selectedCountry) return '#f472b6';
        if (comparedCountries.includes(code)) return '#22d3ee';
        return '#1e2a45';
      })
      .attr('stroke-width', (d) => {
        const code = getCountryCode(d);
        if (code === selectedCountry) return 2;
        if (comparedCountries.includes(code)) return 1.5;
        return 0.5;
      });

    // Tooltip
    const tooltip = d3.select(tooltipRef.current);

    countryPaths
      .on('mouseenter', function (event, d) {
        const code = getCountryCode(d);
        const countryName = d.properties?.name || d.properties?.NAME || 'Unknown';
        const value = getValue(code);
        const summaryData = summary.find((s) => s.country_code === code);

        onCountryHover(code);

        d3.select(this)
          .raise()
          .attr('stroke', '#22d3ee')
          .attr('stroke-width', 1.5);

        tooltip
          .style('opacity', 1)
          .style('left', `${event.offsetX + 15}px`)
          .style('top', `${event.offsetY + 15}px`)
          .html(`
            <div class="country-name">${countryName}</div>
            <div class="stat-row">
              <span class="stat-label">Papers (${selectedYear})</span>
              <span class="stat-value">${yearData.get(code)?.toLocaleString() || 'N/A'}</span>
            </div>
            ${summaryData ? `
              <div class="stat-row">
                <span class="stat-label">Total (2010-2025)</span>
                <span class="stat-value">${Math.round(summaryData.total_papers).toLocaleString()}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Growth Ratio</span>
                <span class="stat-value">${summaryData.growth_ratio?.toFixed(2) || 'N/A'}×</span>
              </div>
            ` : ''}
          `);
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.offsetX + 15}px`)
          .style('top', `${event.offsetY + 15}px`);
      })
      .on('mouseleave', function (event, d) {
        const code = getCountryCode(d);
        onCountryHover(null);

        const isSelected = code === selectedCountry;
        const isCompared = comparedCountries.includes(code);

        d3.select(this)
          .attr('stroke', isSelected ? '#f472b6' : isCompared ? '#22d3ee' : '#1e2a45')
          .attr('stroke-width', isSelected ? 2 : isCompared ? 1.5 : 0.5);

        tooltip.style('opacity', 0);
      })
      .on('click', (event, d) => {
        const code = getCountryCode(d);
        if (code) onCountrySelect(code);
      });

    // Legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = width - legendWidth - 20;
    const legendY = height - 40;

    // Legend gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient');

    const colors = viewMode === 'growth' ? GROWTH_COLORS : PAPER_COUNT_COLORS;
    colors.forEach((color, i) => {
      gradient.append('stop')
        .attr('offset', `${(i / (colors.length - 1)) * 100}%`)
        .attr('stop-color', color);
    });

    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#legend-gradient)')
      .attr('rx', 2);

    // Legend labels
    const domain = colorScale.domain();
    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 6)
      .attr('class', 'axis-label')
      .text(viewMode === 'growth' ? `${domain[0]?.toFixed(1)}×` : '1');

    svg.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY - 6)
      .attr('class', 'axis-label')
      .attr('text-anchor', 'end')
      .text(viewMode === 'growth' 
        ? `${domain[1]?.toFixed(1)}×` 
        : `${Math.round(domain[1]).toLocaleString()}`);

    svg.append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY + legendHeight + 14)
      .attr('class', 'axis-label')
      .attr('text-anchor', 'middle')
      .text(viewMode === 'growth' ? 'Growth Ratio (2010→2025)' : 'Paper Count');

  }, [geoData, dimensions, yearData, summary, selectedYear, selectedCountry, 
      comparedCountries, viewMode, colorScale, onCountrySelect, onCountryHover]);

  return (
    <div className="map-container w-full h-full relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
      <div ref={tooltipRef} className="map-tooltip" style={{ opacity: 0 }} />
    </div>
  );
}