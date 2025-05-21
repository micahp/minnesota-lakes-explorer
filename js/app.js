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
        item.textContent = `${lake.LAKE_NAME} (${lake.COUNTY_NAME || 'N/A'})`;
        item.dataset.lakeId = lake.FISHERIES_WATERBODY_ID; // Store ID for potential use

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
        // ---- START DIAGNOSTIC ----
        console.log("Counties received by initializeCountyFilter:", counties);
        // ---- END DIAGNOSTIC ----
        
        if (counties && counties.length > 0) {
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
        } // Closes: if (counties && counties.length > 0)
    }); // Closes: dataLoader.onDataLoaded(() => {
}

// Display lake details in the side panel
function displayLakeDetails(lake, lakeDetails) {
    console.log("app.js: displayLakeDetails called with lake:", lake, "and lakeDetails:", lakeDetails);
    const detailsDiv = document.getElementById('lake-details');
    detailsDiv.innerHTML = ''; // Clear previous details

    if (!lake) {
        detailsDiv.innerHTML = '<p>Lake data not available.</p>';
        return;
    }

    // Helper to display a property if it exists
    const displayProperty = (label, value, unit = '') => {
        if (value !== null && typeof value !== 'undefined' && value !== '') {
            return `<p><strong>${label}:</strong> ${value}${unit ? ' ' + unit : ''}</p>`;
        }
        return `<p><strong>${label}:</strong> N/A</p>`;
    };

    let content = `<h3>${lake.name || 'Unknown Lake'}</h3>`;
    content += displayProperty('County', lake.county);
    content += displayProperty('Area', lake.area_acres, 'acres');
    content += displayProperty('Max Depth', lake.max_depth_ft, 'ft');
    content += displayProperty('Mean Depth', lake.mean_depth_ft, 'ft');
    content += displayProperty('Shore Length', lake.shore_length_mi, 'miles');

    // Fish data (expects UPPERCASE from lakeDetails)
    if (lakeDetails && Object.keys(lakeDetails).length > 0 && (lakeDetails.catches || lakeDetails.lengths)) {
        content += '<h4>Fish Information:</h4>';

        const allSpecies = new Set();
        if (lakeDetails.catches) {
            lakeDetails.catches.forEach(c => allSpecies.add(c.COMMON_NAME || c.SPECIES));
        }
        if (lakeDetails.lengths) {
            lakeDetails.lengths.forEach(l => allSpecies.add(l.COMMON_NAME || l.SPECIES));
        }
        
        allSpecies.delete(undefined); // Remove undefined if any
        allSpecies.delete(null); // Remove null if any


        if (allSpecies.size > 0) {
            allSpecies.forEach(speciesName => {
                if (!speciesName) return; // Should be caught by delete, but as safeguard

                content += `<h5>${speciesName}</h5>`;

                // Display Catch Data for this species
                const speciesCatches = lakeDetails.catches ? lakeDetails.catches.filter(c => (c.COMMON_NAME || c.SPECIES) === speciesName) : [];
                if (speciesCatches.length > 0) {
                    content += '<h6>Catch Data:</h6><ul>';
                    speciesCatches.forEach(c => {
                        const surveyDate = c.SURVEY_DATE ? new Date(c.SURVEY_DATE).toLocaleDateString() : 'N/A';
                        content += `<li>CPUE: ${c.CPUE || 'N/A'} (Survey: ${surveyDate})</li>`;
                    });
                    content += '</ul>';
                } else {
                    content += '<p>No specific catch data for this species.</p>';
                }

                // Display Length Distribution for this species
                const speciesLengths = lakeDetails.lengths ? lakeDetails.lengths.filter(l => (l.COMMON_NAME || l.SPECIES) === speciesName) : [];
                if (speciesLengths.length > 0) {
                    content += '<h6>Length Distribution:</h6>';
                    speciesLengths.forEach(l => {
                        content += `<p>Survey Year: ${l.SURVEY_YEAR || 'N/A'}</p>`;
                        if (l.LENGTH_DISTRIBUTION) {
                            // Attempt to parse simple "key:value,key:value" strings
                            content += '<ul>';
                            try {
                                const distributions = String(l.LENGTH_DISTRIBUTION).split(',');
                                if (distributions.length > 0 && distributions[0].includes(':')) {
                                    distributions.forEach(dist => {
                                        const parts = dist.split(':');
                                        if (parts.length === 2) {
                                            content += `<li>${parts[0].trim()}: ${parts[1].trim()}</li>`;
                                        } else {
                                            content += `<li>${dist}</li>`; // Fallback for non-standard parts
                                        }
                                    });
                                } else { // If not comma separated key:value, or only one item without colon
                                   content += `<li>${l.LENGTH_DISTRIBUTION}</li>`; // Display raw
                                }
                            } catch (e) {
                                console.warn("Could not parse LENGTH_DISTRIBUTION string:", l.LENGTH_DISTRIBUTION, e);
                                content += `<li>${l.LENGTH_DISTRIBUTION}</li>`; // Fallback to raw display
                            }
                            content += '</ul>';
                        } else {
                            content += '<p>No length distribution data.</p>';
                        }
                    });
                } // No specific message if length data is missing for a species with catch data
                 content += '<hr>'; // Separator between species
            });
        } else {
            content += '<p>No fish species data found.</p>';
        }

    } else {
        content += '<p>No detailed fish survey data available for this lake.</p>';
    }

    detailsDiv.innerHTML = content;
}


// Export app functions for potential use in other modules
export { initApp, displayLakeDetails }; 