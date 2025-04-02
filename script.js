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
        
        new google.maps.Polyline({
            path: pathCoordinates,
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: map
        });

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
