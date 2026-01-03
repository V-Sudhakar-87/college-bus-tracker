const mongoose = require('mongoose');

const StopSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    expectedTimeMorning: {
        type: String,
        required: true
    },
    expectedTimeEvening: {
        type: String,
        required: true
    },
    expectedTime: {
        type: String
   },
    sequence: {
        type: Number,
        required: true
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
});

const RouteSchema = mongoose.Schema({
    routeName: {
        type: String,
        required: [true, 'Please add a route name'],
        unique: true,
        trim: true
    },
    maxCapacity: { 
        type: Number,
        required: [true, 'Please define max capacity'],
        default: 50
    },
    stops: [StopSchema],
    
    assignedBusNo: { 
        type: String,
        required: [true, 'Please add a bus no'],
        unique: true,
        trim: true,
        uppercase: true 
        
    },
    totalDistance: {
    type: Number,
    default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Route', RouteSchema);