// Map handling for Minnesota Lake Explorer
// Uses Leaflet.js to display lake locations and data

import dataLoader from './data-loader.js';

class LakeMap {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.lakeLayers = [];
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
        
        // Add lake polygons
        await this.addLakePolygons();
        
        return this.map;
    }

    // Add polygons for all lakes
    async addLakePolygons() {
        // Clear existing layers
        this.clearLayers();
        
        try {
            // Load GeoJSON data
            const response = await fetch('/data/lakes.geojson');
            const geojsonData = await response.json();
            
            // Create a layer group for lakes
            const lakeLayer = L.geoJSON(geojsonData, {
                style: {
                    color: '#0077be',
                    weight: 1,
                    fillColor: '#0077be',
                    fillOpacity: 0.6
                },
                onEachFeature: (feature, layer) => {
                    // Add popup with basic lake info
                    const lake = dataLoader.getLakeById(feature.properties.DNR_ID);
                    if (lake) {
                        layer.bindTooltip(`${lake.name}<br>${lake.county} County<br>${lake.area_acres} acres`);
                        
                        // Add click handler
                        layer.on('click', () => this.onLakeClick(lake));
                    }
                }
            });
            
            // Add the layer to the map
            lakeLayer.addTo(this.map);
            this.lakeLayers.push(lakeLayer);
            
            console.log(`Added ${geojsonData.features.length} lake polygons to map`);
        } catch (error) {
            console.error('Error loading lake polygons:', error);
        }
    }

    // Handle lake click
    async onLakeClick(lake) {
        // Highlight selected lake
        this.highlightSelectedLake(lake.id);
        
        // Store selected lake
        this.selectedLake = lake;
        
        // Load detailed data for this lake
        const lakeDetails = await dataLoader.loadLakeDetails(lake.id);
        
        // Notify callbacks
        this.notifyLakeSelected(lake, lakeDetails);
    }

    // Highlight the selected lake
    highlightSelectedLake(lakeId) {
        // Reset all layers to default style
        this.lakeLayers.forEach(layer => {
            layer.setStyle({
                color: '#0077be',
                weight: 1,
                fillColor: '#0077be',
                fillOpacity: 0.6
            });
        });
        
        // Find and highlight selected lake
        this.lakeLayers.forEach(layer => {
            layer.eachLayer(featureLayer => {
                const lake = dataLoader.getLakeById(featureLayer.feature.properties.DNR_ID);
                if (lake && lake.id === lakeId) {
                    featureLayer.setStyle({
                        color: '#ff4500',
                        weight: 2,
                        fillColor: '#ff4500',
                        fillOpacity: 0.8
                    });
                    featureLayer.bringToFront();
                }
            });
        });
    }

    // Clear all layers from the map
    clearLayers() {
        this.lakeLayers.forEach(layer => {
            this.map.removeLayer(layer);
        });
        this.lakeLayers = [];
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
    async filterByCounty(county) {
        // Clear existing layers
        this.clearLayers();
        
        try {
            // Load GeoJSON data
            const response = await fetch('/data/lakes.geojson');
            const geojsonData = await response.json();
            
            // Filter features by county
            const filteredFeatures = geojsonData.features.filter(feature => {
                const lake = dataLoader.getLakeById(feature.properties.DNR_ID);
                return !county || (lake && lake.county === county);
            });
            
            // Create filtered GeoJSON
            const filteredGeoJSON = {
                type: 'FeatureCollection',
                features: filteredFeatures
            };
            
            // Create a layer group for filtered lakes
            const lakeLayer = L.geoJSON(filteredGeoJSON, {
                style: {
                    color: '#0077be',
                    weight: 1,
                    fillColor: '#0077be',
                    fillOpacity: 0.6
                },
                onEachFeature: (feature, layer) => {
                    const lake = dataLoader.getLakeById(feature.properties.DNR_ID);
                    if (lake) {
                        layer.bindTooltip(`${lake.name}<br>${lake.county} County<br>${lake.area_acres} acres`);
                        layer.on('click', () => this.onLakeClick(lake));
                    }
                }
            });
            
            // Add the layer to the map
            lakeLayer.addTo(this.map);
            this.lakeLayers.push(lakeLayer);
            
            // If we filtered to a specific county, zoom to fit those lakes
            if (county && filteredFeatures.length > 0) {
                this.map.fitBounds(lakeLayer.getBounds(), {
                    padding: [50, 50]
                });
            } else {
                // Reset view to Minnesota
                this.map.setView([46.5, -94.5], 7);
            }
        } catch (error) {
            console.error('Error filtering lake polygons:', error);
        }
    }

    // Search for lakes by name
    async searchByName(query) {
        if (!query) {
            // If query is empty, show all lakes
            await this.addLakePolygons();
            return;
        }
        
        // Clear existing layers
        this.clearLayers();
        
        try {
            // Load GeoJSON data
            const response = await fetch('/data/lakes.geojson');
            const geojsonData = await response.json();
            
            // Search lakes by name
            const searchResults = dataLoader.searchLakesByName(query);
            const searchResultIds = new Set(searchResults.map(lake => lake.id));
            
            // Filter features by search results
            const filteredFeatures = geojsonData.features.filter(feature => {
                const lake = dataLoader.getLakeById(feature.properties.DNR_ID);
                return lake && searchResultIds.has(lake.id);
            });
            
            // Create filtered GeoJSON
            const filteredGeoJSON = {
                type: 'FeatureCollection',
                features: filteredFeatures
            };
            
            // Create a layer group for search results
            const lakeLayer = L.geoJSON(filteredGeoJSON, {
                style: {
                    color: '#0077be',
                    weight: 1,
                    fillColor: '#0077be',
                    fillOpacity: 0.6
                },
                onEachFeature: (feature, layer) => {
                    const lake = dataLoader.getLakeById(feature.properties.DNR_ID);
                    if (lake) {
                        layer.bindTooltip(`${lake.name}<br>${lake.county} County<br>${lake.area_acres} acres`);
                        layer.on('click', () => this.onLakeClick(lake));
                    }
                }
            });
            
            // Add the layer to the map
            lakeLayer.addTo(this.map);
            this.lakeLayers.push(lakeLayer);
            
            // If we have search results, zoom to fit them
            if (filteredFeatures.length > 0) {
                this.map.fitBounds(lakeLayer.getBounds(), {
                    padding: [50, 50]
                });
            }
            
            return searchResults;
        } catch (error) {
            console.error('Error searching lake polygons:', error);
            return [];
        }
    }
}

// Create and export a singleton instance
export default LakeMap; 