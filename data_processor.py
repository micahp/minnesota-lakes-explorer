import pandas as pd
from pathlib import Path
from pls_processor import get_pls_data

def get_processed_data():
    """Get the processed lake data, loading from the preprocessed file."""
    data_path = Path('processed_lake_data.csv')

    # If preprocessed data doesn't exist, create it
    if not data_path.exists():
        from preprocess_data import preprocess_lake_data
        preprocess_lake_data()

    # Load preprocessed data
    df = pd.read_csv(data_path)

    # Try to load PLS data if available
    pls_data = get_pls_data()
    if pls_data is not None:
        # If we have PLS data, merge it with lake data based on section ID
        # Adjust the merge logic based on your specific needs
        df = pd.merge(
            df,
            pls_data,
            left_on='PLS_SECTION_ID_LAKE_CENTER',
            right_on='Section_ID',
            how='left'
        )

    return df