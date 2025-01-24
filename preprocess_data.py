import pandas as pd
import numpy as np
from pathlib import Path

def preprocess_lake_data():
    """Process the raw lake data and save it as a clean CSV file."""
    print("Loading raw lake data...")
    data_path = Path('attached_assets/fisheries_lake_data(Sheet 1).csv')
    df = pd.read_csv(data_path)

    print("Processing data...")
    # Convert area column to numeric, replacing invalid values with NaN
    df['LAKE_AREA_DOW_ACRES'] = pd.to_numeric(df['LAKE_AREA_DOW_ACRES'], errors='coerce')

    # Filter lakes larger than 200 acres and remove NaN values
    df = df[df['LAKE_AREA_DOW_ACRES'].notna() & (df['LAKE_AREA_DOW_ACRES'] >= 200)]

    # Clean coordinates
    df = df[df['LAKE_CENTER_LAT_DD5'].notna() & df['LAKE_CENTER_LONG_DD5'].notna()]

    # Round numeric columns to 2 decimal places
    numeric_columns = [
        'LAKE_AREA_DOW_ACRES', 'LITTORAL_AREA_ACRES',
        'MAX_DEPTH_FEET', 'MEAN_DEPTH_FEET', 'SHORE_LENGTH_MILES'
    ]

    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        df[col] = df[col].round(2)

    # Save processed data
    output_path = Path('processed_lake_data.csv')
    print(f"Saving processed data to {output_path}...")
    df.to_csv(output_path, index=False)
    print("Data preprocessing complete!")

if __name__ == "__main__":
    preprocess_lake_data()