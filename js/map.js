/**
 * Map module for Minnesota Lakes Explorer
 * Handles the Leaflet map, markers, and interactions
 */

const MapManager = {
  // Leaflet map object
  map: null,
  
  // Marker cluster group
  markerCluster: null,
  
  // Store markers by DOW ID for easy access
  markers: {},
  
  // Currently selected lake
  selectedLakeId: null,
  
  /**
   * Initialize the map
   * @param {string} elementId - ID of the HTML element to contain the map
   * @returns {Object} The map object
   */
  init: function(elementId) {
    // Create the map centered on Minnesota
    this.map = L.map(elementId, {
      center: [46.7296, -94.6859],
      zoom: 7,
      minZoom: 6,
      maxZoom: 18
    });
    
    // Add the base tile layer (CartoDB)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
    
    // Create a marker cluster group
    this.markerCluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      disableClusteringAtZoom: 10,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true
    });
    
    // Add the marker cluster to the map
    this.map.addLayer(this.markerCluster);
    
    return this.map;
  },
  
  /**
   * Add lake markers to the map
   * @param {Array} lakes - Array of lake objects to add as markers
   */
  addLakeMarkers: function(lakes) {
    // Clear existing markers
    this.markerCluster.clearLayers();
    this.markers = {};
    
    // Loop through lakes and add markers
    lakes.forEach(lake => {
      if (!lake.LAKE_CENTER_LAT_DD5 || !lake.LAKE_CENTER_LONG_DD5) {
        return; // Skip lakes without coordinates
      }
      
      // Determine if this is a sentinel or border lake for styling
      const isSentinel = DataLoader.sentinelLakes.includes(lake.DOW);
      const isBorder = DataLoader.borderLakes.includes(lake.DOW);
      
      // Create a circle marker
      const marker = L.circleMarker(
        [lake.LAKE_CENTER_LAT_DD5, lake.LAKE_CENTER_LONG_DD5],
        {
          radius: this.calculateMarkerSize(lake.LAKE_AREA_DOW_ACRES),
          color: this.getMarkerColor(isSentinel, isBorder),
          fillColor: this.getMarkerColor(isSentinel, isBorder),
          fillOpacity: 0.7,
          weight: 2
        }
      );
      
      // Create popup content
      const popupContent = this.createPopupContent(lake);
      marker.bindPopup(popupContent);
      
      // Add click handler to marker
      marker.on('click', () => {
        this.onMarkerClick(lake.DOW);
      });
      
      // Add marker to cluster and store reference by DOW
      this.markerCluster.addLayer(marker);
      this.markers[lake.DOW] = marker;
    });
  },
  
  /**
   * Calculate marker size based on lake area
   * @param {number} area - Lake area in acres
   * @returns {number} Marker radius in pixels
   */
  calculateMarkerSize: function(area) {
    // Base size of 4 pixels, increase slightly for larger lakes
    if (area < 100) return 4;
    if (area < 500) return 5;
    if (area < 1000) return 6;
    if (area < 5000) return 7;
    return 8; // For very large lakes
  },
  
  /**
   * Get marker color based on lake attributes
   * @param {boolean} isSentinel - Whether the lake is a sentinel lake
   * @param {boolean} isBorder - Whether the lake is a border water
   * @returns {string} Color hex code
   */
  getMarkerColor: function(isSentinel, isBorder) {
    if (isSentinel) return '#ff7f00'; // Orange for sentinel lakes
    if (isBorder) return '#4daf4a';   // Green for border waters
    return '#0077be';                 // Blue for regular lakes
  },
  
  /**
   * Create HTML content for the popup
   * @param {Object} lake - Lake object
   * @returns {string} HTML content
   */
  createPopupContent: function(lake) {
    // Format lake information
    const lakeInfo = DataLoader.formatLakeInfo(lake);
    
    // Create popup content with HTML
    let content = `
      <div class="popup-title">${lakeInfo.name} (${lakeInfo.id})</div>
      <div class="popup-content">
    `;
    
    // Add fish consumption advisory if available
    if (lake.HAS_CONSUMPTION_ADVISORY) {
      content += `
        <div class="advisory-box">
          <h3><i class="fa fa-info-circle"></i>Fish consumption advisory</h3>
          <p>See the <a href="https://www.health.state.mn.us/communities/environment/fish/index.html" target="_blank">Fish Consumption</a> guidance provided by the Minnesota Department of Health.</p>
        </div>
      `;
    }
    
    // Add lake details
    content += `
      <p><strong>County:</strong> ${lakeInfo.county}</p>
      <p><strong>Area:</strong> ${lakeInfo.area}</p>
    `;
    
    // Add max depth if available
    if (lakeInfo.maxDepth !== 'Unknown') {
      content += `<p><strong>Max Depth:</strong> ${lakeInfo.maxDepth}</p>`;
    }
    
    // Add special designations
    if (lakeInfo.isSentinel) {
      content += `<p><strong>Sentinel Lake:</strong> Yes</p>`;
    }
    
    if (lakeInfo.isBorder) {
      content += `<p><strong>Border Water:</strong> Yes</p>`;
    }
    
    // Add links for directions
    content += `
      </div>
      <div class="popup-links">
        <a href="https://www.bing.com/maps?sp=point.${lakeInfo.latitude}_${lakeInfo.longitude}_${encodeURIComponent(lakeInfo.name)}" target="_blank">Bing Maps</a>
        <a href="https://www.google.com/maps/search/?api=1&query=${lakeInfo.latitude},${lakeInfo.longitude}" target="_blank">Google Maps</a>
      </div>
    `;
    
    return content;
  },
  
  /**
   * Handle marker click event
   * @param {string} lakeId - DOW ID of the clicked lake
   */
  onMarkerClick: function(lakeId) {
    // Highlight the selected lake
    this.selectLake(lakeId);
    
    // Update lake details in sidebar
    this.updateLakeDetails(lakeId);
  },
  
  /**
   * Select and highlight a lake on the map
   * @param {string} lakeId - DOW ID of the lake to select
   */
  selectLake: function(lakeId) {
    // Reset previous selection
    if (this.selectedLakeId && this.markers[this.selectedLakeId]) {
      const prevMarker = this.markers[this.selectedLakeId];
      const lake = DataLoader.getLakeById(this.selectedLakeId);
      if (lake) {
        const isSentinel = DataLoader.sentinelLakes.includes(lake.DOW);
        const isBorder = DataLoader.borderLakes.includes(lake.DOW);
        prevMarker.setStyle({
          color: this.getMarkerColor(isSentinel, isBorder),
          fillColor: this.getMarkerColor(isSentinel, isBorder)
        });
      }
    }
    
    // Set new selection
    this.selectedLakeId = lakeId;
    
    // Highlight new selection if exists
    if (lakeId && this.markers[lakeId]) {
      const marker = this.markers[lakeId];
      marker.setStyle({
        color: '#e41a1c',
        fillColor: '#e41a1c'
      });
      
      // Open popup and pan to marker
      marker.openPopup();
      this.map.panTo(marker.getLatLng());
    }
  },
  
  /**
   * Update lake details in the sidebar
   * @param {string} lakeId - DOW ID of the lake
   */
  updateLakeDetails: function(lakeId) {
    const lakeDetailsElement = document.getElementById('lake-details');
    if (!lakeDetailsElement) return;
    
    const lake = DataLoader.getLakeById(lakeId);
    if (!lake) {
      lakeDetailsElement.innerHTML = '<p class="info-message">Lake information not available</p>';
      return;
    }
    
    // Format lake information
    const lakeInfo = DataLoader.formatLakeInfo(lake);
    
    // Create HTML for lake details
    let html = `<h3>${lakeInfo.name}</h3>`;
    
    // Fish consumption advisory if available
    if (lake.HAS_CONSUMPTION_ADVISORY) {
      html += `
        <div class="advisory-box">
          <h3><i class="fa fa-info-circle"></i>Fish consumption advisory</h3>
          <p>See the <a href="https://www.health.state.mn.us/communities/environment/fish/index.html" target="_blank">Fish Consumption</a> guidance.</p>
        </div>
      `;
    }
    
    // Lake details
    html += `
      <div class="lake-detail-item"><span>ID:</span> ${lakeInfo.id}</div>
      <div class="lake-detail-item"><span>County:</span> ${lakeInfo.county}</div>
    `;
    
    if (lakeInfo.nearestTown) {
      html += `<div class="lake-detail-item"><span>Nearest Town:</span> ${lakeInfo.nearestTown}</div>`;
    }
    
    html += `
      <div class="lake-detail-item"><span>Area:</span> ${lakeInfo.area}</div>
      <div class="lake-detail-item"><span>Shoreline:</span> ${lakeInfo.shoreline}</div>
      <div class="lake-detail-item"><span>Max Depth:</span> ${lakeInfo.maxDepth}</div>
      <div class="lake-detail-item"><span>Mean Depth:</span> ${lakeInfo.meanDepth}</div>
    `;
    
    // Special designations
    if (lakeInfo.isSentinel) {
      html += `<div class="lake-detail-item"><span>Sentinel Lake:</span> Yes</div>`;
    }
    
    if (lakeInfo.isBorder) {
      html += `<div class="lake-detail-item"><span>Border Water:</span> Yes</div>`;
    }
    
    // Update the element
    lakeDetailsElement.innerHTML = html;
  }
};

// Export the module
window.MapManager = MapManager; 