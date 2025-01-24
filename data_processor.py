import pandas as pd
from pathlib import Path

def get_processed_data():
    """Get the processed lake data from the consolidated dataset."""
    data_path = Path('consolidated_lake_data.csv')

    # If consolidated data doesn't exist, create it
    if not data_path.exists():
        from data_consolidation import load_and_process_data
        load_and_process_data()

    # Load consolidated data
    df = pd.read_csv(data_path)

    return df