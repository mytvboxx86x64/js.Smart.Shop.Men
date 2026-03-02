# Shopping Mapper Pro - Complete Documentation

## Overview
Shopping Mapper Pro is a progressive web app that helps users map retail stores and create optimized shopping routes using GPS tracking, Bluetooth beacons, and computer vision.

## Features

### 1. Multiple Store Management
- **Create unlimited stores**: Each store has its own map, zones, products, and beacons
- **Store profiles**: Name, address, creation date
- **Quick switching**: Dropdown menu to switch between stores
- **Data isolation**: Each store's data is completely separate

### 2. GPS-Based Mapping

#### How It Works
1. Click "Start Recording" (or red button on mobile)
2. Walk around the store perimeter with your phone
3. App automatically tracks your GPS coordinates
4. Click "Stop Recording" when you complete the loop
5. Path is automatically converted to store boundary

#### GPS Features
- **High accuracy mode**: Uses device's best GPS capabilities
- **WiFi positioning**: Works indoors with WiFi triangulation
- **Smart filtering**: Ignores points closer than 0.5m to reduce noise
- **Path smoothing**: Creates natural, curved boundaries
- **Real-time tracking**: See your path as you walk
- **Distance calculation**: Shows total distance traveled
- **Area calculation**: Automatic store area measurement

#### GPS Settings
- **Update Interval**: How often GPS updates (100-5000ms)
- **Min Distance**: Minimum movement to record point (0.1-5m)
- **Smooth Path**: Toggle bezier curve smoothing
- **Show Trail**: Display individual GPS points

### 3. Bluetooth Beacon Support

#### What Are Beacons?
Bluetooth Low Energy (BLE) devices placed around the store that improve indoor positioning accuracy from 30m to ~5m.

#### How to Use Beacons
1. **Physical Setup**: Place BLE beacons around the store (recommended: one every 10-20m)
2. **Scan for Beacons**: Click "Scan for Beacons" to detect nearby devices
3. **Place on Map**: Click detected beacon, then click map location to place it
4. **Range Configuration**: Set each beacon's effective range (1-50m)

#### Manual Beacon Addition
If automatic scanning doesn't work:
1. Click "Add Manual"
2. Enter beacon name and ID (MAC address or UUID)
3. Set range in meters
4. Place on map

#### Beacon-Enhanced Positioning
- Enable "Use Bluetooth Beacons" in settings
- During GPS recording, beacons provide position corrections
- RSSI (signal strength) used for distance estimation
- Trilateration algorithm combines multiple beacons for accuracy

### 4. Floor Plan Import

#### Supported Formats
- JPG, PNG, GIF, WEBP
- Any resolution (auto-scaled to canvas)

#### How to Use
1. Click floor plan import button (image icon)
2. Select floor plan image from device
3. Image overlays on canvas at 50% opacity
4. Use GPS or manual drawing to trace boundaries
5. Toggle floor plan visibility in settings

#### Use Cases
- Trace existing architectural plans
- Verify GPS mapping accuracy
- Plan store layout before physical mapping
- Import satellite imagery for outdoor areas

### 5. Import/Export Features

#### Export Store Data
**Format**: JSON file with complete store information
**Includes**:
- Store metadata (name, address, creation date)
- GPS points (latitude, longitude, accuracy, timestamp)
- Boundary coordinates
- Zones (polygons, colors, names)
- Products (names, positions, zone assignments)
- Beacons (positions, ranges, device IDs)
- Floor plan image (base64 encoded)

**Use Cases**:
- Backup store data
- Share with team members
- Transfer between devices
- Archive historical layouts

#### Export GPS Track
**Format**: GPX (GPS Exchange Format)
**Includes**:
- Track points with timestamps
- Latitude/longitude coordinates
- Store metadata

**Use Cases**:
- Import into GIS software (QGIS, ArcGIS)
- Analyze in GPS tracking apps
- Convert to other formats (KML, KMZ)
- Share with mapping services

#### Import Store
1. Click "Import Store" in store dropdown
2. Select previously exported JSON file
3. Store loads with "(Imported)" suffix
4. All data restored (zones, products, beacons, floor plan)

### 6. Product Zones

#### Creating Zones
1. Click "Add Zone"
2. Enter zone name (e.g., "Dairy", "Bakery", "Produce")
3. Choose zone color
4. Click on map to draw zone boundary (minimum 3 points)
5. Press Enter or right-click to close zone

#### Zone Features
- **Visual distinction**: Each zone has unique color
- **Labels**: Zone names displayed at center
- **Overlap support**: Zones can overlap (e.g., "Organic" + "Produce")
- **Editing**: Delete zones with trash button
- **Color legend**: Visual reference on sidebar

### 7. Product Placement

#### Adding Products
1. Click "Add Product"
2. Enter product name
3. Select zone from dropdown
4. Click on map to place product marker

#### Product Features
- **Zone association**: Each product linked to zone
- **Visual markers**: Color-coded dots matching zone colors
- **Product labels**: Names displayed above markers
- **Search integration**: Products available for shopping list
- **Bulk management**: List view with delete options

### 8. Smart Shopping Lists

#### Creating Lists
1. Type product name in input
2. Press Enter or click Add
3. App checks if product exists in database
4. Products not in database added with warning

#### Route Optimization
1. Click "Generate Route"
2. App groups products by zone
3. Zones ordered by proximity (simple nearest-neighbor)
4. Numbered sequence shows optimal path
5. Visual route map displays journey

#### Route Display
- **Grouped by zone**: All products in same zone together
- **Sequential numbers**: Shows order to visit zones
- **Distance estimation**: Based on zone centers
- **Visual map**: Miniature route with numbered stops
- **Turn-by-turn**: Clear zone-by-zone breakdown

## Technical Implementation

### Data Storage
- **LocalStorage**: All data persisted in browser
- **JSON format**: Structured, human-readable
- **Automatic saves**: Every change saved immediately
- **No server required**: 100% offline-capable

### GPS Calculations
- **Haversine formula**: Accurate distance on sphere
- **Coordinate conversion**: Lat/lng → meters → pixels
- **Origin point**: First GPS point as reference
- **Scale factor**: Configurable pixels per meter (default: 100)

### Canvas Rendering
- **HTML5 Canvas**: Hardware-accelerated drawing
- **Pan & zoom**: Touch and mouse support
- **Grid overlay**: Visual scale reference
- **Layer system**: Floor plan → boundaries → zones → products → beacons

### Bluetooth Integration
- **Web Bluetooth API**: Standard browser API
- **BLE scanning**: Discover nearby beacons
- **RSSI measurement**: Signal strength for distance
- **Device pairing**: Secure connection to beacons

## Browser Support

### Desktop
- ✅ Chrome 56+
- ✅ Edge 79+
- ✅ Opera 43+
- ⚠️ Firefox (GPS only, no Bluetooth)
- ❌ Safari (limited GPS, no Bluetooth)

### Mobile
- ✅ Chrome Android 56+
- ✅ Samsung Internet 6.0+
- ⚠️ Safari iOS (GPS only, no Bluetooth)
- ❌ Firefox Android (limited features)

## Permissions Required

### GPS Features
- **Location access**: "Allow" when prompted
- **Background location**: For continuous tracking
- **High accuracy**: Enable in device settings

### Bluetooth Features
- **Bluetooth**: Must be enabled on device
- **Nearby devices**: Permission for scanning
- **Location**: Required for Bluetooth on Android

### Storage
- **LocalStorage**: Automatically granted
- **File access**: For import/export operations

## Best Practices

### GPS Mapping
1. **Walk slowly**: 2-3 km/h for best accuracy
2. **Stay outside**: Better signal in parking lot first
3. **Multiple passes**: Average multiple recordings
4. **Check accuracy**: Green badge = good, red = retry
5. **Stable position**: Wait 10s before starting

### Beacon Placement
1. **Height**: Mount 2-3m high
2. **Spacing**: 10-15m apart for optimal coverage
3. **Line of sight**: Avoid obstacles when possible
4. **Power**: Use beacons with 2+ year battery life
5. **Calibration**: Record exact positions on floor plan

### Zone Definition
1. **Logical grouping**: Match store layout
2. **Clear boundaries**: Avoid ambiguous areas
3. **Color coding**: Intuitive colors (green=produce, blue=dairy)
4. **Size consistency**: Similar-sized zones for balanced routes
5. **Subcategories**: Use overlapping zones for detail

### Product Database
1. **Consistent naming**: "Milk" not "milk" or "MILK"
2. **Common items first**: Most-purchased products
3. **Brand neutrality**: "Bread" not "Wonder Bread"
4. **Categories**: Group similar items
5. **Regular updates**: Add new products as discovered

## Troubleshooting

### GPS Not Working
- **Check permissions**: Settings → Location → Allow
- **Enable high accuracy**: Device settings
- **Move outside**: Better signal outdoors
- **Restart app**: Refresh browser
- **Try WiFi**: Indoor positioning needs WiFi

### Poor GPS Accuracy
- **Wait for lock**: Green accuracy badge
- **Clear sky view**: Move away from buildings
- **Disable power saving**: Can reduce GPS accuracy
- **Update device**: Latest OS version
- **Increase min distance**: Filter out noise

### Bluetooth Not Scanning
- **Check browser**: Chrome or Edge required
- **Enable Bluetooth**: Device settings
- **Grant permission**: Allow nearby devices
- **Pair mode**: Put beacon in discoverable mode
- **Range**: Stand within 10m of beacon

### Floor Plan Not Showing
- **Check toggle**: Enable "Show Floor Plan" in settings
- **File size**: Large images may be slow to load
- **Format**: Use JPG or PNG
- **Browser cache**: Clear and reload
- **Dimensions**: Very large images auto-scaled

### Data Lost
- **Browser clear**: Don't clear browser data
- **Export regularly**: Backup important stores
- **Incognito mode**: Data not saved in private browsing
- **Multiple devices**: Data not synced automatically
- **Storage full**: Clear old stores if needed

## Advanced Features

### Custom Beacon Protocols
The app supports standard BLE advertising packets. For custom beacons:
```javascript
// Add to beacon object
{
  protocol: 'iBeacon', // or 'Eddystone'
  uuid: 'xxxx-xxxx-xxxx-xxxx',
  major: 1,
  minor: 1,
  txPower: -59
}
```

### Export to External Tools
- **QGIS**: Import GPX track, convert to shapefile
- **Google Maps**: Import KML (convert from GPX)
- **Excel**: Export JSON, parse with script
- **AutoCAD**: Convert coordinates to DXF format

### API Integration
Store data is JSON, can be sent to backend:
```javascript
const store = storage.getStore(storeId);
fetch('/api/stores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(store)
});
```

## Privacy & Security

### Data Privacy
- **Local only**: All data stays on device
- **No tracking**: App doesn't send data anywhere
- **No accounts**: No registration required
- **Export control**: User decides what to share

### Location Privacy
- **On-demand**: GPS only when recording
- **User control**: Explicit start/stop
- **No background**: No tracking when app closed
- **Relative coords**: GPS converted to relative positions

## Future Enhancements (Roadmap)

### Planned Features
- [ ] Multi-floor support
- [ ] Real-time navigation while shopping
- [ ] Barcode scanning for products
- [ ] Cloud sync (optional)
- [ ] Collaborative mapping
- [ ] AR view using device camera
- [ ] Voice-guided shopping
- [ ] Price tracking integration
- [ ] Inventory notifications
- [ ] Shopping history analytics

## License
MIT License - Free for personal and commercial use

## Support
For issues, questions, or contributions:
- GitHub: (your repo URL)
- Email: (your email)
- Documentation: (your docs URL)

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Author**: Carlos (ETAP IT Manager)
