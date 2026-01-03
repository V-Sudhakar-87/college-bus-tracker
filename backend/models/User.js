const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); //must use

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    }, 
    password: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['Student', 'Driver', 'Incharge'], 
        required: true 
    },
    assignedBus: { 
        type: String, 
        default: null, 
        uppercase: true 
    }, 
    assignedStop: { 
        type: String, 
        default: null 
    }, 
    assignedbusRoute: { 
        type: String,  
        default: null 
    } 
});

UserSchema.pre('save', async function () {
  const user = this;

  if (!user.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// Password Matching Method (Login used ) 
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = mongoose.model('User', UserSchema);