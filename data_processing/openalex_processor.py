"""
Collect AI paper counts by country and year from OpenAlex,
then do simple geographic + temporal trend analysis.

Install:
  pip install requests pandas tqdm pycountry

Notes:
- OpenAlex rate limit: ~100k requests/day; polite pool via mailto.
- We avoid downloading all works; we use group-by aggregation.
"""

import time
import math
import requests
import pandas as pd
from tqdm import tqdm
import pycountry
import json
from collections import defaultdict

BASE = "https://api.openalex.org"
MAILTO = "zz4330@nyu.edu"

# -----------------------------
# 1) Define what "AI papers" mean
# -----------------------------
AI_CONCEPT_IDS = [
    "C154945302",  # Artificial intelligence
    "C119857082",  # Machine learning
    "C112194779",  # Deep learning
]

START_YEAR = 2010
END_YEAR = 2025

# Optional coarse subfields (concept IDs)
SUBFIELDS = {
    "Computer Vision": "C121332964",
    "Natural Language Processing": "C144133560",
    "Robotics": "C15744967",
    "Reinforcement Learning": "C55535154",
}

# Main fields for node-link graph
MAIN_FIELDS = {
    "Computer Vision": "C121332964",
    "Natural Language Processing": "C144133560",
    "Robotics": "C15744967",
    "Theory": "C154945302",
}

SESSION = requests.Session()


def openalex_get(endpoint, params, max_retries=5):
    """GET with simple retries/backoff."""
    url = f"{BASE}/{endpoint}"
    params = dict(params)
    params["mailto"] = MAILTO

    for i in range(max_retries):
        r = SESSION.get(url, params=params, timeout=60)
        if r.status_code == 200:
            return r.json()
        sleep_s = (2 ** i) + 0.1
        time.sleep(sleep_s)

    r.raise_for_status()


def concept_filter_string(concept_ids):
    return "|".join(concept_ids)


def extract_country_code(cc):
    """Extract ISO alpha-2 code from OpenAlex country URL or return as-is."""
    if cc is None:
        return "UNKNOWN"
    if cc.startswith("https://openalex.org/countries/"):
        return cc.replace("https://openalex.org/countries/", "")
    return cc


AI_BASE = concept_filter_string(AI_CONCEPT_IDS)


# -----------------------------
# 2) Pull country × year counts
# -----------------------------
def fetch_country_year_counts():
    """
    For each year, query AI papers and group by institutions.country_code.
    """
    rows = []
    ai_filter = f"concept.id:{concept_filter_string(AI_CONCEPT_IDS)}"

    for year in tqdm(range(START_YEAR, END_YEAR + 1), desc="Years"):
        filt = f"{ai_filter},publication_year:{year}"
        data = openalex_get(
            "works",
            params={
                "filter": filt,
                "group-by": "institutions.country_code",
                "per-page": 200,
            },
        )

        groups = data.get("group_by", [])
        for g in groups:
            cc = extract_country_code(g.get("key"))
            count = g.get("count", 0)
            rows.append({"year": year, "country_code": cc, "papers": count})

        time.sleep(0.2)

    df = pd.DataFrame(rows)
    return df


# -----------------------------
# 3) Country × year × subfield counts
# -----------------------------
def fetch_country_year_subfield_counts():
    rows = []
    base_ai = f"concept.id:{concept_filter_string(AI_CONCEPT_IDS)}"

    for sub_name, sub_cid in SUBFIELDS.items():
        sub_filter = f"{base_ai},concept.id:{sub_cid}"
        for year in tqdm(range(START_YEAR, END_YEAR + 1), desc=f"{sub_name} years"):
            filt = f"{sub_filter},publication_year:{year}"
            data = openalex_get(
                "works",
                params={
                    "filter": filt,
                    "group-by": "institutions.country_code",
                    "per-page": 200,
                },
            )
            groups = data.get("group_by", [])
            for g in groups:
                cc = extract_country_code(g.get("key"))
                count = g.get("count", 0)
                rows.append(
                    {"subfield": sub_name, "year": year, "country_code": cc, "papers": count}
                )
            time.sleep(0.2)

    return pd.DataFrame(rows)


# -----------------------------
# 4) Analysis helpers
# -----------------------------
def add_country_names(df):
    def code_to_name(cc):
        if cc in (None, "UNKNOWN"):
            return "Unknown"
        try:
            return pycountry.countries.get(alpha_2=cc).name
        except Exception:
            return cc

    df["country"] = df["country_code"].apply(code_to_name)
    return df


def compute_growth(df):
    """
    Compute total papers per country, growth ratio, and recent slope.
    """
    pivot = df.pivot_table(
        index="year", columns="country_code", values="papers", aggfunc="sum"
    ).fillna(0)

    totals = pivot.sum(axis=0).rename("total_papers")

    start = pivot.loc[START_YEAR]
    end = pivot.loc[END_YEAR]
    growth_ratio = ((end + 1) / (start + 1)).rename("growth_ratio")

    recent_years = list(range(END_YEAR - 4, END_YEAR + 1))
    recent = pivot.loc[recent_years]
    x = pd.Series(range(len(recent_years)), index=recent_years)
    slopes = {}
    for cc in recent.columns:
        y = recent[cc]
        slope = ((x - x.mean()) * (y - y.mean())).sum() / ((x - x.mean()) ** 2).sum()
        slopes[cc] = slope
    slopes = pd.Series(slopes).rename("recent_slope")

    summary = (
        pd.concat([totals, growth_ratio, slopes], axis=1)
        .reset_index()
        .rename(columns={"index": "country_code"})
    )
    return summary.sort_values("total_papers", ascending=False)


def top_k_over_time(df, k=10):
    """Top-k countries each year by paper count."""
    out = []
    for year, g in df.groupby("year"):
        out.append(g.sort_values("papers", ascending=False).head(k).assign(rank_year=year))
    return pd.concat(out, ignore_index=True)


# -----------------------------
# 5) Node-link graph data
# -----------------------------
def fetch_child_concepts(parent_cid, top_n=8):
    """Get child concepts of a main field."""
    data = openalex_get(
        "concepts",
        params={"filter": f"ancestors.id:{parent_cid}", "per-page": 200},
    )
    results = data.get("results", [])
    results = [r for r in results if r.get("works_count", 0) > 0]
    results.sort(key=lambda r: r["works_count"], reverse=True)
    return results[:top_n]


def count_country_concept(country_code, concept_id, year_from=START_YEAR, year_to=END_YEAR):
    """Count AI papers for (country, concept) over a year range."""
    filt = (
        f"concept.id:{AI_BASE},"
        f"concept.id:{concept_id},"
        f"institutions.country_code:{country_code},"
        f"publication_year:{year_from}-{year_to}"
    )
    data = openalex_get("works", params={"filter": filt, "per-page": 1})
    return data.get("meta", {}).get("count", 0)


def build_node_link_for_countries(countries, top_n_subfields=8, output_dir="../nextjs_app/public"):
    """Build node-link JSON per country."""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    field_to_subfields = {}
    for fname, fc in MAIN_FIELDS.items():
        field_to_subfields[fname] = fetch_child_concepts(fc, top_n=top_n_subfields)

    country_graphs = {}

    for cc in tqdm(countries, desc="Node-link countries"):
        nodes = []
        links = []

        for fname, fc in MAIN_FIELDS.items():
            main_count = count_country_concept(cc, fc)
            nodes.append({"id": fname, "type": "main", "count": main_count})

            for sub in field_to_subfields[fname]:
                sid = sub["id"].replace("https://openalex.org/", "")
                sname = sub["display_name"]
                sub_count = count_country_concept(cc, sid)

                nodes.append(
                    {
                        "id": sname,
                        "type": "sub",
                        "parent": fname,
                        "count": sub_count,
                        "concept_id": sid,
                    }
                )
                links.append({"source": fname, "target": sname})

        country_graphs[cc] = {"nodes": nodes, "links": links}

    with open(f"{output_dir}/node_link_by_country.json", "w") as f:
        json.dump(country_graphs, f, indent=2)

    print(f"Saved {output_dir}/node_link_by_country.json")


# -----------------------------
# 6) Export for web app
# -----------------------------
def export_json_for_web(cy_df, summary_df, subfield_df, output_dir="../nextjs_app/public"):
    """Export processed data as JSON for the Next.js app."""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    # Country-year data as JSON
    cy_json = cy_df.to_dict(orient="records")
    with open(f"{output_dir}/ai_papers_country_year.json", "w") as f:
        json.dump(cy_json, f)
    print(f"Saved {output_dir}/ai_papers_country_year.json")
    
    # Summary data
    summary_json = summary_df.to_dict(orient="records")
    with open(f"{output_dir}/ai_papers_country_summary.json", "w") as f:
        json.dump(summary_json, f)
    print(f"Saved {output_dir}/ai_papers_country_summary.json")
    
    # Subfield data
    subfield_json = subfield_df.to_dict(orient="records")
    with open(f"{output_dir}/ai_papers_country_year_subfield.json", "w") as f:
        json.dump(subfield_json, f)
    print(f"Saved {output_dir}/ai_papers_country_year_subfield.json")


# -----------------------------
# 7) Run pipeline
# -----------------------------
def main():
    # A) country-year
    cy = fetch_country_year_counts()
    cy = add_country_names(cy)
    cy.to_csv("ai_papers_country_year.csv", index=False)
    print("Saved ai_papers_country_year.csv")

    # Basic summaries
    summary = compute_growth(cy)
    summary = add_country_names(summary)
    summary.to_csv("ai_papers_country_summary.csv", index=False)
    print("Saved ai_papers_country_summary.csv")

    top10 = top_k_over_time(cy, k=10)
    top10 = add_country_names(top10)
    top10.to_csv("ai_papers_top10_each_year.csv", index=False)
    print("Saved ai_papers_top10_each_year.csv")

    # B) subfield breakdown
    cys = fetch_country_year_subfield_counts()
    cys = add_country_names(cys)
    cys.to_csv("ai_papers_country_year_subfield.csv", index=False)
    print("Saved ai_papers_country_year_subfield.csv")

    # C) Export JSON for web
    export_json_for_web(cy, summary, cys)

    # D) Node-link data
    countries = cy["country_code"].unique().tolist()
    build_node_link_for_countries(countries, top_n_subfields=6)

    print("\nTop 15 countries by total AI papers:")
    print(
        summary.head(15)[
            ["country_code", "country", "total_papers", "growth_ratio", "recent_slope"]
        ]
    )


if __name__ == "__main__":
    main()