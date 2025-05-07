# Minnesota Lakes Explorer

An interactive web application for exploring Minnesota lakes and their fish populations. This application allows users to browse lakes on an interactive map, filter by county, lake size, and access detailed information about each lake including fish species, consumption advisories, and more.

## Features

- Interactive Leaflet map with clustered lake markers
- Filter lakes by county, area, and fish species
- View detailed lake information including:
  - Lake metadata (area, depth, shoreline length)
  - Fish species and catch data
  - Sentinel lake and border water designations
  - Fish consumption advisories
- Responsive design for desktop and mobile devices
- Direct links to Google Maps and Bing Maps for directions

## Data Sources

The application uses data from the Minnesota Department of Natural Resources (DNR), including:

- Lake metadata (name, ID, county, area, depth, etc.)
- Fish catch data by species
- Fish length data
- Sentinel lake designations
- Border water designations
- Lake geospatial coordinates

## Running the Application

This is a client-side web application with no build step required. To run it:

1. Clone this repository
2. Open `index.html` in a web browser

Alternatively, host the files on any web server.

## Project Structure

- `index.html` - Main HTML file
- `css/style.css` - Stylesheet
- `js/` - JavaScript files
  - `app.js` - Main application controller
  - `data-loader.js` - Handles loading and processing data files
  - `map.js` - Map initialization and interaction
- `consolidated_lake_data.csv` - Processed lake data file

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

See the LICENSE file for details.
