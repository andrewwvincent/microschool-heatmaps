let map;
let currentData = null;
let currentCity = null;
let geocoder;
let visibleCategories = [];

// Global variables for locations
let allLocations = null;
let locations = { preferred: [], other: [] };
let locationMarkers = [];

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
        loadAllLocations().then(() => {
            filterLocationsByBounds();
        });
    });
    
    // Change cursor on hover for demographics layer
    map.on('mouseenter', 'demographics', () => {
        map.getCanvas().style.cursor = 'default';
    });
    
    map.on('mouseleave', 'demographics', () => {
        map.getCanvas().style.cursor = '';
    });
}

// Load the list of available cities
async function loadCityList() {
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
        // Initialize the city selector
        const initializeSelector = () => {
            const citySelector = document.getElementById('city-selector');
            citySelector.innerHTML = '<option value="">Select a city</option>';
            
            // Add cities from config
            Object.keys(config.cities).sort().forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelector.appendChild(option);
            });

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
        // Fallback to config cities if directory listing fails
        const formattedCities = {};
        Object.entries(config.cities).forEach(([city, paths]) => {
            const formattedName = formatCityName(city);
            formattedCities[formattedName] = paths;
        });
        config.cities = formattedCities;
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
            // Create modal backdrop
            const backdrop = document.createElement('div');
            backdrop.style.position = 'fixed';
            backdrop.style.top = '0';
            backdrop.style.left = '0';
            backdrop.style.width = '100%';
            backdrop.style.height = '100%';
            backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
            backdrop.style.zIndex = '1000';
            backdrop.style.display = 'flex';
            backdrop.style.alignItems = 'center';
            backdrop.style.justifyContent = 'center';

            // Create modal dialog
            const modal = document.createElement('div');
            modal.style.backgroundColor = 'white';
            modal.style.padding = '20px 30px';
            modal.style.borderRadius = '8px';
            modal.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            modal.style.maxWidth = '500px';
            modal.style.width = '90%';
            modal.style.position = 'relative';

            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.position = 'absolute';
            closeBtn.style.right = '10px';
            closeBtn.style.top = '10px';
            closeBtn.style.border = 'none';
            closeBtn.style.background = 'none';
            closeBtn.style.fontSize = '24px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.color = '#666';
            closeBtn.onclick = () => backdrop.remove();

            // Add content
            const title = document.createElement('h3');
            title.style.marginTop = '0';
            title.style.marginBottom = '15px';
            title.style.color = '#333';
            title.innerHTML = 'No Data Available';

            const content = document.createElement('p');
            content.style.margin = '0';
            content.style.lineHeight = '1.5';
            content.style.color = '#666';
            content.innerHTML = `No areas found in ${cityName} with more than 500 children in households earning $250,000 or more annually.`;

            // Create progress circle container
            const progressContainer = document.createElement('div');
            progressContainer.style.display = 'flex';
            progressContainer.style.justifyContent = 'center';
            progressContainer.style.marginTop = '20px';

            // Create SVG for progress circle
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '40');
            svg.setAttribute('height', '40');
            svg.style.transform = 'rotate(-90deg)';

            // Create circle background
            const circleBackground = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleBackground.setAttribute('cx', '20');
            circleBackground.setAttribute('cy', '20');
            circleBackground.setAttribute('r', '15');
            circleBackground.setAttribute('fill', 'none');
            circleBackground.setAttribute('stroke', '#eee');
            circleBackground.setAttribute('stroke-width', '3');

            // Create progress circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '20');
            circle.setAttribute('cy', '20');
            circle.setAttribute('r', '15');
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', '#4CAF50');
            circle.setAttribute('stroke-width', '3');
            circle.setAttribute('stroke-dasharray', `${2 * Math.PI * 15}`);
            circle.setAttribute('stroke-dashoffset', '0');

            // Create countdown text
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '20');
            text.setAttribute('y', '20');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', '#666');
            text.style.transform = 'rotate(90deg)';
            text.style.transformOrigin = 'center';
            text.style.fontSize = '12px';
            text.textContent = '5';

            svg.appendChild(circleBackground);
            svg.appendChild(circle);
            svg.appendChild(text);
            progressContainer.appendChild(svg);

            modal.appendChild(closeBtn);
            modal.appendChild(title);
            modal.appendChild(content);
            modal.appendChild(progressContainer);
            backdrop.appendChild(modal);

            // Remove any existing modal
            const existingModal = document.querySelector('.modal-backdrop');
            if (existingModal) {
                existingModal.remove();
            }

            backdrop.className = 'modal-backdrop';
            document.body.appendChild(backdrop);

            // Close modal when clicking backdrop
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    backdrop.remove();
                }
            });

            // Animate progress circle
            const circumference = 2 * Math.PI * 15;
            let timeLeft = 5;
            const interval = setInterval(() => {
                timeLeft--;
                if (timeLeft >= 0) {
                    const offset = (timeLeft / 5) * circumference;
                    circle.setAttribute('stroke-dashoffset', (circumference - offset).toString());
                    text.textContent = timeLeft.toString();
                }
            }, 1000);

            // Remove modal after 5 seconds
            setTimeout(() => {
                clearInterval(interval);
                if (document.body.contains(backdrop)) {
                    backdrop.remove();
                }
            }, 5000);
            
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
        const kmlText = await response.text();
        
        // Parse KML file
        const parser = new DOMParser();
        const doc = parser.parseFromString(kmlText, 'text/xml');

        // Check for parsing errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            console.error('Error parsing KML:', parseError.textContent);
            return [];
        }

        // Get all Placemark elements
        const placemarks = Array.from(doc.getElementsByTagName('Placemark'));
        
        // Parse each placemark into a GeoJSON feature
        return placemarks.map(placemark => {
            const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent?.trim();
            if (!coordinates) return null;

            // Split coordinates into points and convert to array of [lon, lat] pairs
            const points = coordinates.split(' ')
                .map(coord => coord.trim())
                .filter(coord => coord)
                .map(coord => {
                    const [lon, lat] = coord.split(',').map(parseFloat);
                    return [lon, lat];
                });

            if (!points.length) return null;

            // Get category from description
            const description = placemark.getElementsByTagName('description')[0]?.textContent?.trim() || '';
            const category = description.split(':')[0]?.trim() || 'Unknown';

            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [points]
                },
                properties: {
                    category: category,
                    income: income
                }
            };
        }).filter(feature => feature !== null);
    } catch (error) {
        console.error('Error loading KML file:', error);
        return [];
    }
}

// Set up event listeners
function setupEventListeners() {
    // City selection
    document.getElementById('city-selector').addEventListener('change', (e) => {
        loadCity(e.target.value);
    });

    // Set up category checkbox event listeners
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateVisibleCategories);
    });

    // Set up parent checkbox event listeners
    document.getElementById('income250k-all').addEventListener('change', handleParentCheckboxChange);
    document.getElementById('income500k-all').addEventListener('change', handleParentCheckboxChange);
    
    // Set up location filter event listeners
    document.getElementById('preferred-locations').addEventListener('change', updateLocationMarkers);
    document.getElementById('other-locations').addEventListener('change', updateLocationMarkers);
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

// Load locations from KML files
async function loadAllLocations() {
    try {
        console.log('Loading KML files...');
        const [preferredKml, otherKml] = await Promise.all([
            fetch('data/locations/preferred_locations.kml').then(r => r.text()),
            fetch('data/locations/other_locations.kml').then(r => r.text())
        ]);
        console.log('KML files loaded');

        console.log('Raw KML content length:', {
            preferred: preferredKml.length,
            other: otherKml.length
        });

        console.log('Parsing errors:', {
            preferred: preferredKml.includes('<parsererror>'),
            other: otherKml.includes('<parsererror>')
        });

        // Parse KML files
        const parser = new DOMParser();
        const preferredDoc = parser.parseFromString(preferredKml, 'text/xml');
        const otherDoc = parser.parseFromString(otherKml, 'text/xml');

        console.log('Parsing errors:', {
            preferred: preferredDoc.querySelector('parsererror'),
            other: otherDoc.querySelector('parsererror')
        });

        // Check for XML parsing errors
        const preferredError = preferredDoc.querySelector('parsererror');
        const otherError = otherDoc.querySelector('parsererror');

        if (preferredError) {
            console.error('Error parsing preferred locations:', preferredError.textContent);
        }
        if (otherError) {
            console.error('Error parsing other locations:', otherError.textContent);
        }

        // Log document structure
        console.log('Document structure:', {
            preferred: {
                placemarks: preferredDoc.getElementsByTagName('Placemark').length,
                names: preferredDoc.getElementsByTagName('name').length,
                nTags: preferredDoc.getElementsByTagName('n').length,
                points: preferredDoc.getElementsByTagName('Point').length,
                descriptions: preferredDoc.getElementsByTagName('description').length
            },
            other: {
                placemarks: otherDoc.getElementsByTagName('Placemark').length,
                names: otherDoc.getElementsByTagName('name').length,
                nTags: otherDoc.getElementsByTagName('n').length,
                points: otherDoc.getElementsByTagName('Point').length,
                descriptions: otherDoc.getElementsByTagName('description').length
            }
        });

        // Helper function to parse placemarks
        function parsePlacemarks(doc, type) {
            const placemarks = Array.from(doc.getElementsByTagName('Placemark'));
            console.log(`Found ${placemarks.length} placemarks in ${type} file`);
            
            return placemarks.map(placemark => {
                try {
                    // Get name from name or n tag
                    let name;
                    const nameElem = placemark.getElementsByTagName('name')[0] || placemark.getElementsByTagName('n')[0];
                    name = nameElem?.textContent?.trim();
                    
                    // Get coordinates from Point tag
                    const point = placemark.getElementsByTagName('Point')[0];
                    const coords = point?.getElementsByTagName('coordinates')[0]?.textContent?.trim().split(',');
                    
                    // Get description, handling CDATA sections
                    let description = '';
                    const descElem = placemark.getElementsByTagName('description')[0];
                    if (descElem) {
                        description = descElem.textContent?.trim() || '';
                        // Clean up CDATA if present
                        description = description.replace(/<!\\[CDATA\\[|\\]\\]>/g, '').trim();
                    }

                    if (!name || !coords || coords.length < 2 || !description) {
                        console.log(`Skipping placemark in ${type} file - missing data:`, {
                            name: name || 'MISSING',
                            hasCoords: !!coords,
                            coordsLength: coords?.length,
                            hasDescription: !!description
                        });
                        return null;
                    }

                    // Parse description HTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = description;
                    
                    const addressElem = tempDiv.querySelector('p:nth-child(2)');
                    const regionElem = tempDiv.querySelector('p:nth-child(3)');
                    const phoneElem = tempDiv.querySelector('p:nth-child(4)');
                    const websiteElem = tempDiv.querySelector('p:nth-child(5) a');

                    return {
                        Organization: name,
                        Address: addressElem?.textContent.replace(/Address:|\s+/g, ' ').trim() || '',
                        Region: regionElem?.textContent.replace(/Region:|\s+/g, ' ').trim() || '',
                        Phone: phoneElem?.textContent.replace(/Phone:|\s+/g, ' ').trim() || '',
                        Website: websiteElem?.href || '',
                        'Location Rank': type === 'preferred' ? 'Preferred Location' : 'Other Target',
                        longitude: parseFloat(coords[0]),
                        latitude: parseFloat(coords[1])
                    };
                } catch (error) {
                    console.error('Error parsing placemark:', error);
                    return null;
                }
            }).filter(location => location !== null);
        }

        // Parse locations from both KML files
        locations.preferred = parsePlacemarks(preferredDoc, 'preferred');
        locations.other = parsePlacemarks(otherDoc, 'other');
        
        allLocations = [...locations.preferred, ...locations.other];
        console.log('Total locations loaded:', allLocations.length);
        console.log('Preferred locations:', locations.preferred.length);
        console.log('Other locations:', locations.other.length);
        return allLocations;
    } catch (error) {
        console.error('Error loading KML files:', error);
        return [];
    }
}

// Filter locations based on map bounds
function filterLocationsByBounds() {
    console.log('Filtering locations...');
    console.log('All locations:', allLocations?.length);
    
    // Filter preferred locations
    locations.preferred = allLocations.filter(location => 
        location && location['Location Rank'] === 'Preferred Location'
    );
    
    // Filter other locations
    locations.other = allLocations.filter(location => 
        location && location['Location Rank'] === 'Other Target'
    );
    
    console.log('After filtering:');
    console.log('Preferred locations:', locations.preferred.length);
    console.log('Other locations:', locations.other.length);
    
    // Update markers
    updateLocationMarkers();
}

// Update location markers on the map
function updateLocationMarkers() {
    // Clear existing markers
    locationMarkers.forEach(marker => marker.remove());
    locationMarkers = [];

    // Get checkbox states
    const preferredChecked = document.getElementById('preferred-locations').checked;
    const otherChecked = document.getElementById('other-locations').checked;

    console.log('Preferred checked:', preferredChecked);
    console.log('Other checked:', otherChecked);
    console.log('Preferred locations:', locations.preferred?.length);
    console.log('Other locations:', locations.other?.length);

    // Create markers for visible locations
    if (locations.preferred) {
        locations.preferred.forEach(location => {
            const marker = createLocationMarker(location, 'preferred');
            if (preferredChecked) {
                marker.addTo(map);
            }
            locationMarkers.push(marker);
        });
    }

    if (locations.other) {
        locations.other.forEach(location => {
            const marker = createLocationMarker(location, 'other');
            if (otherChecked) {
                marker.addTo(map);
            }
            locationMarkers.push(marker);
        });
    }
    
    console.log('Total markers created:', locationMarkers.length);
}

// Create a location marker
function createLocationMarker(location, type) {
    const el = document.createElement('div');
    el.className = `location-marker ${type}`;
    
    // Add label if it's a preferred location
    if (type === 'preferred' && location.Organization) {
        const label = document.createElement('div');
        label.className = 'marker-label';
        label.textContent = location.Organization;
        el.appendChild(label);
    }
    
    const markerOptions = {
        element: el,
        anchor: type === 'preferred' ? 'bottom' : 'center',
        offset: type === 'preferred' ? [0, 0] : [0, 0]
    };
    
    const marker = new mapboxgl.Marker(markerOptions)
        .setLngLat([location.longitude, location.latitude]);
    
    // Add popup
    const popupContent = `
        <h3>${location.Organization}</h3>
        <p><strong>Address:</strong> ${location.Address}</p>
        <p><strong>Region:</strong> ${location.Region}</p>
        <p><strong>Phone:</strong> ${location.Phone}</p>
        ${location.Website ? `<p><strong>Website:</strong> <a href="${location.Website}" target="_blank">Visit Website</a></p>` : ''}
    `;
    
    const popup = new mapboxgl.Popup({
        offset: type === 'preferred' ? [0, -40] : [0, -10]
    }).setHTML(popupContent);
    
    marker.setPopup(popup);
    
    return marker;
}
