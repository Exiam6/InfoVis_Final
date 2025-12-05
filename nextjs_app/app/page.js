'use client';

import { useState, useEffect, useCallback } from 'react';
import MapView from '../components/MapView';
import TimeSeriesPanel from '../components/TimeSeriesPanel';
import NodeLinkGraph from '../components/NodeLinkGraph';
import Controls from '../components/Controls';

export default function Home() {
  // Data state
  const [countryYearData, setCountryYearData] = useState([]);
  const [countrySummary, setCountrySummary] = useState([]);
  const [subfieldData, setSubfieldData] = useState([]);
  const [nodeLinkData, setNodeLinkData] = useState({});
  const [worldGeo, setWorldGeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interaction state
  const [selectedYear, setSelectedYear] = useState(2024);
  const [yearRange, setYearRange] = useState([2010, 2025]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [comparedCountries, setComparedCountries] = useState([]);
  const [selectedSubfield, setSelectedSubfield] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [viewMode, setViewMode] = useState('absolute'); // 'absolute' | 'growth'

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load all data files in parallel
        const [cyRes, summaryRes, subfieldRes, nodeLinkRes, geoRes] = await Promise.all([
          fetch('/ai_papers_country_year.json'),
          fetch('/ai_papers_country_summary.json'),
          fetch('/ai_papers_country_year_subfield.json'),
          fetch('/node_link_by_country.json'),
          fetch('/world-50m.json'),
        ]);

        if (!cyRes.ok || !summaryRes.ok || !subfieldRes.ok || !nodeLinkRes.ok || !geoRes.ok) {
          throw new Error('Failed to load one or more data files');
        }

        const [cy, summary, subfield, nodeLink, geo] = await Promise.all([
          cyRes.json(),
          summaryRes.json(),
          subfieldRes.json(),
          nodeLinkRes.json(),
          geoRes.json(),
        ]);

        setCountryYearData(cy);
        setCountrySummary(summary);
        setSubfieldData(subfield);
        setNodeLinkData(nodeLink);
        setWorldGeo(geo);
        setLoading(false);
      } catch (err) {
        console.error('Data loading error:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Handler: Select a country on the map
  const handleCountrySelect = useCallback((countryCode) => {
    if (countryCode === selectedCountry) {
      // Deselect if clicking same country
      setSelectedCountry(null);
    } else {
      setSelectedCountry(countryCode);
      // Add to comparison if not already there
      if (!comparedCountries.includes(countryCode)) {
        setComparedCountries((prev) => [...prev.slice(-4), countryCode]); // Keep last 5
      }
    }
  }, [selectedCountry, comparedCountries]);

  // Handler: Remove country from comparison
  const handleRemoveComparison = useCallback((countryCode) => {
    setComparedCountries((prev) => prev.filter((c) => c !== countryCode));
    if (selectedCountry === countryCode) {
      setSelectedCountry(null);
    }
  }, [selectedCountry]);

  // Handler: Clear all comparisons
  const handleClearComparisons = useCallback(() => {
    setComparedCountries([]);
    setSelectedCountry(null);
  }, []);

  // Handler: Year slider change
  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
  }, []);

  // Handler: Time brush change
  const handleYearRangeChange = useCallback((range) => {
    setYearRange(range);
  }, []);

  // Handler: Subfield selection from node-link graph
  const handleSubfieldSelect = useCallback((subfield) => {
    setSelectedSubfield(subfield === selectedSubfield ? null : subfield);
  }, [selectedSubfield]);

  // Handler: Hover on map
  const handleCountryHover = useCallback((countryCode) => {
    setHoveredCountry(countryCode);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-viz-muted font-mono text-sm">Loading visualization data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-viz-highlight text-4xl mb-4">⚠</div>
          <h2 className="text-xl font-display font-semibold mb-2">Data Loading Error</h2>
          <p className="text-viz-muted mb-4">{error}</p>
          <p className="text-sm text-viz-muted">
            Make sure data files are in the <code className="bg-viz-border px-1 rounded">/public</code> folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
          Global AI Research
          <span className="text-viz-accent ml-2">2010–2025</span>
        </h1>
        <p className="text-viz-muted mt-1 text-sm md:text-base">
          Interactive visualization of AI paper distribution by country, year, and research area
        </p>
      </header>

      {/* Controls Bar */}
      <Controls
        selectedYear={selectedYear}
        yearRange={yearRange}
        viewMode={viewMode}
        comparedCountries={comparedCountries}
        countrySummary={countrySummary}
        onYearChange={handleYearChange}
        onViewModeChange={setViewMode}
        onRemoveComparison={handleRemoveComparison}
        onClearComparisons={handleClearComparisons}
      />

      {/* Main Layout: Map (left) + Side panels (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Map View - Takes 7 columns on large screens */}
        <div className="lg:col-span-7">
          <div className="viz-panel h-[500px] md:h-[600px]">
            <div className="viz-panel-header">
              <span className="viz-panel-title">Global Distribution</span>
              <span className="text-viz-muted text-xs font-mono">
                Year: {selectedYear} | {viewMode === 'absolute' ? 'Paper Count' : 'Growth Rate'}
              </span>
            </div>
            <div className="viz-panel-content h-[calc(100%-60px)]">
              <MapView
                data={countryYearData}
                summary={countrySummary}
                geoData={worldGeo}
                selectedYear={selectedYear}
                selectedCountry={selectedCountry}
                comparedCountries={comparedCountries}
                hoveredCountry={hoveredCountry}
                viewMode={viewMode}
                selectedSubfield={selectedSubfield}
                subfieldData={subfieldData}
                onCountrySelect={handleCountrySelect}
                onCountryHover={handleCountryHover}
              />
            </div>
          </div>
        </div>

        {/* Side Panels - Takes 5 columns on large screens */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Time Series Panel */}
          <div className="viz-panel h-[280px] md:h-[300px]">
            <div className="viz-panel-header">
              <span className="viz-panel-title">Growth Over Time</span>
              {comparedCountries.length > 0 && (
                <span className="text-viz-accent text-xs font-mono">
                  {comparedCountries.length} countries selected
                </span>
              )}
            </div>
            <div className="viz-panel-content h-[calc(100%-60px)]">
              <TimeSeriesPanel
                data={countryYearData}
                subfieldData={subfieldData}
                comparedCountries={comparedCountries}
                selectedCountry={selectedCountry}
                selectedSubfield={selectedSubfield}
                yearRange={yearRange}
                onYearRangeChange={handleYearRangeChange}
                onCountrySelect={handleCountrySelect}
              />
            </div>
          </div>

          {/* Node-Link Graph */}
          <div className="viz-panel h-[280px] md:h-[290px]">
            <div className="viz-panel-header">
              <span className="viz-panel-title">Research Fields</span>
              {selectedCountry && (
                <span className="text-viz-highlight text-xs font-mono">
                  {countrySummary.find((c) => c.country_code === selectedCountry)?.country || selectedCountry}
                </span>
              )}
            </div>
            <div className="viz-panel-content h-[calc(100%-60px)]">
              <NodeLinkGraph
                nodeLinkData={nodeLinkData}
                selectedCountry={selectedCountry}
                selectedSubfield={selectedSubfield}
                onSubfieldSelect={handleSubfieldSelect}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 pt-4 border-t border-viz-border text-center text-viz-muted text-xs">
        Data source: <a href="https://openalex.org" className="text-viz-accent hover:underline" target="_blank" rel="noopener noreferrer">OpenAlex</a>
        {' · '}
        NYU Data Visualization Course Project
        {' · '}
        Zifan Zhao & Firestone Lappland
      </footer>
    </main>
  );
}