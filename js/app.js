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

        // Clear previous search list and border at the start of every new search submission
        searchResultsListEl.innerHTML = '';
        searchResultsListEl.classList.remove('search-results-border');

        if (!query) { // If query is empty (e.g., user submitted an empty search)
            if (resultsCountEl) resultsCountEl.style.display = 'none';
            // Optionally clear details panel if the query is empty
            // const detailsPanel = document.getElementById('lake-details');
            // if (detailsPanel) detailsPanel.classList.remove('active');
            return; // Nothing more to do for an empty query
        }

        // Display the count of results found
        if (resultsCountEl) {
            resultsCountEl.textContent = `Found ${results.length} lakes matching "${query}"`;
            resultsCountEl.style.display = 'block';
        }

        if (results.length === 0) {
            // "Found 0 lakes..." message is displayed by resultsCountEl.
            // searchResultsListEl remains empty and without border. No explicit "No lakes found" div.
            // Optionally, ensure details panel is not active if no results
            // const detailsPanel = document.getElementById('lake-details');
            // if (detailsPanel) detailsPanel.classList.remove('active');
        } else if (results.length === 1) {
            lakeMap.onLakeClick(results[0]); // Show details for the single lake

            // Reset search bar component after resolving the single lake
            searchInput.value = ''; // Clear the input field
            if (resultsCountEl) resultsCountEl.style.display = 'none'; // Hide "Found 1 lake..."
            // searchResultsListEl is already empty and border removed from the start of submit handler
        } else { // results.length > 1
            searchResultsListEl.classList.add('search-results-border'); // Add border for the list
            displaySearchResultsList(results, lakeMap, searchResultsListEl, searchInput, resultsCountEl);
        }
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

// Updated function to display search results (only called when results.length > 1)
function displaySearchResultsList(results, lakeMap, listElement, searchInput, resultsCountEl) {
    // listElement.innerHTML is cleared by the caller (submit handler) before this function is called.

    results.forEach((lake, index) => {
        const item = document.createElement('div');
        item.classList.add('search-result-item');
        item.textContent = `${lake.name || 'Unnamed Lake'} (${lake.county || 'N/A'})`;
        item.dataset.lakeId = lake.dow_number || lake.id;

        item.addEventListener('click', () => {
            // This is a MANUAL click by the user on an item from the list of multiple results.
            lakeMap.onLakeClick(lake); // Pan/zoom and show details for the clicked lake

            // Clear the search input, hide the count message, and clear the list + border.
            if (searchInput) searchInput.value = '';
            if (resultsCountEl) resultsCountEl.style.display = 'none';
            listElement.innerHTML = '';
            listElement.classList.remove('search-results-border');
        });
        listElement.appendChild(item);

        // If it's the first item in the list (results.length > 1 here),
        // auto-select it functionally (shows details, pans map) and visually highlight it.
        // The list remains visible for the user to make other selections.
        if (index === 0) {
            lakeMap.onLakeClick(lake); // Functionally select (shows details, pans map)
            item.classList.add('active'); // Visually highlight in the list
        }
    });
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
    
    const lakeDetailsPanel = document.getElementById('lake-details');
    if (!lake) {
        if (lakeDetailsPanel) {
            lakeDetailsPanel.innerHTML = '<p>Lake data not available.</p>';
            lakeDetailsPanel.classList.add('active');
        }
        return;
    }
    
    // Ensure the panel is visible
    if (lakeDetailsPanel) {
        lakeDetailsPanel.classList.add('active');
    }

    // Update the lake name in the header
    const lakeNameEl = document.getElementById('lake-name');
    if (lakeNameEl) {
        lakeNameEl.textContent = lake.name || 'Unknown Lake';
    }

    // Helper to create a property element if the value exists
    const createPropertyElement = (label, value, unit = '') => {
        if (value === null || value === undefined || value === '') return '';
        const formattedValue = unit ? `${value} ${unit}` : value;
        return `<p><strong>${label}:</strong> ${formattedValue}</p>`;
    };

    // Update lake info section
    const lakeInfoEl = document.getElementById('lake-info');
    if (lakeInfoEl) {
        let lakeInfoContent = '';
        lakeInfoContent += createPropertyElement('County', lake.county);
        lakeInfoContent += createPropertyElement('Area', lake.area_acres, 'acres');
        lakeInfoContent += createPropertyElement('Max Depth', lake.max_depth_ft, 'ft');
        lakeInfoContent += createPropertyElement('Mean Depth', lake.mean_depth_ft, 'ft');
        lakeInfoContent += createPropertyElement('Shore Length', lake.shore_length_mi, 'miles');
        
        // Add DOW number if available
        if (lake.dow_number) {
            lakeInfoContent += createPropertyElement('DOW Number', lake.dow_number);
        }
        
        lakeInfoEl.innerHTML = lakeInfoContent || '<p>No additional lake information available.</p>';
    }

    // Update fish info section
    const fishInfoEl = document.getElementById('fish-info');
    if (!fishInfoEl) return;

    if (!lakeDetails || !lakeDetails.fishCatch || Object.keys(lakeDetails.fishCatch).length === 0) {
        fishInfoEl.innerHTML = '<div class="no-data"><p>No fish survey data available for this lake.</p></div>';
        return;
    }

    let fishInfoContent = `
        <div class="fish-survey-header">
            <h3>Fish Survey Data</h3>
            <div class="survey-legend">
                <span class="legend-item"><span class="legend-color cpue"></span> CPUE</span>
                <span class="legend-item"><span class="legend-color total"></span> Total Catch</span>
            </div>
        </div>
        <div class="fish-species-container">
    `;
    
    // Process fish catch data
    const fishCatchData = lakeDetails.fishCatch;
    const speciesList = Object.entries(fishCatchData)
        .filter(([_, surveys]) => Array.isArray(surveys) && surveys.length > 0)
        .sort((a, b) => a[0].localeCompare(b[0])); // Sort species alphabetically
    
    if (speciesList.length === 0) {
        fishInfoEl.innerHTML = '<div class="no-data"><p>No fish survey data available for this lake.</p></div>';
        return;
    }

    speciesList.forEach(([species, surveys]) => {
        // Get unique survey dates and sort them in descending order (most recent first)
        const surveyDates = [...new Set(surveys.map(s => s.survey_date))]
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a));
        
        // Calculate total CPUE and catch across all surveys for this species
        const totalCatch = surveys.reduce((sum, survey) => sum + (parseInt(survey.total_catch) || 0), 0);
        const avgCPUE = (surveys.reduce((sum, survey) => sum + (parseFloat(survey.cpue) || 0), 0) / surveys.length).toFixed(2);
        
        fishInfoContent += `
            <div class="fish-species">
                <div class="species-header">
                    <h4>${species}</h4>
                    <div class="species-stats">
                        <span class="stat"><strong>Avg CPUE:</strong> ${avgCPUE}</span>
                        <span class="stat"><strong>Total Catch:</strong> ${totalCatch}</span>
                        <span class="stat"><strong>Surveys:</strong> ${surveyDates.length}</span>
                    </div>
                </div>
                <div class="survey-dates">
        `;
        
        // Display each survey date with collapsible content
        surveyDates.forEach(date => {
            const dateSurveys = surveys.filter(s => s.survey_date === date);
            const dateId = `date-${date}-${species.replace(/\s+/g, '-')}`;
            
            fishInfoContent += `
                <div class="survey-date">
                    <button class="survey-date-btn" aria-expanded="false" data-target="${dateId}">
                        <span class="date">${date}</span>
                        <span class="survey-count">${dateSurveys.length} survey${dateSurveys.length > 1 ? 's' : ''}</span>
                        <span class="toggle-icon">+</span>
                    </button>
                    <div id="${dateId}" class="survey-details" hidden>
                        <table>
                            <thead>
                                <tr>
                                    <th>Gear Type</th>
                                    <th>CPUE</th>
                                    <th>Total Catch</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            dateSurveys.forEach(survey => {
                fishInfoContent += `
                    <tr>
                        <td>${survey.gear_type || 'N/A'}</td>
                        <td class="cpue">${survey.cpue || 'N/A'}</td>
                        <td class="total">${survey.total_catch || 'N/A'}</td>
                    </tr>
                `;
            });
            
            fishInfoContent += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        
        fishInfoContent += `
                </div>
            </div>
        `;
    });
    
    fishInfoContent += `</div>`; // Close fish-species-container
    
    // Add fish length data if available
    if (lakeDetails.fishLength && Object.keys(lakeDetails.fishLength).length > 0) {
        fishInfoContent += `
            <div class="length-data-container">
                <h3>Fish Length Data</h3>
                <div class="length-data-grid">
        `;
        
        Object.entries(lakeDetails.fishLength).forEach(([species, lengthData]) => {
            if (!Array.isArray(lengthData) || lengthData.length === 0) return;
            
            fishInfoContent += `
                <div class="length-data-item">
                    <h4>${species}</h4>
                    <div class="length-data-details">
            `;
            
            // Group by survey date
            const surveysByDate = {};
            lengthData.forEach(record => {
                if (!record.survey_date) return;
                if (!surveysByDate[record.survey_date]) {
                    surveysByDate[record.survey_date] = [];
                }
                surveysByDate[record.survey_date].push(record);
            });
            
            Object.entries(surveysByDate).forEach(([date, records]) => {
                fishInfoContent += `<div class="length-survey">`;
                fishInfoContent += `<strong>${date}:</strong> `;
                
                const lengthInfo = records.map(record => {
                    if (record.length_distribution && typeof record.length_distribution === 'object') {
                        // Format length distribution if it's an object
                        return Object.entries(record.length_distribution)
                            .map(([length, count]) => `${length}": ${count}`)
                            .join(', ');
                    } else if (record.length_inches) {
                        return `${record.length_inches} inches`;
                    }
                    return '';
                }).filter(Boolean).join('; ');
                
                fishInfoContent += lengthInfo || 'No length data';
                fishInfoContent += `</div>`;
            });
            
            fishInfoContent += `
                    </div>
                </div>
            `;
        });
        
        fishInfoContent += `
                </div>
            </div>
        `;
    }
    
    fishInfoEl.innerHTML = fishInfoContent || '<div class="no-data"><p>No fish data available.</p></div>';
    
    // Add event listeners for collapsible sections
    document.querySelectorAll('.survey-date-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const target = document.getElementById(targetId);
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            
            button.setAttribute('aria-expanded', !isExpanded);
            target.hidden = isExpanded;
            button.querySelector('.toggle-icon').textContent = isExpanded ? '+' : '−';
        });
    });
}


// Export app functions for potential use in other modules
export { initApp, displayLakeDetails }; 