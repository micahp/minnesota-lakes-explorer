// Main application logic for Minnesota Lake Explorer
import LakeMap from './map.js';
import dataLoader from './data-loader.js';

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Initialize the application
async function initApp() {
    // Create map instance
    const lakeMap = new LakeMap('map');
    await lakeMap.initialize();
    
    // Set up UI event handlers
    setupUIHandlers(lakeMap);
    
    // Set up lake selection handler
    lakeMap.onLakeSelected((lake, lakeDetails) => {
        displayLakeDetails(lake, lakeDetails);
    });
    
    // Initialize county filter dropdown
    initializeCountyFilter(lakeMap);
}

// Set up UI event handlers
function setupUIHandlers(lakeMap) {
    // Search form
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        const results = lakeMap.searchByName(query);
        
        // Display search results count
        const resultsCount = document.getElementById('results-count');
        if (query && resultsCount) {
            resultsCount.textContent = `Found ${results.length} lakes matching "${query}"`;
            resultsCount.style.display = 'block';
        } else if (resultsCount) {
            resultsCount.style.display = 'none';
        }
    });
    
    // Clear search button
    const clearSearchBtn = document.getElementById('clear-search');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            lakeMap.addLakeMarkers();
            
            // Hide results count
            const resultsCount = document.getElementById('results-count');
            if (resultsCount) {
                resultsCount.style.display = 'none';
            }
        });
    }
    
    // Close details panel button
    const closeDetailsBtn = document.getElementById('close-details');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            const detailsPanel = document.getElementById('lake-details');
            detailsPanel.classList.remove('active');
        });
    }
}

// Initialize county filter dropdown
function initializeCountyFilter(lakeMap) {
    const countySelect = document.getElementById('county-filter');
    
    // Wait for data to be loaded
    dataLoader.onDataLoaded(() => {
        // Get all counties
        const counties = dataLoader.getAllCounties();
        
        // Add counties to dropdown
        countySelect.innerHTML = '<option value="">All Counties</option>';
        counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            countySelect.appendChild(option);
        });
        
        // Handle county selection
        countySelect.addEventListener('change', () => {
            const selectedCounty = countySelect.value;
            lakeMap.filterByCounty(selectedCounty);
        });
    });
}

// Display lake details in the side panel
function displayLakeDetails(lake, lakeDetails) {
    const detailsPanel = document.getElementById('lake-details');
    const lakeName = document.getElementById('lake-name');
    const lakeInfo = document.getElementById('lake-info');
    const fishInfo = document.getElementById('fish-info');
    
    // Set lake name
    lakeName.textContent = lake.name;
    
    // Build lake info HTML
    let infoHTML = `
        <div class="info-section">
            <h3>Lake Information</h3>
            <table class="info-table">
                <tr>
                    <th>County:</th>
                    <td>${lake.county}</td>
                </tr>
                <tr>
                    <th>Area:</th>
                    <td>${lake.area_acres.toLocaleString()} acres</td>
                </tr>
    `;
    
    if (lake.max_depth_ft) {
        infoHTML += `
                <tr>
                    <th>Max Depth:</th>
                    <td>${lake.max_depth_ft} feet</td>
                </tr>
        `;
    }
    
    if (lake.mean_depth_ft) {
        infoHTML += `
                <tr>
                    <th>Mean Depth:</th>
                    <td>${lake.mean_depth_ft} feet</td>
                </tr>
        `;
    }
    
    if (lake.shore_length_mi) {
        infoHTML += `
                <tr>
                    <th>Shoreline:</th>
                    <td>${lake.shore_length_mi} miles</td>
                </tr>
        `;
    }
    
    if (lake.dow_number) {
        infoHTML += `
                <tr>
                    <th>DOW Number:</th>
                    <td>${lake.dow_number}</td>
                </tr>
        `;
    }
    
    if (lake.alternate_name) {
        infoHTML += `
                <tr>
                    <th>Also Known As:</th>
                    <td>${lake.alternate_name}</td>
                </tr>
        `;
    }
    
    infoHTML += `
            </table>
        </div>
    `;
    
    lakeInfo.innerHTML = infoHTML;
    
    // Build fish info HTML
    const { fishCatch, fishLength } = lakeDetails;
    let fishHTML = '';
    
    // Check if we have fish data
    const hasFishData = Object.keys(fishCatch).length > 0;
    
    if (hasFishData) {
        fishHTML = `
            <div class="info-section">
                <h3>Fish Species</h3>
                <div class="fish-list">
        `;
        
        // Create a list of all fish species in this lake
        const fishSpecies = Object.keys(fishCatch);
        
        fishSpecies.forEach(speciesCode => {
            const speciesInfo = dataLoader.getFishSpecies(speciesCode);
            const catchData = fishCatch[speciesCode];
            
            // Calculate average CPUE (Catch Per Unit Effort)
            let totalCPUE = 0;
            let countCPUE = 0;
            
            catchData.forEach(catch_entry => {
                if (catch_entry.cpue) {
                    totalCPUE += catch_entry.cpue;
                    countCPUE++;
                }
            });
            
            const avgCPUE = countCPUE > 0 ? (totalCPUE / countCPUE).toFixed(2) : 'N/A';
            
            // Get the most recent survey date
            const surveyDates = catchData.map(entry => entry.survey_date).filter(Boolean);
            const mostRecentSurvey = surveyDates.length > 0 ? 
                new Date(Math.max(...surveyDates.map(date => new Date(date)))).toLocaleDateString() : 
                'N/A';
            
            fishHTML += `
                <div class="fish-card">
                    <h4>${speciesInfo.name}</h4>
                    <p class="scientific-name">${speciesInfo.scientific_name}</p>
                    <div class="fish-stats">
                        <div class="stat">
                            <span class="stat-label">Avg. Catch Rate:</span>
                            <span class="stat-value">${avgCPUE}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Last Survey:</span>
                            <span class="stat-value">${mostRecentSurvey}</span>
                        </div>
                    </div>
            `;
            
            // Add length distribution if available
            if (fishLength[speciesCode] && fishLength[speciesCode].length > 0) {
                const lengthData = fishLength[speciesCode][0].length_distribution;
                
                if (lengthData && Object.keys(lengthData).length > 0) {
                    fishHTML += `
                        <div class="length-distribution">
                            <h5>Length Distribution</h5>
                            <div class="length-chart">
                    `;
                    
                    // Simple bar chart for length distribution
                    const lengthRanges = Object.keys(lengthData).sort();
                    const maxCount = Math.max(...Object.values(lengthData));
                    
                    lengthRanges.forEach(range => {
                        const count = lengthData[range];
                        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        
                        fishHTML += `
                            <div class="length-bar-container" title="${range} inches: ${count} fish">
                                <div class="length-label">${range}"</div>
                                <div class="length-bar" style="width: ${percentage}%"></div>
                                <div class="length-count">${count}</div>
                            </div>
                        `;
                    });
                    
                    fishHTML += `
                            </div>
                        </div>
                    `;
                }
            }
            
            fishHTML += `
                </div>
            `;
        });
        
        fishHTML += `
                </div>
            </div>
        `;
    } else {
        fishHTML = `
            <div class="info-section">
                <h3>Fish Species</h3>
                <p>No fish survey data available for this lake.</p>
            </div>
        `;
    }
    
    fishInfo.innerHTML = fishHTML;
    
    // Show details panel
    detailsPanel.classList.add('active');
}

// Export app functions for potential use in other modules
export { initApp, displayLakeDetails }; 