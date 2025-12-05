# Global AI Research Visualization

An interactive web application for exploring the geographic and temporal distribution of AI research papers worldwide (2010-2025).

## Overview

AI research has expanded rapidly over the last decade, but its geographic distribution is uneven and evolving. This visualization helps users understand:

- **Where** AI papers are produced globally
- **How** outputs change over time
- **Which subareas** (CV, NLP, Robotics, Theory) dominate in different regions

The intended audience includes students, researchers, and curious members of the public who want a data-driven overview of global AI development.

## Features

- **Interactive Choropleth Map** — World map colored by paper count or growth rate with hover tooltips
- **Time-Series Panel** — Multi-line chart comparing country trajectories over time
- **Node-Link Graph** — Expandable research field hierarchy showing subfield breakdown
- **Controls** — Year slider, view mode toggle, country comparison tags
- **Linked Interactions** — All views are bidirectionally coordinated

## Project Structure

```
ai-research-viz/
├── README.md
├── data_processing/
│   └── openalex_processor.py      # Python script to fetch data from OpenAlex API
│
└── nextjs_app/
    ├── app/
    │   ├── layout.js              # Root layout with metadata
    │   ├── page.js                # Main page with state management
    │   ├── globals.css            # Global styles + D3 visualization styles
    │   └── api/data/route.js      # Optional API route for data serving
    │
    ├── components/
    │   ├── MapView.js             # View 1: Choropleth world map
    │   ├── TimeSeriesPanel.js     # View 2: Multi-line time series chart
    │   ├── NodeLinkGraph.js       # View 3: Field-subfield node-link diagram
    │   └── Controls.js            # Year slider and view mode controls
    │
    ├── lib/
    │   └── dataUtils.js           # Data processing utility functions
    │
    ├── public/
    │   ├── ai_papers_country_year.json
    │   ├── ai_papers_country_summary.json
    │   ├── ai_papers_country_year_subfield.json
    │   ├── node_link_by_country.json
    │   └── world-110m.json        # TopoJSON world map
    │
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## Quick Start

### Prerequisites

- Node.js 18.17.0 or higher
- npm or yarn

### Installation

```bash
# Navigate to the Next.js app directory
cd nextjs_app

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the visualization.

### Production Build

```bash
npm run build
npm start
```

## Data Source

Data is sourced from [OpenAlex](https://openalex.org), an open catalog of scholarly works. We filter for AI/ML papers using concept tags:

- **C154945302** — Artificial Intelligence
- **C119857082** — Machine Learning
- **C112194779** — Deep Learning

Papers are aggregated by:
- Country (via author institution)
- Year (2010-2025)
- Subfield (Computer Vision, NLP, Robotics, Reinforcement Learning)

### Regenerating Data

To fetch fresh data from OpenAlex:

```bash
cd data_processing
pip install requests pandas tqdm pycountry
python openalex_processor.py
```

This will generate CSV and JSON files, and automatically export to `nextjs_app/public/`.

## Views

### View 1: Global Choropleth Map

- World map colored by AI paper count (log scale) or growth ratio
- Hover for country statistics (papers in year, total papers, growth ratio)
- Click to select a country for detailed analysis
- Legend shows color scale

### View 2: Time-Series Growth Panel

- Multi-line chart showing paper counts over 2010-2025
- Compares up to 5 selected countries
- Highlighted line for currently selected country
- Click legend or dots to select countries

### View 3: Field-Subfield Node-Link Graph

- Four main AI fields: Computer Vision, NLP, Robotics, Theory
- Node size represents paper count for selected country
- Click a main field to expand and see subfields
- Click a subfield to filter map and time-series

## Interactions

| Action | Effect |
|--------|--------|
| Click country on map | Select country, add to comparison, update node-link graph |
| Hover country on map | Show tooltip with statistics |
| Drag year slider | Update map colors for that year |
| Toggle view mode | Switch between paper count and growth rate |
| Click country tag (×) | Remove from comparison |
| Click main field node | Expand/collapse subfields |
| Click subfield node | Filter all views by subfield |

## Technologies

- **Next.js 14** — React framework with App Router
- **D3.js 7** — Data visualization library
- **Tailwind CSS 3.4** — Utility-first CSS framework
- **TopoJSON** — Geographic data format
- **OpenAlex API** — Scholarly metadata source

## Data Files

| File | Description |
|------|-------------|
| `ai_papers_country_year.json` | Country × Year paper counts |
| `ai_papers_country_summary.json` | Country-level summary (total, growth ratio, slope) |
| `ai_papers_country_year_subfield.json` | Country × Year × Subfield breakdown |
| `node_link_by_country.json` | Node-link graph data per country |
| `world-110m.json` | TopoJSON world map (110m resolution) |

## Customization

### Color Themes

Edit `app/globals.css` to change the color palette:

```css
:root {
  --viz-bg: #0a0e1a;        /* Background */
  --viz-surface: #131928;   /* Panel background */
  --viz-border: #1e2a45;    /* Borders */
  --viz-text: #e2e8f0;      /* Primary text */
  --viz-muted: #64748b;     /* Secondary text */
  --viz-accent: #22d3ee;    /* Accent color (cyan) */
  --viz-highlight: #f472b6; /* Highlight color (pink) */
}
```

### Adding Subfields

Edit `data_processing/openalex_processor.py`:

```python
SUBFIELDS = {
    "Computer Vision": "C121332964",
    "Natural Language Processing": "C144133560",
    "Robotics": "C15744967",
    "Reinforcement Learning": "C55535154",
    # Add more subfields here with OpenAlex concept IDs
}
```

## Usage Scenarios

**Scenario A:** A PhD student deciding where to apply for internships wants to know which countries are strongest in robotics and whether those regions are trending upward.

**Scenario B:** A general reader wants evidence for "AI is becoming more global" — which regions are catching up, and which subfields are driving the change.

## Team

- **Zifan Zhao** (zz4330) — Data pipeline, cross-view linking, integration
- **Firestone Lappland** (xy2456) — View implementation, UI, styling

NYU Data Visualization Course • Fall 2024

## License

MIT License

## Acknowledgments

- [OpenAlex](https://openalex.org) for providing open scholarly metadata
- [D3.js](https://d3js.org) for the visualization library
- [Natural Earth](https://www.naturalearthdata.com) for geographic data