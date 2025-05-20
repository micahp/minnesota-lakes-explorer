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
        return this.lakes.find(lake => lake.DNR_ID === lakeId);
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

    // Search lakes by name
    searchLakesByName(query) {
        if (!query) return [];
        
        const lowerQuery = query.toLowerCase();
        return this.lakes.filter(lake => 
            lake.name.toLowerCase().includes(lowerQuery) || 
            (lake.alternate_name && lake.alternate_name.toLowerCase().includes(lowerQuery))
        );
    }

    // Filter lakes by county
    getLakesByCounty(county) {
        if (!county) return this.lakes;
        return this.lakes.filter(lake => lake.county === county);
    }

    // Get all unique counties
    getAllCounties() {
        const counties = new Set();
        this.lakes.forEach(lake => {
            if (lake.county) {
                counties.add(lake.county);
            }
        });
        return Array.from(counties).sort();
    }
}

// Create and export a singleton instance
const dataLoader = new DataLoader();
export default dataLoader; 