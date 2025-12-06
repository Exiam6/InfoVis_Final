"""
Quick script to fetch ONLY the node-link subfield data from OpenAlex.
Run from the data_processing folder:
  python fetch_subfields_only.py

This adds subfields to the existing node_link_by_country.json
Takes ~15-20 minutes for 50 countries.
"""

import json
import time
import requests
from tqdm import tqdm

BASE = "https://api.openalex.org"
MAILTO = "zz4330@nyu.edu"  # Change to your email

# Main fields with their subfields (OpenAlex concept IDs)
MAIN_FIELDS = {
    "Computer Vision": {
        "id": "C31972630",
        "subfields": {
            "Object Detection": "C2777901560",
            "Image Segmentation": "C48473522",
            "Pattern Recognition": "C107457646",
            "Image Processing": "C41008148",
            "Feature Extraction": "C49204034",
            "Image Classification": "C2776034682",
        }
    },
    "Natural Language Processing": {
        "id": "C204321447",
        "subfields": {
            "Machine Translation": "C153180895",
            "Sentiment Analysis": "C48824518",
            "Question Answering": "C128827874",
            "Text Mining": "C70721500",
            "Speech Recognition": "C112938831",
            "Information Retrieval": "C17744445",
        }
    },
    "Robotics": {
        "id": "C80444323",
        "subfields": {
            "Motion Planning": "C120314980",
            "Control Theory": "C114614502",
            "Mobile Robot": "C15471489",
            "Robot Kinematics": "C53854851",
            "SLAM": "C205286032",
            "Path Planning": "C179104552",
        }
    },
    "Reinforcement Learning": {
        "id": "C100001896",
        "subfields": {
            "Q-learning": "C2777107058",
            "Markov Decision Process": "C48308254",
            "Multi-agent System": "C199539241",
            "Actor-Critic": "C2779970884",
            "Policy Gradient": "C2779399498",
            "Deep RL": "C2776115382",
        }
    },
}

SESSION = requests.Session()

def openalex_get(endpoint, params, max_retries=3):
    url = f"{BASE}/{endpoint}"
    params = dict(params)
    params["mailto"] = MAILTO
    
    for i in range(max_retries):
        try:
            r = SESSION.get(url, params=params, timeout=30)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                print("Rate limited, waiting...")
                time.sleep(10)
                continue
            time.sleep(2 ** i)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(2)
    return {}

def count_papers(country_code, concept_id):
    """Count papers for a concept in a country."""
    filt = f"concept.id:{concept_id},institutions.country_code:{country_code}"
    data = openalex_get("works", params={"filter": filt, "per-page": 1})
    return data.get("meta", {}).get("count", 0)

def main():
    # Load existing summary to get country list
    try:
        with open("../nextjs_app/public/ai_papers_country_summary.json", "r") as f:
            summary = json.load(f)
        countries = [c["country_code"] for c in summary[:50]]  # Top 50
        print(f"Found {len(countries)} countries")
    except FileNotFoundError:
        print("Error: Run openalex_processor.py first to generate country list")
        return
    
    country_graphs = {}
    
    total_calls = len(countries) * (4 + 24)  # 4 main + 24 subfields per country
    print(f"Will make ~{total_calls} API calls. Estimated time: {total_calls * 0.3 / 60:.1f} minutes")
    
    for cc in tqdm(countries, desc="Countries"):
        nodes = []
        links = []
        
        for field_name, field_data in MAIN_FIELDS.items():
            # Main field
            main_count = count_papers(cc, field_data["id"])
            nodes.append({
                "id": field_name,
                "type": "main",
                "count": main_count
            })
            time.sleep(0.2)
            
            # Subfields
            for sub_name, sub_id in field_data["subfields"].items():
                sub_count = count_papers(cc, sub_id)
                nodes.append({
                    "id": sub_name,
                    "type": "sub",
                    "parent": field_name,
                    "count": sub_count,
                    "concept_id": sub_id
                })
                links.append({
                    "source": field_name,
                    "target": sub_name
                })
                time.sleep(0.2)
        
        country_graphs[cc] = {"nodes": nodes, "links": links}
    
    # Save
    output_path = "../nextjs_app/public/node_link_by_country.json"
    with open(output_path, "w") as f:
        json.dump(country_graphs, f, indent=2)
    
    print(f"\nSaved {output_path}")
    print(f"Countries: {len(country_graphs)}")
    sample = list(country_graphs.values())[0]
    print(f"Nodes per country: {len(sample['nodes'])} (4 main + {len(sample['nodes'])-4} sub)")
    print(f"Links per country: {len(sample['links'])}")

if __name__ == "__main__":
    main()