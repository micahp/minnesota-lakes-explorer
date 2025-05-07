/**
 * Data loader for Minnesota Lakes Explorer
 * Handles loading and parsing the CSV data files
 */

const DataLoader = {
  // Store all the lake data
  lakes: [],
  fishCatch: {},
  fishLength: {},
  sentinelLakes: [],
  borderLakes: [],
  
  // Store filter options derived from data
  counties: new Set(),
  fishSpecies: new Set(),
  
  // Min/max values for lake area
  minArea: 0,
  maxArea: 0,
  
  /**
   * Initialize the data loader and load all data files
   * @returns {Promise} Promise that resolves when all data is loaded
   */
  init: async function() {
    try {
      // Load and process the consolidated lake data
      await this.loadLakeData();
      
      // Display count of loaded lakes
      console.log(`Loaded ${this.lakes.length} lakes`);
      
      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      return false;
    }
  },
  
  /**
   * Load the consolidated lake data CSV
   */
  loadLakeData: async function() {
    return new Promise((resolve, reject) => {
      Papa.parse('consolidated_lake_data.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('Errors parsing lake data:', results.errors);
            reject(results.errors);
            return;
          }
          
          // Filter out lakes without lat/lon or with invalid coordinates
          this.lakes = results.data.filter(lake => {
            return lake.LAKE_CENTER_LAT_DD5 && 
                   lake.LAKE_CENTER_LONG_DD5 &&
                   lake.LAKE_AREA_DOW_ACRES >= 10;
          });
          
          // Extract counties and other filter options
          this.lakes.forEach(lake => {
            if (lake.COUNTY_NAME) {
              this.counties.add(lake.COUNTY_NAME);
            }
            
            // Mark sentinel and border lakes
            if (lake.SENTINEL_LAKE === 'Yes') {
              this.sentinelLakes.push(lake.DOW);
            }
            
            if (lake.BORDER_WATER === 'Yes') {
              this.borderLakes.push(lake.DOW);
            }
          });
          
          // Sort counties alphabetically
          this.counties = Array.from(this.counties).sort();
          
          // Calculate min/max area
          this.minArea = Math.min(...this.lakes.map(lake => lake.LAKE_AREA_DOW_ACRES));
          this.maxArea = Math.max(...this.lakes.map(lake => lake.LAKE_AREA_DOW_ACRES));
          
          resolve();
        },
        error: (error) => {
          console.error('Error loading lake data:', error);
          reject(error);
        }
      });
    });
  },
  
  /**
   * Filter lakes based on the provided criteria
   * @param {Object} filters - Filter criteria (county, area range, fish species)
   * @returns {Array} Filtered lakes array
   */
  filterLakes: function(filters) {
    return this.lakes.filter(lake => {
      // County filter
      if (filters.county && filters.county !== 'all' && lake.COUNTY_NAME !== filters.county) {
        return false;
      }
      
      // Area filter
      if (lake.LAKE_AREA_DOW_ACRES < filters.minArea || lake.LAKE_AREA_DOW_ACRES > filters.maxArea) {
        return false;
      }
      
      // Fish species filter - will be implemented when we load species data
      
      return true;
    });
  },
  
  /**
   * Get lake details by DOW ID
   * @param {string} dowId - The DOW ID of the lake
   * @returns {Object|null} Lake object or null if not found
   */
  getLakeById: function(dowId) {
    return this.lakes.find(lake => lake.DOW === dowId) || null;
  },
  
  /**
   * Format lake data for display in UI
   * @param {Object} lake - Lake object
   * @returns {Object} Formatted lake info
   */
  formatLakeInfo: function(lake) {
    return {
      name: lake.LAKE_NAME || 'Unknown',
      id: lake.DOW || 'Unknown',
      county: lake.COUNTY_NAME || 'Unknown',
      nearestTown: lake.NEAREST_TOWN || '',
      area: lake.LAKE_AREA_DOW_ACRES ? `${lake.LAKE_AREA_DOW_ACRES.toFixed(1)} acres` : 'Unknown',
      shoreline: lake.SHORELINE_LENGTH_MILES ? `${lake.SHORELINE_LENGTH_MILES.toFixed(1)} miles` : 'Unknown',
      maxDepth: lake.MAX_DEPTH_FEET ? `${lake.MAX_DEPTH_FEET.toFixed(1)} ft` : 'Unknown',
      meanDepth: lake.MEAN_DEPTH_FEET ? `${lake.MEAN_DEPTH_FEET.toFixed(1)} ft` : 'Unknown',
      isSentinel: this.sentinelLakes.includes(lake.DOW),
      isBorder: this.borderLakes.includes(lake.DOW),
      latitude: lake.LAKE_CENTER_LAT_DD5,
      longitude: lake.LAKE_CENTER_LONG_DD5
    };
  }
};

// Export the module
window.DataLoader = DataLoader; 