mapboxgl.accessToken = "pk.eyJ1IjoibmFqYXkxIiwiYSI6ImNtNXdqYzQxZjBjbjEyanF6ZXh2aDRqOGcifQ.DO5Klv9yr6ayI_cAoGk6eA";


const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v10",
    center: [-98.35, 39.5],  
    zoom: 5
});

const basemaps = [
    "mapbox://styles/mapbox/light-v10",  
    "mapbox://styles/mapbox/dark-v10",   
    "mapbox://styles/mapbox/satellite-v9"
];
let currentBasemapIndex = 1;

const tilesetId = "mapbox://najay1.d182sure";
const sourceLayer = "Americaair_polution-6obltc";
let selectedPollutant = "Days PM2_5"; 
let controlsAdded = false;  

function addLegend() {
    let legend = document.getElementById("legend");
    
    if (!legend) {
        legend = document.createElement("div");
        legend.id = "legend";
        document.body.appendChild(legend);
    }

    
    legend.innerHTML = `
    <div><strong>Pollution Level</strong></div>
    <div><span class="legend-color" style="background:#00FF00"></span> Low</div>
    <div><span class="legend-color" style="background:#FFFF00"></span> Moderate</div>
    <div><span class="legend-color" style="background:#FF7F00"></span> High</div>
    <div><span class="legend-color" style="background:#FF4500"></span> Very High</div>
    <div><span class="legend-color" style="background:#FF0000"></span> Severe</div>
`;

    legend.style.position = "absolute";
    legend.style.bottom = "20px";  
    legend.style.right = "20px";   
    legend.style.background = "rgba(255,255,255,0.9)";
    legend.style.padding = "10px";
    legend.style.borderRadius = "8px";
    legend.style.fontSize = "12px";
    legend.style.zIndex = "1000";  

 
 document.querySelectorAll(".legend-color").forEach(span => {
        span.style.display = "inline-block";
        span.style.width = "12px";
        span.style.height = "12px";
        span.style.marginRight = "5px";
        span.style.borderRadius = "50%";
    });
}

function getColorScale(pollutant) {
    return [
        "interpolate",
        ["linear"],
        ["to-number", ["coalesce", ["get", pollutant], 0]], 
        0, "#00FF00",   
        50, "#FFFF00",  
        100, "#FF7F00", 
        150, "#FF4500", 
        200, "#FF0000"  
    ];
}

function getRadiusScale(pollutant) {
    return [
        "interpolate",
        ["linear"],
        ["to-number", ["coalesce", ["get", pollutant], 1]], 
        0, 4,   
        50, 6,  
        100, 8, 
        150, 10, 
        200, 14 
    ];
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("toggleHeatmap").addEventListener("click", function () {
        if (map.getLayer("pollution-heatmap")) {
            let visibility = map.getLayoutProperty("pollution-heatmap", "visibility") || "visible";
            map.setLayoutProperty("pollution-heatmap", "visibility", visibility === "visible" ? "none" : "visible");
        }
    });

    document.getElementById("switchBasemap").addEventListener("click", () => {
    currentBasemapIndex = (currentBasemapIndex + 1) % basemaps.length;
    map.setStyle(basemaps[currentBasemapIndex]);

    map.once("style.load", () => {
        addDataLayers();
        addControls();  
        setTimeout(addLegend, 500);
    });
});
    document.getElementById("pm25").addEventListener("click", () => updateHeatmapData("Days PM2_5", "pm25"));
    document.getElementById("no2").addEventListener("click", () => updateHeatmapData("Max AQI", "no2"));
    document.getElementById("o3").addEventListener("click", () => updateHeatmapData("Days Ozone", "o3"));
});


map.on("load", function () {
    addDataLayers();
    addControls();
    addLegend();
    setupHoverEffect();
});


function addDataLayers() {
    if (!map.getSource("air_quality")) {
        map.addSource("air_quality", {
            type: "vector",
            url: tilesetId
        });
    }

    if (!map.getLayer("air_quality")) {
        map.addLayer({
            id: "air_quality",
            type: "circle",
            source: "air_quality",
            "source-layer": sourceLayer,
            paint: {
                "circle-radius": getRadiusScale(selectedPollutant),
                "circle-color": getColorScale(selectedPollutant),
                "circle-opacity": 0.8
            }
        });
    }

    if (!map.getLayer("pollution-heatmap")) {
        map.addLayer({
            id: "pollution-heatmap",
            type: "heatmap",
            source: "air_quality",
            "source-layer": sourceLayer,
            maxzoom: 9,
            layout: { "visibility": "none" },  
            paint: {
                "heatmap-opacity": 0.7
            }
        });
    }
}

function updateHeatmapData(pollutant, buttonId) {
    selectedPollutant = pollutant;

    
    let filterPollutant = ["has", selectedPollutant]; 
    let filterYear = ["==", ["get", "Year"], parseInt(document.getElementById("timeSlider").value)];

    if (map.getLayer("pollution-heatmap")) {
        map.setPaintProperty("pollution-heatmap", "heatmap-weight", [
            "interpolate",
            ["linear"],
            ["get", selectedPollutant],
            0, 0,
            100, 1
        ]);
        map.setFilter("pollution-heatmap", ["all", filterYear, filterPollutant]);  
    }

    if (map.getLayer("air_quality")) {
        map.setPaintProperty("air_quality", "circle-color", getColorScale(selectedPollutant));
        map.setPaintProperty("air_quality", "circle-radius", getRadiusScale(selectedPollutant));
        map.setFilter("air_quality", ["all", filterYear, filterPollutant]);  
    }

    
document.querySelectorAll(".pollutant-button").forEach(button => button.classList.remove("active"));
    let buttonElement = document.getElementById(buttonId);
    if (buttonElement) {
        buttonElement.classList.add("active");
    }
}


function addControls() {
    if (!controlsAdded) {
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        }), "top-right");
        controlsAdded = true;
    }
}

function setupHoverEffect() {
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

    map.on("mousemove", "air_quality", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["air_quality"] });

        if (features.length) {
            const feature = features[0];  
            const featureId = feature.id;

            map.setPaintProperty("air_quality", "circle-stroke-width", [
                "case",
                ["==", ["id"], featureId],
                2,  
                0
            ]);
            map.setPaintProperty("air_quality", "circle-stroke-color", "#000000");

            const properties = feature.properties;
 const description = `
    <strong>${properties.County}, ${properties.State}</strong><br>
    ${selectedPollutant}: ${properties[selectedPollutant]}
`;


            popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
        }
    });

    map.on("mouseleave", "air_quality", () => {
        map.setPaintProperty("air_quality", "circle-stroke-width", 0);
        map.setPaintProperty("air_quality", "circle-stroke-color", "transparent");
        popup.remove();  
    });
}

function updateTime() {
    let year = document.getElementById("timeSlider").value;
    document.getElementById("yearLabel").innerText = year;
    
    let filterYear = ["==", ["get", "Year"], parseInt(year)];
    let filterPollutant = ["has", selectedPollutant]; 

    if (map.getLayer("air_quality")) {
        map.setFilter("air_quality", ["all", filterYear, filterPollutant]);
    }

    if (map.getLayer("pollution-heatmap")) {
        map.setFilter("pollution-heatmap", ["all", filterYear, filterPollutant]);
    }
}