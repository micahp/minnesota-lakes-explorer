import pandas as pd
import numpy as np

def load_and_process_lake_data(file_path):
    """Load and process the lake data CSV file."""
    df = pd.read_csv(file_path)
    
    # Filter lakes larger than 10 acres
    df = df[df['LAKE_AREA_DOW_ACRES'] >= 10]
    
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

def format_lake_info(lake_row):
    """Format lake information for display."""
    info = {
        "Name": lake_row['LAKE_NAME'],
        "ID": lake_row['FISHERIES_WATERBODY_ID'],
        "Area (acres)": lake_row['LAKE_AREA_DOW_ACRES'],
        "Littoral Area (acres)": lake_row['LITTORAL_AREA_ACRES'],
        "Shore Length (miles)": lake_row['SHORE_LENGTH_MILES'],
        "Maximum Depth (feet)": lake_row['MAX_DEPTH_FEET'],
        "Mean Depth (feet)": lake_row['MEAN_DEPTH_FEET'],
        "Location": f"{lake_row['LAKE_CENTER_LAT_DD5']:.4f}°N, {lake_row['LAKE_CENTER_LONG_DD5']:.4f}°W"
    }
    
    # Remove entries with NaN values
    return {k: v for k, v in info.items() if pd.notna(v)}
