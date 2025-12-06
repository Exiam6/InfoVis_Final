'use client';

import { useMemo } from 'react';

// Same colors as TimeSeriesPanel for consistency
const COUNTRY_COLORS = [
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#4ade80', // green
  '#fbbf24', // yellow
  '#a78bfa', // purple
  '#fb7185', // rose
];

export default function Controls({
  selectedYear,
  yearRange,
  viewMode,
  comparedCountries,
  countrySummary,
  onYearChange,
  onViewModeChange,
  onRemoveComparison,
  onClearComparisons,
}) {
  // Get country names for compared countries with matching colors
  const comparedCountryNames = useMemo(() => {
    return comparedCountries.map((code, index) => {
      const country = countrySummary.find((c) => c.country_code === code);
      return { 
        code, 
        name: country?.country || code,
        color: COUNTRY_COLORS[index % COUNTRY_COLORS.length]
      };
    });
  }, [comparedCountries, countrySummary]);

  return (
    <div className="viz-panel">
      <div className="p-4 flex flex-wrap items-center gap-4 md:gap-6">
        {/* Year Slider */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono text-viz-muted uppercase tracking-wider">
              Year
            </label>
            <span className="font-mono text-viz-accent font-semibold">{selectedYear}</span>
          </div>
          <input
            type="range"
            min={2010}
            max={2025}
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="year-slider"
          />
          <div className="flex justify-between text-[10px] text-viz-muted font-mono mt-1">
            <span>2010</span>
            <span>2025</span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-viz-muted uppercase tracking-wider mr-2">View</span>
          <button
            onClick={() => onViewModeChange('absolute')}
            className={`viz-button ${viewMode === 'absolute' ? 'active' : ''}`}
          >
            Paper Count
          </button>
          <button
            onClick={() => onViewModeChange('growth')}
            className={`viz-button ${viewMode === 'growth' ? 'active' : ''}`}
          >
            Growth Rate
          </button>
        </div>

        {/* Compared Countries Tags with Colors */}
        {comparedCountryNames.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-viz-muted uppercase tracking-wider">
              Comparing:
            </span>
            {comparedCountryNames.map(({ code, name, color }) => (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-viz-border rounded text-xs font-mono"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                {name}
                <button
                  onClick={() => onRemoveComparison(code)}
                  className="text-viz-muted hover:text-viz-highlight ml-1"
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </span>
            ))}
            {comparedCountryNames.length > 1 && (
              <button
                onClick={onClearComparisons}
                className="text-xs text-viz-muted hover:text-viz-highlight font-mono"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}