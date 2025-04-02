let map;
let groupMarkers = {};  // Store markers for each group
let groupPaths = {};    // Store paths for each group
let groupColors = {};   // Store colors for each group

// Initialize the map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 2
    });

    fetch('/data')
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(group => {
                let groupData = data[group];
                let color = getRandomColor();  // Assign a random color for each group
                groupColors[group] = color;

                if (groupData.stationary) {
                    plotStationary(group, groupData, color);
                } else {
                    plotDriving(group, groupData, color);
                }
            });
        });
}

// Plot stationary group (using a single marker)
function plotStationary(group, data, color) {
    const position = { lat: data.lat, lng: data.long };
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: group,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'  // Customize as needed
        }
    });

    const contentString = data.activities.map(activity => 
        `<p><strong>${activity.timestamp}</strong>: ${activity.Activity}</p>`
    ).join('');

    const infoWindow = new google.maps.InfoWindow({
        content: contentString
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });

    groupMarkers[group] = marker;
}

// Plot driving group (using a polyline and markers for each point)
function plotDriving(group, data, color) {
    const path = data.path.map(point => ({
        lat: point.Lat,
        lng: point.Long
    }));

    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: 3
    });

    polyline.setMap(map);
    groupPaths[group] = polyline;

    path.forEach((point, index) => {
        const marker = new google.maps.Marker({
            position: point,
            map: map,
            title: `${group} - ${data.path[index].Activity}`,
            icon: getActivityIcon(data.path[index].Activity)  // Add different icons based on activity
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `<strong>${data.path[index].timestamp}</strong>: ${data.path[index].Activity}`
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
    });

    groupMarkers[group] = polyline;
}

// Get a random color for each group
function getRandomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16);
}

// Get different icons for activities
function getActivityIcon(activity) {
    switch(activity) {
        case 'Call_Drop':
            return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
        case 'Data_Use':
            return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
        case 'HandOver':
            return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
        case 'Idle':
            return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        case 'VoLTE':
            return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
        default:
            return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
}

// Zoom into a group when clicked in the table
function zoomIntoGroup(group) {
    const groupData = groupPaths[group];
    if (groupData) {
        map.fitBounds(groupData.getBounds());
        map.setZoom(10);  // Adjust the zoom level as needed
    }
}

// Event listener for clicking on table rows
document.addEventListener('DOMContentLoaded', () => {
    const tableRows = document.querySelectorAll('.group-row');
    tableRows.forEach(row => {
        row.addEventListener('click', () => {
            const groupId = row.dataset.groupId;
            zoomIntoGroup(groupId);
        });
    });
});

// Load the map on window load
window.onload = initMap;
