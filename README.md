# fridge! 🌿 

> **Bridging the gap between surplus food and social impact.**

[![Live Demo](https://img.shields.io/badge/demo-live-green?style=for-the-badge)](https://fridge-ecotech.vercel.app/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://fridge-ecotech.vercel.app/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

---

## Project Overview
**fridge!** is a B2B logistics platform designed to streamline bulk food donations between commercial donors (restaurants, hotels, caterers) and verified NGOs. We focus on professional-grade surplus management to ensure food safety, accountability, and efficiency at scale.

### The Challenge
* **Massive Waste:** Tons of surplus food are discarded daily in the commercial sector.
* **Logistics Gap:** Restaurants lack a direct channel to connect with NGOs for bulk pickup.
* **Verification:** Trust issues regarding food handling and NGO legitimacy.

### The Solution
A real-time coordination tool that validates users via government IDs (FSSAI/NGO Darpan) and utilizes GPS tracking to minimize the window between surplus availability and redistribution.

---

## Key Features

### Secure & Role-Based Auth
* **Firebase Google Auth:** Seamless entry point for all users.
* **Dual-Track Registration:** Custom flows for **Donors** (FSSAI verification) and **NGOs** (NGO Darpan verification).

### Intelligent Logistics
* **Interactive Mapping:** Powered by **Leaflet.js** for real-time location visualization.
* **Distance Calculation:** Automatic calculation of the distance between donors and rescuers to optimize pickup routes.

### Real-Time Food Feed
* **Dynamic Listings:** Live view of available food with quantities and expiry countdowns.
* **Glassmorphism UI:** A modern, responsive design optimized for mobile-field use.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Glassmorphism), Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Mongoose) |
| **Auth** | Firebase Auth (Google OAuth 2.0) |
| **Maps** | Leaflet.js / OpenStreetMap |
| **Hosting** | Vercel (Frontend), Render (Backend) |

---

## Local Setup

1. **Clone the repository**
   ```bash
   git clone [https://github.com/your-username/vashishth.git](https://github.com/your-username/vashishth.git)
   cd vashishth

2. **Install dependencies**
   ```bash
   npm install

3. **Environment Variables**
    Create a `.env` file in the root.
   ```bash
    MONGO_URI=your_mongodb_connection_string
    PORT=5000

4. **Launch application**
   ```bash
   node server.js