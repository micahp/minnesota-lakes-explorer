import pandas as pd
from pathlib import Path

def get_processed_data():
    """Get the processed lake data, loading from the preprocessed file."""
    data_path = Path('processed_lake_data.csv')

    # If preprocessed data doesn't exist, create it
    if not data_path.exists():
        from preprocess_data import preprocess_lake_data
        preprocess_lake_data()

    # Load preprocessed data
    return pd.read_csv(data_path)