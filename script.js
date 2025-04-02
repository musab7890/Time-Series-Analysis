// Assuming you already have data for events and a map initialized

function plotPointsAndConnectLines(data) {
    // Sort data by timestamp
    data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Create an array to store the markers
    let markers = [];
    
    // Loop through the sorted data and place markers
    let previousPoint = null;
    let allLatLng = [];  // To store the sequence of lat, lng for drawing the red line

    data.forEach(event => {
        // Determine the color of the point (red or green)
        let color = (event.Activity === 'Call Drop' || event.Activity === 'Re-Establishment Failure' || event.Activity === 'UE Lost') ? 'red' : 'green';
        
        // Create a marker for each event
        let marker = new google.maps.Marker({
            position: { lat: event.Lat, lng: event.Long },
            map: map,
            title: event.Activity,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: event['Drive/Stationary'] === 'Stationary' ? 10 : 5,  // Larger for stationary
                fillColor: color,
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 1
            }
        });

        // Store the marker
        markers.push(marker);

        // Add the current point to the list of lat/lng for drawing the line
        allLatLng.push(new google.maps.LatLng(event.Lat, event.Long));

        // Connect the current marker to the previous marker with a red line
        if (previousPoint) {
            const linePath = [previousPoint, marker.getPosition()];
            const polyline = new google.maps.Polyline({
                path: linePath,
                geodesic: true,
                strokeColor: 'red',
                strokeOpacity: 1.0,
                strokeWeight: 2
            });
            polyline.setMap(map);
        }

        // Update the previous point to the current marker
        previousPoint = marker.getPosition();
    });

    // Optionally, draw a line connecting all the points at the end (optional)
    if (allLatLng.length > 1) {
        const polyline = new google.maps.Polyline({
            path: allLatLng,
            geodesic: true,
            strokeColor: 'red',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        polyline.setMap(map);
    }
}
