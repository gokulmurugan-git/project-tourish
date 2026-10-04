/**
 * Smart Tourist Guide - AI Trip Planner Module
 * Interacts with backend Gemini API to synthesize structured day itineraries
 * Allows saving trips to user's saved trips in Firestore
 */

const TripPlanner = {
  currentGeneratedTrip: null,

  init() {
    const form = document.getElementById('trip-planner-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleGenerate(e));
    }

    const saveBtn = document.getElementById('save-trip-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSaveTrip());
    }
  },

  async handleGenerate(e) {
    e.preventDefault();
    const destination = document.getElementById('trip-destination').value.trim();
    const days = parseInt(document.getElementById('trip-days').value) || 2;
    const budget = document.getElementById('trip-budget').value.trim();
    const people = parseInt(document.getElementById('trip-people').value) || 2;
    const style = document.getElementById('trip-style').value;

    const interestInputs = document.querySelectorAll('input[name="interests"]:checked');
    const interests = Array.from(interestInputs).map(cb => cb.value);

    if (!destination) {
      App.toast('Please enter a destination.', 'error');
      return;
    }

    const outputContainer = document.getElementById('itinerary-output');
    const emptyState = document.getElementById('itinerary-empty-state');
    const actionBtns = document.getElementById('itinerary-actions');

    if (emptyState) emptyState.style.display = 'none';
    if (actionBtns) actionBtns.style.display = 'none';

    outputContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
        <div style="display: inline-block; width: 44px; height: 44px; border: 4px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--secondary); margin-top: 1.25rem;">Designing Your Personalized Itinerary...</h3>
        <p style="color: var(--text-muted); font-size: 0.9375rem; max-width: 440px; margin: 0.5rem auto 0;">Gemini AI is analyzing top attractions, optimal timings, local dining, and route efficiency for ${destination}.</p>
      </div>
    `;

    try {
      const res = await fetch('/api/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          days,
          budget,
          people,
          interests,
          travel_style: style
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate itinerary');
      }

      this.currentGeneratedTrip = {
        destination,
        duration: `${days} Days`,
        budget,
        people,
        interests: interests.join(', '),
        travel_style: style,
        itinerary: data.itinerary
      };

      this.renderItinerary(data.itinerary, destination, days);
      if (actionBtns) actionBtns.style.display = 'flex';
      App.toast('Itinerary generated successfully!', 'success');
    } catch (err) {
      outputContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: white; border-radius: var(--radius-xl); border: 1px solid var(--border-light);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--secondary);">Something went wrong</h3>
          <p style="color: var(--text-muted); font-size: 0.9375rem; margin: 0.5rem 0 1.25rem;">${err.message || 'Please try again in a moment.'}</p>
          <button onclick="document.getElementById('trip-planner-form').dispatchEvent(new Event('submit'))" class="btn btn-sm btn-primary">Try Again</button>
        </div>
      `;
    }
  },

  renderItinerary(itinerary, destination, days) {
    const outputContainer = document.getElementById('itinerary-output');
    
    // Check if structured days array or markdown/text
    let daysContent = '';

    if (itinerary.days && Array.isArray(itinerary.days)) {
      daysContent = itinerary.days.map((day, idx) => `
        <div class="timeline-day-card">
          <div class="timeline-day-head">
            <div>
              <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; color: var(--primary); letter-spacing: 0.05em;">Day ${idx + 1}</span>
              <h3 class="timeline-day-title">${day.theme || `Day ${idx + 1}: Discovering ${destination}`}</h3>
            </div>
            ${day.estimated_cost ? `<span style="font-size: 0.875rem; font-weight: 600; color: #059669; background: #d1fae5; padding: 4px 10px; border-radius: var(--radius-sm);">Est. ${day.estimated_cost}</span>` : ''}
          </div>
          <div class="timeline-items">
            ${(day.activities || []).map(act => `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-time">${act.time || 'Morning'}</div>
                <div class="timeline-activity">${act.title}</div>
                <p class="timeline-notes">${act.description}</p>
                ${act.tip ? `<p style="font-size: 0.8125rem; color: #b45309; margin-top: 4px;">💡 <b>Tip:</b> ${act.tip}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } else if (typeof itinerary.raw_text === 'string') {
      // Formatted text display
      const formatted = itinerary.raw_text
        .replace(/### (.*?)\n/g, '<h3 style="font-size: 1.25rem; font-weight: 700; color: var(--secondary); margin: 1.5rem 0 0.75rem;">$1</h3>')
        .replace(/## (.*?)\n/g, '<h2 style="font-size: 1.4rem; font-weight: 700; color: var(--primary); margin: 2rem 0 1rem;">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n\n/g, '</p><p style="margin-bottom: 0.75rem; line-height: 1.6; color: var(--text-muted);">');

      daysContent = `
        <div class="timeline-day-card">
          <div style="line-height: 1.6; color: var(--secondary);">
            <p>${formatted}</p>
          </div>
        </div>
      `;
    }

    outputContainer.innerHTML = `
      <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span style="font-size: 0.8125rem; font-weight: 600; color: var(--primary); text-transform: uppercase;">Custom Travel Plan</span>
          <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--secondary);">${days} Days in ${destination}</h2>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button onclick="window.print()" class="btn btn-sm btn-secondary">🖨️ Print Plan</button>
        </div>
      </div>
      <div class="timeline-container">
        ${daysContent}
      </div>
    `;
  },

  async handleSaveTrip() {
    if (!this.currentGeneratedTrip) return;

    const user = Auth.requireAuth();
    if (!user) return;

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          ...this.currentGeneratedTrip
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save trip');

      App.toast('Trip saved to My Trips!', 'success');
      const saveBtn = document.getElementById('save-trip-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saved to My Trips ✅';
      }
    } catch (e) {
      App.toast(e.message, 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  TripPlanner.init();
});
