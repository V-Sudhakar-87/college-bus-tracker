let map;
const socket = io();

// API Fetching and Display Functions

async function fetchRoutesList() {
    const tableBody = document.getElementById('routes-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6">Fetching routes from server...</td></td>';

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/api/bus/routes', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const routes = await response.json();

       // console.log('Fetched Routes Data:', routes);

        if (response.ok) {
            if (routes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No routes found. Click "ADD NEW ROUTE" to create one.</td></tr>';
                return;
            }

            tableBody.innerHTML = routes.map(route => {
                const stopsCount = route.stops ? route.stops.length : 0;
                const driver = route.driverName || 'Not Assigned';
                const busNumber = route.assignedBusNo || 'Not Assigned';

                return `
                    <tr>
                        <td>${route._id.substring(0, 5)}...</td> 
                        <td>${busNumber}</td>
                        <td>${route.routeName}</td>
                        <td>${stopsCount} Stops</td>
                        <td>${route.totalDistance} km</td> 
                        <td>${driver}</td>
                        <td>
                            <button class="action-btn danger-btn delete-route-btn" data-route-id="${route._id}">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');

            document.querySelectorAll('.delete-route-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const routeId = e.currentTarget.dataset.routeId; 
                    deleteRoute(routeId);
                });
            });

        } else {
            tableBody.innerHTML = `<tr><td colspan="6">API Error: ${routes.message || 'Failed to fetch routes.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Fetch error during routes list:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Server connection error. Check if Node.js server is running.</td></tr>';
    }
}

//  Driver List Fetch 

async function fetchDriversList() {
    const tableBody = document.getElementById('drivers-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5">Fetching drivers from server...</td></tr>';

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/api/users/drivers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const drivers = await response.json();
        //console.log('Fetched Drivers Data:', drivers);

        if (response.ok) {
            if (drivers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">No drivers found. Click "ADD NEW DRIVER" to create one.</td></tr>';
                return;
            }

            tableBody.innerHTML = drivers.map(driver => {
                const busDisplay = driver.assignedBus || 'N/A';
                return `
                    <tr>
                        <td>${driver._id.substring(0, 5)}...</td>
                        <td>${driver.name}</td>
                        <td>${driver.username}</td>
                        <td>${busDisplay}</td>
                        <td>
                            <button class="action-btn danger-btn delete-driver-btn" data-driver-id="${driver._id}">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');
            setupDeleteListeners();
        } else {
            tableBody.innerHTML = `<tr><td colspan="5">Error: ${drivers.message || 'Failed to fetch drivers.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Fetch error during drivers list:', error);
        tableBody.innerHTML = '<tr><td colspan="5">Server connection error. Check Node.js server.</td></tr>';
    }
}

//  Student List Fetch 

async function fetchStudentsList() {
    const tableBody = document.getElementById('students-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5">Fetching students from server...</td></tr>';

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/api/users/students', { 
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const students = await response.json();
        //console.log('Fetched Students Data:', students);

        if (response.ok) {
            if (students.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">No students found. Click "ADD NEW STUDENT" to create one.</td></tr>';
                return;
            }

            tableBody.innerHTML = students.map(student => {
                const routeDisplay = student.assignedbusRoute || 'N/A';
                const stopDisplay = student.assignedStop || 'N/A';
                return `
                    <tr>
                        <td>${student._id.substring(0, 5)}...</td>
                        <td>${student.name}</td>
                        <td>${student.username}</td>
                        <td>${student.assignedBus || 'N/A'}</td>
                        <td>${student.routeName || 'N/A'}</td>
                        <td>${student.assignedStop || 'N/A'}</td>
                        <td>
                            <button class="action-btn danger-btn delete-student-btn" data-student-id="${student._id}">Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');
            setupDeleteListeners();
        } else {
            tableBody.innerHTML = `<tr><td colspan="5">Error: ${students.message || 'Failed to fetch students.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Fetch error during students list:', error);
        tableBody.innerHTML = '<tr><td colspan="5">Server connection error. Check Node.js server.</td></tr>';
    }
}

//  System Overview Stats Fetching


async function fetchSystemStats() {
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/api/bus/stats', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const stats = await response.json();

            document.getElementById('total-buses').textContent = stats.totalBuses || 0;
            document.getElementById('active-routes').textContent = stats.activeRoutes || 0;
            document.getElementById('total-drivers').textContent = stats.totalDrivers || 0;

        } else {
            console.error('Failed to fetch system stats.');
        }
    } catch (error) {
        console.error('Error fetching system stats:', error);
    }
}

//  Route & Bus Management Functions 

//  Route Creation Helpers (Dynamic Stops)

function getInitialStopHtml() {
    return `
        <div class="stop-field-group">

            <!-- Stop name + Pick -->
            <div class="form-group-inline ">
                
                    <label class="full-label">Stop Name (Start / End)</label>
                    <div class="name-pick-row">
                    <input type="text" class="stop-name" required
                           placeholder="E.g., College Main Gate"  id="stopName0">
              <input type="hidden" id="stopLat0" class="stop-lat" data-index="0">
              <input type="hidden" id="stopLng0" class="stop-lng" data-index="0">
              <button type="button" class="btn-picker"
                        onclick="openMapPicker(0)">
                    <i class="fas fa-map-marker-alt"> Pick</i>
                </button>  </div>
            </div>

            <!-- Morning / Evening -->
            <div class="form-group-inline two-col">
                <div>
                    <label>Morning Time</label>
                    <input type="time" class="stop-time-morning" id="stopMorningTime0" required>
                </div>
                <div>
                    <label>Evening Time</label>
                    <input type="time" class="stop-time-evening" id="stopEveningTime0" required>
                </div> 
                <!-- Remove -->
                <button type="button"
                        class="remove-stop-btn danger-btn"
                        onclick="removeStopField(this)">
                    Remove
                </button>
            </div>

        </div>
    `;
}

function addStopField() {
    const container = document.getElementById('stops-container');
    const newStopIndex = container.querySelectorAll('.stop-field-group').length;

    const stopGroup = document.createElement('div');
    stopGroup.className = 'stop-field-group';

    stopGroup.innerHTML = `
        <!-- Stop name + Pick -->
        <div class="form-group-inline">
            
                <label  class="full-label">Stop Name</label>
                <div class="name-pick-row">
                <input type="text" class="stop-name" required
                       placeholder="E.g., Stop ${newStopIndex + 1}" id="stopName${newStopIndex}">
        <input type="hidden" id="stopLat${newStopIndex}" class="stop-lat" data-index="${newStopIndex}">
        <input type="hidden" id="stopLng${newStopIndex}" class="stop-lng" data-index="${newStopIndex}">
            <button type="button" class="btn-picker"
                    onclick="openMapPicker(${newStopIndex})">
                <i class="fas fa-map-marker-alt">Pick</i> 
            </button> </div>
        </div>

        <!-- Morning / Evening -->
        <div class="form-group-inline two-col">
            <div>
                <label>Morning Time</label>
                <input type="time" class="stop-time-morning" id="stopMorningTime${newStopIndex}" required>
            </div>
            <div>
                <label>Evening Time</label>
                <input type="time" class="stop-time-evening" id="stopEveningTime${newStopIndex}"required>
            </div>
            <button type="button"
                    class="remove-stop-btn danger-btn"
                    onclick="removeStopField(this)">
                Remove
            </button>
        </div> 
    `;

    container.appendChild(stopGroup);
}


function removeStopField(button) {
    const container = document.getElementById('stops-container');
    if (container.querySelectorAll('.stop-field-group').length > 1) {
        button.closest('.stop-field-group').remove();
    } else {
        alert("A route must have at least one stop.");
    }
}

//  3. Route Creation Handler 

async function handleRouteCreation(event) {
    event.preventDefault();

    const form = event.target;
    const routeName = form.querySelector('#routeName').value.trim();
    const capacity = parseInt(form.querySelector('#routeCapacity').value);
    const assignedBusNo = document.getElementById('assignedBusId').value.trim();
    const stopGroups = form.querySelectorAll('.stop-field-group');
    const stops = [];

    stopGroups.forEach((group, index) => {

    const name = group.querySelector('.stop-name').value.trim();
    const morningTime = group.querySelector('.stop-time-morning').value;
    const eveningTime = group.querySelector('.stop-time-evening').value;

    const lat = group.querySelector('.stop-lat').value;
    const lng = group.querySelector('.stop-lng').value;

    if (name && morningTime && eveningTime) {
        stops.push({
            name,
            expectedTimeMorning: morningTime,
            expectedTimeEvening: eveningTime,
            expectedTime: morningTime,
            sequence: index + 1,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
        });
    }
});

    if (!routeName || !capacity) {
        alert('Please fill in Route Name and Capacity.');
        return;
    }
    if (stops.length === 0) {
        alert('Please add at least one stop for the route.');
        return;
    }

    const routeData = { routeName, maxCapacity: capacity, stops, assignedBusNo: assignedBusNo || null };
    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch('/api/bus/routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(routeData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('New Route created successfully!');
            document.getElementById('route-form-modal').style.display = 'none'; 
            form.reset();
            fetchRoutesList();
            fetchSystemStats();

        } else {
            alert(`Failed to create Route: ${data.message || 'Unknown error'}`);
        }

    } catch (error) {
        console.error('Error creating route:', error);
        alert('Server connection error. Could not create route.');
    }
}

//  Bus Creation Handler 

async function handleBusCreation(event) {
    event.preventDefault();
    const form = event.target;
    const busRegNo = form.querySelector('#busRegNo').value.trim();
    const maxCapacity = parseInt(form.querySelector('#busMaxCapacity').value, 10);
    //const driverId = form.querySelector('#busDriverId').value.trim() || null;

    if (isNaN(maxCapacity) || maxCapacity <= 0) {
        alert('Please enter a valid Max Capacity (a number greater than 0).');
        return;
    }
    if (!busRegNo) {
        alert('Please provide Bus Registration Number');
        return;
    }
    
    const payload = { busRegNo, maxCapacity };
    //if (driverId) payload.driverId = driverId; 

    //console.log('Creating bus with payload:', payload);

    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch('/api/bus/buses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                busRegNo,
                maxCapacity,
                //driverId: driverId || undefined
            })
        });

        const text = await response.json();
        let data;
        try { data =JSON.parse(text); } catch(e) { data = text; }

        //console.log('Create bus response status:', response.status, 'body:', data);
        if (response.ok) {
            alert(`Bus '${busRegNo}' created.`);
            const modal = document.getElementById('bus-form-modal');
            if (modal) modal.style.display = 'none';
            fetchBusesList();
            fetchSystemStats();
        } else {
            alert(text.message || 'Failed to create bus.');
            console.error('Bus creation error:', text);
        }
    } catch (err) {
        console.error('Network error:', err);
        alert('Network error: could not create bus. Check server.');
    }
}

//  Route & Bus Management Functions (NEW)

//  Bus List Fetch 
async function fetchBusesList() {
    const tableBody = document.getElementById('buses-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Fetching buses from server...</td></tr>';

    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch('/api/bus/buses', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }
        });

        let buses = [];
        try { buses = await response.json(); } catch(e) { buses = null; }

        if (response.ok && Array.isArray(buses)) {
            if (buses.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No buses found. Click "ADD NEW BUS" to create one.</td></tr>';
                return;
            }
            tableBody.innerHTML = buses.map(bus => {
                const driverName = bus.driver ? (bus.driver.name || bus.driver) : 'Unassigned';
                const routeName = bus.currentRoute ? (bus.currentRoute.routeName || bus.currentRoute) : 'Unassigned';
                const cap = bus.maxCapacity || bus.capacity || 'N/A';
                const status = bus.status || 'Idle';
           
                return `
                  <tr>
                    <td>${bus.busRegNo || 'N/A'}</td>
                    <td>${cap}</td>
                    <td>${driverName}</td>
                    <td>${routeName}</td>
                    <td id="bus-status-${bus.currentRoute?._id}" class="status-cell">
                        <span class="status offline">OFFLINE</span>
                    </td>
                    <td>
                      <button class="action-btn danger-btn delete-bus-btn" data-bus-id="${bus._id}">Delete</button>
                    </td>
                  </tr>
                `;
            }).join('');

            setupBusTableDelegation();
            setupDeleteListeners();
            Object.entries(busLiveStatus).forEach(([routeId, status]) => {
            updateManageBusStatus(routeId, status);
             });

        } else {
            const msg = buses && buses.message ? buses.message : `Server returned status ${response.status}`;
            tableBody.innerHTML = `<tr><td colspan="6">Error fetching buses: ${msg}</td></tr>`;
            console.error('fetchBusesList error:', msg);
        }
    } catch (error) {
        console.error('Error fetching buses:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Server connection error.</td></tr>';
    }
}

function setupBusTableDelegation() {
    const body = document.getElementById('buses-table-body');
    if (!body) return;
    body.removeEventListener('click', onBusTableClick);
    body.addEventListener('click', onBusTableClick);
}
function onBusTableClick(e) {
    const edit = e.target.closest('.edit-bus-btn');
    const del = e.target.closest('.delete-bus-btn');
    if (edit) {
        const id = edit.dataset.busId;
        console.log('Edit bus', id);
        
    } else if (del) {
        const id = del.dataset.busId;
        if (confirm('Delete this bus?')) {
            deleteBus(id); 
        }
    }
}
//systemoverview mobile responsive only
function toggleOverview() {
    
    const cards = document.getElementById("stats-cards");
    const icon = document.querySelector(".overview-toggle-icon");

    if (!cards || !icon) return;

    cards.classList.toggle("show");
    icon.classList.toggle("rotate");
}
document.addEventListener("click", function (e) {
    const header = document.getElementById("overviewHeader");
    if (!header) return;

    if (header.contains(e.target)) {
        toggleOverview();
    }
});


//  Modal and Form Submission Handlers

// Driver Creation Handler
async function handleDriverCreation(e) {
    e.preventDefault();

    const token = localStorage.getItem('jwtToken');
    const name = document.getElementById('driverName').value.trim();
    const username = document.getElementById('driverUsername').value.trim();
    const password = document.getElementById('driverPassword').value.trim();
    const assignedBusId = document.getElementById('assignedBusId').value;

    if (!name || !username || !password || !assignedBusId) {
        alert('Please fill in all fields for the Driver.');
        return;
    }

    try {
        const response = await fetch('/api/users/drivers', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, username, password, assignedBusId })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            document.getElementById('driver-form-modal').style.display = 'none';
            document.getElementById('driver-creation-form').reset();
            fetchDriversList(); 
            fetchSystemStats();
        } else {
            alert(`Driver Creation Failed: ${result.message || 'Server error.'}`);
        }
    } catch (error) {
        console.error('Driver creation error:', error);
        alert('Network error during driver creation.');
    }
}

// Student Creation Handler 
async function handleStudentCreation(e) {
    e.preventDefault();

    const token = localStorage.getItem('jwtToken');
    const name = document.getElementById('studentName').value.trim();
    const username = document.getElementById('studentUsername').value.trim();
    const password = document.getElementById('studentPassword').value.trim();
    const assignedStop = document.getElementById('assignedStop').value.trim();
    const assignedBus = document.getElementById('assignedBus').value.trim();
    
    if (!name || !username || !password || !assignedBus || !assignedStop) {
        alert('Please fill in all required fields for the Student.');
        return;
    }

    try {
        const response = await fetch('/api/users/students', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, username, password, assignedBus, assignedStop })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            document.getElementById('student-form-modal').style.display = 'none';
            document.getElementById('student-creation-form').reset();
            fetchStudentsList(); 
        } else {
            alert(`Student Creation Failed: ${result.message || 'Server error.'}`);
        }
    } catch (error) {
        console.error('Student creation error:', error);
        alert('Network error during student creation.');
    }
}


//  User Management Listeners Setup 
function setupUserManagementListeners() {
    
    const tabs = document.querySelectorAll('.user-tabs button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');

            tabs.forEach(t => {
                t.classList.remove('active-tab', 'primary-btn');
                t.classList.add('secondary-btn');
            });
            tabContents.forEach(content => content.classList.remove('active-content'));

            tab.classList.add('active-tab', 'primary-btn');
            tab.classList.remove('secondary-btn');
            document.getElementById(targetId).classList.add('active-content');

            if (targetId === 'student-manager') {
                fetchStudentsList();
            } else {
                fetchDriversList();
            }
        });
    });

    const driverModal = document.getElementById('driver-form-modal');
    const addDriverBtn = document.getElementById('add-driver-btn');
    const closeDriverModal = document.getElementById('close-driver-modal');
    const driverForm = document.getElementById('driver-creation-form');

    if (addDriverBtn) addDriverBtn.onclick = () => { driverForm.reset(); driverModal.style.display = 'block'; }
    if (closeDriverModal) closeDriverModal.onclick = () => { driverModal.style.display = 'none'; }

    if (driverForm) driverForm.addEventListener('submit', handleDriverCreation);


    const studentModal = document.getElementById('student-form-modal');
    const addStudentBtn = document.getElementById('add-student-btn'); 
    const closeStudentModal = document.getElementById('close-student-modal');
    const studentForm = document.getElementById('student-creation-form');

    if (document.getElementById('student-manager').querySelector('button')) {
        addStudentBtn.onclick = () => { studentForm.reset(); studentModal.style.display = 'block'; }
    }


    if (studentForm) studentForm.addEventListener('submit', handleStudentCreation);

    window.addEventListener('click', (event) => {
        if (event.target == driverModal) {
            driverModal.style.display = 'none';
        }
        if (studentModal && event.target == studentModal) {
            studentModal.style.display = 'none';
        }
    });
    
    if (closeStudentModal) {
        closeStudentModal.onclick = () => {
            studentModal.style.display = 'none';
        }
    }

    window.addEventListener('click', (event) => {
       
        if (studentModal && event.target == studentModal) {
            studentModal.style.display = 'none';
        }
    });
    
}

//  Initialization and Event Listeners 

document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('jwtToken');
    const role = localStorage.getItem('userRole');

    if (!token || role !== 'Incharge') {
        alert('Access Denied. Please log in as an Incharge.');
        localStorage.clear();
        window.location.href = '../login/index.html';
        return;
    }

    const storedUserName = localStorage.getItem('userName') || 'Incharge User';
    document.getElementById('incharge-name').textContent = storedUserName;
    document.querySelector('.main-header h2').textContent = `Welcome, ${storedUserName}!`;
    const dynamicArea = document.getElementById('dynamic-area');
    if (dynamicArea) {
        dynamicArea.innerHTML = `
            <h3>Route & Bus Status</h3>
            <div id="bus-cards-grid">
                <p class="loading-text">Loading Dashboard Data...</p>
            </div>
        `;
    }
    fetchSystemStats();
    loadDashboardCards()
    setupMobileMenuToggle()
    
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.clear();
            window.location.href = '../login/index.html';
        }
    });

    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
            e.target.closest('li').classList.add('active');

            const area = document.getElementById('dynamic-area');
            const linkId = e.target.closest('a').id;
            

            if (linkId === 'bus-route-link') {

                area.innerHTML = `
                    <div class="route-management-container">
                        <h3>Manage Routes & Buses</h3>
                        <div class="user-tabs">
                            <button class="action-btn primary-btn active-tab" data-target="Route-manager">Manage Routes</button>
                            <button class="action-btn secondary-btn" data-target="Bus-manager">Manage Bus</button>
                        </div>

                        
                        <div id="Route-manager" class="tab-content active-content">
                        <button id="add-route-btn" class="action-btn primary-btn">+ ADD NEW ROUTE</button>
                        
                        <div class="data-table-wrapper">
                            <p>Current Routes in System:</p>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Route ID</th>
                                        <th>Bus No</th>
                                        <th>Route Name</th>
                                        <th>Stops</th>
                                        <th>Distance (km)</th>
                                        <th>Assigned Driver</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="routes-table-body">
                                    <tr><td colspan="6">Loading routes...</td></tr>
                                </tbody>
                            </table>
                        </div>
                     </div>
                   <div id="Bus-manager" class="tab-content">
                       <button id="add-bus-btn" class="action-btn primary-btn">+ ADD NEW BUS</button>
                       <div class="data-table-wrapper">
                           <p>Current Buses in System:</p>
                           <table class="data-table">
                           <thead>
                           <tr>
                           <th>Reg. No.</th><th>Capacity</th><th>Driver</th><th>Current Route</th><th>Status</th><th>Actions</th>
                           </tr>
                          </thead>
                         <tbody id="buses-table-body">
                         <tr><td colspan="6">Loading buses...</td></tr>
                         </tbody>
                         </table>
                        </div>
                    </div>
                        <div id="route-form-modal" class="modal">
                            <div class="modal-content">
                                <span class="close-btn" id="close-route-modal">&times;</span>
                                <h4>Create New Route</h4>
                                <form id="route-creation-form">
                                <label for="assignedBusId">Assign Bus:</label>
                                <input type="text" id="assignedBusId" name="assignedBusId" style="text-transform: uppercase;" placeholder="Enter Bus ID (e.g. TN01 A 1234)">
                                <label for="routeName">Route Name:</label>
                                <input type="text" id="routeName" required>
                                <!-- 🔥 IMPORTANT: Capacity field -->
                                <label for="routeCapacity">Max Capacity:</label>
                                <input type="number" id="routeCapacity" min="1" value="50" required>
                                <div id="stops-container">
                                <h5>Stops (Minimum 2 required)</h5>
                                <!-- Initial stop group -->
                                ${getInitialStopHtml()}
                                </div>
                                <button type="button" id="add-stop-btn"class="action-btn secondary-btn">+ Add Stop</button>
                                <button type="submit" class="action-btn success-btn">Save Route</button>
                                 </form>

                            </div>
                        </div>
                    </div>
                   ${getBusFormModalHtml()}
                `;

                fetchRoutesList();
                

                document.getElementById('add-route-btn').addEventListener('click', () => {
                    const modal = document.getElementById('route-form-modal');
                    const stopsContainer = document.getElementById('stops-container');

                    modal.style.display = 'block';

                    if (stopsContainer && stopsContainer.querySelectorAll('.stop-field-group').length === 0) {
                        stopsContainer.insertAdjacentHTML('beforeend', getInitialStopHtml());
                    }
                });

                document.getElementById('close-route-modal').addEventListener('click', () => {
                    document.getElementById('route-form-modal').style.display = 'none';
                });

                const addStopBtn = document.getElementById('add-stop-btn');
                if (addStopBtn) {
                    addStopBtn.addEventListener('click', addStopField);
                }

                const routeForm = document.getElementById('route-creation-form');
                if (routeForm) {
                    routeForm.addEventListener('submit', handleRouteCreation);
                }
(function bindRouteBusTabsAndButtons() {
    const areaEl = document.getElementById('dynamic-area'); 
    if (!areaEl) return;

    const routesTabBtn = areaEl.querySelector('[data-target="Route-manager"]');
    const busesTabBtn  = areaEl.querySelector('[data-target="Bus-manager"]');

    const routeSection = areaEl.querySelector('#Route-manager');
    const busSection   = areaEl.querySelector('#Bus-manager');

    function showTab(tabName) {
        if (tabName === 'routes') {
            routeSection && routeSection.classList.add('active-content');
            busSection && busSection.classList.remove('active-content');
            routesTabBtn && routesTabBtn.classList.add('active-tab', 'primary-btn');
            busesTabBtn && busesTabBtn.classList.remove('active-tab', 'primary-btn');
            fetchRoutesList();
        } else {
            busSection && busSection.classList.add('active-content');
            routeSection && routeSection.classList.remove('active-content');
            busesTabBtn && busesTabBtn.classList.add('active-tab', 'primary-btn');
            routesTabBtn && routesTabBtn.classList.remove('active-tab', 'primary-btn');
            fetchBusesList();
        }
    }

    if (routesTabBtn) routesTabBtn.addEventListener('click', () => showTab('routes'));
    if (busesTabBtn)  busesTabBtn.addEventListener('click',  () => showTab('buses'));

    const busForm = document.getElementById('bus-creation-form');
    if (busForm) busForm.addEventListener('submit', handleBusCreation);
    const addBusBtn = areaEl.querySelector('#add-bus-btn');
    if (addBusBtn) {
        addBusBtn.addEventListener('click', () => {
            const modal = document.getElementById('bus-form-modal');
            if (!modal) {
                console.warn('bus-form-modal not found in DOM');
                return;
            }
            const form = modal.querySelector('#bus-creation-form');
            if (form) form.reset();
            modal.style.display = 'block';
        });
    }

    const closeBusBtn = document.getElementById('close-bus-modal');
    if (closeBusBtn) closeBusBtn.addEventListener('click', () => {
        const modal = document.getElementById('bus-form-modal');
        if (modal) modal.style.display = 'none';
    });

    document.addEventListener('click', (ev) => {
        if (ev.target && ev.target.id === 'cancel-bus-btn') {
            const modal = document.getElementById('bus-form-modal');
            if (modal) modal.style.display = 'none';
        }
    });

    showTab('routes');
})();


            } else if (linkId === 'user-management-link') {

                area.innerHTML = `
                    <div class="user-management-container">
                        <h3>User Management</h3>
                        
                        <div class="user-tabs">
                            <button class="action-btn primary-btn active-tab" data-target="driver-manager">Manage Drivers</button>
                            <button class="action-btn secondary-btn" data-target="student-manager">Manage Students</button>
                        </div>

                        <div id="driver-manager" class="tab-content active-content">
                            <h4>Driver Accounts</h4>
                            <button id="add-driver-btn" class="action-btn success-btn">+ ADD NEW DRIVER</button>
                            
                            <div class="data-table-wrapper">
                                <p>Current Drivers:</p>
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Username</th>
                                            <th>Assigned Bus</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="drivers-table-body">
                                        <tr><td colspan="5">Loading drivers...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div id="student-manager" class="tab-content">
                            <h4>Student Accounts</h4>
                            <button id="add-student-btn" class="action-btn success-btn">+ ADD NEW STUDENT</button>
                            
                            <div class="data-table-wrapper">
                                <p>Current Students:</p>
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Username</th>
                                            <th>Assigned Bus</th>
                                            <th>Assigned Route</th>
                                            <th>Assigned Stop</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="students-table-body">
                                        <tr><td colspan="6">Loading students...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div id="driver-form-modal" class="modal">
                        <div class="modal-content">
                            <span class="close-btn" id="close-driver-modal">&times;</span>
                            <h4>Add New Driver</h4>
                            <form id="driver-creation-form">
                                <label for="driverName">Driver Name:</label>
                                <input type="text" id="driverName" required>
                                
                                <label for="assignedBusId">Assign Bus:</label>
                                <input type="text" id="assignedBusId" style="text-transform: uppercase;" name="assignedBusId" placeholder="Enter Bus ID (e.g., TN01 A 1234)"> 
                                
                                <label for="driverUsername">Username (Login ID):</label>
                                <input type="text" id="driverUsername" required><br>

                                <label for="driverPassword">Password:</label>
                                <input type="text" id="driverPassword" required><br>
                                
                                <button type="submit" class="action-btn primary-btn">Save Driver</button>
                            </form>
                        </div>
                    </div>

                    <div id="student-form-modal" class="modal">
                        <div class="modal-content">
                            <span class="close-btn" id="close-student-modal">&times;</span>
                            <h4>Add New Student</h4>
                            <form id="student-creation-form">
                                <label for="studentName">Student Name:</label>
                                <input type="text" id="studentName" required>
                                
                                <label for="studentUsername">Username (Roll No / ID):</label>
                                <input type="text" id="studentUsername" required><br>

                                <label for="studentPassword">Password:</label>
                                <input type="text" id="studentPassword" required><br>
                                
                                <label for="assignedBus">Assigned Bus NO:</label>
                               <input type="text" id="assignedBus" style="text-transform: uppercase;" name="assignedBus" placeholder="Enter Bus ID (e.g., TN01 A 1234)"> 
                               
                                <label for="assignedStop">Assigned Stop Name:</label>
                                <input type="text" id="assignedStop" required placeholder="E.g., Anna Nagar Stop 5"><br>
                                
                                <button type="submit" class="action-btn primary-btn">Save Student</button>
                            </form>
                        </div>
                    </div>
                `;
                fetchDriversList();
                setupUserManagementListeners();
            }
             else if (linkId === 'Dashboard'){
                area.innerHTML = `
                `;
            loadDashboardCards()
            } else {
               showLiveTracking()
            
            }
        });
    });
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        //  Outside Click Logic

        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 768) {

                const isSidebarOpen = sidebar.classList.contains('open');

                if (isSidebarOpen && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                    sidebar.classList.remove('open'); 
                }
            }
        });
       
    }
});

// SECTION 4: DELETE Logic and Listeners

//  DELETE API Call & Confirmation Logic

function setupDeleteListeners() {

    const studentDeleteButtons = document.querySelectorAll('.delete-student-btn');
    studentDeleteButtons.forEach(button => {
        button.removeEventListener('click', handleDeleteClick);
        button.addEventListener('click', handleDeleteClick);
    });

    const driverDeleteButtons = document.querySelectorAll('.delete-driver-btn');
    driverDeleteButtons.forEach(button => {
        button.removeEventListener('click', handleDeleteClick);
        button.addEventListener('click', handleDeleteClick);
    });
    const busDeleteButtons = document.querySelectorAll('.delete-bus-btn');
    busDeleteButtons.forEach(button => {
        button.removeEventListener('click', handleBusDeleteClick);
        button.addEventListener('click', handleBusDeleteClick);
    });
}

function handleDeleteClick(event) {
    const button = event.currentTarget;
    const isStudent = button.classList.contains('delete-student-btn');

    const userId = isStudent ? button.dataset.studentId : button.dataset.driverId;
    const role = isStudent ? 'Student' : 'Driver';

    confirmAndDeleteUser(userId, role);
}
function handleBusDeleteClick(event) {
    const button = event.currentTarget;
    const busId = button.dataset.busId;

    if (!confirm('Are you sure you want to permanently delete this bus? This action cannot be undone.')) {
        return;
    }

    deleteBus(busId);
}

//  DELETE Logic and Listeners

function showDeleteConfirmationModal(userId, role) {
    const modalHtml = `
        <div id="delete-modal" class="modal-overlay">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3>Confirm Deletion</h3>
                <p>Are you sure you want to permanently delete this **${role}**? This action cannot be undone.</p>
                <div class="modal-actions">
                    <button id="confirm-delete-btn" 
                            data-user-id="${userId}" 
                            data-role="${role}" 
                            class="action-btn danger-btn">
                        Yes, Delete ${role}
                    </button>
                    <button id="cancel-delete-btn" class="action-btn secondary-btn">Cancel</button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('delete-modal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const deleteModal = document.getElementById('delete-modal');
    deleteModal.style.display = 'flex'; 

    document.querySelector('.close-modal').onclick = () => deleteModal.remove();
    document.getElementById('cancel-delete-btn').onclick = () => deleteModal.remove();

    document.getElementById('confirm-delete-btn').onclick = function () {
        confirmAndDeleteUser(userId, role);
        deleteModal.remove();
    };
}

//confirmAndDeleteUser function

async function confirmAndDeleteUser(userId, role) {
    const token = localStorage.getItem('jwtToken');
    const deleteUrl = `/api/users/${userId}`;
    try {
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 204) {
            alert(`${role} successfully deleted.`);
            if (role === 'Student') {
                fetchStudentsList();
            } else if (role === 'Driver') {
                fetchDriversList();
                fetchSystemStats();
            }
        } else {
            let errorMessage = `Deletion failed! Server responded with Status: ${response.status}.`;

            if (response.headers.get('content-type')?.includes('application/json')) {
                const errorData = await response.json();
                errorMessage = `Deletion failed (Status: ${response.status}): ${errorData.message || 'Unknown Error'}`;
            } else {
                errorMessage += '\nPlease check your Server Console (Node.js) for the actual API error.';
            }

            alert(errorMessage);
        }

    } catch (error) {
        console.error('Error during deletion:', error);
        alert('Client-side error. Could not connect to server.');
    }
}

// delete-Route

async function deleteRoute(routeId) {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) {
        return;
    }

    const token = localStorage.getItem('jwtToken');
    const deleteUrl = `/api/bus/routes/${routeId}`;

    try {
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Route deleted successfully!`);
            fetchRoutesList(); 
            fetchSystemStats();
        } else {
            alert(`Failed to delete Route: ${data.message || 'Unknown error'}`);
        }

    } catch (error) {
        console.error('Error deleting route:', error);
        alert('Server connection error. Could not delete route.');
    }
}

function getBusFormModalHtml() {
    return `
        <div id="bus-form-modal" class="modal" style="display:none;">
            <div class="modal-content">
                <span class="close-btn" id="close-bus-modal">&times;</span>
                <h4>Add New Bus</h4>
                <form id="bus-creation-form">
                    <label for="busRegNo">Bus Registration Number:</label>
                    <input type="text" id="busRegNo" name="busRegNo" style="text-transform: uppercase;" required placeholder="E.g., TN 01 AA 1234">

                    <label for="busMaxCapacity">Max Passenger Capacity:</label>
                    <input type="number" id="busMaxCapacity" name="busMaxCapacity" required min="1" value="50">
                    <

                   
                    <div style="margin-top:16px;">
                      <button type="submit" class="action-btn primary-btn">Save Bus</button>
                      <button type="button" class="action-btn secondary-btn" id="cancel-bus-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupMobileMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-btn');
    const navMenu = document.getElementById('sidebar-nav-menu');
    const overlay = document.getElementById('menu-overlay'); 

    if (toggleButton && navMenu && overlay) {

        const toggleMenu = (shouldClose = false) => {
            const isCurrentlyActive = navMenu.classList.contains('active');
            if (shouldClose && !isCurrentlyActive) {
                return; 
            }

            navMenu.classList.toggle('active', shouldClose ? false : !isCurrentlyActive);
            overlay.classList.toggle('active', shouldClose ? false : !isCurrentlyActive);

            const icon = toggleButton.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times'); 
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars'); 
                }
            }
        };

        toggleButton.addEventListener('click', () => toggleMenu());

        overlay.addEventListener('click', () => toggleMenu(true)); 

        const menuItems = navMenu.querySelectorAll('a');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    setTimeout(() => toggleMenu(true), 100);
                }
            });
        });

        //console.log("Mobile Menu Toggle setup complete with overlay close logic.");

    } else {
        console.error("ERROR: Mobile menu elements not found. Check IDs: menu-toggle-btn, sidebar-nav-menu, or menu-overlay.");
    }
}

//  DELETE BUS API CALL

async function deleteBus(busId) {
    const token = localStorage.getItem('jwtToken') || '';
    const deleteUrl = `/api/bus/buses/${busId}`;

    try {
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let text = await response.text();
        let data;
        try { data = text ? JSON.parse(text) : {}; } catch (e) { data = text; }

        if (response.ok) {
            alert('Bus deleted successfully.');
            if (typeof fetchBusesList === 'function') fetchBusesList();
            if (typeof fetchSystemStats === 'function') fetchSystemStats();
        } else {
            const msg = (data && data.message) ? data.message : `Failed to delete bus. Status ${response.status}`;
        }
    } catch (err) {
        console.error('Network error while deleting bus:', err);
        alert('Network error. Could not delete bus. Check server.');
    }
}


async function loadDashboardCards() {
    const dynamicArea = document.getElementById('dynamic-area');
    dynamicArea.innerHTML = '<h3>Live Route Overview</h3><div class="cards-container" id="cards-grid">Loading...</div>';

    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch('/api/bus/routes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const routes = await response.json();

        const cardsGrid = document.getElementById('cards-grid');
        cardsGrid.innerHTML = ''; 

        routes.forEach(route => {
            const card = document.createElement('div');
            card.className = 'bus-card-dynamic';
            const driver = route.driverName || 'Not Assigned';
            const stopsPreview = route.stops.map(s => s.name).slice(0, 2).join(', ') + (route.stops.length > 2 ? '...' : '');

            card.innerHTML = `
                <h4><i class="fas fa-bus"></i> ${route.assignedBusNo || 'No Bus'}</h4>
                <div class="card-info">
                    <p><strong>Route:</strong> ${route.routeName}</p>
                    <p><strong>Driver:</strong> ${driver}</p>
                    <p><strong>km:</strong>${route.totalDistance}</p>
                    <p><strong>Stops:</strong> ${stopsPreview}</p>   
                </div>
                <div class="card-actions">
                    <button class="btn-view view-route-btn" onclick="viewRouteMap('${route._id}')">View Route</button>
                    <button class="btn-view view-stops-btn" onclick="showStopDetails('${route._id}')">Stop Details</button>
                </div>
            `;
            cardsGrid.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading dashboard cards:", err);
    }
}

function showDashboard() {
    const dynamicArea = document.getElementById('dynamic-area');
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    const dashLink = document.getElementById('Dashboard') || document.querySelector('nav ul li:first-child');
    if(dashLink) dashLink.parentElement.classList.add('active');

    dynamicArea.innerHTML = `
        <h3>Route & Driver Status</h3>
        <div id="bus-cards-grid">
            <p class="loading-text">Loading Dashboard Data...</p>
        </div>
    `;

    fetchSystemStats();
    loadDashboardCards();
}

document.querySelector('nav ul li:first-child a').addEventListener('click', (e) => {
    e.preventDefault();
    loadDashboardCards();
});
async function showStopDetails(routeId) {
    const dynamicArea = document.getElementById('dynamic-area');
    const token = localStorage.getItem('jwtToken');

    try {
        dynamicArea.innerHTML = '<h3><i class="fas fa-spinner fa-spin"></i> Fetching Stop Details...</h3>';

        const response = await fetch('/api/bus/routes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const routes = await response.json();
        const route = routes.find(r => r._id === routeId);

        if (route) {
            dynamicArea.innerHTML = `
                <div class="stop-details-form-view">
                    <div class="form-header-inline">
                        <h3><i class="fas fa-info-circle"></i> Route: ${route.routeName}</h3>
                        <button class="btn-back" onclick="showDashboard()">
                            <i class="fas fa-arrow-left"></i> Back to Dashboard
                        </button>
                    </div>

                    <div class="static-details-top">
                        <div class="detail-item">
                            <label><i class="fa-solid fa-bus"></i> Bus No:</label>
                            <span>${route.assignedBusNo || 'Not Assigned'}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fa-regular fa-user"></i> Driver Name:</label>
                            <span>${route.driverName || 'N/A'}</span>
                        </div>
                    </div>

                    <div class="stops-table-container">
                        <h4><i class="fa-solid fa-bus"></i>Stops & <i class="fa-regular fa-clock"></i>Timings</h4>
                        <table class="stops-view-table">
                            <thead>
                                <tr>
                                    <th><b><i class="fas fa-map-marker-alt"></i></b>Stop Name</th>
                                    <th><b><i class="far fa-clock"></i></b>Expected Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${route.stops.map(stop => `
                                    <tr>
                                        <td><i class="fas fa-map-marker-alt"></i> ${stop.name}</td>
                                        <td>
                                         <div><b>Am:</b> ${stop.expectedTimeMorning || '-'}</div>
                                         <div><b>Pm:</b>${stop.expectedTimeEvening || '-'}</div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error("Error:", err);
        dynamicArea.innerHTML = '<h3 style="color:red;">Error loading details.</h3>';
    }
}

//map function

async function viewRouteMap(routeId) {
    const dynamicArea = document.getElementById('dynamic-area');
    const token = localStorage.getItem('jwtToken');

    // Container setup
    dynamicArea.innerHTML = `
        <div class="map-view-container">
            <div class="view-header" style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <h3><i class="fas fa-map-marked-alt"></i> Route Map View</h3>
                <button class="btn-back" onclick="showDashboard()" style="background:#1a428a; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                </button>
            </div>
            <div id="route-map" style="height: 500px; width: 100%; border-radius: 12px; border: 2px solid #ddd; background: #f9f9f9;">
                <p style="padding:20px;">Loading Map Data...</p>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/bus/routes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const routes = await response.json();
        const route = routes.find(r => r._id === routeId);

        if (route && route.stops && route.stops.length > 0) {
            setTimeout(() => {
                const mapContainer = document.getElementById('route-map');
                mapContainer.innerHTML = ""; 
                const firstLat = parseFloat(route.stops[0].latitude);
                const firstLng = parseFloat(route.stops[0].longitude);

                if (isNaN(firstLat) || isNaN(firstLng)) {
                    mapContainer.innerHTML = "<p style='color:red; padding:20px;'>Error: Valid coordinates not found in DB!</p>";
                    return;
                }

                // Map set Tirunelveli
                const map = L.map('route-map').setView([firstLat, firstLng], 14);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                const stopCoords = [];
                route.stops.forEach(stop => {
                   const lat = parseFloat(stop.latitude);
                   const lng = parseFloat(stop.longitude);

                   if (!isNaN(lat) && !isNaN(lng)) {
                   const pos = [lat, lng];
                   stopCoords.push(pos);

                   // Marker create
                  const marker = L.marker(pos).addTo(map);

                  //  Tooltip: Cursor automatic display 
                  marker.bindTooltip(`
                  <div style="font-family: Arial; padding: 5px;">
                  <strong>Stop:</strong> ${stop.name}<br>
                  <strong>Expected Time</strong><br>Am: ${stop.expectedTimeMorning}<br>Pm:${stop.expectedTimeEvening}
                 </div>`,
                  {
                   permanent: false, 
                   direction: 'top', 
                   opacity: 0.9
                 });

                  //  Popup: Click permanent
                 marker.bindPopup(`<b>${stop.name}</b><br><b>Expected Time</b><br> Am: ${stop.expectedTimeMorning}<br> Pm:${stop.expectedTimeEvening} `);
                 }
                });

               if (stopCoords.length > 1) {
                   L.Routing.control({
                   waypoints: stopCoords.map(coord => L.latLng(coord[0], coord[1])),
                   lineOptions: {
                   styles: [{
                    color: '#1a428a', 
                    opacity: 0.8, 
                    weight: 6 }]
                    },
                   createMarker: function() { return null; }, 
                   show: false ,
                   addWaypoints: false, 
                   routeWhileDragging: false,
                   draggableWaypoints: false
                   }).addTo(map);

                   // Zoom setup
                   const bounds = L.latLngBounds(stopCoords);
                   map.fitBounds(bounds);
                }
            }, 300);
        }
    } catch (err) {
        console.error("Dashboard Map Error:", err);
    }
}
let pickerMap;
let currentMarker;
let selectedCoords = null;
let activeStopIndex = null;

// Map Picker
function openMapPicker(index) {
    activeStopIndex = index;
    document.getElementById('map-picker-modal').style.display = "block";
    
    setTimeout(() => {
        if (!pickerMap) {
            // Tirunelveli set center as default
            pickerMap = L.map('picker-map').setView([8.7139, 77.7567], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(pickerMap);

            pickerMap.on('click', function(e) {
                if (currentMarker) pickerMap.removeLayer(currentMarker);
                currentMarker = L.marker(e.latlng).addTo(pickerMap);
                selectedCoords = e.latlng;
            });
        } else {
            pickerMap.invalidateSize(); 
        }
    }, 200);
}

function closeMapPicker() {
    document.getElementById('map-picker-modal').style.display = "none";
}

// Confirm button logic
document.getElementById('confirm-location').addEventListener('click', async () => {
    if (selectedCoords && activeStopIndex !== null) {
        const lat = selectedCoords.lat;
        const lng = selectedCoords.lng;

        document.getElementById(`stopLat${activeStopIndex}`).value = lat;
        document.getElementById(`stopLng${activeStopIndex}`).value = lng;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            
            if (data && data.display_name) {
                const addressParts = data.display_name.split(',');
                const locationName = addressParts[0] + (addressParts[1] ? ', ' + addressParts[1] : '');

                document.getElementById(`stopName${activeStopIndex}`).value = locationName;
            }
        } catch (error) {
            console.error("Error fetching location name:", error);
        }

        const btn = document.querySelectorAll('.btn-picker')[activeStopIndex];
        btn.style.background = "#28a745";
        btn.innerHTML = '<i class="fas fa-check"></i> Set';
        
        closeMapPicker();
    } else {
        alert("Click on the location on the map and mark it.!");
    }
});


let liveMap;
let selectedRouteId = null; 
let liveMarkers = {};
let liveTrackingPaths = {};

function initLiveTrackingMap() {

    liveMap = L.map('live-tracking-map').setView([8.7139, 77.7567], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(liveMap);
   // console.log("Live Map Initialized...");
}

async function showLiveTracking() {
    const dynamicArea = document.getElementById('dynamic-area');
    if (!dynamicArea) return;

    // 1. Layout structure
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
    syncLiveBusesOnLoad();
    updateLiveBusCount(); 
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
                <div class="bus-live-card offline" id="card-${route._id}" onclick="handleBusClick('${route._id}')" style="cursor:pointer;">
                    <div class="bus-details">
                        <h4 id="bus-no-${route._id}">${route.assignedBusNo || 'No Bus'}</h4>
                        <p><i class="fa-solid fa-route"></i> ${route.routeName}</p>
                        <small id="status-text-${route._id}">Currently Offline</small>
                    </div>
                    <div class="status-pill" id="pill-${route._id}" style="display: none;">
                        <span class="pulse-dot"></span> LIVE
                    </div>
                </div>
            `;
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
let stopMarkers = []; 

async function viewRouteOnMap(routeId) {
    selectedRouteId = routeId;
    //console.log("Loading Route with Markers:", selectedRouteId);
    
    const token = localStorage.getItem('jwtToken');
    
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
                styles: [{ color: '#1a428a', opacity: 0.8, weight: 6 }] 
            },
            createMarker: function() { return null; },
            addWaypoints: false,
            draggableWaypoints: false,
            show: false
        }).addTo(liveMap);

        const bounds = L.latLngBounds(stopCoords);
        liveMap.fitBounds(bounds, { padding: [50, 50] });

    } catch (err) {
        console.error("Macha, Marker error:", err);
    }
}
let busLiveStatus = {};
let onlineBusSet = new Set();
socket.on('location-receive', (data) => {
    const { routeId, latitude, longitude, busNo, status } = data;
       if (!latitude || !longitude || latitude === "undefined" || longitude === "undefined") {
        return; 
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
            popup.setContent(`<b>Bus ${busNo} </b>`);
        } else {
            liveMarkers[routeId]
                .bindPopup(`<b>Bus ${busNo} </b>`);
        }} 
       else {
    //  create circle marker
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

function updateManageBusStatus(routeId, status) {
    const statusCell = document.getElementById(`bus-status-${routeId}`);
    if (!statusCell) return;

    if (status === 'online') {
        statusCell.innerHTML = `<span class="status online">ONLINE</span>`;
    } else if (status === 'offline') {
        statusCell.innerHTML = `<span class="status offline">OFFLINE</span>`;
    }
}

function filterBuses() {
    const input = document.getElementById("live-search");
    const container = document.getElementById("live-bus-cards-container");

    if (!input || !container) return;

    const query = input.value.toLowerCase().trim();
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

document.addEventListener("click", function (e) {

    const card = e.target.closest(".bus-live-card");
    if (!card) return;

    const routeId = card.id && card.id.startsWith("card-")
        ? card.id.replace("card-", "")
        : null;

    if (!routeId) return;

    if (window.innerWidth <= 768) {
        openMobileMap();
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
async function fetchLiveBuses() {
    const token = localStorage.getItem('jwtToken');

    const res = await fetch('/api/bus/live', {
        headers: { Authorization: `Bearer ${token}` }
    });

    return await res.json(); 
}
async function syncLiveBusesOnLoad() {
    try {
        const liveBuses = await fetchLiveBuses();

        liveBuses.forEach(bus => {
            const { routeId, latitude, longitude, busNo, tripType } = bus;

            onlineBusSet.add(routeId);
            updateLiveBusCount();

            const card = document.getElementById(`card-${routeId}`);
            const pill = document.getElementById(`pill-${routeId}`);
            const statusText = document.getElementById(`status-text-${routeId}`);

            if (card) {
                card.classList.remove('offline');
                card.classList.add('online');
                if (pill) pill.style.display = 'flex';
                if (statusText) statusText.innerText = "Tracking Live...";
            }

            //  map marker create
            if (!liveMarkers[routeId]) {
                liveMarkers[routeId] = L.circleMarker([latitude, longitude], {
                    radius: 10,
                    fillColor: "#ff0000",
                    color: "#fff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(liveMap)
                  .bindPopup(`<b>Bus No: ${busNo}</b>`);
            }
        });

    } catch (err) {
        console.error("Live sync error:", err);
    }
}
