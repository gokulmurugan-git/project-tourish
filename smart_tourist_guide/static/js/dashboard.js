/**
 * Smart Tourist Guide - Dashboard Module
 * Populates user statistics, nearby discoveries, favorite places, and upcoming trips.
 */

const Dashboard = {
  async init() {
    const user = Auth.requireAuth();
    if (!user) return;

    this.renderWelcome(user);
    await Promise.all([
      this.loadStats(user),
      this.loadNearbyPlaces(),
      this.loadRecommended(),
      this.loadUpcomingEvents(),
      this.loadUserTrips(user),
      this.loadUserFavorites(user)
    ]);
  },

  renderWelcome(user) {
    const nameElem = document.getElementById('dash-user-name');
    if (nameElem) nameElem.textContent = user.name || 'Traveler';

    const locElem = document.getElementById('dash-location-text');
    if (locElem) {
      if (App.userLocation) {
        locElem.textContent = `Current Location: ${App.userLocation.lat.toFixed(2)}° N, ${App.userLocation.lng.toFixed(2)}° E`;
      } else {
        locElem.innerHTML = `<button onclick="App.requestLocation(() => Dashboard.init())" class="btn btn-sm btn-secondary" style="color: white; background: rgba(255,255,255,0.15); border: none;">Enable Location for Nearby Spots 📍</button>`;
      }
    }
  },

  async loadStats(user) {
    try {
      const [favRes, tripRes] = await Promise.all([
        fetch(`/api/favorites?user_id=${user.user_id}`).then(r => r.json()),
        fetch(`/api/trips?user_id=${user.user_id}`).then(r => r.json())
      ]);

      const favCount = document.getElementById('stat-fav-count');
      if (favCount) favCount.textContent = favRes.favorites ? favRes.favorites.length : 0;

      const tripCount = document.getElementById('stat-trip-count');
      if (tripCount) tripCount.textContent = tripRes.trips ? tripRes.trips.length : 0;
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
  },

  async loadNearbyPlaces() {
    const container = document.getElementById('dash-nearby-grid');
    if (!container) return;

    try {
      const lat = App.userLocation ? App.userLocation.lat : 9.9195;
      const lng = App.userLocation ? App.userLocation.lng : 78.1194;
      const res = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&limit=3`);
      const data = await res.json();

      const places = data.places || [];
      if (places.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); padding: 1rem;">No nearby places identified yet.</p>`;
        return;
      }

      container.innerHTML = places.map(p => {
        let dist = '';
        if (App.userLocation) {
          const d = App.calculateDistance(App.userLocation.lat, App.userLocation.lng, p.latitude, p.longitude);
          if (d) dist = `${d} km away`;
        }

        return `
          <div class="place-card" style="box-shadow: none; border: 1px solid var(--border-light);">
            <div class="card-media" style="aspect-ratio: 16 / 9;">
              <img src="${p.image_url}" alt="${p.name}">
            </div>
            <div class="card-body">
              <div class="card-meta">
                <span style="font-weight: 600; color: var(--primary); font-size: 0.75rem;">${p.category}</span>
                <span>·</span>
                <span class="card-rating">★ ${p.rating ? p.rating.toFixed(1) : '4.8'}</span>
              </div>
              <h4 class="card-title" style="font-size: 1rem;">${p.name}</h4>
              <p class="card-desc" style="-webkit-line-clamp: 2;">${p.description}</p>
              <div class="card-footer">
                <span class="card-distance">${dist || '📍 Central'}</span>
                <a href="/place/${p.place_id}" class="btn btn-sm btn-secondary">Details</a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<p style="color: var(--text-muted); padding: 1rem;">Unable to load nearby places.</p>`;
    }
  },

  async loadRecommended() {
    const container = document.getElementById('dash-recommended-grid');
    if (!container) return;

    try {
      const res = await fetch('/api/places?limit=3');
      const data = await res.json();
      const places = (data.places || []).slice(0, 3);

      container.innerHTML = places.map(p => `
        <div class="place-card">
          <div class="card-media">
            <img src="${p.image_url}" alt="${p.name}">
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span style="font-weight: 600; color: var(--primary); font-size: 0.75rem;">${p.category}</span>
              <span>·</span>
              <span class="card-rating">★ ${p.rating.toFixed(1)}</span>
            </div>
            <h4 class="card-title">${p.name}</h4>
            <p class="card-desc">${p.description}</p>
            <div class="card-footer">
              <span style="color: var(--text-muted); font-size: 0.8125rem;">📍 ${p.location}</span>
              <a href="/place/${p.place_id}" class="btn btn-sm btn-primary">Explore</a>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.warn(e);
    }
  },

  async loadUpcomingEvents() {
    const container = document.getElementById('dash-events-list');
    if (!container) return;

    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      const events = (data.events || []).slice(0, 3);

      if (events.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); padding: 1rem;">No upcoming events scheduled.</p>`;
        return;
      }

      container.innerHTML = events.map(ev => `
        <div style="display: flex; gap: 1rem; align-items: center; padding: 0.875rem; border-bottom: 1px solid var(--border-subtle);">
          <div style="width: 52px; height: 52px; border-radius: var(--radius-md); overflow: hidden; flex-shrink: 0;">
            <img src="${ev.image_url}" alt="${ev.name}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="flex: 1;">
            <h4 style="font-size: 0.9375rem; font-weight: 600; color: var(--secondary);">${ev.name}</h4>
            <p style="font-size: 0.8125rem; color: var(--text-muted);">📅 ${ev.date} · 📍 ${ev.location}</p>
          </div>
          <a href="/events" class="btn btn-sm btn-secondary" style="font-size: 0.75rem;">View</a>
        </div>
      `).join('');
    } catch (e) {
      console.warn(e);
    }
  },

  async loadUserTrips(user) {
    const container = document.getElementById('dash-trips-list');
    if (!container) return;

    try {
      const res = await fetch(`/api/trips?user_id=${user.user_id}`);
      const data = await res.json();
      const trips = data.trips || [];

      if (trips.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; background: var(--bg-card-alt); border-radius: var(--radius-lg);">
            <p style="font-size: 0.9375rem; color: var(--text-muted); margin-bottom: 1rem;">You don't have any saved itineraries yet.</p>
            <a href="/trip-planner" class="btn btn-sm btn-primary">Plan a Trip with AI ⚡</a>
          </div>
        `;
        return;
      }

      container.innerHTML = trips.slice(0, 3).map(t => `
        <div style="padding: 1rem; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-md); margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--secondary);">${t.destination}</h4>
            <p style="font-size: 0.8125rem; color: var(--text-muted);">Duration: ${t.duration} · Budget: ${t.budget || 'Flexible'}</p>
          </div>
          <a href="/my-trips" class="btn btn-sm btn-secondary">View Trip</a>
        </div>
      `).join('');
    } catch (e) {
      console.warn(e);
    }
  },

  async loadUserFavorites(user) {
    const container = document.getElementById('dash-favorites-list');
    if (!container) return;

    try {
      const res = await fetch(`/api/favorites?user_id=${user.user_id}`);
      const data = await res.json();
      const favs = data.favorites || [];

      if (favs.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); padding: 1rem;">No saved favorite places yet.</p>`;
        return;
      }

      container.innerHTML = favs.slice(0, 4).map(f => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="color: #ef4444;">❤️</span>
            <span style="font-weight: 600; font-size: 0.9375rem; color: var(--secondary);">${f.place_name || f.place_id}</span>
          </div>
          <a href="/place/${f.place_id}" class="btn btn-sm btn-secondary" style="font-size: 0.75rem;">View</a>
        </div>
      `).join('');
    } catch (e) {
      console.warn(e);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dash-user-name')) {
    Dashboard.init();
  }
});
