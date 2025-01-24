import streamlit as st
import folium
from streamlit_folium import folium_static
import pandas as pd
from utils import load_and_process_lake_data, format_lake_info
import streamlit.components.v1 as components

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

# Initialize session state for selected lake
if 'selected_lake' not in st.session_state:
    st.session_state.selected_lake = None

# Lake information panel
with col1:
    if st.session_state.selected_lake is not None:
        lake_info = format_lake_info(st.session_state.selected_lake)

        st.markdown('<div class="lake-info">', unsafe_allow_html=True)
        st.markdown(f"<h2 class='lake-name'>{lake_info['Name']}</h2>", unsafe_allow_html=True)

        for key, value in lake_info.items():
            if key != 'Name':
                st.markdown(
                    f"<div class='lake-stat'><span class='lake-stat-label'>{key}:</span> {value}</div>",
                    unsafe_allow_html=True
                )
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

        # Add click event
        folium.Circle(
            location=[row['LAKE_CENTER_LAT_DD5'], row['LAKE_CENTER_LONG_DD5']],
            radius=100,
            popup=popup_content,
            color='transparent',
            fill=False,
            opacity=0,
            fillOpacity=0,
            weight=0,
            onclick=f"""
                (function(e) {{
                    var lake_data = {{'index': {idx}}};
                    window.parent.postMessage({{action: 'select_lake', lake_data: lake_data}}, '*');
                }})
            """
        ).add_to(m)

    # Display map
    st.markdown('<div class="map-container">', unsafe_allow_html=True)
    folium_static(m, width=800, height=600)
    st.markdown('</div>', unsafe_allow_html=True)

# Handle lake selection
components.html(
    """
    <script>
    window.addEventListener('message', function(e) {
        if (e.data.action === 'select_lake') {
            window.Streamlit.setComponentValue(e.data.lake_data);
        }
    });
    </script>
    """,
    height=0,
    key="lake_selector"
)

# Update selected lake when clicked
if st.session_state.lake_selector is not None:
    lake_idx = st.session_state.lake_selector['index']
    st.session_state.selected_lake = filtered_df.iloc[lake_idx]
    st.experimental_rerun()