#!/usr/bin/env python3
"""
Script to find lakes with fish catch data and prepare them for the React demo.
This will identify lakes that have recent fish catch data from the Minnesota DNR.
"""

import json
import csv
from datetime import datetime
from collections import defaultdict

def load_lakes_data():
    """Load the lakes data from JSON file."""
    with open('data/lakes.json', 'r') as f:
        return json.load(f)

def load_fish_catch_data():
    """Load the fish catch data from JSON file."""
    with open('data/fish_catch.json', 'r') as f:
        return json.load(f)

def find_lakes_with_recent_catches(fish_data, min_catches=5):
    """Find lakes that have recent fish catch data."""
    lakes_with_fish = []
    
    for lake_id, species_data in fish_data.items():
        total_catches = 0
        most_recent_date = None
        
        # Count total catches across all species
        for species, catches in species_data.items():
            for catch in catches:
                if 'survey_date' in catch:
                    try:
                        date = datetime.strptime(catch['survey_date'], '%Y-%m-%d')
                        if most_recent_date is None or date > most_recent_date:
                            most_recent_date = date
                        total_catches += catch.get('total_catch', 0)
                    except ValueError:
                        continue
        
        if total_catches >= min_catches and most_recent_date:
            lakes_with_fish.append({
                'lake_id': lake_id,
                'total_catches': total_catches,
                'most_recent_date': most_recent_date.isoformat(),
                'species_count': len(species_data)
            })
    
    # Sort by most recent date and total catches
    lakes_with_fish.sort(key=lambda x: (x['most_recent_date'], x['total_catches']), reverse=True)
    return lakes_with_fish

def get_lake_details(lakes_data, lake_id):
    """Get lake details from the lakes data."""
    # Try to find by map_id first (which should match the fish data lake_id)
    for lake in lakes_data:
        if lake.get('map_id') == lake_id:
            return lake
    
    # If not found, return None
    return None

def generate_sample_catches(fish_data, lake_id, num_catches=10):
    """Generate the most recent catches for a lake based on actual fish data."""
    if lake_id not in fish_data:
        return []
    
    sample_catches = []
    species_data = fish_data[lake_id]
    
    # Get the most recent survey data for each species
    for species, catches in species_data.items():
        if catches and len(catches) > 0:
            # Sort by date and get most recent
            sorted_catches = sorted(catches, key=lambda x: x.get('survey_date', ''), reverse=True)
            most_recent = sorted_catches[0]
            
            # Create a sample catch entry
            sample_catch = {
                'id': f"dnr_{lake_id}_{species}_{len(sample_catches)}",
                'angler': 'Minnesota DNR',
                'species': species.title(),
                'length': 18 + (len(sample_catches) * 2),  # Vary lengths
                'verified': True,
                'fishTokens': 0,  # DNR catches don't earn tokens
                'timestamp': most_recent.get('survey_date', '2024-01-01'),
                'lakeId': lake_id,
                'lakeName': f"Lake {lake_id}",  # Will be updated with actual name
                'source': 'DNR Survey',
                'total_catch': most_recent.get('total_catch', 0),
                'cpue': most_recent.get('cpue', 0)
            }
            sample_catches.append(sample_catch)
            
            if len(sample_catches) >= num_catches:
                break
    
    return sample_catches

def main():
    """Main function to process data and generate output."""
    print("Loading lakes data...")
    lakes_data = load_lakes_data()
    
    print("Loading fish catch data...")
    fish_data = load_fish_catch_data()
    
    print("Finding lakes with recent fish catch data...")
    lakes_with_fish = find_lakes_with_recent_catches(fish_data, min_catches=10)
    
    print(f"Found {len(lakes_with_fish)} lakes with fish data")
    
    # Get top 20 lakes with fish data
    top_lakes = lakes_with_fish[:20]
    
    # Prepare data for React demo
    demo_lakes = []
    demo_catches = {}
    
    for i, lake_info in enumerate(top_lakes):
        lake_id = lake_info['lake_id']
        lake_details = get_lake_details(lakes_data, lake_id)
        
        if lake_details:
            # Create demo lake entry
            demo_lake = {
                'id': f"dnr_{lake_id}",
                'name': lake_details.get('name', f"Lake {lake_id}"),
                'county': lake_details.get('county', 'Unknown'),
                'sizeAcres': lake_details.get('area_acres', 1000),
                'coords': [lake_details.get('latitude', 45.0), lake_details.get('longitude', -93.0)],
                'hasFishData': True,
                'totalCatches': lake_info['total_catches'],
                'speciesCount': lake_info['species_count'],
                'lastSurveyDate': lake_info['most_recent_date']
            }
            demo_lakes.append(demo_lake)
            
            # Generate sample catches for this lake - get most recent 10
            sample_catches = generate_sample_catches(fish_data, lake_id, num_catches=10)
            demo_catches[f"dnr_{lake_id}"] = sample_catches
    
    # Save the results
    output_data = {
        'lakes': demo_lakes,
        'catches': demo_catches,
        'metadata': {
            'total_lakes_found': len(lakes_with_fish),
            'lakes_included': len(demo_lakes),
            'generated_at': datetime.now().isoformat(),
            'source': 'Minnesota DNR Fish Survey Data'
        }
    }
    
    with open('react-demo/src/dnr_lakes_data.json', 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\nGenerated demo data for {len(demo_lakes)} lakes")
    print("Data saved to: react-demo/src/dnr_lakes_data.json")
    
    # Print summary
    print("\nTop 10 lakes with fish data:")
    for i, lake in enumerate(demo_lakes[:10]):
        print(f"{i+1:2d}. {lake['name']} ({lake['county']}) - {lake['totalCatches']} catches, {lake['speciesCount']} species")

if __name__ == "__main__":
    main()