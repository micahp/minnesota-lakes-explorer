import pandas as pd
import numpy as np
from pathlib import Path

def load_and_process_data():
    """Load and consolidate lake data from multiple sources."""
    print("Loading data from multiple sources...")
    
    # Load main fisheries data
    fisheries_data = pd.read_csv('attached_assets/fisheries_lake_data(Sheet 1).csv')
    
    try:
        # Load sentinel lake data
        sentinel_data = pd.read_excel('attached_assets/SENTINEL_lake_data.xls')
        # Ensure the ID column matches
        if 'FISHERIES_WATERBODY_ID' not in sentinel_data.columns:
            print("Warning: Sentinel data missing FISHERIES_WATERBODY_ID column")
            sentinel_data = None
    except Exception as e:
        print(f"Error loading sentinel data: {e}")
        sentinel_data = None

    try:
        # Load border lake data
        border_data = pd.read_excel('attached_assets/BORDER_lake_data.xls')
        if 'FISHERIES_WATERBODY_ID' not in border_data.columns:
            print("Warning: Border data missing FISHERIES_WATERBODY_ID column")
            border_data = None
    except Exception as e:
        print(f"Error loading border data: {e}")
        border_data = None

    # Start with main fisheries data
    merged_data = fisheries_data.copy()

    # Merge with sentinel data if available
    if sentinel_data is not None:
        merged_data = pd.merge(
            merged_data,
            sentinel_data,
            on='FISHERIES_WATERBODY_ID',
            how='left',
            suffixes=('', '_sentinel')
        )

    # Merge with border data if available
    if border_data is not None:
        merged_data = pd.merge(
            merged_data,
            border_data,
            on='FISHERIES_WATERBODY_ID',
            how='left',
            suffixes=('', '_border')
        )

    # Clean and standardize data
    print("Cleaning and standardizing data...")
    
    # Convert area columns to numeric, replacing invalid values with NaN
    area_columns = [
        'LAKE_AREA_DOW_ACRES',
        'LAKE_AREA_GIS_ACRES',
        'LAKE_AREA_MN_ACRES',
        'LAKE_AREA_PLANIMETERED_ACRES'
    ]
    
    for col in area_columns:
        if col in merged_data.columns:
            merged_data[col] = pd.to_numeric(merged_data[col], errors='coerce')

    # Clean coordinates
    coord_columns = ['LAKE_CENTER_LAT_DD5', 'LAKE_CENTER_LONG_DD5']
    for col in coord_columns:
        if col in merged_data.columns:
            merged_data[col] = pd.to_numeric(merged_data[col], errors='coerce')

    # Remove rows with missing essential data
    merged_data = merged_data.dropna(subset=['LAKE_CENTER_LAT_DD5', 'LAKE_CENTER_LONG_DD5'])

    # Save processed data
    output_path = Path('consolidated_lake_data.csv')
    print(f"Saving consolidated data to {output_path}...")
    merged_data.to_csv(output_path, index=False)
    
    print("Data consolidation complete!")
    print(f"Total lakes in consolidated dataset: {len(merged_data)}")
    
    return merged_data

if __name__ == "__main__":
    load_and_process_data()
