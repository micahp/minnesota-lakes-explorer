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
        # Convert PLS_SECTION_ID_LAKE_CENTER to numeric, handling any conversion errors
        df['PLS_SECTION_ID_LAKE_CENTER'] = pd.to_numeric(
            df['PLS_SECTION_ID_LAKE_CENTER'].str.replace(',', ''), 
            errors='coerce'
        )

        # Convert Section_ID to int64 to ensure type compatibility
        pls_data['Section_ID'] = pls_data['Section_ID'].astype('Int64')

        # Now merge with compatible types
        df = df.merge(
            pls_data,
            left_on='PLS_SECTION_ID_LAKE_CENTER',
            right_on='Section_ID',
            how='left'
        )

    return df