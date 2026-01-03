# 🚌 College Bus Tracker

A full-stack **real-time college bus tracking system** built using **Node.js, Express, MongoDB, Socket.IO**, and a static frontend.  
This project allows students, drivers, and in-charge/admins to track buses live with role-based dashboards.

---

## 🚀 Live Demo
🔗 https://college-bus-tracker-u9ht.onrender.com

---

## ✨ Features

  
### 👨‍🎓 Student
- Login & authentication
- View assigned bus details
- Live bus tracking (real-time updates)
- Route & stop information

### 🚍 Driver
- Secure login
- Start / stop live tracking
- Send live location updates using Socket.IO

### 🧑‍💼 In-charge / Admin
- Login & authentication
- Manage routes & buses
- Assign drivers and students
- Monitor live bus status

---

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Socket.IO
- JWT Authentication

### Frontend
- HTML
- CSS
- JavaScript
- Served as static files via Express

### Deployment
- Render (Web Service)

---

## 📂 Project Structure
college-bus-tracker/
└── backend/
├── models/
├── routes/
├── middleware/
├── .env
├── public/
│ ├── login/
│ ├── student/
│ ├── driver/
| ├── js/
│ └── incharge/
├── server.js
└── package.json

## 🔌 Real-Time Communication

- Live location tracking is implemented using **Socket.IO**
- Uses same-origin sockets (`io()`) for seamless HTTP/HTTPS support
- Automatically upgrades to `wss` in production

