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

        try {
            const lakeDetails = await dataLoader.loadLakeDetails(lakeDataFromFeature.id);
            console.log("Details from dataLoader.loadLakeDetails:", lakeDetails);
            
            const basicInfoForDisplay = dataLoader.getLakeById(lakeDataFromFeature.id) || lakeDataFromFeature;

            this.notifyLakeSelected({ ...basicInfoForDisplay, ...lakeDetails.basicInfo }, lakeDetails.surveyData);
        } catch (error) {
             console.error(`Error loading details for lake ID ${lakeDataFromFeature.id}:`, error);
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
            this.vectorLayer.redraw();
        }
        
        if (this.selectedCounty) {
            const lakesInCounty = dataLoader.getLakesByCounty(this.selectedCounty);
            console.log(`Found ${lakesInCounty.length} lakes in ${this.selectedCounty} (from metadata).`);
            if (lakesInCounty.length > 0) {
                const firstLake = dataLoader.getLakeById(lakesInCounty[0].DNR_ID);
                if (firstLake && firstLake.center_lat && firstLake.center_lon) { 
                     this.map.setView([firstLake.center_lat, firstLake.center_lon], 10); 
                }
            }
        } else {
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