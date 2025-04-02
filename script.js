let map;
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
    });
    fetchDataAndPlot();
}

function fetchDataAndPlot() {
    fetch("/data")
        .then(response => response.json())
        .then(data => {
            window.groupData = data;
        });
}

function showOnMap(group) {
    const groupInfo = window.groupData[group];
    if (!groupInfo) return;

    map.setZoom(14);
    const bounds = new google.maps.LatLngBounds();

    if (groupInfo.stationary) {
        const marker = new google.maps.Marker({
            position: { lat: groupInfo.lat, lng: groupInfo.long },
            map: map,
            title: group
        });

        const infoWindow = new google.maps.InfoWindow({
            content: groupInfo.activities.map(a => `${a.timestamp}: ${a.Activity}`).join('<br>')
        });
        marker.addListener("click", () => infoWindow.open(map, marker));
        map.setCenter(marker.getPosition());
    } else {
        const pathCoordinates = [];
        groupInfo.path.forEach(p => {
            const latLng = new google.maps.LatLng(p.Lat, p.Long);
            bounds.extend(latLng);
            pathCoordinates.push(latLng);
            
            const marker = new google.maps.Marker({
                position: latLng,
                map: map,
                title: p.Activity,
                icon: getMarkerIcon(p.Activity)
            });
            
            const infoWindow = new google.maps.InfoWindow({
                content: `${p.timestamp}: ${p.Activity}`
            });
            marker.addListener("click", () => infoWindow.open(map, marker));
        });
        
        drawSnappedPath(pathCoordinates, getRandomColor());
        map.fitBounds(bounds);
    }
}

function getMarkerIcon(activity) {
    const colors = {
        "Call_Drop": "red",
        "Data_Use": "blue",
        "HandOver": "green",
        "Idle": "yellow",
        "VoLTE": "purple"
    };
    return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: colors[activity] || "black",
        fillOpacity: 1,
        strokeWeight: 1
    };
}

function getRandomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

function drawSnappedPath(pathCoordinates, color) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: color,
            strokeOpacity: 1.0,
            strokeWeight: 4,
        },
        map: map
    });
    
    const waypoints = pathCoordinates.slice(1, -1).map(coord => ({ location: coord, stopover: false }));
    
    directionsService.route({
        origin: pathCoordinates[0],
        destination: pathCoordinates[pathCoordinates.length - 1],
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        } else {
            console.error("Directions request failed due to " + status);
        }
    });
}

function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}
