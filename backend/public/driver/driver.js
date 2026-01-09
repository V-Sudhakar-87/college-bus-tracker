const socket = io();
const noSleep = new NoSleep();
let map, marker, watchId;
let isTracking = false;
let routingControl = null;
let stopMarkers = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const role = localStorage.getItem('userRole');
    
    if (!token || role !== 'Driver') {
        alert('Access Denied. Please log in as a Driver.');
        localStorage.clear();
        window.location.href = '../login/index.html';
        return; 
    }

    const storedUserName = localStorage.getItem('userName') || 'Driver User';
    document.getElementById('driver-name').textContent = storedUserName;
    
    initMap(); 
    fetchDriverDetails(token); 

    //  Logout Logic
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            if(isTracking) stopTracking(); 
            localStorage.clear();
            window.location.href = '../login/index.html'; 
        }
    });

    // Tracking Button 
    document.getElementById('start-tracking-btn').addEventListener('click', startTracking);
    document.getElementById('stop-tracking-btn').addEventListener('click', stopTracking);
});

//reconnect
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'visible') {
        if (!socket.connected) {
            socket.connect();
        }
    }
});

// MAP FUNCTIONS

function initMap() {
    map = L.map('route-map-placeholder').setView([8.7139, 77.7567], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    marker = null;
}


// DATA FETCHING FUNCTIONS

async function fetchDriverDetails(token) {
    try {
        const response = await fetch('/api/bus/driver/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
   
       
        const data = await response.json();
       // console.log("Response from Backend:", data);

        if (response.ok) {
            const storedUserName = localStorage.getItem('userName') || 'Driver User';
            document.getElementById('driver-name').textContent = storedUserName;
            document.getElementById('driver-name').textContent = data.driverName;
            document.getElementById('bus-reg-no').textContent = data.busRegNo || 'Not Assigned';

            const routeDisplay = document.getElementById('current-route-name');
            const routeSelector = document.getElementById('route-selector');

            routeSelector.innerHTML = '<option value="">-- Select Route --</option>';
            

            if (data.assignedRoutes && data.assignedRoutes.length > 0) {
                routeSelector.disabled = false;
                const firstRouteStops = data.assignedRoutes[0].stops;
        displayStopsOnMap(firstRouteStops);
                if (routeDisplay) {
            routeDisplay.textContent = data.assignedRoutes[0].routeName;
        }
                data.assignedRoutes.forEach(route => {
                    const option = document.createElement('option');
                    option.value = route._id;
                    option.textContent = route.routeName;
                    routeSelector.appendChild(option);
                });
                
                document.getElementById('start-tracking-btn').disabled = false;
                
            }else {
        if (routeDisplay) routeDisplay.textContent = "No Route Found";
        routeSelector.disabled = true;
    }
            
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}
function isAndroidApp() {
    return typeof window.Android !== "undefined";
}

// LIVE TRACKING LOGIC

function startTracking() {
    const routeId = document.getElementById('route-selector').value;
    const busNo = document.getElementById('bus-reg-no').textContent;
    if (!routeId) {
        alert("Please select a route first!");
        return;
    }
    noSleep.enable(); 
    socket.emit('join-route', routeId);
    startHeartbeat(routeId);
    if (!isAndroidApp() && "geolocation" in navigator) {
        isTracking = true;
        updateUI(true);
        
        watchId = navigator.geolocation.watchPosition(success, handleError, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        });
        //console.log("Tracking started for route:", routeId);
    }
    if (isAndroidApp()) {
        Android.startTracking(routeId, busNo);
    }
    
}

function stopTracking() {
    isTracking = false;
    noSleep.disable();
    const routeId = document.getElementById('route-selector').value;

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    socket.emit('tracking-stopped', { routeId });
    stopHeartbeat();
   /*socket.emit('update-location', { 
        routeId, 
        status: 'offline', 
        busNo: document.getElementById('bus-reg-no').textContent 
    });*/

    document.getElementById('start-tracking-btn').disabled = false;
    document.getElementById('stop-tracking-btn').disabled = true;
    document.getElementById('last-location').textContent = "Tracking Stopped";
   if (isAndroidApp() && window.Android.stopTracking) {
        Android.stopTracking();
    }

}

function androidLocationUpdate(lat, lng) {
    const fakePos = {
        coords: {
            latitude: lat,
            longitude: lng
        }
    };
    success(fakePos); // reuse SAME web logic
}

async function updateLocation(position) {
    const { latitude, longitude } = position.coords;
    const timestamp = new Date().toLocaleTimeString();
    const newPos = [latitude, longitude];

    map.setView(newPos, 16);
    marker.setLatLng(newPos);

    document.getElementById('last-location').innerText = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)} at ${timestamp}`;

}

function updateUI(live) {
    const status = document.getElementById('tracking-status');
    document.getElementById('start-tracking-btn').disabled = live;
    document.getElementById('stop-tracking-btn').disabled = !live;
    document.getElementById('route-selector').disabled = live;

    if(!live)
    {
        status.innerText = "IDLE";
        status.className = "status-badge status-idle";
    }

    if (live) {
        status.innerText = "LIVE";
        status.className = "status-badge status-moving";
    } else {
        status.innerText = "IDLE";
        status.className = "status-badge status-idle";
    }
}

function handleError(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
}

const sidePanel = document.querySelector('.sidebar');
let startY, currentY;

sidePanel.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
        sidePanel.classList.toggle('active');
    }
});

//  Touch/Swipe Logic
sidePanel.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
});

sidePanel.addEventListener('touchmove', (e) => {
    currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    
    if (diff > 50) { // Swipe Up
        sidePanel.classList.add('active');
    } else if (diff < -50) { // Swipe Down
        sidePanel.classList.remove('active');
    }
});


function displayStopsOnMap(stops) {
    stopMarkers.forEach(m => map.removeLayer(m));
    stopMarkers = [];
    
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    if (!stops || stops.length === 0) return;

    const stopCoords = [];

    stops.forEach((stop, index) => {
        const lat = parseFloat(stop.latitude);
        const lng = parseFloat(stop.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            const coord = [lat, lng];
            stopCoords.push(coord);

          const sMarker = L.marker(coord).addTo(map);
          const tripType = getSelectedTripType();
        
            const timeToShow =
             tripType === 'evening'
                  ? stop.expectedTimeEvening
                  : stop.expectedTimeMorning;
            //cursor close to display
            sMarker.bindTooltip(`
                  <div style="font-family: Arial; padding: 5px;">
                  <strong>Stop:</strong>${stop.name}<br>
                  <strong>${tripType === 'evening' ? 'Evening' : 'Morning'} Time:</strong>
        ${timeToShow}
                 </div>`,
                  {
                   permanent: false, 
                   direction: 'top', 
                   opacity: 0.9
                 });
                 //cursor click show permanent
                 sMarker.bindPopup(`<b>${stop.name}</b><br> ${tripType === 'evening' ? 'Evening' : 'Morning'} Time: ${timeToShow}`);
                
                 
        }
    });

    if (stopCoords.length > 1) {
        routingControl = L.Routing.control({
            waypoints: stopCoords.map(coord => L.latLng(coord[0], coord[1])),
            lineOptions: {
                styles: [{
                    color: '#1a428a', 
                    opacity: 0.8, 
                    weight: 6 
                }]
            },
            createMarker: function() { return null; },
            show: false,
            addWaypoints: false,
            routeWhileDragging: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true
        }).addTo(map);
         const startPoint = stopCoords[0];
        map.setView(startPoint, 15);
        // Zoom setup
        const bounds = L.latLngBounds(stopCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
       
    }
    
}
let lastEmitTime = 0;
const EMIT_INTERVAL = 2000; 
function success(pos) {

    const now = Date.now();
    if (now - lastEmitTime < EMIT_INTERVAL) return; 

    lastEmitTime = now;
    const { latitude, longitude } = pos.coords;
    const latlng = [latitude, longitude];
    const routeId = document.getElementById('route-selector').value;
    const busRegNo = document.getElementById('bus-reg-no').textContent;

    if (marker) {
        
        marker.setLatLng(latlng);
        const currentPopup = marker.getPopup();
        if (currentPopup) {
            currentPopup.setContent(`<b>Bus ${busRegNo} </b>`);
        } else {
            marker.bindPopup(`<b>Bus ${busRegNo} </b>`).openPopup();
        }
    } else {
        marker = L.circleMarker(latlng,  {
                radius: 10,
                fillColor: "#ff0000",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
        marker.bindPopup(`<b>Bus ${busRegNo}</b>`);
    }

    map.panTo(latlng ,{ animate: true });

    document.getElementById('last-location').innerText = 
        `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;

    socket.emit('update-location', {
        routeId: routeId,
        latitude: latitude,
        longitude: longitude,
        busNo: busRegNo,
        status: 'online' ,
        tripType: getSelectedTripType()
        
    });
}

function getSelectedTripType() {
    const el = document.getElementById('trip-type');
    return el ? el.value : '';
}

document.getElementById('trip-type')?.addEventListener('change', () => {
    const routeId = document.getElementById('route-selector').value;
    if (!routeId) return;
    fetchDriverDetails(localStorage.getItem('jwtToken'));
});

let heartbeatInterval = null;

function startHeartbeat(routeId) {
  heartbeatInterval = setInterval(() => {
    socket.emit('update-location', {
      routeId,
      heartbeat: true   
    });
  }, 5000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
