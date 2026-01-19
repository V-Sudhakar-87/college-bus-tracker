const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const router = express.Router();

const saltRounds = 10; 

// POST - User Register
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, role,adminSecret } = req.body;
        if (role === 'Incharge') {
            const INSTITUTION_KEY = process.env.INCHARGE_SIGNUP_SECRET;
            if (!adminSecret || adminSecret !== INSTITUTION_KEY) {
                return res.status(403).json({ message: 'Invalid Admin Secret Key. Access Denied.' });
            }
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            username,
            password,
            name,
            role
        });
        await newUser.save();
        res.status(201).json({ message: `${role} registered successfully` });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Username already exists.' });
        }
        res.status(500).json({ message: 'Server error during registration.', error: err.message });
    }
});


// POST- User Login
router.post('/login', async (req, res) => {
    try {
        const { username, password, role } = req.body; 

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'Invalid Username.' });
        }
        
        // Role Match Check
        if (user.role !== role) {
             return res.status(403).json({ message: `Access denied. Please select the correct role.` });
        }

        //  Password Check
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Password.' });
        }

        //  JWT Token 
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '30d' }
        );

        
        res.json({
            message: 'Login successful',
            token, 
            user: {
                id: user._id,
                name: user.name,
                role: user.role 
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error during login.', error: err.message });
    }
});

module.exports = router;