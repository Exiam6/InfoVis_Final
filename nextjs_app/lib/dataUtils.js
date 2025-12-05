/**
 * Data utilities for processing and transforming visualization data
 */

/**
 * Get the top N countries by total paper count
 */
export function getTopCountries(summaryData, n = 10) {
    return [...summaryData]
      .sort((a, b) => b.total_papers - a.total_papers)
      .slice(0, n);
  }
  
  /**
   * Get country data for a specific year
   */
  export function getCountryYearData(data, year, countryCode) {
    return data.find(
      (d) => d.year === year && d.country_code === countryCode
    );
  }
  
  /**
   * Calculate growth metrics for a country
   */
  export function calculateGrowth(data, countryCode, startYear = 2010, endYear = 2025) {
    const countryData = data
      .filter((d) => d.country_code === countryCode)
      .sort((a, b) => a.year - b.year);
  
    const startPapers = countryData.find((d) => d.year === startYear)?.papers || 0;
    const endPapers = countryData.find((d) => d.year === endYear)?.papers || 0;
  
    const growthRatio = startPapers > 0 ? endPapers / startPapers : 0;
    const cagr = startPapers > 0
      ? Math.pow(endPapers / startPapers, 1 / (endYear - startYear)) - 1
      : 0;
  
    return {
      countryCode,
      startPapers,
      endPapers,
      growthRatio,
      cagr,
      totalPapers: countryData.reduce((sum, d) => sum + d.papers, 0),
    };
  }
  
  /**
   * Aggregate subfield data by country
   */
  export function aggregateSubfieldsByCountry(subfieldData, countryCode, yearRange) {
    const [startYear, endYear] = yearRange;
    
    const filtered = subfieldData.filter(
      (d) =>
        d.country_code === countryCode &&
        d.year >= startYear &&
        d.year <= endYear
    );
  
    const bySubfield = {};
    filtered.forEach((d) => {
      if (!bySubfield[d.subfield]) {
        bySubfield[d.subfield] = 0;
      }
      bySubfield[d.subfield] += d.papers;
    });
  
    return Object.entries(bySubfield)
      .map(([subfield, papers]) => ({ subfield, papers }))
      .sort((a, b) => b.papers - a.papers);
  }
  
  /**
   * Format large numbers for display
   */
  export function formatNumber(num) {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }
  
  /**
   * Get color for a value on a scale
   */
  export function getColorForValue(value, min, max, colorScale) {
    const normalized = (value - min) / (max - min);
    return colorScale(Math.max(0, Math.min(1, normalized)));
  }