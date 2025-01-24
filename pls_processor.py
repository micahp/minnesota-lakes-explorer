import os
import pandas as pd
import struct
from pathlib import Path
import shapefile

def read_sd_file(file_path):
    """
    Read and process a PLS .sd file.

    Args:
        file_path (str): Path to the .sd file

    Returns:
        pd.DataFrame: Processed survey data
    """
    try:
        # Read the .sd file as binary
        with open(file_path, 'rb') as f:
            header = f.read(512)  # Read header block

            # Parse header information (implement based on specific .sd format)
            # This is a basic example - adjust according to actual file format
            version = struct.unpack('i', header[0:4])[0]
            record_count = struct.unpack('i', header[4:8])[0]

            # Initialize lists for data
            section_ids = []
            townships = []
            ranges = []
            sections = []

            # Read records
            for _ in range(record_count):
                record = f.read(256)  # Adjust size based on actual record size
                if not record:
                    break

                try:
                    # Parse record (implement based on specific format)
                    # This is a placeholder - adjust according to actual format
                    section_id = struct.unpack('i', record[0:4])[0]
                    township = struct.unpack('i', record[4:8])[0]
                    range_val = struct.unpack('i', record[8:12])[0]
                    section = struct.unpack('i', record[12:16])[0]

                    section_ids.append(section_id)
                    townships.append(township)
                    ranges.append(range_val)
                    sections.append(section)
                except struct.error:
                    print(f"Warning: Skipping malformed record in {file_path}")
                    continue

            # Create DataFrame
            df = pd.DataFrame({
                'Section_ID': section_ids,
                'Township': townships,
                'Range': ranges,
                'Section': sections
            })

            print(f"Successfully processed {len(df)} records from {file_path}")
            return df

    except Exception as e:
        print(f"Error processing .sd file {file_path}: {e}")
        return None

def get_pls_data(sd_file_path=None):
    """
    Get processed PLS data from .sd files.

    Args:
        sd_file_path (str, optional): Path to specific .sd file

    Returns:
        pd.DataFrame: Processed PLS data
    """
    if sd_file_path and os.path.exists(sd_file_path):
        return read_sd_file(sd_file_path)

    # Look for .sd files in the assets directory
    data_dir = Path('attached_assets')
    sd_files = list(data_dir.glob('*.sd'))

    if not sd_files:
        print("No .sd files found in the assets directory")
        return None

    # Process all found .sd files
    dfs = []
    for sd_file in sd_files:
        df = read_sd_file(sd_file)
        if df is not None:
            dfs.append(df)

    # Combine all processed data
    if dfs:
        return pd.concat(dfs, ignore_index=True)

    return None

def read_county_borders(file_path):
    """
    Read and process a county borders .sd file.
    Args:
        file_path (str): Path to the .sd file
    Returns:
        dict: Processed county border data
    """
    try:
        # Read the .sd file as binary
        with open(file_path, 'rb') as f:
            header = f.read(512)  # Read header block

            # Parse header - adjust based on actual format
            record_count = struct.unpack('i', header[4:8])[0]
            print(f"Found {record_count} records in header")

            counties = {
                'names': [],
                'polygons': [],
                'centroids': []
            }

            # Read county records
            for _ in range(record_count):
                record = f.read(1024)  # Adjust size based on county record format
                if not record:
                    break

                try:
                    # Extract polygon points (adjust based on actual format)
                    num_points = struct.unpack('i', record[0:4])[0]
                    points = []
                    offset = 4

                    for i in range(num_points):
                        lat = struct.unpack('d', record[offset:offset+8])[0]
                        lon = struct.unpack('d', record[offset+8:offset+16])[0]
                        points.append((lon, lat))
                        offset += 16

                    # Extract county name (adjust based on actual format)
                    name_length = struct.unpack('i', record[offset:offset+4])[0]
                    name = record[offset+4:offset+4+name_length].decode('utf-8').strip()

                    if points:
                        # Calculate centroid
                        x_coords = [p[0] for p in points]
                        y_coords = [p[1] for p in points]
                        centroid = (sum(x_coords) / len(points), sum(y_coords) / len(points))

                        counties['polygons'].append(points)
                        counties['centroids'].append(centroid)
                        counties['names'].append(name)

                except struct.error:
                    print(f"Warning: Skipping malformed county record")
                    continue

            print(f"Successfully processed {len(counties['names'])} counties from {file_path}")
            return counties

    except Exception as e:
        print(f"Error processing county borders file {file_path}: {e}")
        return None

def get_county_data(file_path=None):
    """
    Get processed county border data.
    Args:
        file_path (str, optional): Path to specific county borders file
    Returns:
        dict: Processed county data
    """
    if file_path and os.path.exists(file_path):
        return read_county_borders(file_path)

    # Look for county borders file in assets directory
    data_dir = Path('attached_assets')
    county_file = data_dir / 'County_Borders.sd'

    if county_file.exists():
        return read_county_borders(county_file)

    print("No county borders file found")
    return None