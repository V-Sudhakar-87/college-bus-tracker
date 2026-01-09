const socket = io();
let liveMap;
let selectedRouteId = null; 
let liveMarkers = {};
let liveTrackingPaths = {};
 document.addEventListener("DOMContentLoaded", () => {
            showLiveTracking();
            fetchStudentProfile();
        });
function initLiveTrackingMap() {
    liveMap = L.map('live-tracking-map').setView([8.7139, 77.7567], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(liveMap);
    //console.log("Live Map Initialized...");
}
let myAssignedBus = null;
async function fetchStudentProfile() {
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch('/api/bus/student/profile-details', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        //console.log("data ",data);

        if (response.ok) {
            // Corner Form data 
            document.getElementById('studentName').innerText = data.studentName||'-';
            document.getElementById('studentEmail').innerText = data.studentUsername;
            document.getElementById('routeName').innerText = data.routeName;
            document.getElementById('routeDistance').innerText = data.distance + " km";
            myAssignedBus=data.busNo;
            document.getElementById('busNo').innerText = myAssignedBus;
            document.getElementById('driverName').innerText = data.driverName;
            
        }
    } catch (err) {
        console.log(" Data fetch error:", err);
    }
}

const menuBtn = document.getElementById("studentMenuBtn");
const cornerForm = document.getElementById("cornerForm");
const overlay = document.getElementById("cornerOverlay");

menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cornerForm.style.display = "block";
    overlay.style.display = "block";
});

overlay.addEventListener("click", closeCornerForm);

function closeCornerForm() {
    cornerForm.style.display = "none";
    overlay.style.display = "none";
}
function logoutStudent() {
     if (!confirm("Logout from Student Dashboard?")) return;
    localStorage.clear();
    window.location.href = "../login/index.html";
}
document.addEventListener('click', (e) => {
    const sheet = document.getElementById('studentStopSheet');
    const arrow = document.getElementById('sheet-arrow');
    
    if (e.target.closest('#toggleStudentSheet')) {
        sheet.classList.toggle('expanded');
       
    }
});

async function showLiveTracking() {
    const dynamicArea = document.getElementById('dynamic-area');
    if (!dynamicArea) return;

    dynamicArea.innerHTML = `
        <div class="live-tracking-container">
            <div class="live-header-card">
                <h3><i class="fa-solid fa-tower-broadcast" style="color: #ff4d4d;"></i> Fleet Monitoring</h3>
                <div class="live-status-pill">
                    <span id="live-count">0</span> Buses Online
                </div>
            </div>

            <div class="live-content-wrapper">
                <div class="bus-list-panel">
                    <div class="search-container">
                        <input type="text" id="live-search" placeholder="Search Bus No..." onkeyup="filterBuses()">
                    </div>
                    <div id="live-bus-cards-container" class="cards-scroll-area">
                        <p>Loading buses...</p>
                    </div>
                </div>

                <div class="map-display-panel" id="mapPanel">
                    <div class="mobile-map-header">
                      <span class="map-title">Live Map</span>
                      <button id="backToList">← Back</button>
                      
                    </div>
                    <div id="live-tracking-map"></div>
                    <div class="bottom-sheet" id="studentStopSheet">
                        <div class="sheet-header" id="toggleStudentSheet">
                            <div class="sheet-handle"></div>
                            <div class="sheet-title">
                                <span><i class="fas fa-route"></i>Stops&Timeing</span>
                                </div>
                            </div>
                            <div class="sheet-content">
                                <div id="student-stops-list"></div>
                            </div>
                        </div>
                    </div>
            </div>
            <div id="offlineWarning" class="warning-overlay">
                <div class="warning-box">
                    <h4>Bus Not Live</h4>
                    <p>This bus is currently offline.<br>Please check again later.</p>
                    <button onclick="closeWarning()">OK</button>
                </div>
            </div>
        </div>
    `;

    initLiveTrackingMap();
    await loadAllBusesDefault();
    onlineBusSet.clear();
    updateLiveBusCount(); 
    await loadCurrentlyLiveBuses();
}
function showOfflineWarning() {
    document.getElementById("offlineWarning").style.display = "flex";
}

function closeWarning() {
    document.getElementById("offlineWarning").style.display = "none";
}
function closeWarning() {
    // Close warning popup
    const warning = document.getElementById("offlineWarning");
    if (warning) warning.style.display = "none";

    const mapPanel = document.getElementById("mapPanel");
    if (mapPanel && window.innerWidth <= 768) {
        mapPanel.classList.remove("show");
    }

    const list = document.getElementById("live-bus-cards-container");
    if (list) list.scrollTop = 0;
}

async function loadAllBusesDefault() {
    const container = document.getElementById('live-bus-cards-container');
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/api/bus/routes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const routes = await response.json();
        //console.log(" Database Routes:", routes);

        container.innerHTML = routes.map(route => {
            socket.emit('join-route', route._id);
           return `
            <div class="bus-live-card offline" id="card-${route._id}" onclick="handleBusClick('${route._id}')"style="cursor:pointer;">
                <div class="bus-details">
                    <h4 id="bus-no-${route._id}">${route.assignedBusNo || 'No Bus'}</h4>
                    <p><i class="fa-solid fa-route"></i> ${route.routeName}</p>
                    <small id="status-text-${route._id}">Currently Offline</small>
                </div>
                <div class="status-pill" id="pill-${route._id}" style="display: none;">
                    <span class="pulse-dot"></span> LIVE
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        container.innerHTML = "<p>Error loading bus list.</p>";
    }
}
function handleBusClick(routeId) {

    const card = document.getElementById(`card-${routeId}`);
    if (!card) return;

    if (card.classList.contains("offline")) {
        showOfflineWarning();
        return;
    }

    selectedRouteId = routeId;
    viewRouteOnMap(routeId);
    openMobileMap();  
}

let currentPolyline; 
let activeBusData = {};
let routingControl=null; 
let studentSheet, sheetArrow;
let stopMarkers = [];

async function viewRouteOnMap(routeId) {
    selectedRouteId = routeId;
    //console.log("Macha, Loading Route with Markers:", selectedRouteId);
   // if (!liveMap) return;
    const token = localStorage.getItem('jwtToken');
   /* if (routingControl) {
        try {
            liveMap.removeControl(routingControl);
            routingControl = null;
        } catch (e) { console.log("Routing clear error"); }
    }

    stopMarkers.forEach(marker => {
        if (marker && liveMap.hasLayer(marker)) {
            liveMap.removeLayer(marker);
        }
    });
    stopMarkers = [];*/

    Object.values(liveMarkers).forEach(m => liveMap.removeLayer(m));
    liveMarkers = {};

    Object.values(liveTrackingPaths).forEach(p => liveMap.removeLayer(p));
    liveTrackingPaths = {};
    

    try {
        const response = await fetch(`/api/bus/routes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const routes = await response.json();
        const selectedRoute = routes.find(r => r._id === routeId);

        if (!selectedRoute || !selectedRoute.stops || selectedRoute.stops.length === 0) return;
         if (routingControl) liveMap.removeControl(routingControl);
        stopMarkers.forEach(marker => liveMap.removeLayer(marker));
        stopMarkers = [];

        const stopCoords = [];
        
        selectedRoute.stops.forEach((stop, index) => {
            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
            const pos = [lat, lng];
            stopCoords.push(L.latLng(lat, lng));

            const marker = L.marker(pos).addTo(liveMap);
            const tripType = activeBusData[selectedRouteId]?.tripType || 'morning';

           const timeToShow =
           tripType === 'evening'
                ? stop.expectedTimeEvening
                : stop.expectedTimeMorning;
            
            marker.bindTooltip(`<b>Stop:</b> ${stop.name}<br>
                ${tripType === 'evening' ? 'Evening' : 'Morning'} Time: ${timeToShow}`, {
                permanent: false, direction: 'top'
            });

            marker.bindPopup(`<b>${stop.name}</b><br>${tripType === 'evening' ? 'Evening' : 'Morning'} Time: ${timeToShow}`);
            stopMarkers.push(marker);
        });

        routingControl = L.Routing.control({
            waypoints: stopCoords,
            lineOptions: {
                styles: [{ color: '#1a428a', opacity: 0.8, weight: 6 }] // Blue Line
            },
            createMarker: function() { return null; },
            addWaypoints: false,
            draggableWaypoints: false,
            show: false
        }).addTo(liveMap);

        // Map focus setup
        const bounds = L.latLngBounds(stopCoords);
        liveMap.fitBounds(bounds, { padding: [50, 50] });
        const sheetContainer = document.getElementById('student-stops-list');
        if (sheetContainer) sheetContainer.innerHTML = ""; // Clear old stops

        selectedRoute.stops.forEach((stop,index) => {
        
            if (sheetContainer) {
                const tripType = activeBusData[selectedRouteId]?.tripType || 'morning';
                const timeStr = tripType === 'evening' ? stop.expectedTimeEvening : stop.expectedTimeMorning;
                
                sheetContainer.innerHTML += `
            
                    <div class="student-stop-row">
                        <span class="s-name"><i class="fa-solid fa-location-dot"></i>${stop.name}</span>
                        <span class="s-time">${timeStr}</span>
                    </div>
                `;
            }
        });
        
        if (studentSheet) {
            studentSheet.classList.remove('expanded');
            if (sheetArrow) {
                sheetArrow.classList.add('fa-chevron-up');
                sheetArrow.classList.remove('fa-chevron-down');
            }
        }

    } catch (err) {
        console.error("Marker error:", err);
    }
}
let busLiveStatus = {};
let onlineBusSet = new Set();
async function loadCurrentlyLiveBuses() {
    const token = localStorage.getItem('jwtToken');

    const res = await fetch('/api/bus/live', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const liveData = await res.json();

    liveData.forEach(data => {
        socket.emit('join-route', data.routeId);
        handleLiveBusInitial(data);
    });
}
function handleLiveBusInitial(data) {
    const { routeId, latitude, longitude, busNo, tripType } = data;

    const card = document.getElementById(`card-${routeId}`);
    const pill = document.getElementById(`pill-${routeId}`);
    const statusText = document.getElementById(`status-text-${routeId}`);

    if (card) {
        card.classList.remove("offline");
        card.classList.add("online");
        if (pill) pill.style.display = "flex";
        if (statusText) statusText.innerText = "Tracking Live...";
        onlineBusSet.add(routeId);
        updateLiveBusCount();
    }

    activeBusData[routeId] = { tripType: tripType || 'morning' };
    selectedRouteId = routeId;
    viewRouteOnMap(routeId);

    liveMarkers[routeId] = L.circleMarker([latitude, longitude], {
        radius: 10,
        fillColor: "#ff0000",
        color: "#fff",
        weight: 2,
        fillOpacity: 0.8
    })
    .addTo(liveMap)
    .bindPopup(`<b>Bus ${busNo} is LIVE</b>`)
    .openPopup();
}
socket.on('location-receive', (data) => {
    const { routeId, latitude, longitude, busNo, status } = data;
   if (!latitude || !longitude || latitude === "undefined" || longitude === "undefined") {
        return; 
    }
    if (myAssignedBus && busNo === myAssignedBus) {
        const statusBadge = document.getElementById('bus-status-badge');
        if (statusBadge) {
            if (status === 'online') {
                statusBadge.textContent = 'Online';
                statusBadge.className = 'status-badge status-online';
            } else if (status === 'offline') {
                statusBadge.textContent = 'Offline';
                statusBadge.className = 'status-badge status-offline';
            }
        }
    }

    if (!selectedRouteId) {
        selectedRouteId = routeId;
    }
    if (status) {
        busLiveStatus[routeId] = status;
        updateManageBusStatus(routeId, status);
    }
    activeBusData[routeId] = {
    ...(activeBusData[routeId] || {}),
    tripType: data.tripType || 'morning'
    };

    const card = document.getElementById(`card-${routeId}`);
    const pill = document.getElementById(`pill-${routeId}`);
    const statusText = document.getElementById(`status-text-${routeId}`);

    if (card) {
        if (data.status === 'offline') {
            if (onlineBusSet.has(routeId)) {
            onlineBusSet.delete(routeId);
            updateLiveBusCount();
        }
            card.classList.add('offline');
            card.classList.remove('online');
            if (pill) pill.style.display = 'none';
            if (statusText) statusText.innerText = "Offline";
            if (liveMarkers[routeId]) {
                liveMap.removeLayer(liveMarkers[routeId]);
                delete liveMarkers[routeId];
            }
            return;
        }
    if (!onlineBusSet.has(routeId)) {
        onlineBusSet.add(routeId);  
        updateLiveBusCount();
    }
        card.classList.remove('offline');
        card.classList.add('online');
        if (pill) pill.style.display = 'flex';
        if (statusText) statusText.innerText = "Tracking Live...";
        
    }

    
    if (routeId === selectedRouteId) {
        const latlng = [parseFloat(latitude), parseFloat(longitude)];
        if (liveMarkers[routeId]) {
            liveMarkers[routeId].setLatLng(latlng);
            liveMap.panTo(latlng, { animate: true });
        
         const popup = liveMarkers[routeId].getPopup();
          if (popup) {
            popup.setContent(`<b> ${busNo} </b>`);
        } else {
            liveMarkers[routeId]
                .bindPopup(`<b> ${busNo} </b>`);
        }}
       else {
    // create circle marker
    liveMarkers[routeId] = L.circleMarker([latitude, longitude], {
         radius: 10,
                fillColor: "#ff0000",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
    })
    .addTo(liveMap)
    .bindPopup(`<b>Bus No: ${busNo}</b>`).openPopup();
}
        try {
            stopMarkers.forEach(m => {
                if(m.bringToFront) m.bringToFront();
            });
            if (liveMarkers[routeId] && liveMarkers[routeId].bringToFront) {
                liveMarkers[routeId].bringToFront();
            }
        } catch (e) {
            console.log("Visibility error:", e);
        }
    }
});


function filterBuses() {
    const input = document.getElementById("live-search");
    const container = document.getElementById("live-bus-cards-container");

    if (!input || !container) return;

    const query = input.value.toLowerCase().trim();

    // All bus cards
    const cards = Array.from(
        container.querySelectorAll(".bus-live-card")
    );

    cards.sort((a, b) => {

        const aBusNoEl = a.querySelector("h4");
        const bBusNoEl = b.querySelector("h4");

        const aText = aBusNoEl ? aBusNoEl.innerText.toLowerCase() : "";
        const bText = bBusNoEl ? bBusNoEl.innerText.toLowerCase() : "";

        const aMatch = aText.includes(query);
        const bMatch = bText.includes(query);

        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
    });

    cards.forEach(card => container.appendChild(card));

    cards.forEach(card => {
        const busText = card.querySelector("h4")?.innerText.toLowerCase() || "";
        card.classList.toggle("match", query && busText.includes(query));
    });
}


function openMobileMap() {
    if (window.innerWidth > 768) return;

    const mapPanel = document.getElementById("mapPanel");
    if (!mapPanel) return;

    mapPanel.classList.add("show");

    setTimeout(() => {
        if (liveMap) liveMap.invalidateSize();
    }, 300);
}
document.addEventListener("click", (e) => {
    if (e.target.id === "backToList") {
        document.getElementById("mapPanel")?.classList.remove("show");
    }
});


function updateLiveBusCount() {
    const countEl = document.getElementById("live-count");
    if (countEl) {
        countEl.innerText = onlineBusSet.size;
    }
}
function updateManageBusStatus(routeId, status) {
    const statusCell = document.getElementById(`bus-status-${routeId}`);
    if (!statusCell) return;

    statusCell.innerHTML =
        status === 'online'
        ? `<span class="status online">ONLINE</span>`
        : `<span class="status offline">OFFLINE</span>`;
}
