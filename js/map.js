// Map handling for Minnesota Lake Explorer
// Uses Leaflet.js to display lake locations and data

import dataLoader from './data-loader.js';

class LakeMap {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.lakePolygonLayer = null; // Single layer for all lake polygons
        this.selectedLake = null;
        this.onLakeSelectedCallbacks = [];
        this.allLakeFeatures = []; // Store all features for efficient client-side filtering
    }

    // Initialize the map
    async initialize() {
        this.map = L.map(this.mapElementId).setView([46.5, -94.5], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        await dataLoader.loadInitialData(); // Still needed for detailed data and potentially county lists
        await this.loadLakePolygons();
        
        return this.map;
    }

    // Load and add polygons for all lakes
    async loadLakePolygons() {
        this.clearLakePolygonLayer();
        
        try {
            const response = await fetch('/data/lakes.geojson');
            if (!response.ok) {
                console.error('Failed to load lakes.geojson:', response.status, response.statusText);
                return;
            }
            const geojsonData = await response.json();
            this.allLakeFeatures = geojsonData.features; // Store all features

            this.lakePolygonLayer = L.geoJSON(geojsonData, {
                style: feature => ({ // Default style
                    color: '#0077be',
                    weight: 1,
                    fillColor: '#0077be',
                    fillOpacity: 0.6,
                    // Initially hide features if you want to only show them after a filter/search
                    // Or show all by default:
                    // opacity: 1, 
                }),
                onEachFeature: (feature, layer) => {
                    const props = feature.properties;
                    let tooltipContent = 'Lake Information';
                    if (props) {
                        tooltipContent = `${props.name || 'N/A'}`;
                        if (props.county) tooltipContent += `<br>${props.county} County`;
                        if (props.area_acres) tooltipContent += `<br>${Number(props.area_acres).toFixed(0)} acres`;
                    }
                    layer.bindTooltip(tooltipContent);
                    
                    layer.on('click', async () => {
                        if (props && props.DNR_ID) {
                            // Attempt to find matching lake in dataLoader for full details
                            // This assumes dataLoader.lakes has an 'id' field that matches props.DNR_ID
                            const lakeMasterData = dataLoader.getLakeById(props.DNR_ID) || { id: props.DNR_ID, name: props.name, county: props.county, area_acres: props.area_acres };
                            await this.onLakeClick(lakeMasterData);
                        } else {
                            console.warn('Clicked lake polygon without a valid DNR_ID:', props);
                            // Fallback: display basic info if available
                            this.notifyLakeSelected({ id: null, name: props.name, county: props.county, area_acres: props.area_acres }, {});
                        }
                    });
                }
            }).addTo(this.map);
            
            console.log(`Loaded ${this.allLakeFeatures.length} lake polygons into map layer.`);
        } catch (error) {
            console.error('Error loading or processing lake polygons:', error);
        }
    }
    
    // Handle lake click
    async onLakeClick(lakeDataFromFeature) { // lakeDataFromFeature contains at least DNR_ID and basic props
        this.highlightSelectedLake(lakeDataFromFeature.id); // Use DNR_ID for highlighting
        this.selectedLake = lakeDataFromFeature; // Store the basic data

        try {
            // Fetch detailed data using the ID
            const lakeDetails = await dataLoader.loadLakeDetails(lakeDataFromFeature.id);
            // Merge or use detailed data
            this.notifyLakeSelected({ ...lakeDataFromFeature, ...lakeDetails.basicInfo }, lakeDetails.surveyData);
        } catch (error) {
             console.error(`Error loading details for lake ID ${lakeDataFromFeature.id}:`, error);
             // Notify with basic data if details fail
             this.notifyLakeSelected(lakeDataFromFeature, {});
        }
    }

    // Highlight the selected lake
    highlightSelectedLake(dnrId) {
        if (!this.lakePolygonLayer) return;

        this.lakePolygonLayer.eachLayer(layer => {
            const props = layer.feature.properties;
            if (props && props.DNR_ID === dnrId) {
                layer.setStyle({
                    color: '#ff4500',
                    weight: 2,
                    fillColor: '#ff4500',
                    fillOpacity: 0.8
                });
                layer.bringToFront();
            } else {
                layer.setStyle({ // Reset to default style
                    color: '#0077be',
                    weight: 1,
                    fillColor: '#0077be',
                    fillOpacity: 0.6
                });
            }
        });
    }

    // Clear the main lake polygon layer
    clearLakePolygonLayer() {
        if (this.lakePolygonLayer) {
            this.map.removeLayer(this.lakePolygonLayer);
            this.lakePolygonLayer = null;
        }
        this.allLakeFeatures = [];
    }

    // Register callback for lake selection
    onLakeSelected(callback) {
        this.onLakeSelectedCallbacks.push(callback);
    }

    // Notify all callbacks that a lake was selected
    notifyLakeSelected(lakeBasicInfo, lakeSurveyData) {
        this.onLakeSelectedCallbacks.forEach(callback => callback(lakeBasicInfo, lakeSurveyData));
    }
    
    // Helper to update the displayed polygons based on a filter function
    _applyFilter(filterFunction) {
        if (!this.lakePolygonLayer || !this.allLakeFeatures.length) {
            console.warn("Lake polygon layer or features not loaded, cannot apply filter.");
            return;
        }

        // Remove current layer before re-adding filtered features
        this.map.removeLayer(this.lakePolygonLayer);

        const filteredGeoJson = {
            type: "FeatureCollection",
            features: this.allLakeFeatures.filter(filterFunction)
        };

        this.lakePolygonLayer = L.geoJSON(filteredGeoJson, {
            style: feature => ({
                color: '#0077be',
                weight: 1,
                fillColor: '#0077be',
                fillOpacity: 0.6,
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                let tooltipContent = 'Lake Information';
                if (props) {
                    tooltipContent = `${props.name || 'N/A'}`;
                    if (props.county) tooltipContent += `<br>${props.county} County`;
                    if (props.area_acres) tooltipContent += `<br>${Number(props.area_acres).toFixed(0)} acres`;
                }
                layer.bindTooltip(tooltipContent);
                
                layer.on('click', async () => {
                     if (props && props.DNR_ID) {
                        const lakeMasterData = dataLoader.getLakeById(props.DNR_ID) || { id: props.DNR_ID, name: props.name, county: props.county, area_acres: props.area_acres };
                        await this.onLakeClick(lakeMasterData);
                    } else {
                        console.warn('Clicked lake polygon without a valid DNR_ID:', props);
                        this.notifyLakeSelected({ id: null, name: props.name, county: props.county, area_acres: props.area_acres }, {});
                    }
                });
            }
        }).addTo(this.map);
        
        console.log(`Applied filter. Displaying ${filteredGeoJson.features.length} lakes.`);
        return filteredGeoJson.features;
    }


    // Filter lakes by county
    filterByCounty(county) {
        const features = this._applyFilter(feature => {
            if (!county) return true; // Show all if no county selected
            return feature.properties && feature.properties.county === county;
        });

        if (county && features && features.length > 0) {
            this.map.fitBounds(this.lakePolygonLayer.getBounds(), {
                padding: [50, 50]
            });
        } else if (!county) {
            this.map.setView([46.5, -94.5], 7); // Reset view if showing all counties
        }
    }

    // Search for lakes by name
    searchByName(query) {
        const lowerQuery = query.toLowerCase().trim();
        
        if (!lowerQuery) {
            // If query is empty, show all lakes (or reset to initial state)
            this._applyFilter(() => true); // Show all
            this.map.setView([46.5, -94.5], 7);
            return this.allLakeFeatures.map(f => f.properties); // Return basic info for all
        }
        
        const searchResultsFeatures = this._applyFilter(feature => {
            return feature.properties && feature.properties.name && 
                   feature.properties.name.toLowerCase().includes(lowerQuery);
        });
        
        if (searchResultsFeatures && searchResultsFeatures.length > 0) {
            this.map.fitBounds(this.lakePolygonLayer.getBounds(), {
                padding: [50, 50]
            });
        }
        // Return properties of found lakes for display elsewhere if needed
        return searchResultsFeatures.map(f => f.properties);
    }
}

// Create and export a singleton instance
const lakeMapInstance = new LakeMap('map'); // Ensure 'map' is your map div ID
export default lakeMapInstance; 