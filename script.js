let map;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 0, lng: 0 },
        zoom: 12,
    });

    fetch("/get_data")
        .then(response => response.json())
        .then(data => {
            // Combine and sort both drive and stationary events by timestamp
            let allEvents = [...data.drive, ...data.stationary];
            allEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort by timestamp
            
            plotEvents(allEvents);  // Plot events on map
            plotTowers(data.towers);  // Plot towers on map
            populateTable(allEvents); // Populate data table
        });
}

function plotEvents(events) {
    let previousEvent = null;

    events.forEach(event => {
        let color = event.Color || (["Call Drop", "Re-Establishment Failure", "UE Lost"].includes(event.Activity) ? "red" : "green");
        
        let marker = new google.maps.Marker({
            position: { lat: event.Lat, lng: event.Long },
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: event["Drive/Stationary"] === "Stationary" ? 10 : 5,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 1,
            }
        });

        let infoContent = `<b>Events:</b> ${Array.isArray(event.Activity) ? event.Activity.join(", ") : event.Activity}`;
        let infowindow = new google.maps.InfoWindow({ content: infoContent });

        marker.addListener("click", () => infowindow.open(map, marker));

        // Connect the points with a red line, if there's a previous event
        if (previousEvent) {
            new google.maps.Polyline({
                path: [
                    { lat: previousEvent.Lat, lng: previousEvent.Long },
                    { lat: event.Lat, lng: event.Long }
                ],
                strokeColor: "red",
                strokeOpacity: 0.7,
                strokeWeight: 2,
                map: map,
            });
        }

        // Update the previous event to the current one
        previousEvent = event;
        
        // If not stationary, also draw a line to the tower
        if (event["Drive/Stationary"] !== "Stationary") {
            new google.maps.Polyline({
                path: [{ lat: event.Lat, lng: event.Long }, { lat: event["Tower Lat"], lng: event["Tower Long"] }],
                strokeColor: "#0000FF",
                strokeOpacity: 0.7,
                strokeWeight: 2,
                map: map,
            });
        }
    });
}

function plotTowers(towers) {
    towers.forEach(tower => {
        new google.maps.Marker({
            position: { lat: tower["Tower Lat"], lng: tower["Tower Long"] },
            map: map,
            icon: {
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: "blue",
                fillOpacity: 1,
                strokeWeight: 1,
            },
            title: `Tower: Beamwidth ${tower["Tower Beamwidth"]}, Azimuth ${tower["Tower Azimuth"]}`
        });

        plotTowerCoverage(tower);
    });
}

function populateTable(events) {
    const tableBody = document.querySelector("#data-table tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    events.forEach(event => {
        let row = `<tr>
            <td>${event.timestamp}</td>
            <td>${event.Lat}</td>
            <td>${event.Long}</td>
            <td>${Array.isArray(event.Activity) ? event.Activity.join(", ") : event.Activity}</td>
            <td>${event.Group || "N/A"}</td>
            <td>${event["Drive/Stationary"]}</td>
            <td>${event["Tower Lat"] || "N/A"}</td>
            <td>${event["Tower Long"] || "N/A"}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

// Load the map
window.onload = initMap;
