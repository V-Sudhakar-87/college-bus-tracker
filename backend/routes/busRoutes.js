const express = require('express');
const Route = require('../models/Route'); 
const Bus = require('../models/Bus');
const User = require('../models/User'); 
const { protect, restrictTo } = require('../middleware/authMiddleware'); 
const router = express.Router();

 //  Distance calculation 
function calculateTotalDistance(stops) {
    const toRad = (value) => value * Math.PI / 180;
    const R = 6371; // Earth radius in KM
    let totalDistance = 0;

    for (let i = 0; i < stops.length - 1; i++) {
        const lat1 = stops[i].latitude;
        const lon1 = stops[i].longitude;
        const lat2 = stops[i + 1].latitude;
        const lon2 = stops[i + 1].longitude;

        if (
            lat1 == null || lon1 == null ||
            lat2 == null || lon2 == null
        ) continue;

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
    }

    return Number(totalDistance.toFixed(2)); // KM
}


//  System Stats
router.get('/stats',protect, restrictTo(['Incharge']), async (req, res) => {
    try {
        const totalBuses = await Bus.countDocuments();
        const activeRoutes = await Route.countDocuments({ }); 
        const totalDrivers = await User.countDocuments({ role: 'Driver' });
        
        res.status(200).json({
            totalBuses,
            activeRoutes,
            totalDrivers
        });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).json({ message: 'Server error fetching stats.' });
    }
});

//  ROUTE MANAGEMENT ENDPOINTS 

// POST -new Route
router.post('/routes',protect, restrictTo(['Incharge']), async (req, res) => {
    try {

      const { routeName, maxCapacity, stops } = req.body;
      const assignedBusNo = req.body.assignedBusNo.toUpperCase().trim();
      if (!assignedBusNo) {
        alert('Please select / enter a Bus Number for the Route.');
        return;
      }
      if (!stops || !Array.isArray(stops) || stops.length === 0) {
          return res.status(400).json({ message: 'Stops information is required and must be a non-empty array.' });
      }
    
      const existingRoute = await Route.findOne({ routeName });
      if (existingRoute) {
        return res.status(400).json({ message: 'Route name already exists.' });
      }

    
      const busAlreadyUsed = await Route.findOne({ assignedBusNo });
      if (busAlreadyUsed) {
        return res.status(400).json({
        message: 'This bus number is already assigned to another route.'
        });
      }
      const totalDistance = calculateTotalDistance(stops);
      const newRoute = await Route.create({
          routeName,
          maxCapacity: maxCapacity || 50,
          stops,
          assignedBusNo,
          totalDistance ,
          createdBy: req.user.id
        });
      const updatedBus = await Bus.findOneAndUpdate(
      { busRegNo: { $regex: new RegExp('^' + assignedBusNo + '$', 'i') } },
      { route: newRoute._id },
      { new: true }
      );

      if (!updatedBus) {
        console.error("❌ BUS NOT FOUND FOR ROUTE:", assignedBusNo);
      }

      res.status(201).json({ message: 'Route created successfully!', route: newRoute });

    } catch (error) {
        console.error('Error creating route:', error);
        res.status(500).json({ message: 'Server error during route creation.' });
    }
});

router.get('/routes', async (req, res) => {
    try {
        const routes = await Route.aggregate([
            {
                $lookup: {
                    from: "users",
                    let: { routeBus: "$assignedBusNo" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: [{ $toUpper: { $trim: { input: "$assignedBus" } } }, { $toUpper: { $trim: { input: "$$routeBus" } } }] },
                                        { $eq: ["$role", "Driver"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "driverInfo"
                }
            },
            {
                $addFields: {                   
                    driverName: { $ifNull: [{ $arrayElemAt: ["$driverInfo.name", 0] }, "Not Assigned"] }
                }
            },
            { $project: { driverInfo: 0 } }
        ]);
        res.json(routes);
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

//  BUS MANAGEMENT ENDPOINTS 

// POST  - new Bus
router.post('/buses', async (req, res) => {
    try {
        const {driverId}  = req.body; 
        const busRegNo = req.body.busRegNo.toUpperCase().trim();
       
        if (!busRegNo) {
            return res.status(400).json({ message: 'Please provide Bus Registration Number.' });
        }
        
        let driver = null;
        if (driverId) {
            
            driver = await User.findById(driverId); 
            if (!driver || driver.role !== 'Driver') {
                return res.status(404).json({ message: 'Assigned Driver ID not found or user is not a Driver.' });
            }
            
            const existingBus = await Bus.findOne({ driver: driverId });
            if (existingBus) {
                return res.status(400).json({ message: `Driver is already assigned to Bus: ${existingBus.busRegNo}. Please unassign them first.` });
            }
        }
        
        const newBus = await Bus.create({
            busRegNo,
            driver: driverId || null,
        });

        if (driver) {
             await User.findByIdAndUpdate(driverId, { assignedBus: newBus.busRegNo});
        }

        res.status(201).json(newBus);

    } catch (error) {
        console.error('Error creating bus:', error);
        if (error.code === 11000 && error.keyPattern && error.keyPattern.busRegNo) {
            return res.status(409).json({ message: `Bus Registration Number '${req.body.busRegNo}' already exists. Please use a unique number.` });
        }
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ 
                message: `Validation Error: ${messages.join(', ')}` 
            });
        }
        res.status(500).json({ message: 'Server error during bus creation.' });
    }
});
// GET -Buses


router.get('/buses', async (req, res) => {
  try {
    const buses = await Bus.aggregate([
      {
        $lookup: {
          from: "users",
          let: { busNo: "$busRegNo" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$assignedBus", "$$busNo"] },
                    { $eq: ["$role", "Driver"] }
                  ]
                }
              }
            },
            { $project: { name: 1, username: 1 } }
          ],
          as: "driver"
        }
      },
      {
        $addFields: {
          driver: { $arrayElemAt: ["$driver", 0] }
        }
      },

      {
        $lookup: {
          from: "routes",
          localField: "busRegNo",
          foreignField: "assignedBusNo",
          as: "route"
        }
      },
      {
        $addFields: {
          currentRoute: { $arrayElemAt: ["$route", 0] }
        }
      }
    ]);

    res.status(200).json(buses);
  } catch (err) {
    console.error("Manage bus fetch error:", err);
    res.status(500).json({ message: "Error fetching buses" });
  }
});
const mongoose = require("mongoose");

router.get('/student/profile-details', protect, async (req, res) => {
  try {
    const data = await User.aggregate([
      // Student
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user.id)
        }
      },

      //  Bus (Student → Bus)
      {
        $lookup: {
          from: "buses",
          localField: "assignedBus",
          foreignField: "busRegNo",
          as: "bus"
        }
      },

      //  Route (Bus → Route)
      {
        $lookup: {
          from: "routes",
          let: { busNo: "$assignedBus",routeId: { $arrayElemAt: ["$bus.route", 0] } },
          pipeline: [
      {
        $match: {
          $expr: {
            $or: [
              { $eq: ["$_id", "$$routeId"] },
              { $eq: ["$assignedBusNo", "$$busNo"] }
            ]
          }
        }
      }
    ],
          as: "route"
        }
      },

      //  Driver (Bus → Driver)
      {
        $lookup: {
          from: "users",
          let: { busNo: "$assignedBus"  },
           pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$assignedBus", "$$busNo"] },
              { $eq: ["$role", "Driver"] }
            ]
          }
        }
      },
      { $project: { name: 1 } }
    ],
          as: "driver"
        }
      },

      //  Final Output
      {
        $project: {
          _id: 0,
          studentName: "$name",
          studentUsername: "$username",
          busNo: "$assignedBus",
          routeName: { $arrayElemAt: ["$route.routeName", 0] },
          distance: { $arrayElemAt: ["$route.totalDistance", 0] },
          driverName: { $arrayElemAt: ["$driver.name", 0] }
        }
      }
    ]);

    res.json(data[0] || {});
  } catch (err) {
    console.error("Student profile aggregation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// DELETE /api/bus/buses/:id
router.delete('/buses/:id', async (req, res) => {
    try {
        const busId = req.params.id;
        const deleted = await Bus.findByIdAndDelete(busId);
        if (!deleted) return res.status(404).json({ message: 'Bus not found.' });
        await User.updateMany({ assignedBus: busId }, { $unset: { assignedBus: "" } });
        res.status(200).json({ message: 'Bus deleted successfully.' });
    } catch (err) {
        console.error('Error deleting bus:', err);
        res.status(500).json({ message: 'Server error deleting bus.' });
    }
});

router.post('/location', protect, restrictTo(['Driver']), async (req, res) => {
    
});

// DELETE :id - Route
router.delete('/routes/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        const deletedRoute = await Route.findByIdAndDelete(routeId);

        if (!deletedRoute) {
            return res.status(404).json({ message: 'Route not found.' });
        }

        await Bus.updateMany({ currentRoute: routeId }, { currentRoute: null });

        res.status(200).json({ message: 'Route deleted successfully!', routeId });

    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({ message: 'Server error during route deletion.' });
    }
});


router.get('/driver/me', protect, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const driver = await User.findById(userId);

        if (!driver) {
            return res.status(404).json({ message: "Driver not found in DB" });
        }

        const myBusNo = driver.assignedBus ? driver.assignedBus.trim() : null;

        if (!myBusNo) {
            return res.status(200).json({
                driverName: driver.name,
                busRegNo: 'Not Assigned',
                assignedRoutes: []
            });
        }

        const routes = await Route.find({ 
            assignedBusNo: { $regex: new RegExp('^' + myBusNo + '$', 'i') } 
        });

        res.status(200).json({
            driverName: driver.name,
            busRegNo: myBusNo,
            assignedRoutes: routes
        });

    } catch (error) {
        console.error("Error in /driver/me:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;