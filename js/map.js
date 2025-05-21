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

                    if (this.selectedCounty && properties.county && properties.county.toUpperCase() !== this.selectedCounty.toUpperCase()) {
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
            this.lastClickedTileProps = props; // Store for fallback in onLakeClick
            console.log("Vector tile clicked props:", props);
            if (props && props.DNR_ID) {
                // Fetch the full lake object using DNR_ID from tile properties
                const fullLakeObject = dataLoader.getLakeById(props.DNR_ID);

                if (fullLakeObject) {
                    console.log("Full lake object fetched:", fullLakeObject);
                    await this.onLakeClick(fullLakeObject); // Pass the full object
                } else {
                    console.error(`Lake with DNR_ID ${props.DNR_ID} not found in master data.`);
                    // Optionally notify UI about the missing data
                    this.notifyLakeSelected({ name: props.name || 'Unknown Lake', county: props.county || 'Unknown' }, {});
                }
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

    // Handle lake click - now processes the full lake object
    async onLakeClick(fullLakeObject) { // Expecting the full lake object from dataLoader
        console.log("onLakeClick received full lake object:", fullLakeObject);

        // Check for dow_number as it's the primary key from lakes.json used for initial fetch
        // and 'id' which we assume links to fish data (as FISHERIES_WATERBODY_ID)
        if (!fullLakeObject || !fullLakeObject.dow_number || typeof fullLakeObject.id === 'undefined') { 
            console.error('onLakeClick: Full lake object, dow_number, or id is missing.', fullLakeObject);
            // Pass a minimal object to clear details or show 'unknown', using lowercase from tile props if available
            const tileProps = this.lastClickedTileProps || {}; // Store last clicked props on the class if needed elsewhere
            this.notifyLakeSelected({ name: tileProps.name || 'Unknown Lake', county: tileProps.county || 'Unknown' }, {});
            return;
        }

        // Pan to lake if coordinates are available (using lowercase keys)
        if (fullLakeObject.latitude && fullLakeObject.longitude) { // Assuming these are the correct keys from lakes.json
            this.map.setView([fullLakeObject.latitude, fullLakeObject.longitude], 13);
        } else {
            console.warn(`onLakeClick: Lake data missing latitude or longitude. Cannot pan map.`, fullLakeObject);
        }

        try {
            // Fetch fish details using fullLakeObject.map_id
            const fishDataLakeId = fullLakeObject.map_id;
            console.log(`Fetching fish details with ID: ${fishDataLakeId} (from fullLakeObject.map_id)`);
            const fishData = await dataLoader.loadLakeDetails(fishDataLakeId);
            console.log("Fish details from dataLoader.loadLakeDetails:", fishData);

            // Notify UI with the full lake object (now has lowercase keys) and the fetched fish data
            this.notifyLakeSelected(fullLakeObject, fishData);
        } catch (error) {
             console.error(`Error loading fish details for lake ID ${fullLakeObject.map_id}:`, error);
             this.notifyLakeSelected(fullLakeObject, {}); 
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