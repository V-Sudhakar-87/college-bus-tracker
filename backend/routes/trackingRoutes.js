const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const { protect } = require('../middleware/authMiddleware');

// GET /api/tracking/live - Get all buses with their current location
router.get('/live', protect, async (req, res) => {
    try {
        // Fetch only buses that have location data and are not 'Idle'
        const liveBuses = await Bus.find({ 
            status: { $ne: 'Idle' } 
        }).populate('currentRoute', 'routeName');

        res.status(200).json(liveBuses);
    } catch (error) {
        console.error('Error fetching live tracking data:', error);
        res.status(500).json({ message: 'Error fetching live data.' });
    }
});

module.exports = router;