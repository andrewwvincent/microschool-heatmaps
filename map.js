let map;
let currentData = null;
let currentCity = null;
let geocoder;
let visibleCategories = [];

// Initialize the map
function initializeMap() {
    mapboxgl.accessToken = config.mapboxToken;
    
    map = new mapboxgl.Map({
        container: 'map',
        style: config.mapStyle,
        center: config.defaultCenter,
        zoom: config.defaultZoom
    });
    
    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());
    
    // Add geocoder (address search)
    geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: {
            color: '#0066FF'
        },
        placeholder: 'Search for an address'
    });
    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
    
    // Initialize the interface after map loads
    map.on('load', () => {
        loadCityList();
        setupEventListeners();
    });
    
    // Add popup on click
    map.on('click', 'demographics', (e) => {
        if (!e.features.length) return;
        
        const feature = e.features[0];
        const coordinates = e.lngLat;
        
        const popupContent = `
            <strong>Category:</strong> ${feature.properties.category}<br>
            <strong>Location:</strong> ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}
        `;
        
        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map);
        
        // Update info panel
        document.getElementById('feature-info').innerHTML = popupContent;
    });
    
    // Change cursor on hover
    map.on('mouseenter', 'demographics', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'demographics', () => {
        map.getCanvas().style.cursor = '';
    });
}

// Load the list of available cities
function loadCityList() {
    // Helper function to format city name
    function formatCityName(name) {
        // Remove any file extensions
        name = name.replace(/\.[^/.]+$/, "");
        // Replace underscores and %20 with spaces
        name = name.replace(/[_\%20]/g, " ");
        // If it contains "Demographics", take only what's before it
        if (name.includes("Demographics")) {
            name = name.split("Demographics")[0];
        }
        // Trim any trailing spaces or special characters
        name = name.trim();
        // Ensure proper capitalization
        return name.split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    }

    try {
        // Get cities from config and format their names
        const formattedCities = {};
        Object.entries(config.cities).forEach(([city, paths]) => {
            const formattedName = formatCityName(city);
            formattedCities[formattedName] = paths;
        });

        // Wait for DOM to be ready
        const initializeSelector = () => {
            const citySelector = document.getElementById('citySelect');
            if (!citySelector) {
                console.error('City selector element not found, retrying in 100ms');
                setTimeout(initializeSelector, 100);
                return;
            }

            // Update the city selector with formatted names
            citySelector.innerHTML = '<option value="">Select a city</option>' +
                Object.keys(formattedCities).sort().map(city => 
                    `<option value="${city}">${city}</option>`
                ).join('');

            // Store the formatted cities back in config
            config.cities = formattedCities;

            // Add event listener for city selection
            citySelector.addEventListener('change', (e) => {
                const selectedCity = e.target.value;
                if (selectedCity) {
                    currentCity = selectedCity;
                    loadCity(selectedCity);
                }
            });
        };

        // Start initialization
        initializeSelector();

    } catch (error) {
        console.error('Error loading city list:', error);
    }
}

// Load KML data for a specific city
async function loadCity(cityName) {
    try {
        const files = config.cities[cityName];
        
        // Handle both single files and arrays of files
        const loadFiles = async (fileOrFiles) => {
            if (Array.isArray(fileOrFiles)) {
                const allFeatures = await Promise.all(fileOrFiles.map(file => loadKMLFile(file, '250k')));
                return allFeatures.flat();
            } else {
                return await loadKMLFile(fileOrFiles, '250k');
            }
        };
        
        const features250k = await loadFiles(files['250k']);
        const features500k = await loadKMLFile(files['500k'], '500k');
        
        if (!features250k.length && !features500k.length) {
            console.error("No features found in KML files for", cityName);
            return;
        }

        console.log(`Loaded ${features250k.length} 250k features and ${features500k.length} 500k features for ${cityName}`);

        // Create lookup for 500k features
        const lookup500k = {};
        features500k.forEach(f => {
            const key = JSON.stringify(f.geometry.coordinates[0]);
            lookup500k[key] = f;
        });

        // Process 250k features and mark those with 500k matches
        features250k.forEach(f => {
            const key = JSON.stringify(f.geometry.coordinates[0]);
            if (key in lookup500k) {
                f.properties.has500k = true;
                f.properties.category500k = lookup500k[key].properties.category;
            } else {
                f.properties.has500k = false;
            }
        });

        // Remove existing layers if they exist
        ['demographics'].forEach(layerId => {
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(layerId)) map.removeSource(layerId);
        });

        // Add source for all features
        map.addSource('demographics', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: features250k
            }
        });

        // Add main layer
        map.addLayer({
            id: 'demographics',
            type: 'fill',
            source: 'demographics',
            paint: {
                'fill-color': [
                    'case',
                    ['get', 'has500k'],
                    [
                        'case',
                        ['in', ['get', 'category500k'], ['literal', []]], // Will be updated with visible500k
                        [
                            'match',
                            ['get', 'category500k'],
                            '1500+ Kids', config.categoryColors['500k']['1500+ Kids'],
                            '1250-1500 Kids', config.categoryColors['500k']['1250-1500 Kids'],
                            '1000-1250 Kids', config.categoryColors['500k']['1000-1250 Kids'],
                            '750-1000 Kids', config.categoryColors['500k']['750-1000 Kids'],
                            '500-750 Kids', config.categoryColors['500k']['500-750 Kids'],
                            'rgba(0,0,0,0)'
                        ],
                        [
                            'case',
                            ['in', ['get', 'category'], ['literal', []]], // Will be updated with visible250k
                            [
                                'match',
                                ['get', 'category'],
                                '1500+ Kids', config.categoryColors['250k']['1500+ Kids'],
                                '1250-1500 Kids', config.categoryColors['250k']['1250-1500 Kids'],
                                '1000-1250 Kids', config.categoryColors['250k']['1000-1250 Kids'],
                                '750-1000 Kids', config.categoryColors['250k']['750-1000 Kids'],
                                '500-750 Kids', config.categoryColors['250k']['500-750 Kids'],
                                'rgba(0,0,0,0)'
                            ],
                            'rgba(0,0,0,0)'
                        ]
                    ],
                    [
                        'case',
                        ['in', ['get', 'category'], ['literal', []]], // Will be updated with visible250k
                        [
                            'match',
                            ['get', 'category'],
                            '1500+ Kids', config.categoryColors['250k']['1500+ Kids'],
                            '1250-1500 Kids', config.categoryColors['250k']['1250-1500 Kids'],
                            '1000-1250 Kids', config.categoryColors['250k']['1000-1250 Kids'],
                            '750-1000 Kids', config.categoryColors['250k']['750-1000 Kids'],
                            '500-750 Kids', config.categoryColors['250k']['500-750 Kids'],
                            'rgba(0,0,0,0)'
                        ],
                        'rgba(0,0,0,0)'
                    ]
                ],
                'fill-opacity': 1,
                'fill-outline-color': 'rgba(0,0,0,0)'
            }
        });

        // Update visible categories
        updateVisibleCategories();
        
        // Fit map to features
        const bounds = new mapboxgl.LngLatBounds();
        features250k.forEach(feature => {
            feature.geometry.coordinates[0].forEach(coord => {
                bounds.extend(coord);
            });
        });
        map.fitBounds(bounds, { padding: 50 });

    } catch (error) {
        console.error(`Error loading city ${cityName}:`, error);
    }
}

// Function to update visible categories
function updateVisibleCategories() {
    // Get all checked categories
    const visible250k = [];
    const visible500k = [];
    
    document.querySelectorAll('.category-checkbox:checked').forEach(checkbox => {
        const category = checkbox.value;
        const income = checkbox.getAttribute('data-income');
        if (income === '500k') {
            visible500k.push(category);
        } else {
            visible250k.push(category);
        }
    });

    console.log('Visible categories:', {
        '250k': visible250k,
        '500k': visible500k
    });

    // Update main layer
    if (map.getLayer('demographics')) {
        // Update fill color and opacity
        const colorExpression = [
            'case',
            ['get', 'has500k'],
            [
                'case',
                ['in', ['get', 'category500k'], ['literal', visible500k]],
                [
                    'match',
                    ['get', 'category500k'],
                    '1500+ Kids', config.categoryColors['500k']['1500+ Kids'],
                    '1250-1500 Kids', config.categoryColors['500k']['1250-1500 Kids'],
                    '1000-1250 Kids', config.categoryColors['500k']['1000-1250 Kids'],
                    '750-1000 Kids', config.categoryColors['500k']['750-1000 Kids'],
                    '500-750 Kids', config.categoryColors['500k']['500-750 Kids'],
                    'rgba(0,0,0,0)'
                ],
                [
                    'case',
                    ['in', ['get', 'category'], ['literal', visible250k]],
                    [
                        'match',
                        ['get', 'category'],
                        '1500+ Kids', config.categoryColors['250k']['1500+ Kids'],
                        '1250-1500 Kids', config.categoryColors['250k']['1250-1500 Kids'],
                        '1000-1250 Kids', config.categoryColors['250k']['1000-1250 Kids'],
                        '750-1000 Kids', config.categoryColors['250k']['750-1000 Kids'],
                        '500-750 Kids', config.categoryColors['250k']['500-750 Kids'],
                        'rgba(0,0,0,0)'
                    ],
                    'rgba(0,0,0,0)'
                ]
            ],
            [
                'case',
                ['in', ['get', 'category'], ['literal', visible250k]],
                [
                    'match',
                    ['get', 'category'],
                    '1500+ Kids', config.categoryColors['250k']['1500+ Kids'],
                    '1250-1500 Kids', config.categoryColors['250k']['1250-1500 Kids'],
                    '1000-1250 Kids', config.categoryColors['250k']['1000-1250 Kids'],
                    '750-1000 Kids', config.categoryColors['250k']['750-1000 Kids'],
                    '500-750 Kids', config.categoryColors['250k']['500-750 Kids'],
                    'rgba(0,0,0,0)'
                ],
                'rgba(0,0,0,0)'
            ]
        ];

        const opacityExpression = 1;

        map.setPaintProperty('demographics', 'fill-color', colorExpression);
        map.setPaintProperty('demographics', 'fill-opacity', opacityExpression);
        map.setPaintProperty('demographics', 'fill-outline-color', 'rgba(0,0,0,0)');
    }
}

// Helper function to check if coordinates are equal
function coordsAreEqual(coords1, coords2) {
    if (coords1.length !== coords2.length) return false;
    
    return coords1.every((coord1, i) => {
        const coord2 = coords2[i];
        return Math.abs(coord1[0] - coord2[0]) < 0.0000001 && 
               Math.abs(coord1[1] - coord2[1]) < 0.0000001;
    });
}

// Load KML file
async function loadKMLFile(kmlFile, income) {
    try {
        const response = await fetch(kmlFile);
        if (!response.ok) {
            console.error(`Failed to load ${kmlFile}: ${response.status} ${response.statusText}`);
            return [];
        }
        const text = await response.text();
        const parser = new DOMParser();
        const kml = parser.parseFromString(text, 'text/xml');
        
        if (!kml.querySelector('Placemark')) {
            console.error(`No Placemarks found in ${kmlFile}`);
            return [];
        }
        
        // Convert KML to GeoJSON
        const features = Array.from(kml.querySelectorAll('Placemark')).map(placemark => {
            try {
                const coordsElement = placemark.querySelector('coordinates');
                if (!coordsElement || !coordsElement.textContent) {
                    console.error('Missing coordinates in Placemark');
                    return null;
                }

                const coordinates = coordsElement.textContent
                    .trim()
                    .split(' ')
                    .filter(coord => coord.length > 0)
                    .map(coord => coord.split(',').map(Number));
                
                const descElement = placemark.querySelector('description');
                if (!descElement || !descElement.textContent) {
                    console.error('Missing description in Placemark');
                    return null;
                }

                // Extract and normalize category
                let category = descElement.textContent.trim();
                
                // Ensure category matches our expected format
                if (!category.endsWith('Kids')) {
                    category += ' Kids';
                }
                
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    },
                    properties: {
                        category: category,
                        income: income
                    }
                };
            } catch (err) {
                console.error('Error processing Placemark:', err);
                return null;
            }
        }).filter(feature => feature !== null);
        
        console.log(`Loaded ${features.length} features for ${income}. Sample categories:`, 
            features.slice(0, 3).map(f => f.properties.category));
        
        return features;
    } catch (error) {
        console.error(`Error loading KML file ${kmlFile}:`, error);
        return [];
    }
}

// Set up event listeners
function setupEventListeners() {
    // City selection
    document.getElementById('citySelect').addEventListener('change', (e) => {
        loadCity(e.target.value);
    });
}

// Function to handle parent checkbox changes
function handleParentCheckboxChange(event) {
    const parentCheckbox = event.target;
    const income = parentCheckbox.id.includes('500k') ? '500k' : '250k';
    const categoryList = document.getElementById(`income${income}-categories`);
    const childCheckboxes = categoryList.querySelectorAll('.category-checkbox');
    
    childCheckboxes.forEach(checkbox => {
        checkbox.checked = parentCheckbox.checked;
    });
    
    updateVisibleCategories();
}

// Add event listeners for parent checkboxes
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for parent checkboxes
    document.getElementById('income250k-all').addEventListener('change', handleParentCheckboxChange);
    document.getElementById('income500k-all').addEventListener('change', handleParentCheckboxChange);

    // Add event listeners for individual category checkboxes
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Update parent checkbox state
            const income = checkbox.getAttribute('data-income');
            const parentId = `income${income}-all`;
            const parentCheckbox = document.getElementById(parentId);
            if (parentCheckbox) {
                const siblings = document.querySelectorAll(`.category-checkbox[data-income="${income}"]`);
                const allChecked = Array.from(siblings).every(cb => cb.checked);
                parentCheckbox.checked = allChecked;
            }
            
            updateVisibleCategories();
        });
    });
});

// Function to update legend colors
function updateLegendColors() {
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        const income = checkbox.getAttribute('data-income');
        const category = checkbox.value;
        const color = config.categoryColors[income][category];
        
        // Update the color indicator
        const indicator = checkbox.parentElement.querySelector('.color-indicator');
        indicator.style.backgroundColor = color;
    });
}

// Initialize the map when the page loads
initializeMap();

// Update legend colors initially
updateLegendColors();

// Function to update color for a category
function updateCategoryColor(income, category, color) {
    config.categoryColors[income][category] = color;
    
    // Update the legend colors
    updateLegendColors();
    
    // Update the map colors
    updateVisibleCategories();
}

// Add color picker functionality to legend colors
document.querySelectorAll('.color-indicator').forEach(indicator => {
    indicator.style.cursor = 'pointer';
    indicator.addEventListener('click', (e) => {
        const checkbox = e.target.parentElement.querySelector('.category-checkbox');
        const income = checkbox.getAttribute('data-income');
        const category = checkbox.value;
        
        // Create color picker
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = rgbaToHex(config.categoryColors[income][category]);
        
        // Add alpha slider
        const alphaContainer = document.createElement('div');
        alphaContainer.style.position = 'absolute';
        alphaContainer.style.backgroundColor = 'white';
        alphaContainer.style.padding = '10px';
        alphaContainer.style.border = '1px solid #ccc';
        alphaContainer.style.borderRadius = '4px';
        alphaContainer.style.zIndex = 1000;
        
        const alphaSlider = document.createElement('input');
        alphaSlider.type = 'range';
        alphaSlider.min = 0;
        alphaSlider.max = 100;
        alphaSlider.value = parseFloat(config.categoryColors[income][category].match(/[\d.]+\)$/)[0]) * 100;
        
        const alphaLabel = document.createElement('div');
        alphaLabel.textContent = `Opacity: ${alphaSlider.value}%`;
        
        alphaContainer.appendChild(picker);
        alphaContainer.appendChild(alphaLabel);
        alphaContainer.appendChild(alphaSlider);
        
        // Position the container near the color indicator
        const rect = e.target.getBoundingClientRect();
        alphaContainer.style.left = `${rect.left}px`;
        alphaContainer.style.top = `${rect.bottom + 5}px`;
        
        document.body.appendChild(alphaContainer);
        
        // Update color when changed
        const updateColor = () => {
            const hexColor = picker.value;
            const alpha = alphaSlider.value / 100;
            const rgba = hexToRgba(hexColor, alpha);
            updateCategoryColor(income, category, rgba);
            alphaLabel.textContent = `Opacity: ${alphaSlider.value}%`;
        };
        
        picker.addEventListener('input', updateColor);
        alphaSlider.addEventListener('input', updateColor);
        
        // Close picker when clicking outside
        const closeHandler = (event) => {
            if (!alphaContainer.contains(event.target) && event.target !== e.target) {
                document.body.removeChild(alphaContainer);
                document.removeEventListener('click', closeHandler);
            }
        };
        
        // Delay adding the click handler to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 100);
        
        // Prevent the click from triggering the document click handler immediately
        e.stopPropagation();
    });
});

// Helper function to convert RGBA to HEX
function rgbaToHex(rgba) {
    const values = rgba.match(/[\d.]+/g);
    const r = parseInt(values[0]);
    const g = parseInt(values[1]);
    const b = parseInt(values[2]);
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Helper function to convert HEX to RGBA
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
