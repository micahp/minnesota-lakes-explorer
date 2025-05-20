// Main application logic for Minnesota Lake Explorer
import lakeMapInstance from './map.js';
import dataLoader from './data-loader.js';

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Initialize the application
async function initApp() {
    // Use the imported singleton instance directly
    await lakeMapInstance.initialize();
    
    // Set up UI event handlers
    setupUIHandlers(lakeMapInstance);
    
    // Set up lake selection handler
    lakeMapInstance.onLakeSelected((lake, lakeDetails) => {
        displayLakeDetails(lake, lakeDetails);
    });
    
    // Initialize county filter dropdown
    initializeCountyFilter(lakeMapInstance);
}

// Set up UI event handlers
function setupUIHandlers(lakeMap) {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsCountEl = document.getElementById('results-count');
    const searchResultsListEl = document.getElementById('search-results-list');

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        const results = lakeMap.searchByName(query); 
        
        if (resultsCountEl) {
            if (query) {
                resultsCountEl.textContent = `Found ${results.length} lakes matching "${query}"`;
                resultsCountEl.style.display = 'block';
            } else {
                resultsCountEl.style.display = 'none';
            }
        }
        // Add border when search is performed
        searchResultsListEl.classList.add('search-results-border');
        displaySearchResultsList(results, lakeMap, searchResultsListEl);
    });

    const clearSearchBtn = document.getElementById('clear-search');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            if (resultsCountEl) resultsCountEl.style.display = 'none';
            if (searchResultsListEl) {
                searchResultsListEl.innerHTML = ''; // Clear results list
                searchResultsListEl.classList.remove('search-results-border'); // Remove border
            }
            
            const detailsPanel = document.getElementById('lake-details');
            if (detailsPanel) detailsPanel.classList.remove('active');
        });
    }
    
    const closeDetailsBtn = document.getElementById('close-details');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            const detailsPanel = document.getElementById('lake-details');
            detailsPanel.classList.remove('active');
        });
    }
}

// New function to display search results in a list
function displaySearchResultsList(results, lakeMap, listElement) {
    listElement.innerHTML = ''; // Clear previous results
    const resultsCountEl = document.getElementById('results-count'); // Get once for potential use

    if (!results || results.length === 0) {
        listElement.innerHTML = '<div class=\"search-result-item\">No lakes found.</div>';
        // Border is added by the submit handler, so it will be present here as desired.
        return;
    }

    // 1. Build and append all list items and attach their event listeners
    results.forEach((lake) => {
        const item = document.createElement('div');
        item.classList.add('search-result-item');
        item.textContent = `${lake.name} (${lake.county || 'N/A'})`;
        item.dataset.lakeId = lake.DNR_ID; // Store ID for potential use

        item.addEventListener('click', () => {
            // This handler is for ACTUAL user clicks on any item.
            lakeMap.onLakeClick(lake); // Pan/zoom and show details for the clicked lake

            // Visually update active state in the list
            listElement.querySelectorAll('.search-result-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // If there were originally multiple results, hide the list and count now.
            if (results.length > 1) {
                listElement.innerHTML = ''; // Clear the list
                if (resultsCountEl) {
                    resultsCountEl.style.display = 'none'; // Hide the count message
                }
                listElement.classList.remove('search-results-border'); // Remove border when list is cleared
            }
        });
        listElement.appendChild(item);
    });

    // 2. After all items are in the DOM, if there are results, 
    //    automatically select the first one functionally and visually.
    //    This does NOT clear the list.
    if (results.length > 0) {
        const firstLakeData = results[0];
        lakeMap.onLakeClick(firstLakeData); // Show details for the first lake

        // Visually highlight the first item in the list
        if (listElement.firstChild && listElement.firstChild.classList) { // Ensure firstChild is an element
            // Clear any previous active states from other items first, then set the new one.
            listElement.querySelectorAll('.search-result-item').forEach(el => el.classList.remove('active'));
            listElement.firstChild.classList.add('active');
        }
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
    lakeName.textContent = lake.name || 'Unknown Lake';
    
    // Build lake info HTML
    let infoHTML = `
        <div class="info-section">
            <h3>Lake Information</h3>
            <table class="info-table">
                <tr>
                    <th>County:</th>
                    <td>${lake.county || 'Unknown'}</td>
                </tr>
    `;
    
    if (lake.area_acres) {
        infoHTML += `
                <tr>
                    <th>Area:</th>
                    <td>${Number(lake.area_acres).toLocaleString()} acres</td>
                </tr>
        `;
    }
    
    if (lake.max_depth_ft) {
        infoHTML += `
                <tr>
                    <th>Max Depth:</th>
                    <td>${Number(lake.max_depth_ft).toLocaleString()} feet</td>
                </tr>
        `;
    }
    
    if (lake.mean_depth_ft) {
        infoHTML += `
                <tr>
                    <th>Mean Depth:</th>
                    <td>${Number(lake.mean_depth_ft).toLocaleString()} feet</td>
                </tr>
        `;
    }
    
    if (lake.shore_length_mi) {
        infoHTML += `
                <tr>
                    <th>Shoreline:</th>
                    <td>${Number(lake.shore_length_mi).toLocaleString()} miles</td>
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
    const { fishCatch = {}, fishLength = {} } = lakeDetails || {};
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
            const speciesInfo = dataLoader.getFishSpecies(speciesCode) || { name: 'Unknown Species', scientific_name: 'Unknown' };
            const catchData = fishCatch[speciesCode] || [];
            
            // Calculate average CPUE (Catch Per Unit Effort)
            let totalCPUE = 0;
            let countCPUE = 0;
            
            catchData.forEach(catch_entry => {
                if (catch_entry && catch_entry.cpue) {
                    totalCPUE += catch_entry.cpue;
                    countCPUE++;
                }
            });
            
            const avgCPUE = countCPUE > 0 ? (totalCPUE / countCPUE).toFixed(2) : 'N/A';
            
            // Get the most recent survey date
            const surveyDates = catchData
                .filter(entry => entry && entry.survey_date)
                .map(entry => entry.survey_date);
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