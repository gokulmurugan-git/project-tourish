/**
 * Smart Tourist Guide - Explore Page Logic
 * Search, filters, category tabs, and place card rendering
 */

const Explore = {
  places: [],
  activeCategory: 'All',
  searchQuery: '',
  userFavorites: new Set(),

  async init() {
    this.setupListeners();
    await this.fetchUserFavorites();
    await this.loadPlaces();
  },

  async fetchUserFavorites() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    try {
      const res = await fetch(`/api/favorites?user_id=${user.user_id}`);
      if (res.ok) {
        const data = await res.json();
        this.userFavorites = new Set(data.favorites.map(f => f.place_id));
      }
    } catch (e) {
      console.warn('Could not load user favorites', e);
    }
  },

  setupListeners() {
    const searchInput = document.getElementById('explore-search');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          this.render();
        }, 250);
      });
    }

    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.dataset.category || 'All';
        this.render();
      });
    });

    const sortSelect = document.getElementById('explore-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.render();
      });
    }
  },

  async loadPlaces() {
    const container = document.getElementById('explore-grid');
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <div style="display: inline-block; width: 36px; height: 36px; border: 3px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9375rem;">Discovering incredible places for you...</p>
        </div>
      `;
    }

    try {
      const res = await fetch('/api/places');
      const data = await res.json();
      this.places = data.places || [];
      this.render();
    } catch (err) {
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-light);">
            <p style="font-size: 1.1rem; font-weight: 600; color: var(--secondary);">Something went wrong.</p>
            <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">Could not load tourist attractions right now.</p>
            <button onclick="Explore.loadPlaces()" class="btn btn-sm btn-primary">Try Again</button>
          </div>
        `;
      }
    }
  },

  render() {
    const container = document.getElementById('explore-grid');
    if (!container) return;

    let filtered = this.places.filter(place => {
      const matchesCategory = (this.activeCategory === 'All' || place.category.toLowerCase() === this.activeCategory.toLowerCase());
      const matchesSearch = !this.searchQuery || 
        place.name.toLowerCase().includes(this.searchQuery) ||
        (place.location && place.location.toLowerCase().includes(this.searchQuery)) ||
        (place.description && place.description.toLowerCase().includes(this.searchQuery));
      return matchesCategory && matchesSearch;
    });

    const sortSelect = document.getElementById('explore-sort');
    const sortVal = sortSelect ? sortSelect.value : 'rating';

    if (sortVal === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortVal === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortVal === 'distance' && App.userLocation) {
      filtered.sort((a, b) => {
        const distA = parseFloat(App.calculateDistance(App.userLocation.lat, App.userLocation.lng, a.latitude, a.longitude) || 9999);
        const distB = parseFloat(App.calculateDistance(App.userLocation.lat, App.userLocation.lng, b.latitude, b.longitude) || 9999);
        return distA - distB;
      });
    }

    const countElem = document.getElementById('explore-count');
    if (countElem) {
      countElem.textContent = `Showing ${filtered.length} places`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-light);">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">🗺️</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--secondary);">No places found</h3>
          <p style="color: var(--text-muted); font-size: 0.9375rem; margin-top: 0.375rem;">Try adjusting your search query or selecting a different category filter.</p>
          <button onclick="document.getElementById('explore-search').value=''; Explore.searchQuery=''; Explore.activeCategory='All'; document.querySelector('.filter-tab').click();" class="btn btn-sm btn-secondary" style="margin-top: 1.25rem;">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(place => {
      const isFav = this.userFavorites.has(place.place_id);
      let distText = '';
      if (App.userLocation) {
        const d = App.calculateDistance(App.userLocation.lat, App.userLocation.lng, place.latitude, place.longitude);
        if (d) distText = `${d} km away`;
      }

      return `
        <div class="place-card">
          <div class="card-media">
            <img src="${place.image_url || 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80'}" alt="${place.name}" loading="lazy">
            <button class="card-favorite-btn ${isFav ? 'favorited' : ''}" data-fav-id="${place.place_id}" onclick="App.toggleFavorite('${place.place_id}', event)" title="Save to Favorites">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span style="font-weight: 600; color: var(--primary); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">${place.category}</span>
              <span aria-hidden="true">·</span>
              <span class="card-rating">★ ${place.rating ? place.rating.toFixed(1) : '4.8'}</span>
            </div>
            <h3 class="card-title">${place.name}</h3>
            <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.5rem;">📍 ${place.location || 'Tamil Nadu, India'}</p>
            <p class="card-desc">${place.description}</p>
            <div class="card-footer">
              <span class="card-distance">${distText ? '📍 ' + distText : '🕒 ' + (place.opening_time || '09:00 AM') + ' - ' + (place.closing_time || '06:00 PM')}</span>
              <a href="/place/${place.place_id}" class="btn btn-sm btn-primary">View Details</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('explore-grid')) {
    Explore.init();
  }
});
