import pandas as pd
import numpy as np
from pathlib import Path
import json
import os

# Configuration for XLS file processing (remains the same)
FILE_CONFIGS = {
    "LAKE_METADATA_2024.xls": {
        "int_cols": ["FISHERIES_WATERBODY_ID", "DOW_NBR_PRIMARY", "DOW_SUB_BASIN_NBR_PRIMARY", "LAKE_CENTER_UTM_EASTING", "LAKE_CENTER_UTM_NORTHING", "LAKE_CLASS_ID_PRIMARY", "LAKE_CLASS_ID_ALTERNATE", "PLS_SECTION_ID_LAKE_CENTER", "UTM_DATUM_ID", "UTM_ZONE_ID", "WATERSHED_MINOR_ID"],
        "float_cols": ["FETCH_ORIENTATION_DEGREES", "LAKE_AREA_DOW_ACRES", "LAKE_AREA_GIS_ACRES", "LAKE_AREA_MN_ACRES", "LAKE_AREA_PLANIMETERED_ACRES", "LAKE_CENTER_LAT_DD5", "LAKE_CENTER_LONG_DD5", "LITTORAL_AREA_ACRES", "MAX_DEPTH_FEET", "MAX_FETCH_MILES", "MEAN_DEPTH_FEET", "SHORE_LENGTH_MILES"]
    },
    "fisheries_lake_data.xls": {
        "int_cols": ["FISHERIES_WATERBODY_ID", "DOW_NBR_PRIMARY", "DOW_SUB_BASIN_NBR_PRIMARY", "LAKE_CENTER_UTM_EASTING", "LAKE_CENTER_UTM_NORTHING", "LAKE_CLASS_ID_PRIMARY", "LAKE_CLASS_ID_ALTERNATE", "PLS_SECTION_ID_LAKE_CENTER", "UTM_DATUM_ID", "UTM_ZONE_ID", "WATERSHED_MINOR_ID"],
        "float_cols": ["FETCH_ORIENTATION_DEGREES", "LAKE_AREA_DOW_ACRES", "LAKE_AREA_GIS_ACRES", "LAKE_AREA_MN_ACRES", "LAKE_AREA_PLANIMETERED_ACRES", "LAKE_CENTER_LAT_DD5", "LAKE_CENTER_LONG_DD5", "LITTORAL_AREA_ACRES", "MAX_DEPTH_FEET", "MAX_FETCH_MILES", "MEAN_DEPTH_FEET", "SHORE_LENGTH_MILES"]
    },
    "Hydro_Export.xls": { "int_cols": ["OID", "fw_id", "dowlknum"], "float_cols": ["acres", "UTMX", "UTMY"]},
    "BORDER_lake_data.xls": {
        "int_cols": ["BORDER_ID", "FISHERIES_WATERBODY_ID", "DOW_NBR_PRIMARY", "DOW_SUB_BASIN_NBR_PRIMARY", "LAKE_CENTER_UTM_EASTING", "LAKE_CENTER_UTM_NORTHING", "LAKE_CLASS_ID_PRIMARY", "LAKE_CLASS_ID_ALTERNATE", "PLS_SECTION_ID_LAKE_CENTER", "UTM_DATUM_ID", "UTM_ZONE_ID", "WATERSHED_MINOR_ID"],
        "float_cols": ["FETCH_ORIENTATION_DEGREES", "LAKE_AREA_DOW_ACRES", "LAKE_AREA_GIS_ACRES", "LAKE_AREA_MN_ACRES", "LAKE_AREA_PLANIMETERED_ACRES", "LAKE_CENTER_LAT_DD5", "LAKE_CENTER_LONG_DD5", "LITTORAL_AREA_ACRES", "MAX_DEPTH_FEET", "MAX_FETCH_MILES", "MEAN_DEPTH_FEET", "SHORE_LENGTH_MILES"]
    },
    "SENTINEL_lake_data.xls": {
        "int_cols": ["SENTINEL_ID", "FISHERIES_WATERBODY_ID", "DOW_NBR_PRIMARY", "DOW_SUB_BASIN_NBR_PRIMARY", "LAKE_CENTER_UTM_EASTING", "LAKE_CENTER_UTM_NORTHING", "LAKE_CLASS_ID_PRIMARY", "LAKE_CLASS_ID_ALTERNATE", "PLS_SECTION_ID_LAKE_CENTER", "UTM_DATUM_ID", "UTM_ZONE_ID", "WATERSHED_MINOR_ID"],
        "float_cols": ["FETCH_ORIENTATION_DEGREES", "LAKE_AREA_DOW_ACRES", "LAKE_AREA_GIS_ACRES", "LAKE_AREA_MN_ACRES", "LAKE_AREA_PLANIMETERED_ACRES", "LAKE_CENTER_LAT_DD5", "LAKE_CENTER_LONG_DD5", "LITTORAL_AREA_ACRES", "MAX_DEPTH_FEET", "MAX_FETCH_MILES", "MEAN_DEPTH_FEET", "SHORE_LENGTH_MILES"]
    }
}

# Custom JSON encoder to handle NaN values by converting them to None (-> null in JSON)
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)): # Handle NaN and Inf
            return None
        if pd.isna(obj): # Handle pandas NA types like pd.NA, NaT
            return None
        return super().default(obj)

def convert_excel_to_csv(input_path, output_path=None, config=None):
    if output_path is None: output_path = input_path.with_suffix('.csv')
    try:
        file_ext = input_path.suffix.lower()
        engine = 'xlrd' if file_ext == '.xls' else 'openpyxl' if file_ext == '.xlsx' else None
        df = pd.read_excel(input_path, engine=engine)
        if config:
            for col in config.get("int_cols", []):
                if col in df.columns:
                    if df[col].dtype == 'object': df[col] = df[col].astype(str).str.replace(',', '', regex=False)
                    df[col] = pd.to_numeric(df[col], errors='coerce').round(0).astype('Int64')
            for col in config.get("float_cols", []):
                if col in df.columns:
                    if df[col].dtype == 'object': df[col] = df[col].astype(str).str.replace(',', '', regex=False)
                    df[col] = pd.to_numeric(df[col], errors='coerce').astype('float64')
            df.to_csv(output_path, index=False)
            # print(f"Successfully converted and typed {input_path} to {output_path}")
        else:
            df.to_csv(output_path, index=False)
            # print(f"Converted {input_path} to {output_path} (basic conversion)")
        return output_path
    except Exception as e: print(f"Error converting {input_path}: {e}"); return None

def get_cleaned_id(raw_id_val):
    if pd.isna(raw_id_val): return None
    cleaned_id = str(raw_id_val).strip()
    if cleaned_id.startswith('="') and cleaned_id.endswith('"'):
        cleaned_id = cleaned_id[2:-1]
    return cleaned_id.strip()

def normalize_name(name):
    if pd.isna(name) or name == '': return None
    return str(name).lower().strip()

def process_lake_metadata(min_lake_size_acres=0, require_coordinates=False):
    print("Processing lake metadata...")
    data_path = Path('attached_assets/fisheries_lake_data.csv')
    if not data_path.exists():
        original_fallback_path = Path('attached_assets/fisheries_lake_data(Sheet 1).csv')
        if original_fallback_path.exists(): data_path = original_fallback_path
        else: print(f"Error: Main data file {data_path} (and fallback) not found."); return [], {}
    try: df = pd.read_csv(data_path)
    except Exception as e: print(f"Error reading main data file {data_path}: {e}"); return [], {}

    metadata_path = Path('attached_assets/LAKE_METADATA_2024.csv')
    if not metadata_path.exists():
        df['COUNTY_NAME'] = 'Unknown (Metadata Missing)'
    else:
        try:
            metadata_df = pd.read_csv(metadata_path)
            if 'COUNTY_NAME' in metadata_df.columns and 'FISHERIES_WATERBODY_ID' in metadata_df.columns:
                metadata_df = metadata_df[['FISHERIES_WATERBODY_ID', 'COUNTY_NAME']]
                df['FISHERIES_WATERBODY_ID'] = df['FISHERIES_WATERBODY_ID'].astype(str)
                metadata_df['FISHERIES_WATERBODY_ID'] = metadata_df['FISHERIES_WATERBODY_ID'].astype(str)
                df = pd.merge(df, metadata_df, on='FISHERIES_WATERBODY_ID', how='left')
                df['COUNTY_NAME'] = df['COUNTY_NAME'].fillna('Unknown (Not in Metadata)')
            else: df['COUNTY_NAME'] = 'Unknown (Metadata Format Issue)'
        except Exception as e: df['COUNTY_NAME'] = f'Unknown (Metadata Error: {e})'
    
    df['LAKE_AREA_DOW_ACRES'] = pd.to_numeric(df['LAKE_AREA_DOW_ACRES'], errors='coerce')
    if min_lake_size_acres > 0: df = df[df['LAKE_AREA_DOW_ACRES'].notna() & (df['LAKE_AREA_DOW_ACRES'] >= min_lake_size_acres)]
    if require_coordinates: df = df[df['LAKE_CENTER_LAT_DD5'].notna() & df['LAKE_CENTER_LONG_DD5'].notna()]
    
    numeric_cols = ['LAKE_AREA_DOW_ACRES', 'LITTORAL_AREA_ACRES', 'MAX_DEPTH_FEET', 'MEAN_DEPTH_FEET', 'SHORE_LENGTH_MILES', 'LAKE_CENTER_LAT_DD5', 'LAKE_CENTER_LONG_DD5']
    for col in numeric_cols:
        if col in df.columns: 
            df[col] = pd.to_numeric(df[col], errors='coerce')
            if col not in ['LAKE_CENTER_LAT_DD5', 'LAKE_CENTER_LONG_DD5']: df[col] = df[col].round(2)
    
    lakes = []
    # For building name_to_map_id_lookup and identifying ambiguous names
    name_map_id_associations = {} # Stores lists of map_ids for each name
    
    # First pass: collect all map_ids associated with each normalized name
    for _, row in df.iterrows():
        current_map_id = None
        raw_dow_primary = row.get('DOW_NBR_PRIMARY'); raw_dow_sub_basin = row.get('DOW_SUB_BASIN_NBR_PRIMARY')
        if pd.notna(raw_dow_primary) and pd.notna(raw_dow_sub_basin):
            try:
                num_dow_primary = pd.to_numeric(get_cleaned_id(raw_dow_primary), errors='coerce')
                num_dow_sub_basin = pd.to_numeric(get_cleaned_id(raw_dow_sub_basin), errors='coerce')
                if pd.notna(num_dow_primary) and pd.notna(num_dow_sub_basin):
                    current_map_id = f"{int(num_dow_primary)}{int(num_dow_sub_basin):02d}"
            except: pass
        
        if current_map_id:
            norm_name = normalize_name(row.get('LAKE_NAME'))
            if norm_name:
                if norm_name not in name_map_id_associations: name_map_id_associations[norm_name] = set()
                name_map_id_associations[norm_name].add(current_map_id)
            
            norm_alt_name = normalize_name(row.get('ALT_LAKE_NAME'))
            if norm_alt_name:
                if norm_alt_name not in name_map_id_associations: name_map_id_associations[norm_alt_name] = set()
                name_map_id_associations[norm_alt_name].add(current_map_id)

    # Identify ambiguous names (names mapping to more than one map_id)
    ambiguous_names_for_mapid = set()
    for name, map_ids_set in name_map_id_associations.items():
        if len(map_ids_set) > 1:
            print(f"Warning: Normalized lake name '{name}' is ambiguous and maps to multiple map_ids: {map_ids_set}. Fish data for this name will be excluded.")
            ambiguous_names_for_mapid.add(name)

    # Build the final lookup, excluding ambiguous names
    name_to_map_id_lookup = {}
    for name, map_ids_set in name_map_id_associations.items():
        if name not in ambiguous_names_for_mapid:
            name_to_map_id_lookup[name] = list(map_ids_set)[0] # Get the single map_id

    # Second pass: create lake entries for JSON
    for _, row in df.iterrows():
        lake_entry_fields = {
            'id': get_cleaned_id(row.get('FISHERIES_WATERBODY_ID')),
            'name': str(row.get('LAKE_NAME','Unknown')).strip(),
            'county': str(row.get('COUNTY_NAME','Unknown')).strip(),
            'area_acres': row.get('LAKE_AREA_DOW_ACRES'), 'max_depth_ft': row.get('MAX_DEPTH_FEET'),
            'mean_depth_ft': row.get('MEAN_DEPTH_FEET'), 'shore_length_mi': row.get('SHORE_LENGTH_MILES'),
            'latitude': row.get('LAKE_CENTER_LAT_DD5'), 'longitude': row.get('LAKE_CENTER_LONG_DD5'),
            'alternate_name': get_cleaned_id(row.get('ALT_LAKE_NAME'))
        }
        for key, value in lake_entry_fields.items(): # Convert pd.NA or np.nan to None
            if pd.isna(value) or (isinstance(value, float) and np.isnan(value)): lake_entry_fields[key] = None

        current_map_id = None; raw_dow_primary = row.get('DOW_NBR_PRIMARY'); raw_dow_sub_basin = row.get('DOW_SUB_BASIN_NBR_PRIMARY')
        if pd.notna(raw_dow_primary) and pd.notna(raw_dow_sub_basin):
            try:
                num_dow_primary = pd.to_numeric(get_cleaned_id(raw_dow_primary), errors='coerce')
                num_dow_sub_basin = pd.to_numeric(get_cleaned_id(raw_dow_sub_basin), errors='coerce')
                if pd.notna(num_dow_primary) and pd.notna(num_dow_sub_basin):
                    current_map_id = f"{int(num_dow_primary)}{int(num_dow_sub_basin):02d}"
            except: pass
        lake_entry_fields['map_id'] = current_map_id
        
        lake_entry_fields['dow_number'] = None
        if pd.notna(raw_dow_primary):
            try: lake_entry_fields['dow_number'] = str(int(pd.to_numeric(get_cleaned_id(raw_dow_primary), errors='coerce')))
            except: lake_entry_fields['dow_number'] = get_cleaned_id(raw_dow_primary)
        lakes.append(lake_entry_fields)
        
    output_path = Path('data/lakes.json'); output_path.parent.mkdir(exist_ok=True)
    with open(output_path, 'w') as f: json.dump(lakes, f, indent=2, cls=CustomJSONEncoder) # Use custom encoder
    print(f"Saved {len(lakes)} lakes to {output_path}")
    if not name_to_map_id_lookup: print("Warning: name_to_map_id_lookup is empty post-processing. Fish data linking by name will fail.")
    return lakes, name_to_map_id_lookup

GLOBAL_CATCH_FILE_CONFIG = { 'lake_name_col': 'WATER_BODY_NAME', 'alt_name_col': 'ALT_NAME', 'species_col': 'SPECIES_CODE'}
MEGA_LENGTH_FILE_CONFIG = {
    'lake_name_col': 'WATER_BODY_NAME', 'alt_name_col': 'ALT_NAME', 'species_col': 'SPECIES_CODE',
    'length_cols': ['0-5 INCHES', '6-7 INCHES', '8-9 INCHES', '10-11 INCHES', '12-14 INCHES', '15-19 INCHES', '20-24 INCHES', '25-29 INCHES', '31-34 INCHES', '35-39 INCHES', '40-44 INCHES', '45-49 INCHES', '50+INCHES']
}

def process_fish_data(file_path_str, data_type_name, name_to_map_id_lookup, fish_file_config):
    print(f"Processing {data_type_name} data from {file_path_str} by linking to map_id via name...")
    data_path = Path(file_path_str)
    if not data_path.exists(): print(f"Error: {data_type_name} data file {data_path} not found."); return {}
    if not name_to_map_id_lookup: print(f"Error: Name-to-map_id lookup is empty for {file_path_str}. Cannot link {data_type_name} data."); return {}

    LAKE_NAME_COL = fish_file_config['lake_name_col']; ALT_NAME_COL = fish_file_config.get('alt_name_col'); SPECIES_COL = fish_file_config['species_col']
    try: df = pd.read_csv(data_path, low_memory=False, dtype=str)
    except Exception as e: print(f"Error reading CSV {data_path}: {e}"); return {}
    if not df.empty and df.iloc[0].isin(df.columns).sum() > len(df.columns) * 0.5: df = df.iloc[1:].reset_index(drop=True)

    essential_cols = [LAKE_NAME_COL, SPECIES_COL]; missing_cols = [col for col in essential_cols if col not in df.columns]
    if missing_cols: print(f"Error: Essential columns {missing_cols} not found in {data_path}."); return {}
    if ALT_NAME_COL and ALT_NAME_COL not in df.columns: print(f"Warning: Alt name col '{ALT_NAME_COL}' not in {data_path}.")

    processed_data = {}; unlinked_records = 0
    for _, row in df.iterrows():
        map_id_key = None; norm_fish_lake_name = normalize_name(row.get(LAKE_NAME_COL))
        if norm_fish_lake_name: map_id_key = name_to_map_id_lookup.get(norm_fish_lake_name)
        if not map_id_key and ALT_NAME_COL and ALT_NAME_COL in row: # Check if ALT_NAME_COL exists in row
            norm_fish_alt_lake_name = normalize_name(row.get(ALT_NAME_COL))
            if norm_fish_alt_lake_name: map_id_key = name_to_map_id_lookup.get(norm_fish_alt_lake_name)
        
        species_code = get_cleaned_id(row.get(SPECIES_COL))
        if not map_id_key or not species_code:
            if not map_id_key and norm_fish_lake_name : unlinked_records +=1
            continue 
        if map_id_key not in processed_data: processed_data[map_id_key] = {}
        if species_code not in processed_data[map_id_key]: processed_data[map_id_key][species_code] = []
        
        entry = {'survey_date': get_cleaned_id(row.get('SURVEY_DATE'))}
        if data_type_name == "catch":
            entry['cpue'] = None; raw_cpue = row.get('CATCH_CPUE')
            if pd.notna(raw_cpue):
                try: val_str = str(raw_cpue).strip().lower(); entry['cpue'] = float(val_str) if val_str not in ['∞', 'inf', 'infinity', '-inf'] else float(val_str)
                except ValueError: pass
            entry['total_catch'] = None; raw_total_catch = row.get('TOTAL_CATCH')
            if pd.notna(raw_total_catch):
                try: entry['total_catch'] = int(float(raw_total_catch))
                except ValueError: pass
            entry['gear_type'] = get_cleaned_id(row.get('GEAR'))
        elif data_type_name == "length":
            length_dist = {}; length_cols = fish_file_config.get('length_cols', [])
            for col_name in length_cols:
                raw_val = row.get(col_name); range_key = col_name.upper().replace(' INCHES', '').replace('"', '').replace("'", '')
                if pd.notna(raw_val):
                    try: length_dist[range_key] = int(float(raw_val))
                    except ValueError: length_dist[range_key] = None
                else: length_dist[range_key] = None
            if not any(v is not None for v in length_dist.values()): continue
            entry['length_distribution'] = length_dist
        processed_data[map_id_key][species_code].append(entry)
    
    if unlinked_records > 0: print(f"Warning: {unlinked_records} records in {data_path} could not be linked to a map_id via lake name and were skipped (likely due to ambiguous names or names not in lake metadata).")
    output_path = Path(f'data/fish_{data_type_name}.json'); output_path.parent.mkdir(exist_ok=True)
    with open(output_path, 'w') as f: json.dump(processed_data, f, indent=2, cls=CustomJSONEncoder)
    print(f"Saved fish {data_type_name} data for {len(processed_data)} map_ids to {output_path}")
    return processed_data

def process_fish_catch_data(name_to_map_id_lookup): return process_fish_data('attached_assets/GLOBAL_CATCH_FILE.CSV', "catch", name_to_map_id_lookup, GLOBAL_CATCH_FILE_CONFIG)
def process_fish_length_data(name_to_map_id_lookup): return process_fish_data('attached_assets/MEGA_LENGTH_CSV_FILE.CSV', "length", name_to_map_id_lookup, MEGA_LENGTH_FILE_CONFIG)
def create_species_reference():
    print("Creating fish species reference...")
    catch_path = Path('attached_assets/GLOBAL_CATCH_FILE.CSV')
    species_dict = {}; species_mapping = {
        'WAE': {'name': 'Walleye', 'scientific_name': 'Sander vitreus'}, 'NOP': {'name': 'Northern Pike', 'scientific_name': 'Esox lucius'},
        'LMB': {'name': 'Largemouth Bass', 'scientific_name': 'Micropterus salmoides'}, 'SMB': {'name': 'Smallmouth Bass', 'scientific_name': 'Micropterus dolomieu'},
        'BLC': {'name': 'Black Crappie', 'scientific_name': 'Pomoxis nigromaculatus'}, 'BLG': {'name': 'Bluegill', 'scientific_name': 'Lepomis macrochirus'},
        'YEP': {'name': 'Yellow Perch', 'scientific_name': 'Perca flavescens'}, 'MUE': {'name': 'Muskellunge', 'scientific_name': 'Esox masquinongy'},
        'TLC': {'name': 'Tullibee (Cisco)', 'scientific_name': 'Coregonus artedi'}, 'LKT': {'name': 'Lake Trout', 'scientific_name': 'Salvelinus namaycush'}
    }
    SPECIES_COL = GLOBAL_CATCH_FILE_CONFIG['species_col']
    if not catch_path.exists(): print(f"Warning: {catch_path} not found. Species ref uses defaults."); species_dict = species_mapping
    else:
        try:
            catch_df = pd.read_csv(catch_path, low_memory=False, dtype=str)
            if SPECIES_COL in catch_df.columns:
                if not catch_df.empty and get_cleaned_id(catch_df.iloc[0][SPECIES_COL]) == SPECIES_COL: catch_df = catch_df.iloc[1:]
                unique_species = catch_df[SPECIES_COL].dropna().apply(get_cleaned_id).unique()
                for sp_code in unique_species:
                    if sp_code: species_dict[sp_code] = species_mapping.get(sp_code, {'name': f'Species {sp_code}', 'scientific_name': 'Unknown'})
            else: print(f"Warning: Column '{SPECIES_COL}' not in {catch_path}. Using defaults."); species_dict = species_mapping
        except Exception as e: print(f"Error reading {catch_path} for species: {e}. Using defaults."); species_dict = species_mapping
    output_path = Path('data/fish_species.json'); output_path.parent.mkdir(exist_ok=True)
    with open(output_path, 'w') as f: json.dump(species_dict, f, indent=2, cls=CustomJSONEncoder)
    print(f"Saved {len(species_dict)} fish species to {output_path}"); return species_dict

def process_excel_files():
    # print("Converting Excel files to CSV...") # Less verbose
    data_dir = Path('attached_assets'); excel_files = list(data_dir.glob('*.xls')) + list(data_dir.glob('*.xlsx'))
    if not excel_files: print(f"No Excel files found in {data_dir}"); return
    for excel_file_path in excel_files:
        csv_file_path = data_dir / f"{excel_file_path.stem}.csv"
        convert_excel_to_csv(excel_file_path, csv_file_path, config=FILE_CONFIGS.get(excel_file_path.name))

def main():
    Path('data').mkdir(exist_ok=True)
    try:
        process_excel_files()
        lakes, name_to_map_id_lookup = process_lake_metadata(min_lake_size_acres=0, require_coordinates=False)
        catch_data = process_fish_catch_data(name_to_map_id_lookup)
        length_data = process_fish_length_data(name_to_map_id_lookup)
        species_data = create_species_reference()
        print(f"\nData processing complete! JSON files created for:\n- {len(lakes)} lakes\n- {len(catch_data)} map_ids with catch data\n- {len(length_data)} map_ids with length data\n- {len(species_data)} fish species")
    except Exception as e: print(f"FATAL Error in main: {e}"); import traceback; traceback.print_exc()

if __name__ == "__main__":
    main()