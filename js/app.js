/**
 * Main application controller for Minnesota Lakes Explorer
 * Initializes components and handles UI interactions
 */

(function() {
  // DOM elements
  const mapContainer = document.getElementById('map-container');
  const countySelect = document.getElementById('county-select');
  const areaMinInput = document.getElementById('area-min');
  const areaMaxInput = document.getElementById('area-max');
  const fishSelect = document.getElementById('fish-select');
  const applyFiltersBtn = document.getElementById('apply-filters');
  
  // Current filter state
  const filters = {
    county: 'all',
    minArea: 10,
    maxArea: 100000,
    fishSpecies: 'all'
  };
  
  /**
   * Initialize the application
   */
  async function init() {
    // Initialize data loader
    try {
      const dataLoaded = await DataLoader.init();
      if (!dataLoaded) {
        showError('Error loading lake data. Please try refreshing the page.');
        return;
      }
      
      // Initialize map
      const map = MapManager.init('map-container');
      
      // Populate filter controls
      populateFilters();
      
      // Apply initial filters and load lakes
      applyFilters();
      
      // Set up event listeners
      setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing application:', error);
      showError('Error initializing application. Please try refreshing the page.');
    }
  }
  
  /**
   * Populate filter controls with options from data
   */
  function populateFilters() {
    // Populate county select
    DataLoader.counties.forEach(county => {
      const option = document.createElement('option');
      option.value = county;
      option.textContent = county;
      countySelect.appendChild(option);
    });
    
    // Set min/max area values from data
    areaMinInput.value = 10; // Default min
    areaMinInput.min = 0;
    
    areaMaxInput.value = DataLoader.maxArea || 100000;
    areaMaxInput.min = 10;
    
    // Populate fish species when available
    if (DataLoader.fishSpecies && DataLoader.fishSpecies.length > 0) {
      DataLoader.fishSpecies.forEach(species => {
        const option = document.createElement('option');
        option.value = species;
        option.textContent = species;
        fishSelect.appendChild(option);
      });
    } else {
      // Disable fish species filter if no data
      fishSelect.disabled = true;
      fishSelect.parentElement.classList.add('disabled');
    }
  }
  
  /**
   * Set up event listeners for UI controls
   */
  function setupEventListeners() {
    // Apply filters button
    applyFiltersBtn.addEventListener('click', applyFilters);
    
    // County select change
    countySelect.addEventListener('change', () => {
      filters.county = countySelect.value;
    });
    
    // Area inputs
    areaMinInput.addEventListener('change', () => {
      filters.minArea = parseFloat(areaMinInput.value) || 0;
    });
    
    areaMaxInput.addEventListener('change', () => {
      filters.maxArea = parseFloat(areaMaxInput.value) || 100000;
    });
    
    // Fish species select
    fishSelect.addEventListener('change', () => {
      filters.fishSpecies = fishSelect.value;
    });
  }
  
  /**
   * Apply filters and update the map
   */
  function applyFilters() {
    // Update filters from form inputs
    filters.county = countySelect.value;
    filters.minArea = parseFloat(areaMinInput.value) || 0;
    filters.maxArea = parseFloat(areaMaxInput.value) || 100000;
    filters.fishSpecies = fishSelect.value;
    
    // Get filtered lakes
    const filteredLakes = DataLoader.filterLakes(filters);
    
    // Update map with filtered lakes
    MapManager.addLakeMarkers(filteredLakes);
    
    // Update lake count display
    updateLakeCount(filteredLakes.length);
  }
  
  /**
   * Update the lake count display
   * @param {number} count - Number of lakes
   */
  function updateLakeCount(count) {
    const countElement = document.createElement('div');
    countElement.className = 'lake-count';
    countElement.textContent = `Showing ${count} lakes`;
    
    // Replace existing count element if it exists
    const existingCount = document.querySelector('.lake-count');
    if (existingCount) {
      existingCount.remove();
    }
    
    // Add before the first filter group
    const filtersContainer = document.querySelector('.filters');
    const firstFilterGroup = document.querySelector('.filter-group');
    if (filtersContainer && firstFilterGroup) {
      filtersContainer.insertBefore(countElement, firstFilterGroup);
    }
  }
  
  /**
   * Show an error message to the user
   * @param {string} message - Error message to display
   */
  function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    // Add to the map container
    if (mapContainer) {
      mapContainer.innerHTML = '';
      mapContainer.appendChild(errorElement);
    } else {
      // Fallback to body if map container not found
      document.body.appendChild(errorElement);
    }
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
})(); 