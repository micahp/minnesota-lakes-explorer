// Map handling for Minnesota Lake Explorer
// Uses Leaflet.js to display lake locations and data

import dataLoader from './data-loader.js';

class LakeMap {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.vectorLayer = null;
        this.selectedCounty = null;
        this.onLakeSelectedCallbacks = [];
        this.hoverTooltip = null;
    }

    // Initialize the map
    async initialize() {
        this.map = L.map(this.mapElementId, {
            minZoom: 0,
            maxZoom: 16
        }).setView([46.5, -94.5], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        await dataLoader.loadInitialData();
        
        const tileUrl = 'http://localhost:8080/data/lake_tiles/{z}/{x}/{y}.pbf'; 

        const vectorTileOptions = {
            vectorTileLayerStyles: {
                lakes: (properties, zoom) => {
                    const defaultStyle = {
                        fillColor: '#0077be',
                        fillOpacity: 0.6,
                        stroke: true,
                        color: '#005a8f',
                        weight: 1,
                        fill: true
                    };
                    const hiddenStyle = {
                        fill: false,
                        stroke: false,
                        opacity: 0,
                        fillOpacity: 0
                    };

                    if (this.selectedCounty && properties.county !== this.selectedCounty) {
                        return hiddenStyle;
                    }
                    return defaultStyle;
                }
            },
            interactive: true,
            getFeatureId: function(f) {
                return f.properties.DNR_ID;
            }
        };

        this.vectorLayer = L.vectorGrid.protobuf(tileUrl, vectorTileOptions).addTo(this.map);

        this.vectorLayer.on('click', async (e) => {
            L.DomEvent.stop(e); 
            const props = e.layer.properties;
            console.log("Vector tile clicked props:", props);
            if (props && props.DNR_ID) {
                const lakeMasterData = dataLoader.getLakeById(props.DNR_ID) || 
                                     { id: props.DNR_ID, name: props.name, county: props.county }; 
                console.log("Lake master data for onLakeClick:", lakeMasterData);
                await this.onLakeClick(lakeMasterData);
            } else {
                console.warn('Clicked lake vector tile without DNR_ID:', props);
            }
        });
        
        this.vectorLayer.on('mouseover', (e) => {
            L.DomEvent.stop(e);
            const props = e.layer.properties;
            if (props && props.name) {
                let tooltipContent = `<strong>${props.name}</strong>`;
                if (props.county) {
                    tooltipContent += `<br>${props.county} County`;
                }
                if (this.hoverTooltip) {
                    this.map.removeLayer(this.hoverTooltip);
                    this.hoverTooltip = null;
                }
                this.hoverTooltip = L.tooltip({
                    sticky: true, 
                    opacity: 0.9
                })
                .setLatLng(e.latlng)
                .setContent(tooltipContent)
                .addTo(this.map);
            }
        });

        this.vectorLayer.on('mouseout', (e) => {
            if (this.hoverTooltip) {
                this.map.removeLayer(this.hoverTooltip);
                this.hoverTooltip = null;
            }
        });
        
        this.map.on('click', () => {
            // If details panel should close on map click, that logic can be handled here
            // or by the UI elements themselves (e.g., if lake-details panel is open, close it)
            // For now, this.notifyLakeSelected(null, {}) could be used if UI needs to clear details.
            // However, typically a click on map means deselect, which is not a visual state anymore.
        });

        console.log("Vector tile layer initialized.");
        return this.map;
    }

    // Handle lake click - now only fetches data and notifies UI
    async onLakeClick(lakeDataFromFeature) {
        console.log("onLakeClick received:", lakeDataFromFeature);

        // Pan/zoom to the lake's location first
        if (lakeDataFromFeature && typeof lakeDataFromFeature.center_lat === 'number' && typeof lakeDataFromFeature.center_lon === 'number') {
            const zoomLevel = this.map.getZoom() < 10 ? 13 : this.map.getZoom(); // Zoom in if map is too zoomed out, else keep current zoom
            this.map.flyTo([lakeDataFromFeature.center_lat, lakeDataFromFeature.center_lon], zoomLevel);
            console.log(`Map flying to: [${lakeDataFromFeature.center_lat}, ${lakeDataFromFeature.center_lon}] at zoom ${zoomLevel}`);
        } else {
            console.warn("onLakeClick: Lake data missing center_lat or center_lon. Cannot pan map.", lakeDataFromFeature);
        }

        try {
            const lakeId = lakeDataFromFeature.id || lakeDataFromFeature.DNR_ID; // Handle both possible ID property names
            if (!lakeId) {
                console.error("onLakeClick: Lake data missing ID. Cannot fetch details.", lakeDataFromFeature);
                this.notifyLakeSelected(lakeDataFromFeature, {}); // Notify with what we have
                return;
            }

            const lakeDetails = await dataLoader.loadLakeDetails(lakeId);
            console.log("Details from dataLoader.loadLakeDetails:", lakeDetails);
            
            const basicInfoForDisplay = dataLoader.getLakeById(lakeId) || lakeDataFromFeature;

            this.notifyLakeSelected({ ...basicInfoForDisplay, ...lakeDetails.basicInfo }, lakeDetails.surveyData);
        } catch (error) {
             const lakeId = lakeDataFromFeature.id || lakeDataFromFeature.DNR_ID;
             console.error(`Error loading details for lake ID ${lakeId}:`, error);
             this.notifyLakeSelected(lakeDataFromFeature, {}); 
        }
    }

    onLakeSelected(callback) {
        this.onLakeSelectedCallbacks.push(callback);
    }

    notifyLakeSelected(lakeBasicInfo, lakeSurveyData) {
        console.log("notifyLakeSelected called with basicInfo:", lakeBasicInfo, "surveyData:", lakeSurveyData);
        this.onLakeSelectedCallbacks.forEach(callback => callback(lakeBasicInfo, lakeSurveyData));
    }
    
    filterByCounty(county) {
        console.log(`Filter by county requested: ${county}.`);
        
        this.selectedCounty = county || null;

        if (this.vectorLayer && typeof this.vectorLayer.redraw === 'function') {
            this.vectorLayer.redraw(); // Redraw to show/hide lakes based on selectedCounty
        }
        
        if (this.selectedCounty) {
            // Try to get bounds from dataLoader
            const countyBounds = dataLoader.getCountyBounds(this.selectedCounty);
            if (countyBounds && countyBounds.isValid()) { // Ensure bounds are valid
                console.log(`Fitting map to bounds for ${this.selectedCounty}:`, countyBounds);
                this.map.fitBounds(countyBounds);
            } else {
                // Fallback if bounds are not found or invalid for the selected county
                console.warn(`Could not find valid bounds for county: ${this.selectedCounty}. Falling back to default view or first lake logic if desired.`);
                // Previous logic (zoom to first lake) can be reinstated here as a further fallback if needed,
                // but for now, we'll go to a general view if specific county bounds aren't available.
                // For example, could try to find *any* lake in the county if bounds failed but county is valid
                const lakesInCounty = dataLoader.getLakesByCounty(this.selectedCounty);
                if (lakesInCounty.length > 0) {
                    const firstLake = dataLoader.getLakeById(lakesInCounty[0].DNR_ID);
                    if (firstLake && firstLake.center_lat && firstLake.center_lon) { 
                         console.log(`No bounds found, centering on first lake: ${firstLake.name}`);
                         this.map.setView([firstLake.center_lat, firstLake.center_lon], 10); 
                    } else {
                        this.map.setView([46.5, -94.5], 11); // Default if first lake has no coords
                    }
                } else {
                     this.map.setView([46.5, -94.5], 11); // Default if no lakes in county (or county invalid)
                }
            }
        } else {
            // No county selected, reset to default view
            console.log('No county selected. Resetting map view to default.');
            this.map.setView([46.5, -94.5], 11);
        }
    }

    searchByName(query) {
        console.log(`Search by name: ${query}.`);
        const results = dataLoader.searchLakesByName(query);
        // The map instance itself no longer directly handles displaying the first result or map interactions here.
        // It just returns the data. app.js will coordinate UI updates.
        return results; // Return all found results
    }
}

const lakeMapInstance = new LakeMap('map'); 
export default lakeMapInstance; 