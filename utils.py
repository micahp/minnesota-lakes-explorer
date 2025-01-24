import pandas as pd

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