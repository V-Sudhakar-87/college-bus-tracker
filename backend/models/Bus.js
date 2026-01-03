const mongoose = require('mongoose');

const BusSchema = mongoose.Schema({
    busRegNo: {
        type: String,
        required: [true, 'Please add a Bus Registration Number'],
        unique: true,
        uppercase: true 
    },
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Route"
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    currentRoute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        default: null 
    },
    status: {
        type: String,
        enum: ['Idle', 'Stopped', 'Moving'],
        default: 'Idle'
    },
     maxCapacity: {
        type: Number,
        required: [true, 'Please provide maxCapacity for the bus'],
        min: [1, 'maxCapacity must be at least 1'],
        default: 50
    },
    // --- Live Tracking Data ---
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], 
            default: [0, 0]
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
}, 
{
    timestamps: true
});

BusSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Bus', BusSchema);