// Define endpoint URL as a constant
const endPointURL = "https://app-907670644284.us-central1.run.app";

// Import Firebase functions (ensure this is at the top of your addMaps.js file)
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const app = Vue.createApp({
    data() {
      return {
        map: null,
        directionsService: null,
        directionsRenderer: null,
        routePolyline: null,
        // search:'',
        waypoints: [],
        markers: [], // Array to store markers
        currentColor: '#FF0000',
        totalDistance: 0,
        geocoder: null, // Add a geocoder for reverse geocoding
        colors: ['#e81416','#ffa500','#faeb36','#79c314','#487de7','#4b369d','#70369d'], // Available colors
        mapsApiKey: '', // Maps API key to be dynamically loaded
        // Alert
        showAlert: false,
        hidden:true,
        alertType: '',
        alertMessage: '', 
        // Post related
        postTitle:'',
        postDescription:'',
        postAnonymously:false,
        userID:'',
        username:'',
        submitting:false,
      };

    },
    methods: {
        async loadGoogleMapsScript() {
            try {
                // Fetch the API key from the Firebase function with CORS enabled
                const response = await fetch(`${endPointURL}/getGoogleMapsApiKey`);
            
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            
                const data = await response.json();
                this.mapsApiKey = data.apiKey;
            
                // Dynamically load Google Maps script with the fetched API key
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${this.mapsApiKey}&callback=initMap`;
                script.async = true;
                script.defer = true;
                document.body.appendChild(script);
            } catch (error) {
                console.error('Error fetching API key:', error);
            }
        },

        createPost() {
            // Ensure the post has a title
            if (this.postTitle.trim() === '') {
                this.alertMsg = 'Post must include a title.';
                this.setAlert('error', this.alertMsg);
                this.alertMsg = '';
                return;
            }
        
            // Ensure there are at least two waypoints
            if (this.waypoints.length < 2) {
                this.setAlert('error', 'You need at least two points to submit the route!');
                return;
            }
        
            // Ensure post description isn't empty, default to 'No description' if it is
            if (this.postDescription.trim() === '') {
                this.postDescription = "No description.";
            }
        
            this.submitting = true;
        
            // Check Firebase Auth to get user details
            const auth = getAuth();
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // User is authenticated
                    const userId = user.uid; // Firebase UID
                    const username = user.username || "Anonymous"; // Use email as username, fallback to "Anonymous" if not present
        
                    // Create the new route object following the new structure
                    const newRoute = {
                        title: this.postTitle,
                        description: this.postDescription,
                        distance: "0km", // Initialize with 0 km as we don't have actual distance data yet
                        location: this.waypoints[0].name || "Unknown Location", // Set location to the first waypoint's name
                        image: "", // Placeholder image
                        date: new Date().toISOString(), // Current timestamp
                        likes: 0, // Initialize likes to 0
                        comments: 0, // Initialize comments to 0
                        modalId: userId + "-modal", // Unique modal ID using userId
                        author: username, // Use the user's email as author
                        commentsList: [], // Initialize with an empty array
                        waypoints: this.waypoints // Pass the waypoints data
                    };
        
                    // Make the API call to create a post using axios
                    axios.post(`${endPointURL}/api/create/`, {
                        route: newRoute, // Send the new route structure to the backend
                        userID: userId
                    })
                    .then(response => {
                        const data = response.data;
                        if (data.id) {
                            // Post was successfully created
                            this.setAlert('success', 'Your post has been successfully created.');
                            // Clear post fields
                            this.postTitle = '';
                            this.postDescription = '';
                            this.postAnonymously = false;
                            this.clearMap();
                        } else {
                            // Something went wrong with the creation
                            this.setAlert('error', 'Failed to create the post. Please try again.');
                        }
                    })
                    .catch((error) => {
                        console.error('Error creating post:', error);
                        this.setAlert('error', 'An error occurred while creating the post.');
                    });
                } else {
                    // User is not authenticated
                    this.setAlert('error', 'You must be logged in to create a post.');
                    window.location.href = 'login.html';
                }
                this.submitting = false;
            });
        },
        clearPost(){
            this.postTitle = '';
            this.postDescription = '';
            this.postAnonymously = false;
            this.clearMap();
            this.setAlert('success', 'Post cleared successfully.');
        },      
        initMap() {
            // Initialize the map and its settings
            this.map = new google.maps.Map(document.getElementById("map"), {
                zoom: 18,
                center: { lat: 1.36241, lng: 103.82606 }, // Singapore's coordinates
                mapTypeId: "roadmap",
                streetViewControl: false,
                styles: [
                    { 
                        "featureType": "road.highway",
                        "elementType": "geometry",
                        "stylers": [
                            { 
                                "visibility": "off" 
                            }
                        ] 
                    },
                    {
                        "featureType": "poi",
                        "elementType": "labels.text",
                        "stylers": [
                        {
                            "visibility": "off"
                        }
                        ]
                    },
                    {
                        "featureType": "poi.business",
                        "stylers": [
                        {
                            "visibility": "off"
                        }
                        ]
                    },
                    {
                        "featureType": "transit.station.bus",
                        "stylers":  [
                        { 
                            "visibility": "off" 
                        }
                        ]
                    }
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
            
            this.geocoder = new google.maps.Geocoder(); // Ensure geocoder is initialized here

            // Fix this part to make sure that search bar is able to auto reload like example in "https://developers.google.com/maps/documentation/javascript/examples/places-searchbox" 
            // // Add the search box and link it to the input element
            // const input = document.getElementById("pac-input");
            // const searchBox = new google.maps.places.SearchBox(input);
            
            // // Bias the SearchBox results towards current map's viewport
            // this.map.addListener("bounds_changed", () => {
            //     searchBox.setBounds(this.map.getBounds());
            // });

            // // Listen for the event fired when the user selects a prediction and retrieve
            // // more details for that place
            // searchBox.addListener("places_changed", () => {
            //     const places = searchBox.getPlaces();

            //     if (places.length === 0) {
            //         return;
            //     }

            //     // Clear out the old markers.
            //     this.markers.forEach((marker) => {
            //         marker.setMap(null);
            //     });
            //     this.markers = [];

            //     // For each place, get the name and location.
            //     const bounds = new google.maps.LatLngBounds();

            //     places.forEach((place) => {
            //         if (!place.geometry || !place.geometry.location) {
            //             console.log("Returned place contains no geometry");
            //             return;
            //         }

            //         // Create a marker for each place
            //         this.addMarker(place.geometry.location);

            //         if (place.geometry.viewport) {
            //             bounds.union(place.geometry.viewport);
            //         } else {
            //             bounds.extend(place.geometry.location);
            //         }
            //     });

            //     this.map.fitBounds(bounds);
            // });

            // Listen for clicks on the map to add waypoints
            this.map.addListener("click", (event) => {
                this.addWaypoint(event.latLng);
            });
            
            // Automatically try to get the user's current location on page load
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        // Pan the map to the user's current location
                        this.map.setCenter(pos);
                    }
                );
            }
        },

        addWaypoint(latLng) {
            // Add a new waypoint
            this.geocoder.geocode({ location: latLng }, (results, status) => {
                if (status === 'OK') {
                    const address = results[0] ? results[0].formatted_address : 'Address not found';
                    this.waypoints.push({
                        location: latLng,
                        stopover: true,
                        address: address // Store the address (street name)
                    });
            
                    // Add a marker for each waypoint
                    this.addMarker(latLng);
                    this.calculateAndDisplayRoute()
                }
            });
        },

        // Make marker "bounce" when hovering over the anchor tag
        startMarkerBounce(index) {
            if(this.submitting){
                return;
            }

            const marker = this.markers[index];
            if (marker && !marker.bounceInterval) { // Ensure bounce starts only once
                this.bounceMarker(marker); // Start the custom bouncing animation
            }
        },
        
        // Stop the marker "bouncing" when mouse leaves
        stopMarkerBounce(index) {
            const marker = this.markers[index];
            if (marker && marker.bounceInterval) {
                clearInterval(marker.bounceInterval); // Stop the bounce
                marker.bounceInterval = null;
                marker.setPosition(marker.originalPosition); // Reset to original position
            }
        },

        // Custom bouncing function
        bounceMarker(marker) {
            const bounceHeight = 0.00015; // How high the marker will "bounce"
            const bounceSpeed = 300; // Speed of the bounce in milliseconds (adjust this to slow down)
            let direction = 1; // Direction of bounce (1 = up, -1 = down)

            marker.originalPosition = marker.getPosition(); // Store original position

            // Set an interval for the bouncing effect
            marker.bounceInterval = setInterval(() => {
                const position = marker.getPosition();
                const newLat = position.lat() + (bounceHeight * direction); // Adjust latitude for bounce
                direction *= -1; // Reverse direction after each bounce (up/down)

                marker.setPosition(new google.maps.LatLng(newLat, position.lng())); // Update marker position
            }, bounceSpeed);
        },

        addMarker(latLng) {
            const markerIndex = this.waypoints.length;  // Adjusting to match array length
        
            // Create a new marker without a label initially
            const marker = new google.maps.Marker({
                map: this.map,
                position: latLng,
                animation: google.maps.Animation.DROP, // Initial drop animation for when marker is added
            });
        
            // Create an InfoWindow for the marker
            const infoWindow = new google.maps.InfoWindow({
                content: `Marker ${markerIndex}<br>Lat: ${latLng.lat().toFixed(5)}, Lng: ${latLng.lng().toFixed(5)}`
            });
        
            // Add event listeners for hovering to show InfoWindow
            marker.addListener("mouseover", () => {
                infoWindow.open(this.map, marker);
            });
            marker.addListener("mouseout", () => {
                infoWindow.close();
            });
        
            // Wait for 700ms (duration of the drop animation) before adding the label
            setTimeout(() => {
                // Add the label after the drop animation
                marker.setLabel({
                    text: `${markerIndex}`, // Display the marker index
                    color: "black", // Label color
                    fontSize: "14px", // Label font size
                    fontWeight: "bold" // Label font weight
                });
            }, 300); // 700ms matches the default Google Maps drop animation duration
        
            // Store the marker in the markers array
            this.markers.push(marker);
        },        

        removeWaypoint(index) {
            if (this.isDeleting) return;  // If a deletion is in progress, don't proceed
        
            this.isDeleting = true;  // Set flag to prevent further clicks
        
            // Add the is-filling class to trigger the animation
            this.waypoints[index].isFilling = true; 
        
            // Wait for the animation to complete (1 second), then remove the item
            setTimeout(() => {
              this.waypoints.splice(index, 1);  // Remove the waypoint from the array
        
              // Remove the corresponding marker from the map
              var marker = this.markers[index];
              if (marker) {
                marker.setMap(null);
                marker.setVisible(false);
                marker = null;
              } else {
                console.error('Marker not found at index:', index);
              }
        
              // Also remove the marker from the markers array
              this.markers.splice(index, 1);
        
              // Recalculate and display the updated route
              this.calculateAndDisplayRoute();
        
              // Update all markers' labels after removing a marker
              this.updateMarkerLabels();
        
              // Allow further deletions after the animation completes
              this.isDeleting = false;
        
            }, 1000);  // Wait for the animation to complete (1 second)
        },        
        
        updateMarkerLabels() {
            this.markers.forEach((marker, index) => {
                // Update the marker label
                marker.setLabel(`${index + 1}`);
                
                // Update the InfoWindow content to reflect the updated marker number
                const infoWindow = new google.maps.InfoWindow({
                    content: `Marker ${index + 1}<br>Lat: ${marker.getPosition().lat().toFixed(5)}, Lng: ${marker.getPosition().lng().toFixed(5)}`
                });
                
                // Update event listeners for the new InfoWindow content
                marker.addListener("mouseover", () => {
                    infoWindow.open(this.map, marker);
                });
                marker.addListener("mouseout", () => {
                    infoWindow.close();
                });
            });
        },
        
        changeColor(color) {
            this.currentColor = color;
            if (this.routePolyline) {
                this.routePolyline.setOptions({ strokeColor: this.currentColor });
            }
        },

        calculateAndDisplayRoute() {
            // Prepare waypoints for the directionsService (only send location and stopover)
            const processedWaypoints = this.waypoints.map(point => ({
                location: point.location,
                stopover: point.stopover
            }));
        
            // If there are fewer than 2 waypoints, clear the route and the polyline
            if (this.waypoints.length < 2) {
                this.clearRoute();
                return;
            }
        
            // Request route directions from the DirectionsService
            this.directionsService.route({
                origin: this.waypoints[0].location,
                destination: this.waypoints[this.waypoints.length - 1].location,
                waypoints: processedWaypoints.slice(1, -1), // Only pass valid waypoint data
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
                    this.setAlert('error','Directions request failed due to ' + status);
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

        clearRoute() {
            this.totalDistance = 0;
            this.routePolyline.setPath([]);  // Clear the polyline
            this.directionsRenderer.set('directions', null); // Clear the DirectionsRenderer
        },

        clearMap() {
            // Clear all markers
            for(let marker of this.markers){
                marker.setVisible(false);
                marker.setMap(null);
                marker.setPosition(null);
                marker = null;
            }
            this.markers = [];

            // Clear waypoints and the route
            this.waypoints = [];
            this.clearRoute();

            this.setAlert('success', 'Route cleared successfully.');
        },

        exportToGoogleMaps() {
            if (this.waypoints.length < 2) {
                this.setAlert('error','You need at least two points to export the route!')
                return;
            }

            let googleMapsLink = 'https://www.google.com/maps/dir/';
            this.waypoints.forEach((waypoint) => {
                googleMapsLink += `${waypoint.location.lat()},${waypoint.location.lng()}/`;
            });
            window.open(googleMapsLink, '_blank');
        },

        dismissAlert() {
            // First, set showAlert to false to trigger the fade-out animation
            this.showAlert = false;
        
            // Then, after a delay (matching the fade-out duration), set hidden to true
            setTimeout(() => {
                this.hidden = true;  // Hide the alert completely after the fade-out animation
                this.alertMessage = '';  // Clear the message if needed
            }, 300); // Adjust this timing to match your CSS transition duration (300ms here)
        },
        
        setAlert(type, message) {
            // First, unhide the alert box
            this.hidden = false;
        
            // Set the alert type and message
            this.alertType = type;
            this.alertMessage = message;
        
            // Add a short delay to trigger the fade-in effect after the alert becomes unhidden
            setTimeout(() => {
                this.showAlert = true;  // Make the alert visible after un-hiding it
            }, 10);  // A small delay (e.g., 10ms) to ensure the DOM reflects the 'hidden' state before showing
        }

    },
    mounted() {
        // Assign initMap as a global function
        window.initMap = this.initMap;

        // Fetch the Google Maps API key from Firebase Functions and load the script
        this.loadGoogleMapsScript();
    }
}).mount('#app');