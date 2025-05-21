// Data loader for Minnesota Lake Explorer
// Handles loading and processing lake and fish data

class DataLoader {
    constructor() {
        this.lakes = [];
        this.fishCatch = {};
        this.fishLength = {};
        this.fishSpecies = {};
        this.dataLoaded = false;
        this.onDataLoadedCallbacks = [];
    }

    // Load basic lake data
    async loadLakeData() {
        try {
            const response = await fetch('data/lakes.json');
            this.lakes = await response.json();
            console.log(`Loaded ${this.lakes.length} lakes`);

            // ---- START DIAGNOSTIC ----
            if (this.lakes.length > 0) {
                console.log("First 3 lake objects from data/lakes.json:", JSON.stringify(this.lakes.slice(0, 3), null, 2));
                const gullLakeExample = this.lakes.find(lake => String(lake.dow_number) === "11030500");
                console.log("Example Gull Lake (DNR_ID 11030500) found in this.lakes by 'dow_number':", gullLakeExample ? JSON.stringify(gullLakeExample, null, 2) : "NOT FOUND with ID 11030500 using 'dow_number'");
            }
            // ---- END DIAGNOSTIC ----

            return this.lakes;
        } catch (error) {
            console.error('Error loading lake data:', error);
            return [];
        }
    }

    // Load fish species reference data
    async loadFishSpecies() {
        try {
            const response = await fetch('data/fish_species.json');
            this.fishSpecies = await response.json();
            console.log(`Loaded ${Object.keys(this.fishSpecies).length} fish species`);
            return this.fishSpecies;
        } catch (error) {
            console.error('Error loading fish species data:', error);
            return {};
        }
    }

    // Load all data needed for initial map display
    async loadInitialData() {
        await Promise.all([
            this.loadLakeData(),
            this.loadFishSpecies()
        ]);
        
        this.dataLoaded = true;
        this.notifyDataLoaded();
        return {
            lakes: this.lakes,
            fishSpecies: this.fishSpecies
        };
    }

    // Load fish catch data for a specific lake
    async loadLakeFishCatch(lakeId) {
        if (this.fishCatch[lakeId]) {
            return this.fishCatch[lakeId];
        }

        try {
            if (!this.allFishCatch) {
                const response = await fetch('data/fish_catch.json');
                this.allFishCatch = await response.json();
            }
            
            this.fishCatch[lakeId] = this.allFishCatch[lakeId] || {};
            return this.fishCatch[lakeId];
        } catch (error) {
            console.error(`Error loading fish catch data for lake ${lakeId}:`, error);
            return {};
        }
    }

    // Load fish length data for a specific lake
    async loadLakeFishLength(lakeId) {
        if (this.fishLength[lakeId]) {
            return this.fishLength[lakeId];
        }

        try {
            if (!this.allFishLength) {
                const response = await fetch('data/fish_length.json');
                this.allFishLength = await response.json();
            }
            
            this.fishLength[lakeId] = this.allFishLength[lakeId] || {};
            return this.fishLength[lakeId];
        } catch (error) {
            console.error(`Error loading fish length data for lake ${lakeId}:`, error);
            return {};
        }
    }

    // Load all data for a specific lake
    async loadLakeDetails(lakeId) {
        const [fishCatch, fishLength] = await Promise.all([
            this.loadLakeFishCatch(lakeId),
            this.loadLakeFishLength(lakeId)
        ]);

        return {
            fishCatch,
            fishLength
        };
    }

    // Get lake by ID
    getLakeById(lakeId) {
        console.log(`DataLoader.getLakeById: Attempting to find lake with lakeId: '${lakeId}' (type: ${typeof lakeId})`);
        const StringLakeId = String(lakeId); // Ensure we're working with a string version for consistent logging

        const foundLake = this.lakes.find(lake => {
            // Before: use dow_number
            // const lakeDowNumberStr = String(lake.dow_number);
            // const isMatch = lakeDowNumberStr === StringLakeId;

            // After: use map_id
            const lakeMapIdStr = String(lake.map_id);
            const isMatch = lakeMapIdStr === StringLakeId;

            // Log details specifically for Gull Lake's DNR_ID or any problematic ID
            if (StringLakeId === '11030500') {
                // Before
                //console.log(`DataLoader.getLakeById (Gull Lake Check): Comparing lake.dow_number '${lakeDowNumberStr}' (type: ${typeof lakeDowNumberStr}) from lake "${lake.name}" with input lakeId '${StringLakeId}' (type: ${typeof StringLakeId}). Match: ${isMatch}`);
                // After
                console.log(`DataLoader.getLakeById (Gull Lake Check): Comparing lake.map_id '${lakeMapIdStr}' (type: ${typeof lakeMapIdStr}) from lake "${lake.name}" with input lakeId '${StringLakeId}' (type: ${typeof StringLakeId}). Match: ${isMatch}`);
            }
            return isMatch;
        });

        if (StringLakeId === '11030500' && !foundLake) {
            console.error(`DataLoader.getLakeById: Gull Lake (DNR_ID '11030500') NOT FOUND after detailed check.`);
            // Check if Gull Lake exists with a numeric dow_number
            const gullRawNumeric = this.lakes.find(l => l.dow_number === 11030500);
            console.log(`DataLoader.getLakeById: Raw check for Gull Lake with numeric DOW 11030500:`, gullRawNumeric ? gullRawNumeric : "Not found with numeric DOW.");
             const gullRawString = this.lakes.find(l => l.dow_number === "11030500");
            console.log(`DataLoader.getLakeById: Raw check for Gull Lake with string DOW \"11030500\":`, gullRawString ? gullRawString : "Not found with string DOW.");
        } else if (foundLake) {
            // console.log(`DataLoader.getLakeById: Found lake:`, foundLake);
        } else {
            console.log(`DataLoader.getLakeById: Lake with lakeId '${StringLakeId}' not found.`);
        }
        return foundLake;
    }

    // Get fish species by code
    getFishSpecies(speciesCode) {
        return this.fishSpecies[speciesCode] || { 
            name: `Unknown (${speciesCode})`, 
            scientific_name: 'Species data not available' 
        };
    }

    // Register callback for when data is loaded
    onDataLoaded(callback) {
        if (this.dataLoaded) {
            callback();
        } else {
            this.onDataLoadedCallbacks.push(callback);
        }
    }

    // Notify all callbacks that data is loaded
    notifyDataLoaded() {
        this.onDataLoadedCallbacks.forEach(callback => callback());
        this.onDataLoadedCallbacks = [];
    }

    // Search lakes by name or alternative name
    searchLakesByName(query) {
        if (!query || query.trim() === '') return [];
        
        const searchTerm = query.trim().toLowerCase();
        console.log(`Searching for: "${searchTerm}"`);
        
        if (this.lakes.length === 0) {
            console.log('No lakes loaded in the data');
            return [];
        }
        
        // First pass: find exact matches at start of name
        const exactMatches = this.lakes.filter(lake => {
            const name = lake.name?.toLowerCase() || '';
            const altName = lake.alternate_name?.toLowerCase() || '';
            
            return name === searchTerm || 
                   name.startsWith(searchTerm + ' ') ||
                   altName === searchTerm || 
                   altName.startsWith(searchTerm + ' ');
        });
        
        // Second pass: find partial matches if no exact matches found
        const results = exactMatches.length > 0 ? exactMatches : this.lakes.filter(lake => {
            const name = lake.name?.toLowerCase() || '';
            const altName = lake.alternate_name?.toLowerCase() || '';
            
            return name.includes(searchTerm) || 
                   altName.includes(searchTerm);
        });
        
        // Sort results by relevance (exact matches first, then by name length)
        results.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            
            // Exact match comes first
            if (aName === searchTerm) return -1;
            if (bName === searchTerm) return 1;
            
            // Then by name length (shorter names first)
            return aName.length - bName.length;
        });
        
        console.log(`Search for "${query}" returned ${results.length} results`);
        if (results.length > 0) {
            console.log('First 3 results:', results.slice(0, 3).map(r => ({
                name: r.name,
                alternate_name: r.alternate_name,
                county: r.county
            })));
        }
        
        return results;
    }

    // Filter lakes by county
    getLakesByCounty(county) {
        if (!county) return this.lakes;
        return this.lakes.filter(lake => lake.COUNTY_NAME === county);
    }

    // Get all unique counties
    getAllCounties() {
        const counties = new Set();
        this.lakes.forEach(lake => {
            if (lake.county) {
                counties.add(lake.county);
            }
        });
        // ---- START DIAGNOSTIC ----
        const uniqueCountiesArray = Array.from(counties).sort();
        console.log("Unique counties found by getAllCounties:", uniqueCountiesArray);
        // ---- END DIAGNOSTIC ----
        return uniqueCountiesArray;
    }

    // New method to get county bounds by name
    getCountyBounds(countyName) {
        if (!countyName || !this.countyFeatures || this.countyFeatures.size === 0) {
            console.warn('getCountyBounds called with no county name or countyFeatures not loaded.');
            return null;
        }
        // Normalize the input county name to match the keys in countyFeatures (e.g., uppercase)
        const normalizedCountyName = countyName.toUpperCase(); 
        const feature = this.countyFeatures.get(normalizedCountyName);

        if (feature) {
            try {
                // L (Leaflet) is expected to be globally available when this method is called from map.js
                if (typeof L !== 'undefined' && L.geoJSON) {
                    const geoJsonLayer = L.geoJSON(feature); // Create a temporary GeoJSON layer
                    return geoJsonLayer.getBounds();       // Get bounds from this layer
                } else {
                    console.error('Leaflet (L) or L.geoJSON is not available. Cannot calculate county bounds.');
                    return null;
                }
            } catch (e) {
                console.error(`Error calculating bounds for county ${countyName}:`, e);
                return null;
            }
        } else {
            console.warn(`County feature not found for: ${normalizedCountyName} (Input: ${countyName})`);
            return null;
        }
    }
}

// Create and export a singleton instance
const dataLoader = new DataLoader();
export default dataLoader; 