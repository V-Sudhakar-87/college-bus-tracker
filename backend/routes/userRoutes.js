const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Bus = require('../models/Bus'); 
const Route = require('../models/Route'); 
const { protect, restrictTo } = require('../middleware/authMiddleware');

//  POST  - New Driver 
router.post('/drivers', protect, restrictTo(['Incharge']), async (req, res) => {
    try {
        const { name, username, password,assignedBusId } = req.body;

        if (!name || !username || !password || !assignedBusId) {
            return res.status(400).json({ message: 'Please provide name, username, password, and assigned Bus ID.' });
        }
        
        const bus = await Bus.findOne({ busRegNo: assignedBusId });
        if (!bus) {
            return res.status(404).json({ message: 'Assigned Bus ID not found.' });
        }
        
        if (bus.driver) {
            return res.status(400).json({ message: `Bus ${bus.busRegNo} is already assigned to another driver.` });
        }
    
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already taken.' });
        }
        
        // New User create (Default role: 'Driver')
        const driver = await User.create({
            name,
            username,
            password, 
            role: 'Driver' ,
            assignedBus: bus.busRegNo 
        });

        res.status(201).json({
            message: 'Driver account created successfully.',
            user: {
                id: driver._id,
                name: driver.name,
                username: driver.username, 
                role: driver.role,
                assignedBus: driver.assignedBus,
                driver: driver
            }
        });

    } catch (error) {
        console.error('Error creating driver:', error);
        res.status(500).json({ message: 'Server error during driver creation.', error: error.message });
    }
});

// 2. GET- Drivers
router.get('/drivers', protect, restrictTo(['Incharge']), async (req, res) => {
    try {
        const drivers= await User.find({ role: 'Driver' })
            .select('name username assignedBus role');
        res.status(200).json(drivers);
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({ message: 'Server error fetching drivers.' });
    }
});

// 3. POST - New Student 
router.post('/students', protect, restrictTo(['Incharge']), async (req, res) => {
    try {
        
        const { name, username, password, assignedBus ,assignedStop } = req.body;
        
        if (!name || !username || !password ||!assignedBus|| !assignedStop) {
            return res.status(400).json({ message: 'Please provide name, username, password, bus number, and stop.' });
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already taken.' });
        }

        const busNo = req.body.assignedBus.toUpperCase().trim();
        const route = await Route.findOne({ assignedBusNo: busNo });
    if (!route) {
      return res.status(400).json({
        message: 'No route found for the assigned bus.'
      });
    }
        const student = await User.create({
            name,
            username,
            password, 
            role: 'Student', 
            assignedBus: busNo, 
            assignedStop 
        });

        res.status(201).json({
            message: 'Student account created successfully.',
            user: {
                id: student._id,
                name: student.name,
                username: student.username,
                assignedBus: busNo,
                assignedbusRoute: route.routeName, 
                routeName: route.routeName,
                assignedStop
            }
        });

    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ message: 'Server error during student creation.', error: error.message });
    }
});


// 4. GET- Students
router.get('/students', protect, restrictTo(['Incharge']), async (req, res) => {
    try {
        const students = await User.aggregate([
  { $match: { role: 'Student' } },
  {
    $lookup: {
      from: 'routes',
      localField: 'assignedBus',
      foreignField: 'assignedBusNo',
      as: 'route'
    }
  },
  {
    $addFields: {
      route: { $arrayElemAt: ['$route', 0] }
    }
  },
  {
    $project: {
      name: 1,
      username: 1,
      assignedBus: 1,
      assignedStop: 1,
      routeName: '$route.routeName'
    }
  }
]);

res.json(students);

    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Server error fetching students.' });
    }
});

// 6. GET - Logged-in User 
router.get('/me', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        
        let userQuery = User.findById(userId).select('-password -__v');

        if (req.user.role === 'Driver') {
            userQuery = userQuery.populate({
                path: 'assignedBus', 
                select: 'busRegNo'
            });
            
            const assignedBus = await Bus.findOne({ driver: userId }).select('busRegNo currentRoute');
            const routes = await Route.find({ assignedDrivers: userId }).select('routeName _id'); 
            
            return res.status(200).json({
                user: userQuery,
                assignedBus: assignedBus,
                assignedRoutes: routes
            });
            
        } else if (req.user.role === 'Student') {
            userQuery = userQuery.populate('assignedRoute', 'routeName');
        }

        const user = await userQuery;

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ user: user });

    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Server error fetching user details.' });
    }
});
 
// 6. DELETE :id - User
router.delete('/:id', protect, restrictTo(['Incharge']), async (req, res) => {
    try {
        const userId = req.params.id;
        const userToDelete = await User.findById(userId).select('role assignedBusId');

        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        if (userToDelete.role === 'Driver' && userToDelete.assignedBusId) {
            await Bus.findByIdAndUpdate(
                userToDelete.assignedBusId,
                { driver: null },
                { new: true }
            );
        }

        await User.findByIdAndDelete(userId);
        res.status(204).json({ message: 'User deleted successfully.' }); 

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error during user deletion.', error: error.message });
    }
});

module.exports = router;