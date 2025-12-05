import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * API Route to serve visualization data
 * 
 * Query parameters:
 * - type: 'country-year' | 'summary' | 'subfield' | 'nodelink' | 'all'
 * - country: (optional) Filter by country code
 * - year: (optional) Filter by year
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const country = searchParams.get('country');
  const year = searchParams.get('year');

  const publicDir = join(process.cwd(), 'public');

  // Data file paths
  const files = {
    'country-year': 'ai_papers_country_year.json',
    'summary': 'ai_papers_country_summary.json',
    'subfield': 'ai_papers_country_year_subfield.json',
    'nodelink': 'node_link_by_country.json',
  };

  try {
    // Return all data
    if (type === 'all') {
      const result = {};
      
      for (const [key, filename] of Object.entries(files)) {
        const filepath = join(publicDir, filename);
        if (existsSync(filepath)) {
          result[key] = JSON.parse(readFileSync(filepath, 'utf-8'));
        }
      }
      
      return NextResponse.json(result);
    }

    // Return specific data type
    const filename = files[type];
    if (!filename) {
      return NextResponse.json(
        { error: `Invalid type: ${type}. Valid types: ${Object.keys(files).join(', ')}, all` },
        { status: 400 }
      );
    }

    const filepath = join(publicDir, filename);
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: `Data file not found: ${filename}` },
        { status: 404 }
      );
    }

    let data = JSON.parse(readFileSync(filepath, 'utf-8'));

    // Apply filters for array data
    if (Array.isArray(data)) {
      if (country) {
        data = data.filter((d) => d.country_code === country);
      }
      if (year) {
        const yearNum = parseInt(year, 10);
        data = data.filter((d) => d.year === yearNum);
      }
    }

    // For node-link data, filter by country
    if (type === 'nodelink' && country && data[country]) {
      data = { [country]: data[country] };
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to load data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get list of available countries
 */
export async function POST(request) {
  const publicDir = join(process.cwd(), 'public');
  const filepath = join(publicDir, 'ai_papers_country_summary.json');

  try {
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Summary data not found' }, { status: 404 });
    }

    const data = JSON.parse(readFileSync(filepath, 'utf-8'));
    
    // Extract unique countries with metadata
    const countries = data.map((d) => ({
      code: d.country_code,
      name: d.country,
      totalPapers: d.total_papers,
      growthRatio: d.growth_ratio,
    }));

    return NextResponse.json({ countries });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to load countries', details: error.message },
      { status: 500 }
    );
  }
}