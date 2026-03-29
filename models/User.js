const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uid: { type: String, unique: true },
    orgName: String,
    role: { type: String, enum: ['donor', 'ngo'], required: true },
    isVerified: { type: Boolean, default: true }, // Set to true for hackathon demo
    licenseNumber: String, // FSSAI or DARPAN
    lat: Number,
    lng: Number
});

module.exports = mongoose.model('User', userSchema);