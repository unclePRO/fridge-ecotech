import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyC3ze73Rh3t87qpglkcjjDNNLBkAiOFkjE",
  authDomain: "foodbridge-e95b4.firebaseapp.com",
  projectId: "foodbridge-e95b4",
  storageBucket: "foodbridge-e95b4.firebasestorage.app",
  messagingSenderId: "927507094546",
  appId: "1:927507094546:web:5ce5984e7bf1a124a70ccb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Global State
let currentUser = null;
let currentProfile = null; 
const API_URL = 'https://fridge-ecotech.onrender.com/api/food';

// --- 2. AUTHENTICATION ---
window.signInWithGoogle = () => { signInWithPopup(auth, provider).catch(e => console.error(e)); };
window.signOutUser = () => { 
    signOut(auth).then(() => {
        // We clear local storage to ensure the next user doesn't see old data
        localStorage.clear(); 
        window.location.reload(); 
    });
};

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userProfile = document.getElementById('userProfile');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (user) {
        // 1. Initial UI Setup
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        userNameDisplay.innerText = `Hi, ${user.displayName.split(' ')[0]}`; 
        userAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + user.displayName;
        userProfile.classList.remove('hidden');
        document.querySelectorAll('.auth-req').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.logged-out-only').forEach(el => el.classList.add('hidden'));

        try {
            // 2. Fetch Persistent Profile from MongoDB
            console.log("Fetching profile for UID:", user.uid);
            const response = await fetch(`${API_URL}/profile/${user.uid}`);
            
            if (response.ok) {
                currentProfile = await response.json();
                console.log("Profile Sync Successful:", currentProfile);
                
                // Save to local storage for quick access
                localStorage.setItem(`fridge_profile_${user.uid}`, JSON.stringify(currentProfile));
                
                // Update specific UI labels
                if(document.getElementById('displayOrgName')) {
                    document.getElementById('displayOrgName').innerText = currentProfile.orgName;
                }
                
                // 3. CALL THE HELPER TO AUTO-FILL THE FORM
                fillProfileForm(currentProfile);

                // Set coordinates for the app's distance calculations
                if (currentProfile.lat && currentProfile.lng) {
                    userLocation = [currentProfile.lat, currentProfile.lng];
                }
            } else {
                // If 404/No profile, it's a new user - force them to Profile view
                console.warn("No profile found in DB. User must verify.");
                window.switchView('profile');
            }
        } catch (err) {
            console.error("Critical: Database sync failed during login.", err);
        }

    } else {
        // Logged Out State
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        userProfile.classList.add('hidden');
        document.querySelectorAll('.auth-req').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.logged-out-only').forEach(el => el.classList.remove('hidden'));
    }

    // 4. THE FLICKER FIX: Only hide the white screen once EVERYTHING above is done
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 400);
    }
});

// --- 3. UI HELPERS ---
window.toggleVerificationFields = () => {
    const role = document.getElementById('userRole').value;
    const donorFields = document.getElementById('donorFields');
    const ngoFields = document.getElementById('ngoFields');

    if (role === 'donor') {
        if(donorFields) donorFields.classList.remove('hidden');
        if(ngoFields) ngoFields.classList.add('hidden');
    } else if (role === 'ngo') {
        if(ngoFields) ngoFields.classList.remove('hidden');
        if(donorFields) donorFields.classList.add('hidden');
    }
};

// --- 4. MAPS & GEOLOCATION ---
const DEFAULT_COORDS = [12.8384, 80.1362]; 
let userLocation = DEFAULT_COORDS; 
let findMap, findUserMarker, profileMap, profileMarker;
let findMapMarkers = []; 

const userIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function initMaps() {
    if(document.getElementById('findMap') && !findMap) {
        findMap = L.map('findMap').setView(userLocation, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(findMap);
        findUserMarker = L.marker(userLocation, { icon: userIcon }).addTo(findMap);
    }
    if(document.getElementById('profileMap') && !profileMap) {
        profileMap = L.map('profileMap').setView(userLocation, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(profileMap);
        profileMarker = L.marker(userLocation, { icon: userIcon, draggable: true, zIndexOffset: 1000 }).addTo(profileMap);
        
        profileMarker.on('dragend', function() {
            const pos = profileMarker.getLatLng();
            userLocation = [pos.lat, pos.lng]; 
        });
    }
}

// --- 5. NAVIGATION (STRICT CLICK-BLOCK) ---
window.switchView = (viewId) => {
    
    if (viewId !== 'home' && viewId !== 'profile') {
        // NEW: Global Verification Gatekeeper
        if (!currentProfile || !currentProfile.isVerified || !currentProfile.lat) {
            alert("⚠️ Please verify your organization and complete your profile details first.");
            return window.switchView('profile'); // Force them to the profile page
        }

        // Role-Based Navigation Interception
        if (viewId === 'donate' && currentProfile.role !== 'donor') {
            alert("Access Denied: Only registered Restaurants and Donors can post food.");
            return; 
        }
        if (viewId === 'mylistings' && currentProfile.role !== 'donor') {
            alert("Access Denied: Only Donors have a listings dashboard.");
            return; 
        }
        if (viewId === 'find' && currentProfile.role !== 'ngo') {
            alert("Access Denied: Only verified NGOs can access the live recovery map.");
            return; 
        }
    }

    // Switch View
    document.querySelectorAll('.view-section').forEach(section => section.classList.add('hidden'));
    const targetView = document.getElementById(`${viewId}-view`);
    if(targetView) targetView.classList.remove('hidden');
    
    // Resize Maps & Trigger Loads
    if (viewId === 'find' && findMap) { 
        setTimeout(() => findMap.invalidateSize(), 200);
        window.loadFoodFeed(); 
    }
    if (viewId === 'profile' && profileMap) {
        setTimeout(() => {
            profileMap.invalidateSize();
            if (currentProfile && currentProfile.lat) {
                profileMap.setView([currentProfile.lat, currentProfile.lng], 14);
                profileMarker.setLatLng([currentProfile.lat, currentProfile.lng]);
            }
        }, 200);
    }
    if (viewId === 'home') window.loadLeaderboard(); 
    if (viewId === 'mylistings') window.loadMyListings(); 
};

// --- 6. DATA VISUALIZATION ---
window.loadFoodFeed = async () => {
    if (!currentProfile || !currentProfile.lat) return; 
    try {
        const res = await fetch(API_URL);
        let items = await res.json();
        const container = document.getElementById('foodFeed');
        if(!container) return;
        
        container.innerHTML = ''; 
        findMapMarkers.forEach(m => findMap.removeLayer(m));

        items = items.map(i => ({...i, distance: getDistance(currentProfile.lat, currentProfile.lng, i.lat, i.lng)}))
                     .filter(i => i.status !== 'Claimed')
                     .sort((a,b) => a.distance - b.distance);

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'food-item';
            const timeDisplay = item.pickupTime ? formatTime(item.pickupTime) : 'Not specified';
            
            div.innerHTML = `
                <div class="food-details" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <p class="food-title">${item.item} <span style="font-size: 0.9rem; font-weight: 400; color: #666;">(${item.distance.toFixed(1)}km)</span></p>
                    </div>
                    <p style="margin-top: 0.3rem;"><strong>Donor:</strong> ${item.donor}</p>
                    <div style="background: #f8fafc; padding: 0.8rem; border-radius: 8px; margin-top: 0.5rem; border-left: 3px solid var(--accent-color);">
                        <p style="margin-bottom: 0.2rem; font-size: 0.95rem;"><strong>🕒 Pickup Scheduled:</strong> <span style="color: var(--primary-color); font-weight: 700;">${timeDisplay}</span></p>
                        <p style="margin-bottom: 0; font-size: 0.85rem;"><strong>Est. Qty:</strong> ${item.quantity} | <strong>Exp:</strong> ${item.expiry}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; margin-left: 1rem;">
                    <button class="btn claim-btn" onclick="claimFood('${item._id}', '${item.donor.replace(/'/g, "\\'")}', ${item.lat}, ${item.lng}, '${timeDisplay}')">Claim & Route</button>
                </div>`;
            container.appendChild(div);

            const m = L.marker([item.lat, item.lng]).addTo(findMap)
                       .bindPopup(`<b>${item.item}</b><br>Pickup: ${timeDisplay}<br><button onclick="claimFood('${item._id}')" style="margin-top:5px; padding:3px 8px; background:#f59e0b; border:none; color:white; border-radius:3px; cursor:pointer;">Claim Route</button>`);
            findMapMarkers.push(m);
        });
    } catch (e) { console.error(e); }
};

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))); 
}

function formatTime(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

window.loadMyListings = async () => { 
    const res = await fetch(API_URL);
    const all = await res.json();
    const container = document.getElementById('myListingsFeed');
    if(!container) return;
    container.innerHTML = ''; 
    all.filter(f => f.uid === currentUser.uid).forEach(item => {
        const timeDisplay = item.pickupTime ? formatTime(item.pickupTime) : 'Not specified';
        const statusBadge = item.status === 'Claimed' ? '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">Claimed</span>' : '<span style="background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">Active</span>';
        const div = document.createElement('div');
        div.className = 'food-item';
        div.innerHTML = `
            <div class="food-details">
                <p class="food-title" style="display:flex; align-items:center; gap:0.5rem;">${item.item} ${statusBadge}</p>
                <p><strong>Pickup:</strong> ${timeDisplay}</p>
                <p><strong>Qty:</strong> ${item.quantity}</p>
            </div>
            <button class="btn cancel-btn" onclick="cancelListing('${item._id}')">Delete</button>`;
        container.appendChild(div);
    });
};

let routeMapInstance = null; // Holds the mini-map

window.claimFood = async (id, donorName, donorLat, donorLng, pickupTime) => { 
    if (currentProfile?.role !== 'ngo') return alert("Access Denied: Only registered NGOs can claim food fleets.");
    
    try {
        const res = await fetch(`${API_URL}/${id}/claim`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({uid: currentUser.uid}) 
        });
        
        if (res.ok) { 
            // 1. Refresh feed to remove the item
            window.loadFoodFeed(); 
            
            // 2. Populate the Floating Panel
            document.getElementById('routeDonorName').innerText = donorName;
            document.getElementById('routeTime').innerText = pickupTime;
            document.getElementById('activeRoutePanel').classList.remove('hidden');
            
            // 3. Initialize the Mini-Map (if not already created)
            if (!routeMapInstance) {
                routeMapInstance = L.map('routeMap', { zoomControl: false });
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(routeMapInstance);
            }
            
            // 4. Clear any old routes
            routeMapInstance.eachLayer((layer) => {
                if (layer instanceof L.Marker || layer instanceof L.Polyline) routeMapInstance.removeLayer(layer);
            });

            // 5. Draw the Route Points
            const ngoCoords = [currentProfile.lat, currentProfile.lng];
            const donorCoords = [donorLat, donorLng];

            L.marker(ngoCoords).addTo(routeMapInstance).bindPopup('NGO (You)').openPopup();
            L.marker(donorCoords, {icon: userIcon}).addTo(routeMapInstance).bindPopup('Pickup');
            
            // 6. Draw the dashed route line
            const routeLine = L.polyline([ngoCoords, donorCoords], { 
                color: '#2563eb', // Blue route line
                weight: 4, 
                dashArray: '8, 8' 
            }).addTo(routeMapInstance);
            
            // 7. Auto-zoom map to fit both points perfectly
            routeMapInstance.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
            setTimeout(() => routeMapInstance.invalidateSize(), 300);
        }
    } catch (err) { console.error(err); }
};

// Function to close the panel
window.closeRoutePanel = () => {
    document.getElementById('activeRoutePanel').classList.add('hidden');
};

window.cancelListing = async (id) => { 
    if(confirm("Are you sure you want to remove this surplus listing?")) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        window.loadMyListings();
        window.loadFoodFeed();
    }
};

window.loadLeaderboard = async () => { 
    try {
        const res = await fetch(`${API_URL}/leaderboard`);
        const leaders = await res.json();
        const container = document.getElementById('leaderboardFeed');
        if(!container) return;
        if(leaders.length === 0) { container.innerHTML = '<p style="text-align:center; color:#666;">No impact data yet.</p>'; return; }
        container.innerHTML = leaders.map((l, i) => {
            let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            return `<div class="food-item" style="padding: 1rem;"><b style="font-size: 1.1rem; color: var(--primary-color);">${medal} ${l.donor}</b><span style="font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 4px 10px; border-radius: 20px;">${l.points} kg CO₂ Saved</span></div>`;
        }).join('');
    } catch(err) { console.error(err); }
};

// --- 7. ROBUST GLOBAL FORM HANDLER ---
document.addEventListener('submit', async (e) => {
    
    // MY PROFILE FORM (Unified Verification & Location)
    if (e.target && e.target.id === 'profileForm') {
        e.preventDefault();
        
        const role = document.getElementById('userRole').value;
        const orgName = document.getElementById('orgName').value;
        const fssaiInput = document.getElementById('fssaiNum');
        const darpanInput = document.getElementById('darpanId');
        
        const license = (role === 'donor' && fssaiInput) ? fssaiInput.value : 
                        (darpanInput ? darpanInput.value : 'Pending');

        currentProfile = {
            orgName: `${orgName} ✓`,
            role: role,
            licenseNumber: license,
            isVerified: true,
            contactPerson: document.getElementById('contactPerson').value,
            phone: document.getElementById('contactPhone').value,
            lat: userLocation[0],
            lng: userLocation[1]
        };

        localStorage.setItem(`fridge_profile_${currentUser.uid}`, JSON.stringify(currentProfile));

        try {
        await fetch(`${API_URL}/profile`, { // Ensure this matches your POST route
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: currentUser.uid, 
                orgName: currentProfile.orgName, 
                role: currentProfile.role,
                licenseNumber: currentProfile.licenseNumber, 
                isVerified: currentProfile.isVerified,
                contactPerson: currentProfile.contactPerson, 
                phone: currentProfile.phone,
                lat: currentProfile.lat, 
                lng: currentProfile.lng
            })
        });
            alert("✅ Verification & Location Saved Successfully!");
            window.switchView('home');
        } catch (err) { console.error("Profile Sync Error", err); }
    }

    // DONATION FORM (Posting Food)
    if (e.target && e.target.id === 'donationForm') {
        e.preventDefault(); 
        
        if (currentProfile?.role !== 'donor') {
            alert("Access Denied: Only Donors can post food.");
            return; 
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    uid: currentUser.uid, 
                    donor: currentProfile.orgName,
                    item: document.getElementById('foodItem').value,
                    quantity: document.getElementById('estQuantity').value, 
                    pickupTime: document.getElementById('pickupTime').value, 
                    expiry: document.getElementById('expiry').value,
                    lat: currentProfile.lat, 
                    lng: currentProfile.lng
                })
            });

            if (response.ok) {
                alert("Surplus Logged Successfully! Nearby NGOs have been alerted.");
                e.target.reset(); 
                window.switchView('mylistings'); 
            } else {
                const errorData = await response.json();
                alert("Backend Rejection: " + (errorData.message || errorData.error || JSON.stringify(errorData)));
            }
        } catch (error) { console.error("Donation Error:", error); }
    }
});

function fillProfileForm(data) {
    const roleEl = document.getElementById('userRole');
    const orgEl = document.getElementById('orgName');
    const contactEl = document.getElementById('contactPerson');
    const phoneEl = document.getElementById('contactPhone');
    const fssaiEl = document.getElementById('fssaiNum');
    const darpanEl = document.getElementById('darpanId');

    if (roleEl) roleEl.value = data.role || '';
    if (orgEl) orgEl.value = (data.orgName || '').replace(' ✓', '');
    
    // Trigger the toggle so the FSSAI/DARPAN fields unhide
    window.toggleVerificationFields(); 

    if (contactEl) contactEl.value = data.contactPerson || '';
    if (phoneEl) phoneEl.value = data.phone || '';
    
    // License number could be in either field depending on role
    if (data.role === 'donor' && fssaiEl) fssaiEl.value = data.licenseNumber || '';
    if (data.role === 'ngo' && darpanEl) darpanEl.value = data.licenseNumber || '';
}

// --- INIT ---
window.onload = () => { initMaps(); window.loadLeaderboard(); };