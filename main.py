import streamlit as st
import folium
from streamlit_folium import st_folium
import pandas as pd
from utils import load_and_process_lake_data, format_lake_info

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

# Load and process data
@st.cache_data
def load_data():
    return load_and_process_lake_data('attached_assets/fisheries_lake_data(Sheet 1).csv')

df = load_data()

# Create two columns for layout
col1, col2 = st.columns([1, 2])

# Sidebar for filters
with st.sidebar:
    st.header("Lake Filters")

    # Area filter
    min_area = float(df['LAKE_AREA_DOW_ACRES'].min())
    max_area = float(df['LAKE_AREA_DOW_ACRES'].max())
    area_range = st.slider(
        "Lake Area (acres)",
        min_value=min_area,
        max_value=max_area,
        value=(min_area, max_area)
    )

    # Apply filters
    filtered_df = df[
        (df['LAKE_AREA_DOW_ACRES'] >= area_range[0]) &
        (df['LAKE_AREA_DOW_ACRES'] <= area_range[1])
    ]

    st.markdown(f"Showing **{len(filtered_df)}** lakes")

# Lake information panel
with col1:
    st.markdown('<div class="lake-info">', unsafe_allow_html=True)

    if 'last_clicked' not in st.session_state:
        st.session_state.last_clicked = None

    if st.session_state.last_clicked is not None:
        selected_lake = filtered_df.iloc[st.session_state.last_clicked]
        lake_info = format_lake_info(selected_lake)

        st.markdown(f"<h2 class='lake-name'>{lake_info['Name']}</h2>", unsafe_allow_html=True)
        for key, value in lake_info.items():
            if key != 'Name':
                st.markdown(
                    f"<div class='lake-stat'><span class='lake-stat-label'>{key}:</span> {value}</div>",
                    unsafe_allow_html=True
                )
    else:
        st.write("Click on a lake marker to see details")

    st.markdown('</div>', unsafe_allow_html=True)

# Map
with col2:
    # Create base map
    m = folium.Map(
        location=[46.7296, -94.6859],  # Minnesota center
        zoom_start=7,
        tiles='CartoDB positron'
    )

    # Add markers for each lake
    for idx, row in filtered_df.iterrows():
        popup_content = f"{row['LAKE_NAME']} ({row['LAKE_AREA_DOW_ACRES']} acres)"

        folium.CircleMarker(
            location=[row['LAKE_CENTER_LAT_DD5'], row['LAKE_CENTER_LONG_DD5']],
            radius=5,
            popup=popup_content,
            color='#0077be',
            fill=True,
            fill_color='#0077be',
            fill_opacity=0.7,
            weight=2,
        ).add_to(m)

    # Display map using st_folium
    st.markdown('<div class="map-container">', unsafe_allow_html=True)
    map_data = st_folium(m, width=800, height=600)
    st.markdown('</div>', unsafe_allow_html=True)

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
            st.experimental_rerun()