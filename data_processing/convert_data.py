import pandas as pd
import json
import os

# Paths (Adjust these if your folder structure is different)
# Assuming:
# /project_root
#   /data_processing (contains csv)
#   /nextjs_app (current folder)
csv_path = "ai_papers_country_year.csv"
node_link_source = "node_link_by_country.json"
output_path = "../nextjs_app/public/ai_papers_country_year.json"
node_link_dest = "../nextjs_app/public/node_link_by_country.json"

def main():
    # 1. Check if input CSV exists
    if not os.path.exists(csv_path):
        print(f"Error: Could not find {csv_path}")
        print("Please ensure you ran the openalex_processor.py script in the data_processing folder first.")
        return

    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path)

    # 2. Convert to Nested JSON structure: { "US": { "2020": { "count": 100 }, ... } }
    # The frontend expects: data[country_code][year] -> object with 'count'
    nested_data = {}

    for _, row in df.iterrows():
        cc = row['country_code']
        year = str(row['year']) # Keys must be strings for JSON
        count = int(row['papers']) # Ensure Python int

        if pd.isna(cc) or cc == "UNKNOWN":
            continue

        if cc not in nested_data:
            nested_data[cc] = {}
        
        nested_data[cc][year] = {
            "count": count
        }

    # 3. Save the converted JSON to /public
    os.makedirs("./public", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(nested_data, f)
    print(f"✅ Generated {output_path}")

    # 4. Move/Copy the Node Link JSON to /public
    if os.path.exists(node_link_source):
        with open(node_link_source, 'r') as f_src:
            node_data = json.load(f_src)
        with open(node_link_dest, 'w') as f_dst:
            json.dump(node_data, f_dst)
        print(f"✅ Copied node_link_by_country.json to {node_link_dest}")
    else:
        print(f"⚠️  Warning: Could not find {node_link_source}. Make sure to generate it first.")

if __name__ == "__main__":
    main()