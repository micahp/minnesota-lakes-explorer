import geopandas as gpd
import json
from pathlib import Path
import subprocess # Added for running Tippecanoe
import os # Added for removing temporary file
# No need to import fiona explicitly if not used directly

def clean_county_name(county_name):
    if county_name is None:
        return None
    name = str(county_name).strip()
    if not name or name.upper() == "NOT IN MN": # Treat empty strings or "NOT IN MN" as None or a specific category
        return None # Or "Unknown" or "Outside MN"
    
    # Simple title casing, could be more robust if needed for specific edge cases
    # e.g., "St. Louis" should remain "St. Louis", not "St. louis"
    # A common approach is to title case then fix known exceptions.
    # For "Lac qui Parle" vs "Lac Qui Parle", simple title() works.
    # For "St. Louis", title() makes it "St. Louis".
    return name.title()

def inspect_geopackage_details():
    gpkg_path = 'attached_assets/gpkg_water_dnr_hydrography/water_dnr_hydrography_uncompressed.gpkg'
    layer_to_inspect = 'dnr_hydro_features_all'
    print(f"Inspecting details for layer: {layer_to_inspect} in {gpkg_path}")
    
    gdf_full = None # Initialize to None
    try:
        # Read the full layer for comprehensive checks of specific columns
        gdf_full = gpd.read_file(gpkg_path, layer=layer_to_inspect)
        print("\nSuccessfully read the full layer.")

        print("\nAll columns in the layer:")
        for col_name in gdf_full.columns:
            print(f"- {col_name}")
        
        # Specifically check all unique values for cty_name
        if 'cty_name' in gdf_full.columns:
            print("\nUnique values for column 'cty_name' (all):")
            unique_counties = gdf_full['cty_name'].unique()
            sorted_counties = sorted([str(c) for c in unique_counties if c is not None]) # Sort and handle None
            for county_name in sorted_counties:
                print(f"- {county_name}")
            if any(unique_counties == None): # Check if None was in the original unique list
                 print("- None (or null/empty values exist)")
            print(f"Total unique county names (excluding None): {len(sorted_counties)}")
        else:
            print("Column 'cty_name' not found.")

    except Exception as e:
        print(f"Could not read or process layer: {e}")
        return

    # Display sample values for other columns from the first 5 features if gdf_full was loaded
    if gdf_full is not None and not gdf_full.empty:
        gdf_sample = gdf_full.head()
        columns_to_check_sample = [
            'wb_class',
            'pw_basin_name',
            'acres',
            'dowlknum',
            'shore_mi' # Check our identified shore_mi column
        ]
        print("\nChecking specific columns for unique values (sample from first 5 features):")
        for col_name in columns_to_check_sample:
            if col_name in gdf_sample.columns:
                print(f"\nUnique values for column '{col_name}' (sample from first 5):")
                try:
                    unique_values = gdf_sample[col_name].unique() 
                    for val in unique_values:
                        print(f"- {val}")
                except Exception as e:
                    print(f"Could not get unique values for {col_name}: {e}")
            else:
                print(f"Column '{col_name}' not found in sample.")
    else:
        print("Skipping sample value checks as full GDF could not be loaded or is empty.")

def process_geopackage():
    gpkg_path = 'attached_assets/gpkg_water_dnr_hydrography/water_dnr_hydrography_uncompressed.gpkg'
    layer_name_for_lakes = 'dnr_hydro_features_all' 
    feature_type_column = 'wb_class' 
    lake_descriptor = 'Lake or Pond'

    print(f"Reading GeoPackage layer '{layer_name_for_lakes}' from {gpkg_path}...")
    gdf = gpd.read_file(gpkg_path, layer=layer_name_for_lakes)
    
    print(f"Filtering for features where column '{feature_type_column}' is '{lake_descriptor}'...")
    lakes_gdf = gdf[gdf[feature_type_column] == lake_descriptor].copy()
    
    if lakes_gdf.empty:
        print("No lakes found with the specified criteria. Please check column names and values.")
        return None

    print(f"Original CRS: {lakes_gdf.crs}")
    if lakes_gdf.crs != "EPSG:4326":
        print("Reprojecting to EPSG:4326...")
        lakes_gdf = lakes_gdf.to_crs("EPSG:4326")
        print(f"New CRS: {lakes_gdf.crs}")

    print("Standardizing properties...")
    
    # DNR_ID
    if 'dowlknum' in lakes_gdf.columns:
        lakes_gdf['DNR_ID'] = lakes_gdf['dowlknum']
        print("  Using 'dowlknum' as DNR_ID.")
    elif 'fw_id' in lakes_gdf.columns:
        lakes_gdf['DNR_ID'] = lakes_gdf['fw_id']
        print("  Warning: 'dowlknum' not found, falling back to 'fw_id' for DNR_ID.")
    else:
        lakes_gdf['DNR_ID'] = None
        print("  Warning: Neither 'dowlknum' nor 'fw_id' found. DNR_ID set to None.")

    # Name
    lakes_gdf['name'] = lakes_gdf['pw_basin_name'].fillna('Unknown Name').astype(str) if 'pw_basin_name' in lakes_gdf.columns else 'Unknown Name'
    print(f"  Name mapped from: {'pw_basin_name' if 'pw_basin_name' in lakes_gdf.columns else 'N/A'}")

    # County (with cleaning)
    if 'cty_name' in lakes_gdf.columns:
        lakes_gdf['county'] = lakes_gdf['cty_name'].apply(clean_county_name)
        print("  County mapped from 'cty_name' and cleaned.")
    else:
        lakes_gdf['county'] = None
        print("  'cty_name' not found for County.")

    # Area
    lakes_gdf['area_acres'] = lakes_gdf['acres'] if 'acres' in lakes_gdf.columns else None
    print(f"  Area mapped from: {'acres' if 'acres' in lakes_gdf.columns else 'N/A'}")
    
    # Shore Length
    lakes_gdf['shore_length_mi'] = lakes_gdf['shore_mi'] if 'shore_mi' in lakes_gdf.columns else None
    print(f"  Shore length mapped from: {'shore_mi' if 'shore_mi' in lakes_gdf.columns else 'N/A'}")

    # Properties for GeoJSON (includes geometry)
    geojson_columns = ['geometry', 'DNR_ID', 'name', 'county', 'area_acres', 'shore_length_mi']
    
    final_geojson_columns = [col for col in geojson_columns if col in lakes_gdf.columns]
    if 'geometry' not in lakes_gdf.columns: # Should always be there from read_file
      print ("ERROR: Geometry column is missing before final selection for GeoJSON.")
      return None

    # Clean geometries if invalid
    if not lakes_gdf['geometry'].is_valid.all():
        print("Warning: Invalid geometries found. Attempting to clean with buffer(0)...")
        lakes_gdf['geometry'] = lakes_gdf['geometry'].buffer(0)
        # Re-check validity after cleaning, or handle potential errors
        if not lakes_gdf['geometry'].is_valid.all():
            print("Error: Invalid geometries persist after cleaning. Check source data.")
            # Decide how to handle: remove invalid, skip, or raise error
            # For now, let's filter them out to prevent issues with to_json()
            lakes_gdf = lakes_gdf[lakes_gdf['geometry'].is_valid].copy()
            print(f"  Removed invalid geometries. Remaining lakes: {len(lakes_gdf)}")


    lakes_geojson_export_gdf = lakes_gdf[final_geojson_columns].copy() # Use a copy for geojson export

    print("Converting datetime columns to string format (if any)...") # Likely not in our selected columns
    for col in lakes_geojson_export_gdf.select_dtypes(include=['datetime64[ns]', 'datetime64[ns, UTC]']).columns:
        print(f"  Converting column for GeoJSON: {col}")
        lakes_geojson_export_gdf[col] = lakes_geojson_export_gdf[col].astype(str)

    print("Converting to GeoJSON...")
    geojson_data = lakes_geojson_export_gdf.to_json()
    
    output_path_geojson = Path('data/lakes.geojson')
    output_path_geojson.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Saving GeoJSON to {output_path_geojson}...")
    with open(output_path_geojson, 'w') as f:
        f.write(geojson_data)
    print(f"Processed and saved {len(lakes_geojson_export_gdf)} lakes to {output_path_geojson}")

    # --- Create data/lakes.json (metadata only) ---
    print("\nExtracting lake metadata for data/lakes.json...")
    # Define columns for the metadata JSON file (no geometry)
    # These should match what the frontend expects (e.g., in displayLakeDetails, DataLoader)
    lake_metadata_columns = ['DNR_ID', 'name', 'county', 'area_acres', 'shore_length_mi']
    # Max depth, mean depth, alternate name are confirmed not available in this GPKG layer.
    
    actual_metadata_columns = [col for col in lake_metadata_columns if col in lakes_gdf.columns]
    
    if not actual_metadata_columns:
        print("Error: No metadata columns found to create data/lakes.json. Check column names in lakes_gdf.")
        return str(output_path_geojson) # Still return GeoJSON path

    # Use the main lakes_gdf which has all processed columns
    lake_metadata_df = lakes_gdf[actual_metadata_columns].copy()
    
    # Convert DataFrame to list of dicts
    lake_metadata_list = lake_metadata_df.to_dict(orient='records')

    # Clean NaN/NaT values from metadata, replace with None (null in JSON)
    cleaned_lake_metadata = []
    for record in lake_metadata_list:
        cleaned_record = {}
        for key, value in record.items():
            if gpd.pd.isna(value): # Handles np.nan, pd.NaT, None already
                cleaned_record[key] = None
            elif isinstance(value, float) and gpd.pd.isna(value): # Redundant with above, but specific
                cleaned_record[key] = None
            else:
                cleaned_record[key] = value
        cleaned_lake_metadata.append(cleaned_record)

    metadata_output_path_json = Path('data/lakes.json')
    print(f"Saving lake metadata to {metadata_output_path_json}...")
    with open(metadata_output_path_json, 'w') as f:
        json.dump(cleaned_lake_metadata, f, indent=4)
    
    print(f"Saved metadata for {len(cleaned_lake_metadata)} lakes to {metadata_output_path_json}")
    
    # --- Part 3: Generate Vector Tiles using Tippecanoe ---
    print("\nGenerating vector tiles with Tippecanoe...")
    # Define columns needed for tiling (geometry is implicit)
    # These attributes will be available in the vector tiles.
    # Ensure properties used for interaction (e.g. DNR_ID for fetching details) are included.
    # And properties for potential styling (e.g. name, county) are also useful.
    tile_attributes = ['DNR_ID', 'name', 'county'] # Add more if needed for direct tile styling, e.g. area_acres
    
    # Select only the necessary columns for the GeoJSON input to Tippecanoe to keep it minimal
    # Geometry column is implicitly handled by to_json() when creating GeoJSON.
    # Tippecanoe will read properties from the GeoJSON features.
    columns_for_tile_geojson = ['geometry'] + [col for col in tile_attributes if col in lakes_gdf.columns]
    
    # Ensure geometry is still valid before this step if any prior ops could invalidate it
    # This gdf should be the main `lakes_gdf` which has all lakes and properties.
    if not lakes_gdf['geometry'].is_valid.all():
        print("Warning: Invalid geometries found before Tippecanoe step. Attempting to clean...")
        # Use a copy to avoid issues if lakes_gdf is used elsewhere or if buffer changes types unexpectedly
        temp_tile_gdf = lakes_gdf.copy()
        temp_tile_gdf['geometry'] = temp_tile_gdf['geometry'].buffer(0)
        if not temp_tile_gdf['geometry'].is_valid.all():
            print("Error: Invalid geometries persist after cleaning for vector tiles. Filtering them out.")
            temp_tile_gdf = temp_tile_gdf[temp_tile_gdf['geometry'].is_valid].copy()
        tile_input_gdf = temp_tile_gdf[columns_for_tile_geojson]
    else:
        tile_input_gdf = lakes_gdf[columns_for_tile_geojson].copy() # Use a copy

    temp_geojson_for_tiles_path = Path('data/temp_lakes_for_tiles.geojson')
    print(f"Saving temporary GeoJSON for Tippecanoe to {temp_geojson_for_tiles_path}...")
    # Ensure no NaN/NaT values are passed to to_json for properties, as they can cause issues or become strings "NaN"
    # For properties, fillna with None (which becomes null) or an appropriate string like "Unknown"
    # For simplicity, let's assume our selected tile_attributes (DNR_ID, name, county) are already cleaned strings or handle None correctly.
    # If DNR_ID could be numeric and missing, ensure it's handled (e.g. cast to string, or fillna if it was object type)
    # Our current cleaning for 'name' uses 'Unknown Name', 'county' uses None for missing. DNR_ID can be None.
    tile_input_gdf.to_file(str(temp_geojson_for_tiles_path), driver='GeoJSON')

    mbtiles_output_path = Path('data/lake_tiles.mbtiles')
    tippecanoe_cmd = [
        'tippecanoe',
        '-o', str(mbtiles_output_path),    # Output MBTiles file
        '-l', 'lakes',                     # Layer name in the tileset
        '--force',                         # Overwrite if mbtiles file exists
        '--no-tile-compression',         # Helps with some Leaflet plugins
        '--simplification=2',            # Simplification factor (higher means more simplification)
        '-zg',                             # Auto-determine max zoom from density
        '--minimum-zoom=5',                # Set a reasonable minimum zoom for lakes to appear
        '--drop-densest-as-needed',      # Standard density management
        '--extend-zooms-if-still-dropping', # Try to push features to higher zooms if still too dense
        # Attributes from the GeoJSON properties will be included by default.
        # If specific includes/excludes are needed, add flags like:
        # '--include=DNR_ID', '--include=name', etc.
        str(temp_geojson_for_tiles_path) # Input GeoJSON file
    ]

    print(f"Running Tippecanoe: {' '.join(tippecanoe_cmd)}")
    try:
        subprocess.run(tippecanoe_cmd, check=True, capture_output=True, text=True)
        print(f"Tippecanoe successfully generated {mbtiles_output_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error running Tippecanoe:")
        print(f"Return code: {e.returncode}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")
        # Decide if to return or raise
    finally:
        print(f"Removing temporary GeoJSON: {temp_geojson_for_tiles_path}")
        if temp_geojson_for_tiles_path.exists():
            os.remove(temp_geojson_for_tiles_path)

    return {
        "geojson_path": str(output_path_geojson),
        "metadata_json_path": str(metadata_output_path_json),
        "mbtiles_path": str(mbtiles_output_path) if mbtiles_output_path.exists() else None
    }

if __name__ == '__main__':
    # inspect_geopackage_details() 
    process_geopackage() 