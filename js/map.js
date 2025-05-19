// Map handling for Minnesota Lake Explorer
// Uses Leaflet.js to display lake locations and data

import dataLoader from './data-loader.js';

class LakeMap {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.vectorLayer = null; // For L.vectorGrid
        this.selectedLakeDnrId = null; // To track ID for styling
        this.onLakeSelectedCallbacks = [];
    }

    // Initialize the map
    async initialize() {
        this.map = L.map(this.mapElementId).setView([46.5, -94.5], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        await dataLoader.loadInitialData(); // Still needed for detailed data and potentially county lists
        
        // --- Load Vector Tiles ---
        // The layer name inside mbtiles is 'lakes'
        // tileserver-gl-light serves mbtiles files under /data/<filename_without_extension>/
        const tileUrl = 'http://localhost:8080/data/lake_tiles/{z}/{x}/{y}.pbf'; 

        const vectorTileOptions = {
            vectorTileLayerStyles: {
                lakes: (properties, zoom) => {
                    return {
                        fillColor: (properties.DNR_ID === this.selectedLakeDnrId) ? '#ff4500' : '#0077be',
                        fillOpacity: 0.7,
                        stroke: true,
                        color: (properties.DNR_ID === this.selectedLakeDnrId) ? '#cc3700' : '#005a8f',
                        weight: (properties.DNR_ID === this.selectedLakeDnrId) ? 2 : 1,
                        fill: true
                    };
                }
            },
            interactive: true,
            getFeatureId: function(f) {
                return f.properties.DNR_ID;
            }
        };

        this.vectorLayer = L.vectorGrid.protobuf(tileUrl, vectorTileOptions).addTo(this.map);

        this.vectorLayer.on('click', async (e) => {
            L.DomEvent.stop(e); // Stop propagation to map click
            const props = e.layer.properties;
            if (props && props.DNR_ID) {
                // The onLakeClick will eventually call highlightSelectedLake
                const lakeMasterData = dataLoader.getLakeById(props.DNR_ID) || 
                                     { id: props.DNR_ID, name: props.name, county: props.county }; 
                await this.onLakeClick(lakeMasterData);
            } else {
                console.warn('Clicked lake vector tile without DNR_ID:', props);
            }
        });
        
        // Handle map clicks for clearing selection (if no feature is clicked)
        this.map.on('click', () => {
            if (this.selectedLakeDnrId) {
                this.highlightSelectedLake(null); // Clear selection
                // Optionally, notify UI to close details panel if that's desired behavior
                // this.notifyLakeSelected(null, {}); // If you want to clear panel
            }
        });

        console.log("Vector tile layer initialized.");
        return this.map;
    }

    // Handle lake click
    async onLakeClick(lakeDataFromFeature) {
        this.highlightSelectedLake(lakeDataFromFeature.id); 
        // selectedLake (basic info) is now primarily managed by dataLoader, 
        // but onLakeClick receives it (or a subset from tile props)
        // this.selectedLake = lakeDataFromFeature; // This was used for non-tile version

        try {
            const lakeDetails = await dataLoader.loadLakeDetails(lakeDataFromFeature.id);
            this.notifyLakeSelected({ ...lakeDataFromFeature, ...lakeDetails.basicInfo }, lakeDetails.surveyData);
        } catch (error) {
             console.error(`Error loading details for lake ID ${lakeDataFromFeature.id}:`, error);
             this.notifyLakeSelected(lakeDataFromFeature, {}); // Fallback with basic data
        }
    }

    // Highlight the selected lake
    highlightSelectedLake(dnrId) {
        if (!this.vectorLayer) return;

        const previousSelectedId = this.selectedLakeDnrId;
        this.selectedLakeDnrId = dnrId;

        // Reset previous feature style if it exists and is different from current
        if (previousSelectedId && previousSelectedId !== dnrId) {
            try {
                 // Check if the feature is still available/rendered by the vector grid
                if (this.vectorLayer.getFeature(previousSelectedId)) { 
                    this.vectorLayer.resetFeatureStyle(previousSelectedId);
                }
            } catch (err) {
                console.warn(`Could not reset style for feature ${previousSelectedId}:`, err);
            }
        }

        // Set new feature style if a dnrId is provided
        if (dnrId) {
            try {
                if (this.vectorLayer.getFeature(dnrId)) { 
                    this.vectorLayer.setFeatureStyle(dnrId, {
                        fillColor: '#ff4500',
                        fillOpacity: 0.8,
                        stroke: true,
                        color: '#cc3700',
                        weight: 2
                    });
                } else {
                    // Feature might not be in the current view / zoom, or ID mismatch
                    // console.log(`Feature ${dnrId} not found in vectorLayer to highlight.`);
                }
            } catch (err) { 
                 console.warn(`Could not set style for feature ${dnrId}:`, err);
            }
        }
        // To make style changes visible if styling function depends on this.selectedLakeDnrId
        // Trigger a redraw of all visible tiles for the layer (if needed, depends on styling function approach)
        // For some L.VectorGrid versions/setups, you might need to explicitly update the layer
        // if the style function relies on an external variable like `this.selectedLakeDnrId`.
        // A common way is to call `redraw` on the layer.
        if (this.vectorLayer && typeof this.vectorLayer.redraw === 'function') {
            this.vectorLayer.redraw();
        }
    }

    // Register callback for lake selection
    onLakeSelected(callback) {
        this.onLakeSelectedCallbacks.push(callback);
    }

    // Notify all callbacks that a lake was selected
    notifyLakeSelected(lakeBasicInfo, lakeSurveyData) {
        this.onLakeSelectedCallbacks.forEach(callback => callback(lakeBasicInfo, lakeSurveyData));
    }
    
    // Filter lakes by county
    filterByCounty(county) {
        console.log(`Filter by county requested: ${county}. Map display not filtered, but data can be listed.`);
        // 1. Clear current map selection/highlight
        this.highlightSelectedLake(null);
        // 2. Get lakes for this county from dataLoader (metadata)
        const lakesInCounty = dataLoader.getLakesByCounty(county);
        console.log(`Found ${lakesInCounty.length} lakes in ${county || 'all counties'} (from metadata).`);
        // 3. Optionally, fly to the bounds of the county if available, or fit to first few lakes.
        //    This requires county boundary data or deriving bounds from lake coordinates.
        // For now, we just log. Visual map filtering of tiles is complex.
        // If you want to list them in the UI, you can adapt displayLakeDetails or a new function.
        
        // Example: If you want to zoom to the first lake in the county (if county is selected)
        if (county && lakesInCounty.length > 0) {
            const firstLake = dataLoader.getLakeById(lakesInCounty[0].id); // Get full metadata if needed
            if (firstLake && firstLake.center_lat && firstLake.center_lon) { // Assuming you add centroids to lakes.json
                 this.map.setView([firstLake.center_lat, firstLake.center_lon], 12); // Zoom to a lake
            }
        } else if (!county) {
            this.map.setView([46.5, -94.5], 7); // Reset view
        }
    }

    // Search for lakes by name
    searchByName(query) {
        console.log(`Search by name: ${query}. Map display not filtered directly, relies on selection.`);
        this.highlightSelectedLake(null);
        const results = dataLoader.searchLakesByName(query);
        
        if (results.length > 0) {
            // Select the first result for demonstration
            const firstResult = results[0];
            this.onLakeClick(firstResult); // This will highlight and fetch details

            // Pan to the lake if coordinates are available (requires centroids in lakes.json)
            if (firstResult && firstResult.center_lat && firstResult.center_lon) {
                this.map.setView([firstResult.center_lat, firstResult.center_lon], 13); 
            }
        }
        return results.map(f => f); // Return properties, similar to original but from dataLoader
    }
}

// Create and export a singleton instance
const lakeMapInstance = new LakeMap('map'); // Ensure 'map' is your map div ID
export default lakeMapInstance; 