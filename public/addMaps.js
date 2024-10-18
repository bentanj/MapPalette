const functions = require('firebase-functions');

const app = Vue.createApp({
    data() {
      return {
        map: null,
        directionsService: null,
        directionsRenderer: null,
        routePolyline: null,
        waypoints: [],
        currentColor: '#FF0000',
        totalDistance: 0,
        colors: ['#FF0000', '#008000', '#0000FF', '#800080'], // Available colors
        mapsApiKey: '' // Maps API key to be injected dynamically
      };
    },
    methods: {
      loadGoogleMapsScript() {
        // Dynamically load Google Maps script with API key
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.mapsApiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      },
      initMap() {
        // Initialize the map and its settings
        this.map = new google.maps.Map(document.getElementById("map"), {
          zoom: 14,
          center: { lat: 1.3521, lng: 103.8198 }, // Singapore's coordinates
          mapTypeId: "roadmap",
          styles: [
            { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "visibility": "off" }] }
          ]
        });
  
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
        });
  
        this.routePolyline = new google.maps.Polyline({
          strokeColor: this.currentColor,
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map: this.map
        });
  
        // Listen for clicks on the map to add waypoints
        this.map.addListener("click", (event) => {
          this.addWaypoint(event.latLng);
        });
      },
      addWaypoint(latLng) {
        this.waypoints.push({
          location: latLng,
          stopover: true,
        });
        this.calculateAndDisplayRoute();
      },
      removeWaypoint(index) {
        this.waypoints.splice(index, 1); // Remove the point
        this.calculateAndDisplayRoute();
      },
      changeColor(color) {
        this.currentColor = color;
        if (this.routePolyline) {
          this.routePolyline.setOptions({ strokeColor: this.currentColor });
        }
      },
      calculateAndDisplayRoute() {
        if (this.waypoints.length < 2) return;
  
        this.directionsService.route({
          origin: this.waypoints[0].location,
          destination: this.waypoints[this.waypoints.length - 1].location,
          waypoints: this.waypoints.slice(1, -1), // Waypoints between start and end
          travelMode: 'WALKING',
          avoidHighways: true,
        }, (response, status) => {
          if (status === 'OK') {
            this.directionsRenderer.setDirections(response);
            this.updateDistance(response);
            this.routePolyline.setOptions({
              path: response.routes[0].overview_path,
              strokeColor: this.currentColor
            });
          } else {
            alert('Directions request failed due to ' + status);
          }
        });
      },
      updateDistance(response) {
        this.totalDistance = 0;
        const route = response.routes[0];
        for (let i = 0; i < route.legs.length; i++) {
          this.totalDistance += route.legs[i].distance.value; // Add distance in meters
        }
        this.totalDistance = (this.totalDistance / 1000).toFixed(2); // Convert to km
      },
      clearMap() {
        this.waypoints = [];
        this.totalDistance = 0;
        this.routePolyline.setPath([]);
      },
      exportToGoogleMaps() {
        if (this.waypoints.length < 2) {
          alert("Please plot at least two points to export the route.");
          return;
        }
        let googleMapsLink = 'https://www.google.com/maps/dir/';
        this.waypoints.forEach((waypoint) => {
          googleMapsLink += `${waypoint.location.lat()},${waypoint.location.lng()}/`;
        });
        window.open(googleMapsLink, '_blank');
      }
    },
    mounted() {
      // Assign initMap as a global function
      window.initMap = this.initMap;
  
      // Load MAPSAPIKEY from an environment variable or a server-side API
      this.mapsApiKey = 'AIzaSyAkF7pStoz7or34u6Sd6QeaD4Y2ecwK58A'; // Replace this with dynamic key loading from environment or backend
      
      // Load the Google Maps script
      this.loadGoogleMapsScript();
    }
  }).mount('#app');
  

// let map;
// let directionsService;
// let directionsRenderer;
// let routePolyline;
// let waypoints = [];
// let currentColor = '#FF0000';  // Default route color
// let totalDistance = 0;

// // Initialize and add the map
// function initMap() {
// // Create a map centered at some default coordinates
// map = new google.maps.Map(document.getElementById("map"), {
//     zoom: 14,
//     center: { lat: 1.3521, lng: 103.8198 }, // Default center (Singapore)
//     mapTypeId: "roadmap",
//     styles: [ // Custom Map Style to hide motorways
//     {
//         "featureType": "road.highway",
//         "elementType": "geometry",
//         "stylers": [{ "visibility": "off" }]
//     }
//     ]
// });

// // Directions service and renderer for snapping to roads and showing routes
// directionsService = new google.maps.DirectionsService();
// directionsRenderer = new google.maps.DirectionsRenderer({
//     suppressMarkers: true,
// });

// routePolyline = new google.maps.Polyline({
//     strokeColor: currentColor,
//     strokeOpacity: 1.0,
//     strokeWeight: 4,
//     map: map
// });

// // Add a listener to capture clicks on the map
// map.addListener("click", function(event) {
//     addWaypoint(event.latLng);
// });
// }

// // Add a waypoint to the route
// function addWaypoint(latLng) {
// waypoints.push({
//     location: latLng,
//     stopover: true,
// });

// // Add the clicked point to the point list in the container
// const pointList = document.getElementById("point-list");
// const listItem = document.createElement("li");
// listItem.className = "list-group-item point-item";
// listItem.innerHTML = `
//     Lat: ${latLng.lat().toFixed(5)}, Lng: ${latLng.lng().toFixed(5)}
//     <button class="btn btn-danger btn-sm" onclick="removeWaypoint(${waypoints.length - 1})">Delete</button>
// `;
// pointList.appendChild(listItem);

// // Recalculate the route with snapping to roads
// calculateAndDisplayRoute();
// }

// // Remove a waypoint from the list
// function removeWaypoint(index) {
// waypoints.splice(index, 1); // Remove the point from waypoints array
// const pointList = document.getElementById("point-list");
// pointList.innerHTML = ''; // Clear the current list
// // Re-render the points list
// waypoints.forEach((waypoint, i) => {
//     const listItem = document.createElement("li");
//     listItem.className = "list-group-item point-item";
//     listItem.innerHTML = `
//     Lat: ${waypoint.location.lat().toFixed(5)}, Lng: ${waypoint.location.lng().toFixed(5)}
//     <button class="btn btn-danger btn-sm" onclick="removeWaypoint(${i})">Delete</button>
//     `;
//     pointList.appendChild(listItem);
// });
// calculateAndDisplayRoute();
// }

// // Change the color of the polyline route
// function changeColor(color) {
// currentColor = color;
// if (routePolyline) {
//     routePolyline.setOptions({ strokeColor: currentColor });
// }
// }

// // Calculate and display the route based on waypoints, avoiding motorways
// function calculateAndDisplayRoute() {
// if (waypoints.length < 2) return;

// directionsService.route({
//     origin: waypoints[0].location,
//     destination: waypoints[waypoints.length - 1].location,
//     waypoints: waypoints.slice(1, -1),  // Middle points as waypoints
//     travelMode: 'WALKING',
//     avoidHighways: true, // Avoid highways/motorways
// }, function(response, status) {
//     if (status === 'OK') {
//     directionsRenderer.setDirections(response);

//     // Calculate the total distance of the route
//     totalDistance = 0;
//     const route = response.routes[0];
//     for (let i = 0; i < route.legs.length; i++) {
//         totalDistance += route.legs[i].distance.value;  // distance in meters
//     }
//     document.getElementById("distance").innerText = `Total Distance: ${(totalDistance / 1000).toFixed(2)} km`;
    
//     // Update the polyline color to the selected one
//     routePolyline.setOptions({
//         path: response.routes[0].overview_path,
//         strokeColor: currentColor
//     });
//     } else {
//     window.alert('Directions request failed due to ' + status);
//     }
// });
// }

// // Clear the map and waypoints
// function clearMap() {
// waypoints = [];
// document.getElementById("distance").innerText = 'Total Distance: 0 km';
// routePolyline.setPath([]);  // Clear the polyline
// document.getElementById("point-list").innerHTML = ''; // Clear the point list
// }

// // Export to Google Maps for navigation
// function exportToGoogleMaps() {
// if (waypoints.length < 2) {
//     alert("Please plot at least two points to export the route.");
//     return;
// }
// let googleMapsLink = 'https://www.google.com/maps/dir/';
// waypoints.forEach((waypoint) => {
//     googleMapsLink += `${waypoint.location.lat()},${waypoint.location.lng()}/`;
// });
// window.open(googleMapsLink, '_blank');
// }
