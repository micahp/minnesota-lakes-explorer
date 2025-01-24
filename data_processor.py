import pandas as pd
import numpy as np
from pathlib import Path

def process_lake_data(df):
    """Process the raw lake dataframe."""
    # Convert area column to numeric, replacing invalid values with NaN
    df['LAKE_AREA_DOW_ACRES'] = pd.to_numeric(df['LAKE_AREA_DOW_ACRES'], errors='coerce')

    # Filter lakes larger than 10 acres and remove NaN values
    df = df[df['LAKE_AREA_DOW_ACRES'].notna() & (df['LAKE_AREA_DOW_ACRES'] >= 10)]

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

    return df

def get_processed_data():
    """Get the processed lake data, processing it only once."""
    # Read the CSV file
    data_path = Path('attached_assets/fisheries_lake_data(Sheet 1).csv')
    df = pd.read_csv(data_path)
    
    # Process the data
    processed_df = process_lake_data(df)
    
    return processed_df
