/**
 * Smart Tourist Guide - Authentication Module
 * Manages user registration, login, logout, and session states.
 */

const Auth = {
  USER_KEY: 'stg_current_user',

  getCurrentUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.USER_KEY);
    }
    this.updateNavAuth();
  },

  async register(name, email, password, language = 'English') {
    if (!name || !email || !password) {
      App.toast('All fields are required.', 'error');
      return { success: false, message: 'All fields are required' };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, language })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      this.setCurrentUser(data.user);
      App.toast('Account created successfully! Welcome to Smart Tourist Guide.', 'success');
      return { success: true, user: data.user };
    } catch (err) {
      App.toast(err.message, 'error');
      return { success: false, message: err.message };
    }
  },

  async login(email, password) {
    if (!email || !password) {
      App.toast('Please enter email and password.', 'error');
      return { success: false, message: 'Missing credentials' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      this.setCurrentUser(data.user);
      App.toast('Welcome back, ' + data.user.name + '!', 'success');
      return { success: true, user: data.user };
    } catch (err) {
      App.toast(err.message, 'error');
      return { success: false, message: err.message };
    }
  },

  logout() {
    this.setCurrentUser(null);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    App.toast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = '/login';
    }, 600);
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      App.toast('Please log in to access this page.', 'info');
      const current = window.location.pathname;
      window.location.href = '/login?redirect=' + encodeURIComponent(current);
      return false;
    }
    return user;
  },

  requireAdmin() {
    const user = this.requireAuth();
    if (!user) return false;
    if (user.role !== 'admin') {
      App.toast('Access denied. Administrator privileges required.', 'error');
      window.location.href = '/dashboard';
      return false;
    }
    return user;
  },

  updateNavAuth() {
    const user = this.getCurrentUser();
    const navActions = document.getElementById('nav-auth-actions');
    if (!navActions) return;

    if (user) {
      const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
      navActions.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <a href="/dashboard" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: var(--secondary);">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.8125rem;">${initials}</div>
            <span class="user-nav-name" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.name}</span>
          </a>
          ${user.role === 'admin' ? '<a href="/admin" class="btn btn-sm btn-accent">Admin</a>' : ''}
          <button onclick="Auth.logout()" class="btn btn-sm btn-secondary" title="Log Out">Log Out</button>
        </div>
      `;
    } else {
      navActions.innerHTML = `
        <a href="/login" class="btn btn-sm btn-secondary">Log In</a>
        <a href="/register" class="btn btn-sm btn-primary">Sign Up</a>
      `;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.updateNavAuth();
});
