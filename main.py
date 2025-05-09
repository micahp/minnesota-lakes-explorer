import streamlit as st
import folium
from streamlit_folium import st_folium
from utils import format_lake_info
from data_processor import get_processed_data
from folium.plugins import MarkerCluster
from pls_processor import get_county_data

# Page configuration
st.set_page_config(
    page_title="Minnesota Lakes Explorer",
    page_icon="🌊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load custom CSS
with open('style.css') as f:
    st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)

# App title
st.title("🌊 Minnesota Lakes Explorer")

# Load data
@st.cache_data(ttl=3600)  # Cache for 1 hour
def load_data():
    return get_processed_data()

@st.cache_data(ttl=3600)
def load_county_data():
    return get_county_data()

df = load_data()
counties = load_county_data()

# Sidebar for filters and lake info
with st.sidebar:
    st.header("Lake Filters")

    # County selection if available
    selected_county = None
    if counties and counties['names']:
        selected_county = st.selectbox(
            "Select County",
            ["All Counties"] + counties['names']
        )

    # Area filter
    min_area = float(df['LAKE_AREA_DOW_ACRES'].min())
    max_area = float(df['LAKE_AREA_DOW_ACRES'].max())
    area_range = st.slider(
        "Lake Area (acres)",
        min_value=min_area,
        max_value=max_area,
        value=(200.0, max_area)  # Default minimum of 200 acres
    )

    # Apply filters
    filtered_df = df[
        (df['LAKE_AREA_DOW_ACRES'] >= area_range[0]) &
        (df['LAKE_AREA_DOW_ACRES'] <= area_range[1])
    ]

    st.markdown(f"Showing **{len(filtered_df)}** lakes")

    # Lake information panel in sidebar
    st.header("Lake Information")
    if 'last_clicked' not in st.session_state:
        st.session_state.last_clicked = None

    if st.session_state.last_clicked is not None:
        selected_lake = filtered_df.iloc[st.session_state.last_clicked]
        lake_info = format_lake_info(selected_lake)

        st.markdown(f"### {lake_info['Name']}")
        for key, value in lake_info.items():
            if key != 'Name':
                st.markdown(f"**{key}:** {value}")
    else:
        st.info("Click on a lake marker to see details")

# Create base map
m = folium.Map(
    location=[46.7296, -94.6859],  # Minnesota center
    zoom_start=7,
    tiles='CartoDB positron'
)

# Add county borders if available
if counties:
    county_style = {
        'fillColor': '#3388ff',
        'color': '#3388ff',
        'weight': 2,
        'fillOpacity': 0.1
    }

    for i, polygon in enumerate(counties['polygons']):
        # Convert points to folium format
        locations = [[p[1], p[0]] for p in polygon]  # Swap lat/long

        # Create polygon with county name popup
        folium.Polygon(
            locations=locations,
            popup=counties['names'][i],
            **county_style
        ).add_to(m)

# Create a marker cluster
marker_cluster = MarkerCluster(
    name="Lake Markers",
    overlay=True,
    control=True,
    options={
        'maxClusterRadius': 50,
        'disableClusteringAtZoom': 10
    }
)

# Add all markers at once
for _, row in filtered_df.iterrows():
    folium.CircleMarker(
        location=[row['LAKE_CENTER_LAT_DD5'], row['LAKE_CENTER_LONG_DD5']],
        radius=5,
        popup=f"{row['LAKE_NAME']} ({row['LAKE_AREA_DOW_ACRES']} acres)",
        color='#0077be',
        fill=True,
        fill_color='#0077be',
        fill_opacity=0.7,
        weight=2,
    ).add_to(marker_cluster)

# Add the marker cluster to the map
marker_cluster.add_to(m)

# Display map using st_folium
map_data = st_folium(m, width=None, height=600)

# Handle clicks
if map_data['last_clicked']:
    clicked_lat = map_data['last_clicked']['lat']
    clicked_lng = map_data['last_clicked']['lng']

    # Find the closest lake
    distances = filtered_df.apply(
        lambda row: (row['LAKE_CENTER_LAT_DD5'] - clicked_lat)**2 + 
                   (row['LAKE_CENTER_LONG_DD5'] - clicked_lng)**2,
        axis=1
    )
    closest_lake_idx = distances.argmin()

    if st.session_state.last_clicked != closest_lake_idx:
        st.session_state.last_clicked = closest_lake_idx
        st.rerun()