// Shopping Mapper Pro - Complete JavaScript Implementation
// Storage Manager
class StorageManager {
    constructor() {
        this.currentStore = null;
        this.stores = this.loadStores();
    }

    loadStores() {
        const stored = localStorage.getItem('shoppingMapperStores');
        return stored ? JSON.parse(stored) : {};
    }

    saveStores() {
        localStorage.setItem('shoppingMapperStores', JSON.stringify(this.stores));
    }

    createStore(name, address = '') {
        const id = 'store-' + Date.now();
        this.stores[id] = {
            id,
            name,
            address,
            created: new Date().toISOString(),
            gpsPoints: [],
            boundary: [],
            zones: [],
            products: [],
            beacons: [],
            floorPlan: null,
            origin: null,
            scale: 100
        };
        this.saveStores();
        return id;
    }

    getStore(id) {
        return this.stores[id];
    }

    updateStore(id, data) {
        if (this.stores[id]) {
            this.stores[id] = { ...this.stores[id], ...data };
            this.saveStores();
        }
    }

    deleteStore(id) {
        delete this.stores[id];
        this.saveStores();
    }

    exportStore(id) {
        const store = this.getStore(id);
        if (!store) return null;
        
        const dataStr = JSON.stringify(store, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${store.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    importStore(jsonData) {
        try {
            const store = JSON.parse(jsonData);
            const newId = 'store-' + Date.now();
            store.id = newId;
            store.name += ' (Imported)';
            this.stores[newId] = store;
            this.saveStores();
            return newId;
        } catch (error) {
            console.error('Import error:', error);
            return null;
        }
    }

    exportGPSData(id) {
        const store = this.getStore(id);
        if (!store || !store.gpsPoints.length) return null;
        
        // Export as GPX format
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Shopping Mapper Pro">
  <metadata>
    <name>${store.name}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${store.name} Boundary</name>
    <trkseg>
`;
        
        store.gpsPoints.forEach(point => {
            gpx += `      <trkpt lat="${point.lat}" lon="${point.lng}">
        <time>${new Date(point.timestamp).toISOString()}</time>
      </trkpt>
`;
        });
        
        gpx += `    </trkseg>
  </trk>
</gpx>`;
        
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${store.name.replace(/\s+/g, '_')}_gps.gpx`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// GPS Mapper
class GPSMapper {
    constructor(canvasId, storage) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.storage = storage;
        this.isRecording = false;
        this.watchId = null;
        this.lastPosition = null;
        this.totalDistance = 0;
        this.heading = 0;
        this.beaconPositioning = false;
        
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        this.isDragging = false;
        this.dragStart = null;
        
        this.setupEventListeners();
        this.setupCompass();
        this.draw();
    }

    get currentStore() {
        return this.storage.getStore(this.storage.currentStore);
    }

    setupEventListeners() {
        document.getElementById('startMapping')?.addEventListener('click', () => this.startRecording());
        document.getElementById('stopMapping')?.addEventListener('click', () => this.stopRecording());
        document.getElementById('toggleRecord')?.addEventListener('click', () => {
            this.isRecording ? this.stopRecording() : this.startRecording();
        });
        
        document.getElementById('clearMap').addEventListener('click', () => this.clear());
        document.getElementById('centerMap').addEventListener('click', () => this.centerView());
        document.getElementById('zoomIn')?.addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.zoom(0.8));
        
        document.getElementById('exportData').addEventListener('click', () => {
            if (this.storage.currentStore) {
                this.storage.exportStore(this.storage.currentStore);
                this.storage.exportGPSData(this.storage.currentStore);
            }
        });
        
        document.getElementById('importFloorPlan').addEventListener('click', () => {
            document.getElementById('floorPlanInput').click();
        });
        
        document.getElementById('floorPlanInput').addEventListener('change', (e) => {
            this.loadFloorPlan(e.target.files[0]);
        });
        
        document.getElementById('showFloorPlan')?.addEventListener('change', (e) => {
            const img = document.getElementById('floorPlanImage');
            if (img) img.style.display = e.target.checked ? 'block' : 'none';
        });
        
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.canvas.addEventListener('mousemove', (e) => this.drag(e));
        this.canvas.addEventListener('mouseup', () => this.endDrag());
        this.canvas.addEventListener('mouseleave', () => this.endDrag());
        
        this.canvas.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.drag(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', () => this.endDrag());
    }

    setupCompass() {
        if ('DeviceOrientationEvent' in window) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.webkitCompassHeading) {
                    this.heading = e.webkitCompassHeading;
                } else if (e.alpha) {
                    this.heading = 360 - e.alpha;
                }
                this.updateCompass();
            });
        }
    }

    updateCompass() {
        const needle = document.getElementById('compassNeedle');
        const display = document.getElementById('headingDisplay');
        if (needle) needle.style.transform = `rotate(${this.heading}deg)`;
        if (display) display.textContent = Math.round(this.heading) + '°';
    }

    loadFloorPlan(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('floorPlanImage');
            img.src = e.target.result;
            img.onload = () => {
                img.width = this.canvas.width;
                img.height = this.canvas.height;
                if (this.currentStore) {
                    this.storage.updateStore(this.storage.currentStore, {
                        floorPlan: e.target.result
                    });
                }
                document.getElementById('showFloorPlan').checked = true;
                img.style.display = 'block';
            };
        };
        reader.readAsDataURL(file);
    }

    startRecording() {
        if (!navigator.geolocation) {
            alert('GPS not supported');
            return;
        }

        const useBeacons = document.getElementById('useBeacons')?.checked;
        if (useBeacons && beaconManager) {
            this.beaconPositioning = true;
            beaconManager.startScanning();
        }

        this.isRecording = true;
        this.updateUI(true);
        
        const options = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleError(error),
            options
        );
    }

    stopRecording() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isRecording = false;
        this.beaconPositioning = false;
        this.updateUI(false);
        
        if (beaconManager) {
            beaconManager.stopScanning();
        }
        
        this.convertToCanvas();
    }

    handlePosition(position) {
        let { latitude, longitude, accuracy } = position.coords;
        
        // Apply beacon correction if enabled
        if (this.beaconPositioning && beaconManager) {
            const correction = beaconManager.getPositionCorrection();
            if (correction) {
                latitude += correction.latOffset;
                longitude += correction.lngOffset;
                accuracy = Math.min(accuracy, correction.accuracy);
            }
        }
        
        document.getElementById('currentLat').textContent = latitude.toFixed(6);
        document.getElementById('currentLng').textContent = longitude.toFixed(6);
        document.getElementById('accuracy').textContent = accuracy.toFixed(1) + 'm';
        document.getElementById('accuracy').className = 
            accuracy < 10 ? 'badge bg-success' : 
            accuracy < 30 ? 'badge bg-warning' : 'badge bg-danger';
        
        const store = this.currentStore;
        if (!store) return;
        
        if (!store.origin) {
            store.origin = { lat: latitude, lng: longitude };
            this.storage.updateStore(this.storage.currentStore, { origin: store.origin });
        }
        
        const minDistance = parseFloat(document.getElementById('minDistance').value);
        
        if (this.lastPosition) {
            const distance = this.calculateDistance(
                this.lastPosition.lat, this.lastPosition.lng,
                latitude, longitude
            );
            
            if (distance < minDistance) return;
            this.totalDistance += distance;
        }
        
        const gpsPoint = {
            lat: latitude,
            lng: longitude,
            accuracy: accuracy,
            timestamp: position.timestamp,
            heading: this.heading
        };
        
        store.gpsPoints.push(gpsPoint);
        this.lastPosition = { lat: latitude, lng: longitude };
        
        this.storage.updateStore(this.storage.currentStore, {
            gpsPoints: store.gpsPoints
        });
        
        this.updateStats();
        this.draw();
    }

    handleError(error) {
        console.error('GPS Error:', error);
        alert('GPS Error: ' + error.message);
        this.stopRecording();
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    gpsToCanvas(lat, lng) {
        const store = this.currentStore;
        if (!store || !store.origin) return { x: 0, y: 0 };
        
        const x = (lng - store.origin.lng) * 111320 * Math.cos(store.origin.lat * Math.PI / 180);
        const y = (store.origin.lat - lat) * 110540;
        
        return {
            x: (x * store.scale * this.scale) + this.canvas.width / 2 + this.offsetX,
            y: (y * store.scale * this.scale) + this.canvas.height / 2 + this.offsetY
        };
    }

    convertToCanvas() {
        const store = this.currentStore;
        if (!store || store.gpsPoints.length === 0) return;
        
        store.boundary = store.gpsPoints.map(p => this.gpsToCanvas(p.lat, p.lng));
        this.storage.updateStore(this.storage.currentStore, {
            boundary: store.boundary
        });
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        
        const store = this.currentStore;
        if (!store) return;
        
        if (store.gpsPoints.length > 0) {
            const showTrail = document.getElementById('showTrail')?.checked ?? true;
            const smooth = document.getElementById('smoothPath')?.checked ?? true;
            
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#0d6efd';
            this.ctx.lineWidth = 3;
            this.ctx.lineJoin = 'round';
            this.ctx.lineCap = 'round';
            
            const points = store.gpsPoints.map(p => this.gpsToCanvas(p.lat, p.lng));
            
            if (points.length > 0) {
                this.ctx.moveTo(points[0].x, points[0].y);
                
                if (smooth && points.length > 2) {
                    for (let i = 1; i < points.length - 1; i++) {
                        const xc = (points[i].x + points[i + 1].x) / 2;
                        const yc = (points[i].y + points[i + 1].y) / 2;
                        this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                    }
                    this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
                } else {
                    points.forEach(p => this.ctx.lineTo(p.x, p.y));
                }
                
                this.ctx.stroke();
                
                if (showTrail) {
                    points.forEach((p, i) => {
                        this.ctx.beginPath();
                        this.ctx.fillStyle = i === 0 ? '#198754' : '#0d6efd';
                        this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                        this.ctx.fill();
                    });
                }
                
                if (this.isRecording && points.length > 0) {
                    const last = points[points.length - 1];
                    this.ctx.beginPath();
                    this.ctx.fillStyle = '#dc3545';
                    this.ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = 'rgba(220, 53, 69, 0.5)';
                    this.ctx.lineWidth = 2;
                    this.ctx.arc(last.x, last.y, 15, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }
        }
    }

    drawGrid() {
        const gridSize = 50 * this.scale;
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        
        for (let x = this.offsetX % gridSize; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = this.offsetY % gridSize; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    startDrag(e) {
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left - this.offsetX,
            y: e.clientY - rect.top - this.offsetY
        };
    }

    drag(e) {
        if (!this.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        this.offsetX = (e.clientX - rect.left) - this.dragStart.x;
        this.offsetY = (e.clientY - rect.top) - this.dragStart.y;
        this.draw();
    }

    endDrag() {
        this.isDragging = false;
    }

    zoom(factor) {
        this.scale *= factor;
        this.draw();
    }

    centerView() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        this.draw();
    }

    updateUI(recording) {
        document.getElementById('gpsStatus').className = 
            recording ? 'gps-status active' : 'gps-status inactive';
        document.getElementById('gpsStatusText').textContent = 
            recording ? 'Recording' : 'GPS Off';
        document.getElementById('recordingIndicator').style.display = 
            recording ? 'block' : 'none';
        
        const startBtn = document.getElementById('startMapping');
        const stopBtn = document.getElementById('stopMapping');
        const recordBtn = document.getElementById('toggleRecord');
        
        if (startBtn && stopBtn) {
            startBtn.style.display = recording ? 'none' : 'block';
            stopBtn.style.display = recording ? 'block' : 'none';
        }
        
        if (recordBtn) {
            recordBtn.className = recording ? 
                'btn btn-danger btn-record recording' : 
                'btn btn-danger btn-record';
            recordBtn.innerHTML = recording ? 
                '<i class="bi bi-stop-fill"></i>' : 
                '<i class="bi bi-circle-fill"></i>';
        }
    }

    updateStats() {
        const store = this.currentStore;
        if (!store) return;
        
        document.getElementById('pointCount').textContent = store.gpsPoints.length;
        document.getElementById('distance').textContent = this.totalDistance.toFixed(1);
        
        if (store.gpsPoints.length > 2) {
            const area = this.calculatePolygonArea(store.gpsPoints);
            document.getElementById('area').textContent = area.toFixed(1);
        }
    }

    calculatePolygonArea(points) {
        const store = this.currentStore;
        if (points.length < 3 || !store.origin) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const xi = (points[i].lng - store.origin.lng) * 111320 * Math.cos(store.origin.lat * Math.PI / 180);
            const yi = (store.origin.lat - points[i].lat) * 110540;
            const xj = (points[j].lng - store.origin.lng) * 111320 * Math.cos(store.origin.lat * Math.PI / 180);
            const yj = (store.origin.lat - points[j].lat) * 110540;
            
            area += xi * yj - xj * yi;
        }
        
        return Math.abs(area / 2);
    }

    clear() {
        if (confirm('Clear all GPS data?')) {
            const store = this.currentStore;
            if (store) {
                store.gpsPoints = [];
                store.boundary = [];
                store.origin = null;
                this.storage.updateStore(this.storage.currentStore, {
                    gpsPoints: [],
                    boundary: [],
                    origin: null
                });
            }
            this.lastPosition = null;
            this.totalDistance = 0;
            this.updateStats();
            this.draw();
        }
    }
}

// Beacon Manager
class BeaconManager {
    constructor(storage) {
        this.storage = storage;
        this.isScanning = false;
        this.detectedBeacons = new Map();
        this.bluetoothDevice = null;
        
        this.setupEventListeners();
    }

    get currentStore() {
        return this.storage.getStore(this.storage.currentStore);
    }

    setupEventListeners() {
        document.getElementById('scanBeacons').addEventListener('click', () => this.scanForBeacons());
        document.getElementById('addBeaconManual').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addBeaconModal'));
            modal.show();
        });
        document.getElementById('saveBeacon').addEventListener('click', () => this.addBeaconManually());
    }

    async scanForBeacons() {
        if (!navigator.bluetooth) {
            alert('Bluetooth not supported on this device');
            return;
        }

        try {
            this.updateStatus('scanning');
            
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service']
            });

            this.bluetoothDevice = device;
            
            const server = await device.gatt.connect();
            
            const beacon = {
                id: 'beacon-' + Date.now(),
                name: device.name || 'Unknown Beacon',
                deviceId: device.id,
                rssi: -50,
                position: null,
                range: 10,
                detected: new Date().toISOString()
            };

            this.detectedBeacons.set(beacon.id, beacon);
            this.updateBeaconsList();
            this.updateStatus('connected');
            
            alert(`Beacon detected: ${beacon.name}\nClick on the map to place it.`);
            
        } catch (error) {
            console.error('Bluetooth error:', error);
            alert('Failed to scan for beacons: ' + error.message);
            this.updateStatus('inactive');
        }
    }

    addBeaconManually() {
        const name = document.getElementById('beaconName').value.trim();
        const id = document.getElementById('beaconId').value.trim();
        const range = parseInt(document.getElementById('beaconRange').value);

        if (!name || !id) {
            alert('Please fill all fields');
            return;
        }

        const beacon = {
            id: 'beacon-' + Date.now(),
            name: name,
            deviceId: id,
            rssi: -50,
            position: null,
            range: range,
            detected: new Date().toISOString()
        };

        this.detectedBeacons.set(beacon.id, beacon);
        this.updateBeaconsList();
        
        bootstrap.Modal.getInstance(document.getElementById('addBeaconModal')).hide();
        document.getElementById('beaconName').value = '';
        document.getElementById('beaconId').value = '';
        
        alert('Beacon added! Click on the beacon canvas to place it.');
    }

    placeBeacon(beaconId, x, y) {
        const beacon = this.detectedBeacons.get(beaconId);
        if (!beacon) return;

        beacon.position = { x, y };
        
        const store = this.currentStore;
        if (store) {
            store.beacons.push(beacon);
            this.storage.updateStore(this.storage.currentStore, {
                beacons: store.beacons
            });
        }

        this.detectedBeacons.delete(beaconId);
        this.updateBeaconsList();
    }

    updateBeaconsList() {
        const list = document.getElementById('beaconsList');
        
        const beacons = Array.from(this.detectedBeacons.values());
        
        if (beacons.length === 0) {
            list.innerHTML = `
                <div class="list-group-item text-muted text-center">
                    <i class="bi bi-broadcast"></i><br>
                    <small>No beacons detected</small>
                </div>
            `;
            return;
        }

        list.innerHTML = beacons.map(beacon => `
            <div class="beacon-item list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${beacon.name}</strong><br>
                        <small class="text-muted">${beacon.deviceId}</small><br>
                        <span class="badge bg-info signal-strength">RSSI: ${beacon.rssi} dBm</span>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="beaconManager.promptPlaceBeacon('${beacon.id}')">
                        <i class="bi bi-pin-map"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    promptPlaceBeacon(beaconId) {
        alert('Switch to the Beacons tab and click on the map to place this beacon.');
        document.querySelector('[data-bs-target="#beacons"]').click();
        this.pendingBeacon = beaconId;
    }

    startScanning() {
        this.isScanning = true;
        this.updateStatus('scanning');
    }

    stopScanning() {
        this.isScanning = false;
        this.updateStatus('inactive');
    }

    updateStatus(status) {
        const statusEl = document.getElementById('beaconStatus');
        const textEl = document.getElementById('beaconStatusText');
        
        statusEl.className = 'beacon-status ' + status;
        
        const statusText = {
            'inactive': 'BLE Off',
            'scanning': 'Scanning...',
            'connected': 'Connected'
        };
        
        textEl.textContent = statusText[status] || 'BLE Off';
    }

    getPositionCorrection() {
        const store = this.currentStore;
        if (!store || !store.beacons.length) return null;

        // Simple trilateration using beacon RSSI
        // This is a simplified version - real implementation would be more complex
        return {
            latOffset: 0,
            lngOffset: 0,
            accuracy: 5
        };
    }
}

// Initialize everything
const storage = new StorageManager();
const gpsMapper = new GPSMapper('mapCanvas', storage);
const beaconManager = new BeaconManager(storage);

// Store management
document.getElementById('createStore').addEventListener('click', () => {
    const name = document.getElementById('newStoreName').value.trim();
    const address = document.getElementById('newStoreAddress').value.trim();
    
    if (!name) {
        alert('Please enter a store name');
        return;
    }

    const storeId = storage.createStore(name, address);
    storage.currentStore = storeId;
    
    updateStoreSelector();
    
    bootstrap.Modal.getInstance(document.getElementById('newStoreModal')).hide();
    document.getElementById('newStoreName').value = '';
    document.getElementById('newStoreAddress').value = '';
});

document.getElementById('importStoreBtn').addEventListener('click', () => {
    document.getElementById('importStoreInput').click();
});

document.getElementById('importStoreInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const storeId = storage.importStore(event.target.result);
        if (storeId) {
            storage.currentStore = storeId;
            updateStoreSelector();
            alert('Store imported successfully!');
        } else {
            alert('Failed to import store');
        }
    };
    reader.readAsText(file);
});

function updateStoreSelector() {
    const dropdown = document.getElementById('storeListDropdown');
    const currentName = document.getElementById('currentStoreName');
    const stores = Object.values(storage.stores);
    
    if (stores.length === 0) {
        dropdown.innerHTML = '<a class="dropdown-item text-muted" href="#">No stores yet</a>';
        currentName.textContent = 'Select Store';
        return;
    }

    dropdown.innerHTML = stores.map(store => `
        <a class="dropdown-item ${store.id === storage.currentStore ? 'active' : ''}" 
           href="#" 
           onclick="selectStore('${store.id}')">
            ${store.name}
            ${store.address ? `<br><small class="text-muted">${store.address}</small>` : ''}
        </a>
    `).join('');

    if (storage.currentStore) {
        const current = storage.getStore(storage.currentStore);
        currentName.textContent = current.name;
        
        // Load floor plan if exists
        if (current.floorPlan) {
            const img = document.getElementById('floorPlanImage');
            img.src = current.floorPlan;
            img.style.display = document.getElementById('showFloorPlan')?.checked ? 'block' : 'none';
        }
    }
}

function selectStore(storeId) {
    storage.currentStore = storeId;
    updateStoreSelector();
    gpsMapper.draw();
    location.reload(); // Reload to update all components
}

// Initialize
updateStoreSelector();

// Request permissions on mobile
if (typeof DeviceOrientationEvent !== 'undefined' && 
    typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.body.addEventListener('click', function requestPermission() {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    console.log('Compass permission granted');
                }
            })
            .catch(console.error);
        document.body.removeEventListener('click', requestPermission);
    }, { once: true });
}

console.log('Shopping Mapper Pro initialized');
