import pandas as pd
import numpy as np
from pathlib import Path
import json
import os

# NEW HELPER FUNCTION
def clean_id_value(value):
    """
    Cleans a single ID value that might have been misinterpreted by Excel
    or other spreadsheet programs as a formula.
    Removes '=\"' from the beginning and '\"' from the end if both are present.
    Handles NaN by returning None.
    """
    if pd.isna(value):
        return None
    s_value = str(value).strip() # Ensure string and remove leading/trailing whitespace
    if s_value.startswith('=\"') and s_value.endswith('\"'):
        s_value = s_value[2:-1] # Get the core value
    # Now, remove commas from the potentially cleaned value or original value
    return s_value.replace(',', '')

def convert_excel_to_csv(input_path, output_path=None):
    """Convert Excel files to CSV format, with special handling for fisheries_lake_data.xls."""
    if output_path is None:
        output_path = input_path.with_suffix('.csv')

    excel_file_name = str(input_path.name) # Get filename for checking

    try:
        if "fisheries_lake_data.xls" in excel_file_name:
            # Special handling for fisheries_lake_data.xls
            try:
                excel_file_obj = pd.ExcelFile(input_path)
                print(f"DIAGNOSTIC: Sheet names found in {excel_file_name}: {excel_file_obj.sheet_names}")
            except Exception as e_inspect:
                print(f"DIAGNOSTIC: Error inspecting sheet names in {excel_file_name}: {e_inspect}")
            
            df = pd.read_excel(input_path, sheet_name='Sheet1', dtype={
                'FISHERIES_WATERBODY_ID': str,
                'DOW_NBR_PRIMARY': str
            })

            # Ensure DOW_NBR_PRIMARY is treated as a string immediately and cleaned for lookup
            if 'DOW_NBR_PRIMARY' in df.columns:
                df['DOW_NBR_PRIMARY'] = df['DOW_NBR_PRIMARY'].astype(str).str.strip()
            
            # Prepare FISHERIES_WATERBODY_ID for lookup (string, stripped, no commas)
            if 'FISHERIES_WATERBODY_ID' in df.columns:
                df['TEMP_LOOKUP_ID'] = df['FISHERIES_WATERBODY_ID'].astype(str).str.strip().str.replace(',', '', regex=False)
            
            # Diagnostic print for Gull Lake (FISHERIES_WATERBODY_ID '2379') AS READ
            if 'TEMP_LOOKUP_ID' in df.columns and 'DOW_NBR_PRIMARY' in df.columns:
                gull_lake_row_as_read = df[df['TEMP_LOOKUP_ID'] == '2379']
                if not gull_lake_row_as_read.empty:
                    dow_as_read = gull_lake_row_as_read['DOW_NBR_PRIMARY'].iloc[0]
                    print(f"DIAGNOSTIC (convert_excel_to_csv): DOW_NBR_PRIMARY for Gull (2379) AS READ from Excel: '{dow_as_read}'")
                else:
                    print("DIAGNOSTIC (convert_excel_to_csv): Gull Lake (2379) not found for 'AS READ' DOW check.")
            
            if 'TEMP_LOOKUP_ID' in df.columns: # Clean up temporary column
                df.drop(columns=['TEMP_LOOKUP_ID'], inplace=True)

            # Apply clean_id_value (assuming this function is defined elsewhere in the script)
            if 'FISHERIES_WATERBODY_ID' in df.columns:
                df['FISHERIES_WATERBODY_ID'] = df['FISHERIES_WATERBODY_ID'].apply(clean_id_value)
            if 'DOW_NBR_PRIMARY' in df.columns:
                df['DOW_NBR_PRIMARY'] = df['DOW_NBR_PRIMARY'].apply(clean_id_value)

            # Diagnostic print for Gull Lake (FISHERIES_WATERBODY_ID '2379') AFTER CLEANING
            if 'FISHERIES_WATERBODY_ID' in df.columns and 'DOW_NBR_PRIMARY' in df.columns:
                # clean_id_value should result in '2379' for FISHERIES_WATERBODY_ID
                gull_lake_row_after_clean = df[df['FISHERIES_WATERBODY_ID'] == '2379'] 
                if not gull_lake_row_after_clean.empty:
                    dow_after_clean = gull_lake_row_after_clean['DOW_NBR_PRIMARY'].iloc[0]
                    print(f"DIAGNOSTIC (convert_excel_to_csv): DOW_NBR_PRIMARY for Gull (2379) AFTER clean_id_value: '{dow_after_clean}'")
                else:
                    print("DIAGNOSTIC (convert_excel_to_csv): Gull Lake (2379) not found for 'AFTER CLEANING' DOW check.")
        else:
            # Standard handling for other Excel files
            df = pd.read_excel(input_path, sheet_name='Sheet1')
        
        df.to_csv(output_path, index=False, quoting=csv.QUOTE_MINIMAL) # Use csv.QUOTE_MINIMAL
        print(f"Converted {input_path} to {output_path}")
        return output_path
    except Exception as e:
        print(f"Error converting {input_path}: {e}")
        return None

def process_lake_metadata(min_lake_size_acres=0, require_coordinates=False):
    """
    Process lake metadata and output as JSON
    
    Parameters:
    - min_lake_size_acres: Minimum lake size in acres (default 0 = no minimum)
    - require_coordinates: Whether to require latitude/longitude coordinates (default False)
    """
    print("Processing lake metadata...")
    
    # Load main lake data
    data_path = Path('attached_assets/fisheries_lake_data.csv')
    df = pd.read_csv(data_path)
    print(f"Available columns in main lake data (fisheries_lake_data(Sheet 1).csv): {df.columns.tolist()}")
    
    # Load metadata with county information
    metadata_path = Path('attached_assets/LAKE_METADATA_2024.csv')
    metadata_df = pd.read_csv(metadata_path)
    print(f"Available columns in lake metadata (LAKE_METADATA_2024.csv): {metadata_df.columns.tolist()}")
    
    # Print row counts before filtering
    # DIAGNOSTIC: Initial DataFrame stats
    print(f"DIAGNOSTIC: Initial main_df (from fisheries_lake_data): {len(df)} rows, {df['FISHERIES_WATERBODY_ID'].nunique()} unique IDs (before cleaning).")
    print(f"DIAGNOSTIC: Initial metadata_df (from LAKE_METADATA_2024): {len(metadata_df)} rows, {metadata_df['FISHERIES_WATERBODY_ID'].nunique()} unique IDs (before cleaning).")
    
    if 'COUNTY_NAME' in metadata_df.columns:
        unique_counties_in_metadata_source = sorted(list(metadata_df['COUNTY_NAME'].astype(str).str.strip().unique()))
        print(f"DIAGNOSTIC: Unique counties available in metadata_df source: {len(unique_counties_in_metadata_source)} -> {unique_counties_in_metadata_source}")
    else:
        print("DIAGNOSTIC: Warning: COUNTY_NAME column not found in metadata_df source.")
    # End DIAGNOSTIC

    # Check if county information exists in metadata
    if 'COUNTY_NAME' in metadata_df.columns and 'FISHERIES_WATERBODY_ID' in metadata_df.columns:
        print(f"Found county information in {metadata_path}")
        # Clean FISHERIES_WATERBODY_ID in both dataframes before merging
        df['FISHERIES_WATERBODY_ID'] = df['FISHERIES_WATERBODY_ID'].apply(clean_id_value)
        metadata_df['FISHERIES_WATERBODY_ID'] = metadata_df['FISHERIES_WATERBODY_ID'].apply(clean_id_value)

        # DIAGNOSTIC: DataFrame stats after ID cleaning
        print(f"DIAGNOSTIC: Main_df after ID cleaning: {df['FISHERIES_WATERBODY_ID'].nunique()} unique IDs.")
        print(f"DIAGNOSTIC: Metadata_df after ID cleaning: {metadata_df['FISHERIES_WATERBODY_ID'].nunique()} unique IDs.")
        # End DIAGNOSTIC
        
        # Convert FISHERIES_WATERBODY_ID to string type in both dataframes after cleaning
        # This ensures that 'None' (if any IDs became None after cleaning) also becomes 'None' string,
        # which is fine for merging if consistent across both DFs.
        df['FISHERIES_WATERBODY_ID'] = df['FISHERIES_WATERBODY_ID'].astype(str)
        metadata_df['FISHERIES_WATERBODY_ID'] = metadata_df['FISHERIES_WATERBODY_ID'].astype(str)
        
        # Merge with main lake data
        df = pd.merge(
            df, 
            metadata_df, # metadata_df now contains all its original (cleaned ID) columns
            on='FISHERIES_WATERBODY_ID', 
            how='left',
            indicator=True, # DIAGNOSTIC: Add indicator for merge diagnostics
            suffixes=('', '_meta') # Keep original names from df, add _meta for overlapping cols from metadata_df
        )
        # DIAGNOSTIC: Merge statistics
        print("DIAGNOSTIC: Merge statistics (how many IDs matched from main_df to metadata_df):")
        print(df['_merge'].value_counts())
        
        # DIAGNOSTIC: Examine non-matching IDs
        unmatched_lake_ids = df[df['_merge'] == 'left_only']['FISHERIES_WATERBODY_ID'].unique()
        if len(unmatched_lake_ids) > 0:
            print(f"DIAGNOSTIC: Sample of FISHERIES_WATERBODY_ID from main_df that did NOT match (up to 20): {unmatched_lake_ids[:20]}")
        else:
            print("DIAGNOSTIC: All lakes from main_df found a match or there were no left_only entries.")
        
        # For comparison, print a sample of IDs from metadata_df AFTER cleaning
        # Ensure metadata_df is the version with cleaned IDs before this step
        # We already have metadata_df['FISHERIES_WATERBODY_ID'] cleaned and as string at this point.
        sample_metadata_ids = metadata_df['FISHERIES_WATERBODY_ID'].unique()
        if len(sample_metadata_ids) > 0:
            print(f"DIAGNOSTIC: Sample of FISHERIES_WATERBODY_ID from metadata_df (cleaned, up to 20): {sample_metadata_ids[:20]}")
        # End DIAGNOSTIC

        # Drop the indicator column after checking
        df = df.drop(columns=['_merge'])
        # End DIAGNOSTIC
    else:
        print(f"No county information found in {metadata_path}, using 'Unknown' as default")
        df['COUNTY_NAME'] = 'Unknown'
    
    # Clean and filter data
    df['LAKE_AREA_DOW_ACRES'] = pd.to_numeric(df['LAKE_AREA_DOW_ACRES'], errors='coerce')
    
    # DEBUG: Show columns before any further filtering or saving
    print(f"DEBUG: Columns in DataFrame before size/coordinate filtering: {df.columns.tolist()}")

    # Apply filters based on parameters
    original_count = len(df)
    
    # Filter lakes by size if specified
    if min_lake_size_acres > 0:
        df = df[df['LAKE_AREA_DOW_ACRES'].notna() & (df['LAKE_AREA_DOW_ACRES'] >= min_lake_size_acres)]
        print(f"Filtered lakes by minimum size ({min_lake_size_acres} acres): {len(df)} lakes remaining (removed {original_count - len(df)})")
    
    # Filter by coordinates if required
    if require_coordinates:
        coord_count = len(df)
        df = df[df['LAKE_CENTER_LAT_DD5'].notna() & df['LAKE_CENTER_LONG_DD5'].notna()]
        print(f"Filtered lakes by coordinates: {len(df)} lakes remaining (removed {coord_count - len(df)})")
    
    # Round numeric columns
    numeric_columns = [
        'LAKE_AREA_DOW_ACRES', 'LITTORAL_AREA_ACRES',
        'MAX_DEPTH_FEET', 'MEAN_DEPTH_FEET', 'SHORE_LENGTH_MILES'
    ]
    
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df[col] = df[col].round(2)
    
    # Create simplified JSON structure
    lakes = []
    sequential_id_counter = 0
    for _, row in df.iterrows():
        lake = {
            'id': sequential_id_counter,  # Use sequential ID
            'name': row['LAKE_NAME'] if pd.notna(row['LAKE_NAME']) else 'Unknown',
            'county': row['COUNTY_NAME'] if pd.notna(row['COUNTY_NAME']) else 'Unknown',
            'area_acres': row['LAKE_AREA_DOW_ACRES'] if pd.notna(row['LAKE_AREA_DOW_ACRES']) else None,
            'max_depth_ft': row['MAX_DEPTH_FEET'] if 'MAX_DEPTH_FEET' in row and pd.notna(row['MAX_DEPTH_FEET']) else None,
            'mean_depth_ft': row['MEAN_DEPTH_FEET'] if 'MEAN_DEPTH_FEET' in row and pd.notna(row['MEAN_DEPTH_FEET']) else None,
            'shore_length_mi': row['SHORE_LENGTH_MILES'] if 'SHORE_LENGTH_MILES' in row and pd.notna(row['SHORE_LENGTH_MILES']) else None,
            'latitude': row['LAKE_CENTER_LAT_DD5'] if pd.notna(row['LAKE_CENTER_LAT_DD5']) else None,
            'longitude': row['LAKE_CENTER_LONG_DD5'] if pd.notna(row['LAKE_CENTER_LONG_DD5']) else None,
            'alternate_name': row['ALT_LAKE_NAME'] if 'ALT_LAKE_NAME' in row and pd.notna(row['ALT_LAKE_NAME']) else None,
            # Process DOW_NBR_PRIMARY to ensure 8-digit format with trailing zeros
            dow_raw_val = row.get('DOW_NBR_PRIMARY') 
            processed_dow_number = None
            if pd.notna(dow_raw_val):
                dow_str = str(dow_raw_val)
                # Remove potential ".0" if pandas read an integer DOW as float
                if dow_str.endswith('.0'): 
                    dow_str = dow_str[:-2]
                
                if dow_str: # Check if dow_str is not empty after potential cleaning
                    if len(dow_str) < 8:
                        processed_dow_number = dow_str.ljust(8, '0') # Pad with TRAILING zeros
                    else:
                        processed_dow_number = dow_str[:8] # Use first 8 characters if 8 or longer
            'dow_number': processed_dow_number,
            'fisheries_waterbody_id': str(row['FISHERIES_WATERBODY_ID']) if pd.notna(row['FISHERIES_WATERBODY_ID']) else None  # Add fisheries_waterbody_id
        }
        lakes.append(lake)
        sequential_id_counter += 1
    
    # DIAGNOSTIC: Log final county list in the processed data
    if lakes:
        final_counties = sorted(list(set(l_entry['county'] for l_entry in lakes)))
        print(f"DIAGNOSTIC: Unique counties in the final processed lakes data: {len(final_counties)} -> {final_counties}")
    else:
        print("DIAGNOSTIC: No lakes data processed to list final counties.")
    # End DIAGNOSTIC

    # DEBUG: Show final columns before saving to JSON
    print(f"DEBUG: Columns in DataFrame being saved to lakes.json: {df.columns.tolist()}")

    # Save as JSON
    output_path = Path('data/lakes.json')
    output_path.parent.mkdir(exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(lakes, f)
    
    print(f"Saved {len(lakes)} lakes to {output_path}")
    return lakes

def process_fish_catch_data():
    """Process fish catch data and output as JSON"""
    print("Processing fish catch data...")
    data_path = Path('attached_assets/GLOBAL_CATCH_FILE.CSV')
    df = pd.read_csv(data_path, low_memory=False)
    
    # Check and map column names
    required_columns = ['ID', 'SPECIES_CODE', 'CATCH_CPUE', 'TOTAL_CATCH', 'SURVEY_DATE', 'GEAR']
    
    # Print available columns for debugging
    print(f"Available columns in catch data: {', '.join(df.columns)}")
    
    # Skip header rows if they contain column names
    header_rows = []
    for i, row in df.iterrows():
        # Check if this row contains column names
        if any(col.upper() in str(row.values).upper() for col in ['CATCH_CPUE', 'SPECIES_CODE', 'TOTAL_CATCH']):
            header_rows.append(i)
    
    if header_rows:
        print(f"Skipping {len(header_rows)} header rows in catch data")
        df = df.drop(header_rows).reset_index(drop=True)
    
    # Map ID column to FISHERIES_WATERBODY_ID if needed
    id_column = 'ID' if 'ID' in df.columns else None
    if id_column is None:
        if 'FISHERIES_WATERBODY_ID' in df.columns:
            id_column = 'FISHERIES_WATERBODY_ID'
        else:
            print("Error: No suitable ID column found in catch data")
            return {}
    
    # Ensure ID column is string type
    df[id_column] = df[id_column].astype(str)
    # Clean problematic characters from ID
    df[id_column] = df[id_column].str.replace('="', '').str.replace('"', '')
    
    # Group by lake and species
    catch_data = {}
    warning_count = 0
    max_warnings = 10  # Limit the number of warnings to display
    
    for _, row in df.iterrows():
        # Skip rows that don't have valid IDs
        if not pd.notna(row[id_column]) or row[id_column] == '' or not pd.notna(row['SPECIES_CODE']):
            continue
            
        lake_id = str(row[id_column])
        species_code = str(row['SPECIES_CODE'])
        
        if lake_id not in catch_data:
            catch_data[lake_id] = {}
            
        if species_code not in catch_data[lake_id]:
            catch_data[lake_id][species_code] = []
        
        # Handle special values like infinity
        try:
            if 'CATCH_CPUE' in df.columns and pd.notna(row['CATCH_CPUE']):
                if str(row['CATCH_CPUE']).lower() in ['∞', 'inf', 'infinity']:
                    cpue_value = float('inf')
                else:
                    cpue_value = float(row['CATCH_CPUE'])
            else:
                cpue_value = 0
        except ValueError:
            if warning_count < max_warnings:
                print(f"Warning: Could not convert CPUE value '{row['CATCH_CPUE']}' to float. Using 0 instead.")
                warning_count += 1
            elif warning_count == max_warnings:
                print("Suppressing further CPUE conversion warnings...")
                warning_count += 1
            cpue_value = 0
            
        # Handle total catch conversion safely
        try:
            if 'TOTAL_CATCH' in df.columns and pd.notna(row['TOTAL_CATCH']):
                total_catch = int(float(row['TOTAL_CATCH']))
            else:
                total_catch = 0
        except ValueError:
            if warning_count < max_warnings:
                print(f"Warning: Could not convert TOTAL_CATCH value '{row['TOTAL_CATCH']}' to int. Using 0 instead.")
                warning_count += 1
            elif warning_count == max_warnings:
                print("Suppressing further TOTAL_CATCH conversion warnings...")
                warning_count += 1
            total_catch = 0
            
        catch_entry = {
            'survey_date': row['SURVEY_DATE'] if 'SURVEY_DATE' in df.columns and pd.notna(row['SURVEY_DATE']) else None,
            'cpue': cpue_value if cpue_value != float('inf') else None,
            'total_catch': total_catch,
            'gear_type': row['GEAR'] if 'GEAR' in df.columns and pd.notna(row['GEAR']) else None
        }
        
        catch_data[lake_id][species_code].append(catch_entry)
    
    # Save as JSON
    output_path = Path('data/fish_catch.json')
    output_path.parent.mkdir(exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(catch_data, f)
    
    print(f"Saved fish catch data for {len(catch_data)} lakes to {output_path}")
    return catch_data

def process_fish_length_data():
    """Process fish length data and output as JSON"""
    print("Processing fish length data...")
    data_path = Path('attached_assets/MEGA_LENGTH_CSV_FILE.CSV')
    df = pd.read_csv(data_path, low_memory=False)
    
    # Print available columns for debugging
    print(f"Available columns in length data: {', '.join(df.columns)}")
    
    # Skip header row if it contains column names
    if any(col in str(df.iloc[0].values) for col in ['INCHES', 'inch', 'Inch']):
        print("Skipping header row in length data")
        df = df.iloc[1:].reset_index(drop=True)
    
    # Map column names to standardized format
    inch_columns = {}
    for col in df.columns:
        if any(x in col.upper() for x in ['INCH', '"', "'"]):
            # Extract the range from the column name
            range_key = col.replace(' INCHES', '').replace('"', '').replace("'", '')
            inch_columns[col] = range_key
    
    # Map ID column to FISHERIES_WATERBODY_ID if needed
    id_column = 'ID' if 'ID' in df.columns else None
    if id_column is None:
        if 'FISHERIES_WATERBODY_ID' in df.columns:
            id_column = 'FISHERIES_WATERBODY_ID'
        else:
            print("Error: No suitable ID column found in length data")
            return {}
    
    # Ensure ID column is string type
    df[id_column] = df[id_column].astype(str)
    # Clean problematic characters from ID
    df[id_column] = df[id_column].str.replace('="', '').str.replace('"', '')
    
    # Group by lake and species
    length_data = {}
    
    for _, row in df.iterrows():
        lake_id = str(row[id_column])
        species_code = str(row['SPECIES_CODE'])
        
        if lake_id not in length_data:
            length_data[lake_id] = {}
            
        if species_code not in length_data[lake_id]:
            length_data[lake_id][species_code] = []
        
        # Extract length distribution
        length_dist = {}
        for col in df.columns:
            if col in inch_columns or col.startswith('0-') or col.startswith('IN_'):
                # Get the range key
                if col in inch_columns:
                    range_key = inch_columns[col]
                elif col.startswith('IN_'):
                    range_key = col.replace('IN_', '')
                else:
                    range_key = col
                
                try:
                    value = row[col]
                    # Skip if the value is actually a column name (header row)
                    if isinstance(value, str) and ('INCH' in value.upper() or '"' in value or "'" in value):
                        continue
                        
                    if pd.notna(value):
                        length_dist[range_key] = int(float(value))
                    else:
                        length_dist[range_key] = 0
                except (ValueError, TypeError):
                    # Only print warning if it's not a header value
                    if not (isinstance(row[col], str) and ('INCH' in row[col].upper() or '"' in row[col] or "'" in row[col])):
                        print(f"Warning: Could not convert length value '{row[col]}' to int. Using 0 instead.")
                    length_dist[range_key] = 0
        
        # Skip entries with empty length distribution (likely header rows)
        if not length_dist:
            continue
            
        length_entry = {
            'survey_date': row['SURVEY_DATE'] if 'SURVEY_DATE' in df.columns and pd.notna(row['SURVEY_DATE']) else None,
            'length_distribution': length_dist
        }
        
        length_data[lake_id][species_code].append(length_entry)
    
    # Save as JSON
    output_path = Path('data/fish_length.json')
    output_path.parent.mkdir(exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(length_data, f)
    
    print(f"Saved fish length data for {len(length_data)} lakes to {output_path}")
    return length_data

def create_species_reference():
    """Create a reference file for fish species codes"""
    print("Creating fish species reference...")

    # Define species mapping first for fallback use
    species_mapping = {
        'WAE': {'name': 'Walleye', 'scientific_name': 'Sander vitreus'},
        'NOP': {'name': 'Northern Pike', 'scientific_name': 'Esox lucius'},
        'LMB': {'name': 'Largemouth Bass', 'scientific_name': 'Micropterus salmoides'},
        'SMB': {'name': 'Smallmouth Bass', 'scientific_name': 'Micropterus dolomieu'},
        'BLC': {'name': 'Black Crappie', 'scientific_name': 'Pomoxis nigromaculatus'},
        'BLG': {'name': 'Bluegill', 'scientific_name': 'Lepomis macrochirus'},
        'YEP': {'name': 'Yellow Perch', 'scientific_name': 'Perca flavescens'},
        'MUE': {'name': 'Muskellunge', 'scientific_name': 'Esox masquinongy'},
        'TLC': {'name': 'Tullibee (Cisco)', 'scientific_name': 'Coregonus artedi'},
        'LKT': {'name': 'Lake Trout', 'scientific_name': 'Salvelinus namaycush'}
        # Add more species as needed
    }
    
    species_dict = {}
    catch_df = None
    catch_data_path = Path('attached_assets/GLOBAL_CATCH_FILE.CSV')

    try:
        # Load catch data, skipping the same header rows as in process_fish_catch_data
        # Using a skiprows function consistent with process_fish_catch_data
        catch_df = pd.read_csv(catch_data_path, low_memory=False, encoding='latin1', skiprows=lambda x: x in range(1, 44))
        print(f"Available columns in data for species reference (from {catch_data_path.name}): {catch_df.columns.tolist()}")
        
        # Ensure 'SPECIES_CODE' column exists, handling potential case variations like 'species_code'
        if 'species_code' in catch_df.columns and 'SPECIES_CODE' not in catch_df.columns:
            print(f"DEBUG create_species_reference: Renaming 'species_code' to 'SPECIES_CODE' in DataFrame from {catch_data_path.name}.")
            catch_df.rename(columns={'species_code': 'SPECIES_CODE'}, inplace=True)
        elif 'SPECIES_CODE' not in catch_df.columns:
            print(f"Warning: 'SPECIES_CODE' column not found in {catch_data_path.name}.")
            # No species code column, so fall back to default mapping
            catch_df = None # Indicate that catch_df should not be used for species extraction

    except FileNotFoundError:
        print(f"Error: {catch_data_path} not found. Cannot create species reference from this file.")
    except Exception as e:
        print(f"Error reading {catch_data_path}: {e}")

    if catch_df is not None and 'SPECIES_CODE' in catch_df.columns:
        unique_species = catch_df['SPECIES_CODE'].unique()
        for species_code in unique_species:
            if pd.notna(species_code):
                code = str(species_code).strip()
                if code in species_mapping:
                    species_dict[code] = species_mapping[code]
                else:
                    species_dict[code] = {'name': f'Species {code}', 'scientific_name': 'Unknown'}
    else:
        print("Warning: SPECIES_CODE column not found in catch data or data file unreadable. Using predefined species mapping.")
        species_dict = species_mapping # Fallback to the predefined mapping
    
    # Save as JSON
    output_path = Path('data/fish_species.json')
    output_path.parent.mkdir(exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(species_dict, f)
    
    print(f"Saved {len(species_dict)} fish species to {output_path}")
    return species_dict

def process_excel_files():
    """Convert all Excel files to CSV format"""
    print("Converting Excel files to CSV...")
    
    data_dir = Path('attached_assets')
    excel_files = list(data_dir.glob('*.xls*'))
    
    for excel_file in excel_files:
        csv_file = data_dir / f"{excel_file.stem}.csv"
        convert_excel_to_csv(excel_file, csv_file)

def main():
    """Main processing function"""
    # Create data directory if it doesn't exist
    Path('data').mkdir(exist_ok=True)
    
    try:
        # Convert Excel files to CSV
        # process_excel_files()
        
        # Check if required files exist
        required_files = [
            'attached_assets/fisheries_lake_data(Sheet 1).csv',
            'attached_assets/LAKE_METADATA_2024.csv',
            'attached_assets/GLOBAL_CATCH_FILE.CSV',
            'attached_assets/MEGA_LENGTH_CSV_FILE.CSV'
        ]
        
        for file_path in required_files:
            if not Path(file_path).exists():
                print(f"Warning: Required file {file_path} not found. Some data may be missing.")
        
        # Process data and create JSON files
        # Default behavior: include all lakes (min_size=0) and don't require coordinates (require_coordinates=False)
        lakes = process_lake_metadata(min_lake_size_acres=0, require_coordinates=False)
        
        # If you want to filter lakes by size and require coordinates, uncomment the line below:
        # lakes = process_lake_metadata(min_lake_size_acres=200, require_coordinates=True)
        
        catch_data = process_fish_catch_data()
        length_data = process_fish_length_data()
        species_data = create_species_reference()
        
        print(f"Data processing complete! Created JSON files for:")
        print(f"- {len(lakes)} lakes")
        print(f"- {len(catch_data)} lakes with catch data")
        print(f"- {len(length_data)} lakes with length data")
        print(f"- {len(species_data)} fish species")
    
    except Exception as e:
        print(f"Error during data processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()