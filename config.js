const config = {
    // Replace this with your Mapbox access token
    mapboxToken: 'pk.eyJ1IjoiYW5kcmV3LXZpbmNlbnQiLCJhIjoiY202OW4wNm5yMGlubzJtcTJmMnBxb2x1cSJ9.jrR3Ucv9Nvtc-T_7aKIQCg',
    
    // Using a more natural, muted style similar to Google Maps
    mapStyle: 'mapbox://styles/mapbox/streets-v12',  // Natural street map with muted colors
    
    // Default map center and zoom
    defaultCenter: [-95.7129, 37.0902], // Center of US
    defaultZoom: 4,
    
    // Category colors with opacity
    categoryColors: {
        '250k': {
            '1500+ Kids': 'rgba(255, 59, 59, 0.4)',    // Bright red
            '1250-1500 Kids': 'rgba(255, 149, 5, 0.4)', // Orange
            '1000-1250 Kids': 'rgba(255, 215, 0, 0.4)', // Gold/Yellow
            '750-1000 Kids': 'rgba(76, 187, 23, 0.4)',  // Bright green
            '500-750 Kids': 'rgba(0, 120, 255, 0.4)'    // Sky blue
        },
        '500k': {
            '1500+ Kids': 'rgba(102, 0, 153, 0.8)',    // Dark purple
            '1250-1500 Kids': 'rgba(186, 85, 211, 0.8)', // Medium purple
            '1000-1250 Kids': 'rgba(220, 20, 60, 0.8)',  // Deep red
            '750-1000 Kids': 'rgba(255, 140, 0, 0.8)',   // Dark orange
            '500-750 Kids': 'rgba(255, 215, 0, 0.8)'     // Gold
        }
    },
    
    // KML file location (relative to index.html)
    kmlPath: 'data/',
    
    // List of cities and their KML files
    cities: {
        'Atlanta': {
            '250k': 'data/Atlanta Demographics_250k_filtered.kml',
            '500k': 'data/Atlanta Demographics_500k_filtered.kml'
        },
        'Charleston': {
            '250k': 'data/Charleston Demographics_250k_filtered.kml',
            '500k': 'data/Charleston Demographics_500k_filtered.kml'
        },
        'Charlotte': {
            '250k': 'data/Charlotte Demographics_250k_filtered.kml',
            '500k': 'data/Charlotte Demographics_500k_filtered.kml'
        },
        'Chicago': {
            '250k': ['data/Chicago Demographics_250k_filtered_part1.kml', 'data/Chicago Demographics_250k_filtered_part2.kml'],
            '500k': 'data/Chicago Demographics_500k_filtered.kml'
        },
        'Dallas': {
            '250k': 'data/Dallas_Demographics_Kids__$250k_HH_Income_250k_filtered.kml',
            '500k': 'data/Dallas_Demographics_Kids__$250k_HH_Income_500k_filtered.kml'
        },
        'Denver': {
            '250k': 'data/Denver_Demographics_Kids__$250k_HH_Income_250k_filtered.kml',
            '500k': 'data/Denver_Demographics_Kids__$250k_HH_Income_500k_filtered.kml'
        },
        'Fort Worth': {
            '250k': 'data/Fort_Worth_Demographics_Kids__$250k_HH_Income_250k_filtered.kml',
            '500k': 'data/Fort_Worth_Demographics_Kids__$250k_HH_Income_500k_filtered.kml'
        },
        'Houston': {
            '250k': 'data/Houston Demographics_250k_filtered.kml',
            '500k': 'data/Houston Demographics_500k_filtered.kml'
        },
        'Orlando': {
            '250k': 'data/Orlando Demographics_250k_filtered.kml',
            '500k': 'data/Orlando Demographics_500k_filtered.kml'
        },
        'Phoenix': {
            '250k': 'data/Phoenix Demographics_250k_filtered.kml',
            '500k': 'data/Phoenix Demographics_500k_filtered.kml'
        },
        'Santa Barbara': {
            '250k': 'data/Santa Barbara Demographics_250k_filtered.kml',
            '500k': 'data/Santa Barbara Demographics_500k_filtered.kml'
        },
        'Tampa': {
            '250k': 'data/Tampa Demographics_250k_filtered.kml',
            '500k': 'data/Tampa Demographics_500k_filtered.kml'
        },
        'West Palm Beach': {
            '250k': 'data/West_Palm_Beach_Demographics_Kids__$250k_HH_Income_250k_filtered.kml',
            '500k': 'data/West_Palm_Beach_Demographics_Kids__$250k_HH_Income_500k_filtered.kml'
        }
    }
};
