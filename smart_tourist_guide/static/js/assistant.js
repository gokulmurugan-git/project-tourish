/**
 * Smart Tourist Guide - AI Tourist Assistant (Chatbot)
 * Handles conversational inquiries, location-aware answers, and suggestion chips.
 */

const Assistant = {
  chatHistory: [],
  isSending: false,

  init() {
    const form = document.getElementById('chat-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    const input = document.getElementById('chat-input');
    if (input) {
      input.focus();
    }

    this.setupSuggestions();
  },

  setupSuggestions() {
    const chips = document.querySelectorAll('.suggestion-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.textContent.trim();
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = text;
          this.sendMessage();
        }
      });
    });
  },

  async sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const message = input.value.trim();
    if (!message || this.isSending) return;

    input.value = '';
    this.isSending = true;

    // Append user message
    this.appendMessage('user', message);

    // Show typing indicator
    const typingId = this.showTypingIndicator();

    try {
      const payload = {
        message: message,
        history: this.chatHistory.slice(-8), // Send last 8 turns for context
        user_location: App.userLocation
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      this.removeTypingIndicator(typingId);

      if (!res.ok) {
        throw new Error(data.message || 'Error communicating with assistant');
      }

      this.appendMessage('assistant', data.response);
      this.chatHistory.push({ role: 'user', content: message });
      this.chatHistory.push({ role: 'assistant', content: data.response });
    } catch (err) {
      this.removeTypingIndicator(typingId);
      this.appendMessage('assistant', 'I apologize, but I encountered an issue connecting to the travel guide service. Please try asking again.');
    } finally {
      this.isSending = false;
      input.focus();
    }
  },

  appendMessage(role, text) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user-message' : 'assistant-message'}`;

    // Clean text / simple markdown formatting
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    if (role === 'assistant') {
      row.innerHTML = `
        <div class="chat-avatar" style="width: 34px; height: 34px; font-size: 0.9375rem; flex-shrink: 0;">🧭</div>
        <div class="message-bubble">${formatted}</div>
      `;
    } else {
      row.innerHTML = `
        <div class="message-bubble">${formatted}</div>
      `;
    }

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  },

  showTypingIndicator() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return null;

    const id = 'typing-' + Date.now();
    const row = document.createElement('div');
    row.id = id;
    row.className = 'message-row assistant-message';
    row.innerHTML = `
      <div class="chat-avatar" style="width: 34px; height: 34px; font-size: 0.9375rem; flex-shrink: 0;">🧭</div>
      <div class="message-bubble" style="display: flex; gap: 4px; align-items: center; padding: 0.75rem 1rem;">
        <span style="display: inline-block; width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: pulse 1s infinite alternate;"></span>
        <span style="display: inline-block; width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: pulse 1s infinite alternate 0.2s;"></span>
        <span style="display: inline-block; width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: pulse 1s infinite alternate 0.4s;"></span>
      </div>
    `;

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return id;
  },

  removeTypingIndicator(id) {
    if (!id) return;
    const elem = document.getElementById(id);
    if (elem) elem.remove();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('chat-messages-container')) {
    Assistant.init();
  }
});
