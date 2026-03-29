const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
    uid: { type: String, required: true },
    donor: { type: String, required: true },
    item: { type: String, required: true },
    quantity: { type: String, required: true },
    expiry: { type: String, required: true },
    pickupTime: { type: String }, // <-- NEW FIELD ADDED HERE
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    status: { type: String, default: 'Available' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Food', foodSchema);