const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const User = require('../models/User');

// --- USER PROFILE ROUTES (Replaces LocalStorage!) ---
router.post('/profile', async (req, res) => {
    try {
        // Upsert: Update if exists, Create if it doesn't
        const user = await User.findOneAndUpdate(
            { uid: req.body.uid },
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/profile/:uid', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.params.uid });
        res.json(user || null);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FOOD LISTING ROUTES ---
router.get('/', async (req, res) => {
    try {
        const availableFood = await Food.find({ status: 'Available' });
        res.json(availableFood);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const allFood = await Food.find();
        const scores = {};
        allFood.forEach(food => {
            if (food.donor === 'Anonymous' || !food.donor) return;
            if (!scores[food.donor]) scores[food.donor] = 0;
            scores[food.donor] += 50; 
            if (food.status === 'Claimed') scores[food.donor] += 50; 
        });
        const sortedLeaderboard = Object.keys(scores)
            .map(donor => ({ donor, points: scores[donor] }))
            .sort((a, b) => b.points - a.points);
        res.json(sortedLeaderboard);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
    try {
        // 1. Print the incoming data to your terminal to see what's missing
        console.log("Incoming Food Payload:", req.body); 

        // 2. Attempt to save to MongoDB
        const newFood = new Food(req.body);
        await newFood.save();
        
        res.status(201).json(newFood);
    } catch (err) {
        // 3. Print the EXACT reason it failed to your terminal
        console.error("🛑 Mongoose Error:", err.message); 
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/claim', async (req, res) => {
    try {
        const { uid } = req.body;
        const user = await User.findOne({ uid: uid });

        if (!user || user.role !== 'ngo') {
            return res.status(403).json({ error: "Access Denied: Only verified NGOs can claim food." });
        }

        await Food.findByIdAndUpdate(req.params.id, { status: 'Claimed' });
        res.json({ message: "Food claimed successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/:id', async (req, res) => {
    try {
        const deletedFood = await Food.findByIdAndDelete(req.params.id);
        if (deletedFood) res.json({ message: "Listing cancelled successfully." });
        else res.status(404).json({ error: "Item not found" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;