require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
    cors: { origin: "*" }
});
const PORT = process.env.PORT || 3000;
const path = require('path');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busRoutes');
const userRoutes = require('./routes/userRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const liveBuses = {}; 



app.use(cors());

app.use(express.json()); // To parse JSON bodies

app.use(express.static(path.join(__dirname, 'public')));// To serve frontend file

io.on('connection', (socket) => {

    socket.on('join-route', (routeId) => {
        socket.join(routeId);
    });

    // Driver sending live location
    socket.on('update-location', (data) => {
        const { routeId, busNo } = data;
        if (!routeId) return;
        socket.driverRouteId = routeId;
        socket.driverBusNo = busNo;
        liveBuses[routeId] = {
            ...liveBuses[routeId],
            ...data,
            status: 'online',
            updatedAt: Date.now(),
            socketId: socket.id
        };

        // Broadcast to students / incharge
        socket.to(routeId).emit('location-receive', {
    ...data,
    status: 'online'
  });
});

    // Driver stopped tracking
    socket.on('tracking-stopped', ({ routeId }) => {
        delete liveBuses[routeId];
        socket.to(routeId).emit('location-receive', {
            routeId,
            status: 'offline'
        });
    });
    //  DISCONNECT LOGIC
    socket.on('disconnect', () => {
        if (socket.driverRouteId) {
            const rId = socket.driverRouteId;
            const bNo = socket.driverBusNo;
            delete liveBuses[rId];
            socket.to(rId).emit('location-receive', {
                routeId: rId,
                busNo: bNo,
                status: 'offline'
            });
        }
    });

});

app.use('/api/auth', authRoutes);
app.use('/api/bus', busRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tracking', trackingRoutes);

//  Database Connection 
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Atlas connected successfully! Server starting...');
         
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
});


app.get('*', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'public/login/index.html')
    );
});
app.get('/api/bus/live', (req, res) => {
      const now = Date.now();

    const liveList = Object.values(liveBuses)
    res.json(liveList);
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});