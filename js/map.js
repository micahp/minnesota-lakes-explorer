// Map handling for Minnesota Lake Explorer
// Uses Leaflet.js to display lake locations and data

import dataLoader from './data-loader.js';

class LakeMap {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.markers = [];
        this.markerCluster = null;
        this.selectedLake = null;
        this.onLakeSelectedCallbacks = [];
    }

    // Initialize the map
    async initialize() {
        // Create map centered on Minnesota
        this.map = L.map(this.mapElementId).setView([46.5, -94.5], 7);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Load lake data
        await dataLoader.loadInitialData();
        
        // Add lake markers
        this.addLakeMarkers();
        
        return this.map;
    }

    // Add markers for all lakes
    addLakeMarkers() {
        // Clear existing markers
        this.clearMarkers();
        
        // Create a marker cluster group
        this.markerCluster = L.markerClusterGroup({
            maxClusterRadius: 50,
            disableClusteringAtZoom: 10,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        
        // Add a marker for each lake
        dataLoader.lakes.forEach(lake => {
            if (lake.latitude && lake.longitude) {
                const marker = L.circleMarker([lake.latitude, lake.longitude], {
                    radius: this.calculateMarkerSize(lake.area_acres),
                    color: '#0077be',
                    fillColor: '#0077be',
                    fillOpacity: 0.6,
                    weight: 1
                });
                
                // Add popup with basic lake info
                marker.bindTooltip(`${lake.name}<br>${lake.county} County<br>${lake.area_acres} acres`);
                
                // Add click handler
                marker.on('click', () => this.onLakeMarkerClick(lake));
                
                // Add marker to cluster and store reference
                this.markerCluster.addLayer(marker);
                this.markers.push({
                    id: lake.id,
                    marker: marker
                });
            }
        });
        
        // Add the marker cluster to the map
        this.map.addLayer(this.markerCluster);
        
        console.log(`Added ${this.markers.length} lake markers to map`);
    }

    // Calculate marker size based on lake area
    calculateMarkerSize(areaAcres) {
        // Base size for visibility
        const baseSize = 3;
        
        // No area data
        if (!areaAcres) return baseSize;
        
        // Scale based on area, with a max size
        const size = baseSize + Math.min(Math.sqrt(areaAcres) / 15, 12);
        return size;
    }

    // Handle lake marker click
    async onLakeMarkerClick(lake) {
        // Highlight selected lake
        this.highlightSelectedLake(lake.id);
        
        // Store selected lake
        this.selectedLake = lake;
        
        // Load detailed data for this lake
        const lakeDetails = await dataLoader.loadLakeDetails(lake.id);
        
        // Notify callbacks
        this.notifyLakeSelected(lake, lakeDetails);
    }

    // Highlight the selected lake marker
    highlightSelectedLake(lakeId) {
        // Reset all markers to default style
        this.markers.forEach(markerData => {
            markerData.marker.setStyle({
                color: '#0077be',
                fillColor: '#0077be',
                fillOpacity: 0.6,
                weight: 1
            });
        });
        
        // Highlight selected marker
        const selectedMarker = this.markers.find(m => m.id === lakeId);
        if (selectedMarker) {
            selectedMarker.marker.setStyle({
                color: '#ff4500',
                fillColor: '#ff4500',
                fillOpacity: 0.8,
                weight: 2
            });
            
            // Bring to front
            selectedMarker.marker.bringToFront();
        }
    }

    // Clear all markers from the map
    clearMarkers() {
        if (this.markerCluster) {
            this.map.removeLayer(this.markerCluster);
            this.markerCluster = null;
        }
        this.markers = [];
    }

    // Register callback for lake selection
    onLakeSelected(callback) {
        this.onLakeSelectedCallbacks.push(callback);
    }

    // Notify all callbacks that a lake was selected
    notifyLakeSelected(lake, lakeDetails) {
        this.onLakeSelectedCallbacks.forEach(callback => callback(lake, lakeDetails));
    }

    // Filter lakes by county
    filterByCounty(county) {
        // Clear existing markers
        this.clearMarkers();
        
        // Get lakes for the selected county
        const filteredLakes = dataLoader.getLakesByCounty(county);
        
        // Create a marker cluster group
        this.markerCluster = L.markerClusterGroup({
            maxClusterRadius: 50,
            disableClusteringAtZoom: 10,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        
        // Add markers for filtered lakes
        filteredLakes.forEach(lake => {
            if (lake.latitude && lake.longitude) {
                const marker = L.circleMarker([lake.latitude, lake.longitude], {
                    radius: this.calculateMarkerSize(lake.area_acres),
                    color: '#0077be',
                    fillColor: '#0077be',
                    fillOpacity: 0.6,
                    weight: 1
                });
                
                // Add popup with basic lake info
                marker.bindTooltip(`${lake.name}<br>${lake.county} County<br>${lake.area_acres} acres`);
                
                // Add click handler
                marker.on('click', () => this.onLakeMarkerClick(lake));
                
                // Add marker to cluster and store reference
                this.markerCluster.addLayer(marker);
                this.markers.push({
                    id: lake.id,
                    marker: marker
                });
            }
        });
        
        // Add the marker cluster to the map
        this.map.addLayer(this.markerCluster);
        
        // If we filtered to a specific county, zoom to fit those lakes
        if (county && filteredLakes.length > 0) {
            const latLngs = filteredLakes
                .filter(lake => lake.latitude && lake.longitude)
                .map(lake => [lake.latitude, lake.longitude]);
            
            if (latLngs.length > 0) {
                this.map.fitBounds(L.latLngBounds(latLngs), {
                    padding: [50, 50]
                });
            }
        } else {
            // Reset view to Minnesota
            this.map.setView([46.5, -94.5], 7);
        }
    }

    // Search for lakes by name
    searchByName(query) {
        if (!query) {
            // If query is empty, show all lakes
            this.addLakeMarkers();
            return;
        }
        
        // Clear existing markers
        this.clearMarkers();
        
        // Search lakes by name
        const searchResults = dataLoader.searchLakesByName(query);
        
        // Create a marker cluster group
        this.markerCluster = L.markerClusterGroup({
            maxClusterRadius: 50,
            disableClusteringAtZoom: 10,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        
        // Add markers for search results
        searchResults.forEach(lake => {
            if (lake.latitude && lake.longitude) {
                const marker = L.circleMarker([lake.latitude, lake.longitude], {
                    radius: this.calculateMarkerSize(lake.area_acres),
                    color: '#0077be',
                    fillColor: '#0077be',
                    fillOpacity: 0.6,
                    weight: 1
                });
                
                // Add popup with basic lake info
                marker.bindTooltip(`${lake.name}<br>${lake.county} County<br>${lake.area_acres} acres`);
                
                // Add click handler
                marker.on('click', () => this.onLakeMarkerClick(lake));
                
                // Add marker to cluster and store reference
                this.markerCluster.addLayer(marker);
                this.markers.push({
                    id: lake.id,
                    marker: marker
                });
            }
        });
        
        // Add the marker cluster to the map
        this.map.addLayer(this.markerCluster);
        
        // If we have search results, zoom to fit them
        if (searchResults.length > 0) {
            const latLngs = searchResults
                .filter(lake => lake.latitude && lake.longitude)
                .map(lake => [lake.latitude, lake.longitude]);
            
            if (latLngs.length > 0) {
                this.map.fitBounds(L.latLngBounds(latLngs), {
                    padding: [50, 50]
                });
            }
        }
        
        return searchResults;
    }
}

// Create and export a singleton instance
export default LakeMap; 