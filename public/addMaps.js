// Define endpoint URL as a constant
const endPointURL = "https://app-907670644284.us-central1.run.app";

// Import Firebase functions (ensure this is at the top of your addMaps.js file)
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { auth } from "./firebase.js"; // Ensure this path matches where firebase.js is located
import { getStorage, ref, uploadString, getDownloadURL, uploadBytes, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { driver } from "./node_modules/driver.js/dist/driver.js.mjs";

const app = Vue.createApp({
    data() {
      return {
        userProfile: {
            name: 'John Doe',
            username: '@johndoe',
            avatar: 'resources/download.jpeg',
            stats: {
                routes: 24,
                following: 156,
                followers: 198
            }
        },
        // Map related
        map: null,
        directionsService: null,
        directionsRenderer: null,
        routePolyline: null,

        // Control related
        waypoints: [],
        markers: [], // Array to store markers
        currentColor: '#e81416',
        totalDistance: 0,
        geocoder: null,
        colors: ['#e81416','#ffa500','#faeb36','#79c314','#487de7','#4b369d','#70369d'], // Colors of the rainbow
        mapsApiKey: '', // Maps API key to be dynamically loaded

        // Alert related
        showAlert: false,
        alertTimeout: null,
        hidden:true,
        alertType: '',
        alertMessage: '', 

        // Post related
        postTitle:'',
        postDescription:'',
        minDescriptionLength: 150, // Minimum character requirement
        userID:'',
        username:'',
        submitting:false,
        formValidated: false,
        API_ENDPOINT: 'https://app-907670644284.us-central1.run.app',
        isFetching: false,
        deleteCountdown: 0,
        deleteTimeout: null,
        deleteModalTitle: "Delete post?",
        storage: null,
        image: '',
        
        // Existing post related
        postId: null,
        isEditing: false,

        // Tour
        tourStarted: false,
      };

    },
    computed:{
        descriptionLength() {
            return this.postDescription.length;
        },
        isSubmitDisabled() {
            return this.descriptionLength < this.minDescriptionLength;
        }
    },
    methods: {

        async loadGoogleMapsScript() {
            try {
                const response = await fetch(`${this.API_ENDPOINT}/getGoogleMapsApiKey`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                this.mapsApiKey = data.apiKey;
                
                // Dynamically load Google Maps script
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.mapsApiKey}&callback=initMap&libraries=places`;
                    script.async = true;
                    script.defer = true;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error("Failed to load Google Maps API"));
                    document.body.appendChild(script);
                });
            } catch (error) {
                console.error('Error fetching API key:', error);
            }
        },
     
        initMap() {
            // Initialize the map and its settings
            this.map = new google.maps.Map(document.getElementById("map"), {
              zoom: 18,
              center: { lat: 1.36241, lng: 103.82606 }, // Singapore's coordinates
              mapTypeId: "roadmap",
              streetViewControl: false,
              mapTypeControl: false,
              gestureHandling: 'greedy',
              styles: [
                {
                  "featureType": "road.highway",
                  "elementType": "geometry",
                  "stylers": [{ "visibility": "off" }]
                },
                {
                  "featureType": "poi",
                  "elementType": "labels",
                  "stylers": [{ "visibility": "off" }]
                },
                {
                  "featureType": "poi.business",
                  "stylers": [{ "visibility": "off" }]
                },
                {
                  "featureType": "transit.station.bus",
                  "stylers": [{ "visibility": "off" }]
                }
              ],
            });
          
            this.directionsService = new google.maps.DirectionsService();
            this.directionsRenderer = new google.maps.DirectionsRenderer({
              suppressMarkers: true,
            });
          
            this.routePolyline = new google.maps.Polyline({
              strokeColor: this.currentColor,
              strokeOpacity: 1.0,
              strokeWeight: 8,
              map: this.map
            });
          
            this.geocoder = new google.maps.Geocoder();

            /* ======== Add Search Box Using map.controls ======== */
            // Get the input element
            const input = document.getElementById("pac-input");
            const searchBox = new google.maps.places.SearchBox(input);

            // Bias the SearchBox results towards current map's viewport
            this.map.addListener("bounds_changed", () => {
                searchBox.setBounds(this.map.getBounds());
            });

            // Listen for the event fired when the user selects a prediction
            searchBox.addListener("places_changed", () => {
                const places = searchBox.getPlaces();
              
                if (places.length === 0) {
                  return;
                }
              
                const place = places[0]; // Get the first place
              
                if (!place.geometry || !place.geometry.location) {
                  console.log("Returned place contains no geometry");
                  return;
                }
              
                // Center the map on the selected place and set zoom to 18
                this.map.setCenter(place.geometry.location);
                this.map.setZoom(18);
            });
            /* ======== End of Search Box Functionality ======== */
          
            // Listen for clicks on the map to add waypoints
            this.map.addListener("click", (event) => {
                this.addWaypoint(event.latLng);
            });
          
            // Automatically try to get the user's current location on page load
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((position) => {
                const pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                // Pan the map to the user's current location
                this.map.setCenter(pos);
              });
            }
        },          

        async addWaypoint(latLng, index = null) {
            return new Promise((resolve) => {
                // Generate a unique ID for the waypoint
                const id = Date.now() + Math.random();
              
                this.geocoder.geocode({ location: latLng }, (results, status) => {
                    if (status === 'OK') {
                        const address = results[0] ? results[0].formatted_address : 'Address not found';
                        this.waypoints.push({
                            id: id,
                            location: { lat: latLng.lat(), lng: latLng.lng() },
                            stopover: true,
                            address: address,
                            order: index !== null ? index : this.waypoints.length // Keep order if index is provided
                        });
        
                        this.addMarker(latLng);
                        this.calculateAndDisplayRoute();
                        resolve(); // Resolve the promise once done
                    } else {
                        console.error('Geocode failed:', status);
                        resolve(); // Resolve to continue even if geocoding fails
                    }
                });
            });
        }
        ,   

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
            // const infoWindow = new google.maps.InfoWindow({
            //     content: `Marker ${markerIndex}<br>Lat: ${latLng.lat().toFixed(5)}, Lng: ${latLng.lng().toFixed(5)}`
            // });
        
            // // Add event listeners for hovering to show InfoWindow
            // marker.addListener("mouseover", () => {
            //     infoWindow.open(this.map, marker);
            // });
            // marker.addListener("mouseout", () => {
            //     infoWindow.close();
            // });
        
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
        },        
        
        updateMarkerLabels() {
            this.markers.forEach((marker, index) => {
                // Update the marker label
                marker.setLabel(`${index + 1}`);
            });
        },
        
        changeColor(color) {
            this.currentColor = color;
            if (this.routePolyline) {
                this.routePolyline.setOptions({ strokeColor: this.currentColor });
            }
        },

        calculateAndDisplayRoute() {
            const processedWaypoints = this.waypoints
                .sort((a, b) => a.order - b.order) // Sort waypoints by order
                .map(point => ({
                    location: point.location,
                    stopover: point.stopover
                }));
        
            if (processedWaypoints.length < 2) {
                this.clearRoute();
                return;
            }
        
            this.directionsService.route({
                origin: processedWaypoints[0].location,
                destination: processedWaypoints[processedWaypoints.length - 1].location,
                waypoints: processedWaypoints.slice(1, -1),
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
                    this.setAlert('error', 'Directions request failed due to ' + status);
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

        clearMap(showAlert = true) {
            // Clear all markers
            for (let marker of this.markers) {
                marker.setVisible(false);
                marker.setMap(null);
                marker.setPosition(null);
                marker = null;
            }
            this.markers = [];
        
            // Clear waypoints and the route
            this.waypoints = [];
            this.clearRoute();
            const input = document.getElementById("pac-input");
            input.value = '';
        
            // Show alert only if showAlert is true
            if (showAlert) {
                this.setAlert('success', 'Route cleared successfully.');
            }
        },
        
        exportToGoogleMaps() {
            if (this.waypoints.length < 2) {
                this.setAlert('error','You need at least two points to export the route!')
                return;
            }

            let googleMapsLink = 'https://www.google.com/maps/dir/';
            this.waypoints.forEach((waypoint) => {
                googleMapsLink += `${waypoint.location.lat},${waypoint.location.lng}/`;
            });
            window.open(googleMapsLink, '_blank');
        },

        dismissAlert() {
            // First, set showAlert to false to trigger the fade-out animation
            this.showAlert = false;
        
            // Then, after a delay (matching the fade-out duration), set hidden to true
            setTimeout(() => {
              this.hidden = true; // Hide the alert completely after the fade-out animation
              this.alertMessage = ''; // Clear the message if needed
            }, 300); // Adjust this timing to match your CSS transition duration
        
            // Clear the timeout if dismissAlert is called manually
            if (this.alertTimeout) {
              clearTimeout(this.alertTimeout);
              this.alertTimeout = null;
            }
        },
        
        setAlert(type, message) {
            // Clear any existing timeout to prevent stacking
            if (this.alertTimeout) {
              clearTimeout(this.alertTimeout);
              this.alertTimeout = null;
            }
        
            // First, unhide the alert box
            this.hidden = false;
        
            // Set the alert type and message
            this.alertType = type;
            this.alertMessage = message;
        
            // Add a short delay to trigger the fade-in effect after the alert becomes unhidden
            setTimeout(() => {
              this.showAlert = true; // Make the alert visible after un-hiding it
            }, 10); // A small delay to ensure the DOM reflects the 'hidden' state before showing
        
            // Automatically dismiss the alert after 10 seconds
            this.alertTimeout = setTimeout(() => {
              this.dismissAlert();
              this.alertTimeout = null; // Reset the timeout ID
            }, 3000); // 10,000 milliseconds = 10 seconds
        },
        
        validateAndSubmit() {
            this.formValidated = true;
            const form = document.querySelector('form');
            
            if (this.descriptionLength < this.minDescriptionLength) {
                this.setAlert('error', `Description must be at least ${this.minDescriptionLength} characters.`);
                return; // Prevent submission
            }

            if (form.checkValidity()) {
                if (!this.isEditing) {
                    // Not the owner, save as a new post
                    this.createPost();
                } else {
                    // User is the owner, edit the existing post
                    this.editPost();
                }
            } else {
                this.setAlert('error', 'Please fill out all required fields.');
            }
        },

        async createPost() {
            if (this.waypoints.length < 2) {
                this.setAlert('error', 'You need at least two points to submit the route!');
                return;
            }
        
            try {
                this.submitting = true; // Show loading overlay
        
                // Get the town name for the first waypoint
                const firstWaypoint = this.waypoints[0].location;
                this.region = await this.getTownName(firstWaypoint.lat, firstWaypoint.lng);
        
                const postId = Date.now();
                await this.captureMapAsImage(postId);
                console.log(this.postTitle, this.postDescription, this.waypoints, this.userID, this.currentColor, this.totalDistance, this.region, this.image);

                const response = await axios.post(`${this.API_ENDPOINT}/api/create/${this.userID}`, {
                    title: this.postTitle,
                    description: this.postDescription,
                    waypoints: this.waypoints,
                    userID: this.userID,
                    color: this.currentColor,
                    distance: this.totalDistance,
                    region: this.region,
                    image: this.image
                });

                if (response.data.id) {
                    this.setAlert('success', 'Your copy has been saved successfully.');
                    this.clearMap(false);
                    this.postTitle = '';
                    this.postDescription = '';
                    this.formValidated = false;
                } else {
                    this.setAlert('error', 'Failed to create the post. Please try again.');
                }
            } catch (error) {
                console.error('Error creating post:', error);
                this.setAlert('error', 'An error occurred while creating the post.');
            } finally {
                this.submitting = false; // Hide loading overlay
            }
        },        

        clearPost(){
            this.postTitle = '';
            this.postDescription = '';
            this.clearMap();
            this.setAlert('success', 'Post cleared successfully.');
        },
        
        getMapIdFromUrl() {
            const params = new URLSearchParams(window.location.search);
            return params.get('id');
        },

        async fetchMapData() {
            if (this.isFetching) return;
            this.isFetching = true;
        
            try {
                const response = await axios.get(`${this.API_ENDPOINT}/api/posts/?id=${this.postId}`);
        
                if (!response.data || Object.keys(response.data).length === 0) {
                    throw new Error("Post not found or already deleted.");
                }
        
                // Load map data into form fields
                this.postTitle = response.data.title;
                this.postDescription = response.data.description;
                this.postIdUserID = response.data.userID;
                this.currentColor = response.data.color;

                // Check if the current user owns the map
                if (this.postIdUserID === this.userID) {
                    // User is the owner, allow editing
                    this.isEditing = true;
                } else {
                    // User is not the owner, set as new map
                    this.postId = null; // Clears postId for new save
                    this.isEditing = false; // Switch to "create" mode
                    this.setAlert('error', 'You are viewing a copy of this map. Changes will save as a new post.');
                }
        
                // Load waypoints as viewable/editable data
                for (const [index, waypoint] of response.data.waypoints.entries()) {
                    const latLng = new google.maps.LatLng(waypoint.location.lat, waypoint.location.lng);
                    await this.addWaypoint(latLng, index); 
                }

                this.fitMapToBounds();
            } catch (error) {
                console.error("Error fetching map data:", error);
                this.setAlert('error', 'This post has been deleted or does not exist.');
                this.isEditing=false;
            } finally {
                this.isFetching = false;
            }
        },

        retBack() {
            window.location.href = "homepage.html";
        },

        async editPost() {
            if (this.postIdUserID !== this.userID) {
                this.setAlert('error', 'You are not authorised to edit this post.');
                return;
            }

            // Ensure the user ID matches the post's user ID before allowing edits
            this.formValidated = true;
            const form = document.querySelector('form');
        
            if (this.waypoints.length < 2) {
                this.setAlert('error', 'You need at least two points to submit the route!');
                return;
            }

            if (form.checkValidity()) {
                // Form is valid, proceed to create the post
                try {
                    this.submitting = true; // Show loading overlay
                    const postId = Date.now();
                    await this.captureMapAsImage(postId);

                    const response = await axios.put(`${this.API_ENDPOINT}/api/posts/?id=${this.postId}`, {
                        title: this.postTitle,
                        description: this.postDescription,
                        waypoints: this.waypoints,
                        color: this.currentColor,
                        image: this.image
                    });
                    if (response.data) {
                        this.setAlert('success', 'Your post has been successfully updated.');
    
                        const modal = new bootstrap.Modal(document.getElementById('editPost'));
                        modal.show();
                    }
                } catch (error) {
                    console.error('Error updating post:', error);
                    this.setAlert('error', 'Failed to update the post. Please try again.');
                } finally {
                    this.submitting = false; // Hide loading overlay
                }
            } else {
                // Form is invalid, display validation errors
                this.setAlert('error', 'Please fill out all required fields.');
            }
        },

        undoChanges() {
            window.location.reload();
        },

        deletePost() {
            // Start the countdown without deleting the post immediately
            if (this.postIdUserID !== this.userID) {
                this.setAlert('error', 'You are not authorised to edit this post.');
                return;
            };
            this.deleteCountdown = 3;
            this.deleteModalTitle = "Post deleted!";
            this.startDeleteCountdown();
          },
        
        async performDelete() {
        // Only perform delete if countdown completes without interruption
        try {
            // Check if an image path is associated with the post
            if (this.image) {
            const imageRef = ref(getStorage(), this.image);
            await deleteObject(imageRef);
            };

            await axios.delete(`${this.API_ENDPOINT}/api/posts/?id=${this.postId}`);
            this.setAlert("success", "Your post has been successfully deleted.");
            window.location.href = "homepage.html"; // Redirect to homepage
        } catch (error) {
            console.error("Error deleting post:", error);
            this.setAlert("error", "Failed to delete the post. Please try again.");
        }
        },
    
        startDeleteCountdown() {
        // Start countdown
        this.deleteTimeout = setInterval(() => {
            if (this.deleteCountdown > 1) {
            this.deleteCountdown -= 1;
            } else {
            clearInterval(this.deleteTimeout);
            this.performDelete(); // Proceed with the actual delete
            }
        }, 1000); // 1-second interval
        },
    
        undoDelete() {
            // Stop countdown and reset
            clearInterval(this.deleteTimeout);
            this.deleteCountdown = 0;
            this.resetDeleteModal();
            this.setAlert("success", "Post deletion undone.");
        },
    
        resetDeleteModal() {
            // Reset modal to initial state
            this.deleteCountdown = 0;
            this.deleteModalTitle = "Delete post?";
        },

        // Capture map as image and upload to Firebase Storage
        async captureMapAsImage(postId) {
            // Define originalControls at the start so it’s accessible throughout the function
            let originalControls;
        
            try {
                // Hide markers temporarily for a clean capture
                this.markers.forEach(marker => marker.setVisible(false));
        
                const mapContainer = document.getElementById("map");
                
                // Save original dimensions
                const originalHeight = mapContainer.style.height;
                const originalWidth = mapContainer.style.width;
                
                // Calculate height for 4:3 aspect ratio based on current width
                const containerWidth = mapContainer.clientWidth;
                const targetHeight = containerWidth * (3 / 4);
        
                // Set the map to the 4:3 aspect ratio
                mapContainer.style.height = `${targetHeight}px`;
        
                // Define bounds based on waypoints
                const bounds = new google.maps.LatLngBounds();
                this.waypoints.forEach(point => bounds.extend(new google.maps.LatLng(point.location.lat, point.location.lng)));
        
                // Apply bounds with extra padding
                this.map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
        
                // Temporarily disable controls and store original settings
                originalControls = {
                    zoomControl: this.map.get('zoomControl'),
                    fullscreenControl: this.map.get('fullscreenControl'),
                    streetViewControl: this.map.get('streetViewControl'),
                    mapTypeControl: this.map.get('mapTypeControl')
                };
                this.map.setOptions({
                    zoomControl: false,
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false
                });
        
                // Allow the map to adjust before capture
                await new Promise(resolve => setTimeout(resolve, 500));
        
                // Adjust zoom level if necessary
                const currentZoom = this.map.getZoom();
                this.map.setZoom(currentZoom - 1);
                await new Promise(resolve => setTimeout(resolve, 300));
        
                // Capture the map view as an image with html2canvas
                const canvas = await html2canvas(mapContainer, {
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff"
                });
        
                const imageData = canvas.toDataURL("image/png");
        
                // Upload the captured image to Firebase
                const storageRef = ref(this.storage, `maps_created/${postId}.png`);
                await uploadString(storageRef, imageData, 'data_url');
                this.image = await getDownloadURL(storageRef);
        
                // Reset the map container to its original dimensions
                mapContainer.style.height = originalHeight;
                mapContainer.style.width = originalWidth;
        
            } catch (error) {
                console.error("Error capturing map as image:", error);
            } finally {
                // Restore original controls
                if (originalControls) {
                    this.map.setOptions(originalControls);
                }
        
                // Show markers again after capture
                if (this.isEditing) {
                    this.markers.forEach(marker => marker.setVisible(true));
                }
            }
        },

        fitMapToBounds() {
            const bounds = new google.maps.LatLngBounds();
            this.waypoints.forEach(point => {
                bounds.extend(new google.maps.LatLng(point.location.lat, point.location.lng));
            });
        
            // Apply padding and fit map to bounds
            this.map.fitBounds(bounds, 250); 
            this.map.panToBounds(bounds);
        },        

        startTour() {
            const driverObj = driver({
                showProgress: true,
                steps: [
                    {
                        element: '#map',
                        popover: {
                            title: 'Map Interaction',
                            description: 'Use scroll to zoom in and out of the map.',
                            position: 'top',
                        },
                    },
                    {
                        element: '#pac-input',
                        popover: {
                            title: 'Search Location',
                            description: 'Enter a location in the search bar, then press Enter or click a suggestion.',
                            position: 'bottom',
                        },
                    },
                    {
                        element: '#map',
                        popover: {
                            title: 'Plot a Waypoint',
                            description: 'Click on the map to plot a waypoint. Each click adds a new point.',
                            position: 'top',
                        },
                        onNext: () => {
                            const mapCenter = this.map.getCenter();
                            this.addWaypoint(mapCenter);
                        },
                    },
                    {
                        element: '#colorPalette',
                        popover: {
                            title: 'Change Route Color',
                            description: 'Click on a color to change the route color.',
                            position: 'top',
                        },
                    },
                    {
                        element: '.btn.btn-danger.m-1',
                        popover: {
                            title: 'Clear Route',
                            description: 'Click here to clear all waypoints instantly.',
                            position: 'left',
                        },
                    },
                    {
                        element: '#export-button',
                        popover: {
                            title: 'Export Route',
                            description: 'Click here to export your route to Google Maps.',
                            position: 'left',
                        },
                    },
                    {
                        element: 'form',
                        popover: {
                            title: 'Add Post Details',
                            description: 'Provide a title and description for your route. These fields are required.',
                            position: 'top',
                        },
                    },
                    {
                        element: '.btn.btn-danger.w-100',
                        popover: {
                            title: 'Delete Post',
                            description: 'Click here to delete this post if needed.',
                            position: 'left',
                        },
                    },
                    {
                        element: '.btn.btn-primary.w-100',
                        popover: {
                            title: 'Create Post',
                            description: 'Click here to create a post for your route.',
                            position: 'top',
                        },
                    },
                ],
            });
        
            driverObj.drive();
        },

        async getTownName(lat, lng) {
            try {
                const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                    params: {
                        latlng: `${lat},${lng}`,
                        key: this.mapsApiKey,
                    }
                });
        
                // Check if results are available and find town/locality
                if (response.data.results && response.data.results.length > 0) {
                    const addressComponents = response.data.results[0].address_components;
                    const town = addressComponents.find(component => 
                        component.types.includes("locality") || component.types.includes("sublocality")
                    );
                    return town ? town.long_name : "Unknown Town";
                } else {
                    console.warn('No results found for the given coordinates.');
                    return "Unknown Town";
                }
            } catch (error) {
                console.error('Error fetching town name:', error);
                return "Error Fetching Town";
            }
        },
        
        
    },
    created() {
        // Assign initMap as a global function to initialize the map once the API loads
        window.initMap = () => this.initMap();
        this.storage = getStorage();

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is authenticated
                this.userID = user.uid;
                this.username = user.email;
                
                // Determine if editing or creating a new post
                this.postId = this.getMapIdFromUrl();
                this.isEditing = !!this.postId;
    
                try {
                    // Ensure Google Maps API is loaded before continuing
                    await this.loadGoogleMapsScript();
    
                    if (this.isEditing) {
                        // Fetch existing map data only after Google Maps API has loaded
                        await this.fetchMapData();
                    } else {
                        // Initialize new map for post creation
                        this.initMap();
                    }
                } catch (error) {
                    console.error("Failed to load Google Maps API:", error);
                }
            } else {
                // Redirect to login if not authenticated
                window.location.href = "index.html";
            }
        });
    },
});

app.component('nav-bar', {
    // get user profile from parent
    props: ['user_profile'], 
    
    data() {
        return {
            currentPage: '',
            defaultAvatar: 'resources/download.jpeg'
        }
    },

    mounted() {
        this.currentPage = window.location.pathname.split('/').pop() || 'homepage.html';
    },

    methods: {
        isCurrentPage(pageName) {
            return this.currentPage === pageName;
        },
        isSearchRelatedPage() {
            return ['routes.html', 'friends.html'].includes(this.currentPage);
        },
        isProfileRelatedPage() {
            return ['profile_page.html', 'settings_page.html'].includes(this.currentPage);
        }
    },

    template: `
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <div class="container-fluid">
                <a class="navbar-brand" href="homepage.html">
                    <img src="resources/mappalettelogo.png" alt="MapPalette Logo" style="width: 40px; height: 40px" >MapPalette
                </a>
                <button class="navbar-toggler" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav" 
                        aria-expanded="false" 
                        aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item">
                            <a class="nav-link" 
                               :class="{ 'active': isCurrentPage('homepage.html') }" 
                               href="homepage.html">Feed</a>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" 
                               :class="{ 'active': isSearchRelatedPage() }"
                               href="#" 
                               id="searchDropdown" 
                               role="button" 
                               data-bs-toggle="dropdown" 
                               aria-expanded="false">
                                Search
                            </a>
                            <ul class="dropdown-menu" aria-labelledby="searchDropdown">
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('routes.html') }"
                                       href="routes.html">Routes</a>
                                </li>
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('friends.html') }"
                                       href="friends.html">Friends</a>
                                </li>
                            </ul>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" 
                               :class="{ 'active': isCurrentPage('addMaps.html') }"
                               href="addMaps.html">Draw</a>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle d-flex align-items-center profile-link"
                               :class="{ 'active': isProfileRelatedPage() }"
                               href="#" 
                               id="profileDropdown" 
                               role="button" 
                               data-bs-toggle="dropdown" 
                               aria-expanded="false">
                                <img :src="user_profile?.avatar || defaultAvatar" 
                                     alt="Profile" 
                                     class="rounded-circle" 
                                     width="50" 
                                     height="50">
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end" 
                                aria-labelledby="profileDropdown">
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('profile_page.html') }"
                                       href="profile_page.html">Your Profile</a>
                                </li>
                                <li>
                                    <a class="dropdown-item" 
                                       :class="{ 'active': isCurrentPage('settings_page.html') }"
                                       href="settings_page.html">Settings</a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#">Log Out</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `
});

app.component('site-footer', {
    template: `
    <footer class="footer-wrapper text-center">
        <div class="container p-5">
            <!-- Grid row -->
            <div class="row align-items-center">
                <div class="col-lg-4 col-md-6 mb-4 mb-md-0">
                    <h5 class="text-uppercase fw-bold">MapPalette</h5>
                </div>

                <div class="col-lg-4 col-md-6 mb-4 mb-md-0">
                    <h6 class="fw-bold">Contact us</h6>
                    <p class="mb-1">mappalette@gmail.com</p>
                    <p class="mb-1">+65-687654321</p>
                    <p>81 Victoria St, Singapore 188065</p>
                </div>

                <div class="col-lg-4 col-md-12 text-md-end">
                    <a href="#" class="me-3"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="me-3"><i class="fab fa-linkedin-in"></i></a>
                    <a href="#" class="me-3"><i class="fab fa-twitter"></i></a>
                    <a href="#" class="text-white"><i class="fab fa-instagram"></i></a>
                </div>
            </div>
            <hr class="my-4">
            <div class="text-center">
                <p class="mb-0">&copy; 2024. All rights reserved.</p>
            </div>
        </div>
    </footer>
    `
});

app.mount("#app");