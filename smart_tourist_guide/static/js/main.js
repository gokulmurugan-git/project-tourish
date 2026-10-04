/**
 * Smart Tourist Guide - Main Application JavaScript
 * Global utilities: Toast notifications, Geolocation, Favorites, Mobile Menu
 */

const App = {
  userLocation: null,
  
  init() {
    this.setupMobileMenu();
    this.setupActiveNav();
    this.initLocation();
  },

  // Toast notifications (no window.alert)
  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Geolocation handling
  initLocation() {
    const cached = localStorage.getItem('user_location');
    if (cached) {
      try {
        this.userLocation = JSON.parse(cached);
        this.updateLocationBadge();
      } catch (e) {
        localStorage.removeItem('user_location');
      }
    }
  },

  requestLocation(callback) {
    if (!navigator.geolocation) {
      App.toast('Geolocation is not supported by your browser.', 'error');
      if (callback) callback(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        App.userLocation = loc;
        localStorage.setItem('user_location', JSON.stringify(loc));
        App.toast('Location updated successfully!', 'success');
        App.updateLocationBadge();
        if (callback) callback(loc);
      },
      (error) => {
        let msg = 'Could not access your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Showing default destination area.';
        }
        App.toast(msg, 'info');
        // Default fallback to Madurai / Central tourist hub
        const fallback = { lat: 9.9195, lng: 78.1194, isDefault: true };
        App.userLocation = fallback;
        if (callback) callback(fallback);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  },

  updateLocationBadge() {
    const badges = document.querySelectorAll('.user-location-badge');
    badges.forEach(b => {
      if (this.userLocation) {
        b.textContent = `📍 ${this.userLocation.lat.toFixed(2)}, ${this.userLocation.lng.toFixed(2)}`;
      }
    });
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  },

  // Mobile menu
  setupMobileMenu() {
    const toggle = document.querySelector('.nav-toggle-btn');
    const menu = document.querySelector('.nav-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        menu.classList.toggle('open');
      });
    }
  },

  // Highlight active link
  setupActiveNav() {
    const path = window.location.pathname;
    const links = document.querySelectorAll('.nav-link');
    links.forEach(l => {
      const href = l.getAttribute('href');
      if (href === path || (href !== '/' && path.startsWith(href))) {
        l.classList.add('active');
      }
    });
  },

  // Global Favorite toggle
  async toggleFavorite(placeId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const user = Auth.getCurrentUser();
    if (!user) {
      App.toast('Please log in to save places to your favorites.', 'info');
      setTimeout(() => {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }, 1200);
      return;
    }

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId, user_id: user.user_id })
      });
      const data = await res.json();
      
      const buttons = document.querySelectorAll(`[data-fav-id="${placeId}"]`);
      buttons.forEach(btn => {
        if (data.is_favorite) {
          btn.classList.add('favorited');
          btn.innerHTML = '❤️';
        } else {
          btn.classList.remove('favorited');
          btn.innerHTML = '🤍';
        }
      });

      App.toast(data.message, data.is_favorite ? 'success' : 'info');
    } catch (err) {
      App.toast('Failed to update favorites. Please try again.', 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
