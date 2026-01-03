const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();

    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const restrictTo = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: `Forbidden: Access restricted to roles: ${roles.join(', ')}` });
    }
    next();
};

module.exports = { protect, restrictTo };