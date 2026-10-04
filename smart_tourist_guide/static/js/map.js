/**
 * Smart Tourist Guide - Interactive Map Module
 * Powered by Leaflet & OpenStreetMap (or Google Maps if key provided)
 * Markers for attractions, restaurants, hotels, hospitals, police stations.
 */

const TourismMap = {
  map: null,
  markersLayer: null,
  userMarker: null,
  places: [],
  restaurants: [],
  hotels: [],
  emergencyServices: [],
  activeFilter: 'all',

  init() {
    const mapElement = document.getElementById('map-view');
    if (!mapElement) return;

    // Default center (Madurai / South India central tourism hub)
    const initialLat = 9.9252;
    const initialLng = 78.1198;

    this.map = L.map('map-view').setView([initialLat, initialLng], 13);

    // High quality OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors | Smart Tourist Guide'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.setupFilterTabs();
    this.loadAllData();
    this.locateUser();
  },

  locateUser() {
    App.requestLocation((loc) => {
      if (!loc || !this.map) return;
      
      if (this.userMarker) {
        this.map.removeLayer(this.userMarker);
      }

      const pulseIcon = L.divIcon({
        className: 'user-pulse-marker',
        html: `<div style="width: 18px; height: 18px; background: #0284c7; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 8px rgba(2, 132, 199, 0.25);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this.userMarker = L.marker([loc.lat, loc.lng], { icon: pulseIcon })
        .addTo(this.map)
        .bindPopup(`<b>You are here</b><br><small>Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)}</small>`);

      if (!loc.isDefault) {
        this.map.setView([loc.lat, loc.lng], 14);
      }
    });
  },

  async loadAllData() {
    try {
      const [placesRes, restRes, hotelsRes, emergRes] = await Promise.all([
        fetch('/api/places').then(r => r.json()),
        fetch('/api/restaurants').then(r => r.json()),
        fetch('/api/hotels').then(r => r.json()),
        fetch('/api/emergency').then(r => r.json())
      ]);

      this.places = placesRes.places || [];
      this.restaurants = restRes.restaurants || [];
      this.hotels = hotelsRes.hotels || [];
      this.emergencyServices = [
        ...(emergRes.hospitals || []).map(h => ({ ...h, type: 'hospital' })),
        ...(emergRes.police_stations || []).map(p => ({ ...p, type: 'police' }))
      ];

      this.renderMarkers();
      this.renderSidebarList();
    } catch (e) {
      App.toast('Could not load map data points.', 'error');
    }
  },

  setupFilterTabs() {
    const tabs = document.querySelectorAll('.map-filter-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeFilter = tab.dataset.filter || 'all';
        this.renderMarkers();
        this.renderSidebarList();
      });
    });
  },

  createCustomIcon(color, emoji) {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="background-color: ${color}; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white;">
          <span style="transform: rotate(45deg); font-size: 15px;">${emoji}</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32]
    });
  },

  renderMarkers() {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();

    const addMarker = (item, type, color, emoji, viewUrl = '') => {
      if (!item.latitude || !item.longitude) return;

      let distText = '';
      if (App.userLocation) {
        const d = App.calculateDistance(App.userLocation.lat, App.userLocation.lng, item.latitude, item.longitude);
        if (d) distText = `${d} km away`;
      }

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;

      const popupContent = `
        <div style="min-width: 200px; padding: 4px;">
          <h4 style="font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${item.name}</h4>
          <p style="font-size: 0.8125rem; color: #64748b; margin-bottom: 6px;">📍 ${item.location || item.category || type}</p>
          ${distText ? `<p style="font-size: 0.8125rem; font-weight: 600; color: #0284c7; margin-bottom: 8px;">${distText}</p>` : ''}
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            ${viewUrl ? `<a href="${viewUrl}" style="background: #0284c7; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; text-decoration: none; font-weight: 600;">Details</a>` : ''}
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="background: #0f172a; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; text-decoration: none; font-weight: 600;">Get Directions ↗</a>
          </div>
        </div>
      `;

      const marker = L.marker([item.latitude, item.longitude], {
        icon: this.createCustomIcon(color, emoji)
      }).bindPopup(popupContent);

      this.markersLayer.addLayer(marker);
    };

    if (this.activeFilter === 'all' || this.activeFilter === 'places') {
      this.places.forEach(p => addMarker(p, p.category, '#0284c7', '🏛️', `/place/${p.place_id}`));
    }
    if (this.activeFilter === 'all' || this.activeFilter === 'restaurants') {
      this.restaurants.forEach(r => addMarker(r, r.cuisine, '#ea580c', '🍽️', `/restaurants`));
    }
    if (this.activeFilter === 'all' || this.activeFilter === 'hotels') {
      this.hotels.forEach(h => addMarker(h, 'Hotel', '#059669', '🏨', `/hotels`));
    }
    if (this.activeFilter === 'all' || this.activeFilter === 'emergency') {
      this.emergencyServices.forEach(e => {
        const isHosp = e.type === 'hospital';
        addMarker(e, isHosp ? 'Hospital' : 'Police', isHosp ? '#dc2626' : '#4f46e5', isHosp ? '🏥' : '🚓', `/emergency`);
      });
    }
  },

  renderSidebarList() {
    const list = document.getElementById('map-sidebar-items');
    if (!list) return;

    let items = [];
    if (this.activeFilter === 'all' || this.activeFilter === 'places') {
      items = items.concat(this.places.map(p => ({ ...p, markerType: 'Attraction', icon: '🏛️' })));
    }
    if (this.activeFilter === 'all' || this.activeFilter === 'restaurants') {
      items = items.concat(this.restaurants.map(r => ({ ...r, markerType: 'Restaurant', icon: '🍽️' })));
    }
    if (this.activeFilter === 'all' || this.activeFilter === 'hotels') {
      items = items.concat(this.hotels.map(h => ({ ...h, markerType: 'Hotel', icon: '🏨' })));
    }
    if (this.activeFilter === 'all' || this.activeFilter === 'emergency') {
      items = items.concat(this.emergencyServices.map(e => ({ ...e, markerType: e.type === 'hospital' ? 'Hospital' : 'Police', icon: e.type === 'hospital' ? '🏥' : '🚓' })));
    }

    if (items.length === 0) {
      list.innerHTML = `<p style="padding: 1rem; color: var(--text-muted); font-size: 0.875rem;">No locations in this category.</p>`;
      return;
    }

    list.innerHTML = items.slice(0, 30).map(item => {
      let dist = '';
      if (App.userLocation && item.latitude) {
        const d = App.calculateDistance(App.userLocation.lat, App.userLocation.lng, item.latitude, item.longitude);
        if (d) dist = `${d} km`;
      }

      return `
        <div class="map-list-item" onclick="TourismMap.panToLocation(${item.latitude}, ${item.longitude}, '${item.name}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-weight: 600; font-size: 0.9375rem; color: var(--secondary);">
              <span>${item.icon}</span> ${item.name}
            </div>
            ${dist ? `<span style="font-size: 0.75rem; font-weight: 600; color: var(--primary);">${dist}</span>` : ''}
          </div>
          <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px;">
            ${item.category || item.cuisine || item.markerType} · ${item.location || 'Local area'}
          </div>
        </div>
      `;
    }).join('');
  },

  panToLocation(lat, lng, name) {
    if (!this.map || !lat || !lng) return;
    this.map.setView([lat, lng], 16, { animate: true });
    App.toast(`Focusing on ${name}`, 'info');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map-view')) {
    TourismMap.init();
  }
});
