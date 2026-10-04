# 🧭 Smart Tourist Guide

> **“Explore More. Travel Smarter.”**
>
> A real-time, modern, responsive tourism assistance platform integrating **Gemini AI**, **Interactive Maps**, **Real-Time Geolocation**, **Personalized Itinerary Planning**, **Tourism Information**, and **Firebase Firestore & Authentication**.

---

## 📖 1. Project Overview

**Smart Tourist Guide** is a comprehensive full-stack tourism web application engineered to transform how travelers explore destinations. Combining real-time GPS location discovery, AI-synthesized day-by-day itineraries, an intelligent 24/7 tourist assistant powered by Google's **Gemini 3.8 Flash**, verified accommodations and culinary recommendations, and a dedicated emergency assistance hub, the platform serves as an end-to-end travel companion for tourists, solo travelers, and families alike.

---

## ✨ 2. Key Features

- **Attractive Modern Landing Page**: Dynamic hero showcase, curated categories (Historical, Nature, Beach, Religious, Adventure, Food), top destination highlights, and architecture stats.
- **AI Tourist Assistant (Chatbot)**: Conversational assistant answering tourism questions, offering local travel hacks, dietary recommendations, temple etiquettes, and location-aware insights using Gemini AI.
- **Personalized AI Trip Planner**: Generates structured day-by-day itineraries based on destination, duration, budget, group size, interests, and preferred travel pace.
- **Interactive Map**: Built with Leaflet & OpenStreetMap, displaying live GPS location pulse, custom colored map markers for attractions, restaurants, hotels, hospitals, and police stations with one-tap directions.
- **Real-Time Geolocation**: Browser Geolocation API (`navigator.geolocation`) calculates accurate distances (km) to nearby tourist destinations.
- **Place Details & Visitor Guides**: Comprehensive pages showing high-resolution imagery, opening/closing hours, entry guidelines, nearby dining, and community reviews.
- **Role-Based Admin Console**: Admin dashboard to add/edit/delete places, curate restaurants and hotels, broadcast tourism advisories, and moderate user reviews.
- **Verified Emergency Hub**: Direct access to national 24/7 hotlines (112, 108 Ambulance, 1363 Tourist Helpline, 1091 Women Safety), plus localized hospital and police contacts with click-to-call.
- **User Dashboard & Bookmarks**: User profile tracking upcoming trips, saved bucket-list favorites, and personalized recommendations.

---

## 🛠️ 3. Technology Stack

### Frontend
- **HTML5**: Semantic, accessible markup.
- **CSS3**: Custom modern card-based theme, micro-interactions, responsive grid, zero-pill metadata discipline.
- **Vanilla JavaScript**: Pure ES6+ modules (`main.js`, `auth.js`, `explore.js`, `map.js`, `planner.js`, `assistant.js`, `dashboard.js`). No React/Vue/Angular bloat.
- **Leaflet.js**: Interactive geospatial map engine using OpenStreetMap tiles.

### Backend
- **Python 3.10+** & **Flask**: Lightweight, robust web framework and REST API server.
- **Google GenAI SDK** (`google-genai`): Server-side integration with Gemini 3.8 Flash for AI trip planning and natural language tourism guidance.
- **Firebase Admin SDK** (`firebase-admin`): Secure cloud connection to Firebase Firestore and Authentication.
- **Gunicorn**: Production WSGI server.

---

## 📁 4. Folder Structure

```text
smart_tourist_guide/
│
├── app.py                     # Main Flask backend & REST API routes
├── firebase_config.py         # Firebase Admin SDK initialization & credentials handler
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (private keys & API config)
├── .env.example               # Template environment configuration
├── .gitignore                 # Git ignore rules
├── README.md                  # Complete documentation
│
├── config/
│   └── chatbot_config.py      # System instructions and behavior prompts for Gemini AI
│
├── templates/
│   ├── index.html             # Homepage & landing showcase
│   ├── login.html             # User login portal
│   ├── register.html          # User account creation
│   ├── dashboard.html         # Logged-in traveler dashboard
│   ├── explore.html           # Destination discovery & category filters
│   ├── place_details.html     # Comprehensive place page with reviews & map
│   ├── trip_planner.html      # AI Itinerary Generator form & timeline UI
│   ├── ai_assistant.html      # Dedicated 24/7 chatbot conversation page
│   ├── map.html               # Interactive full-screen map with pins & layers
│   ├── hotels.html            # Verified hotels & stays directory
│   ├── restaurants.html       # Authentic dining & culinary highlights
│   ├── events.html            # Cultural festivals & seasonal celebrations
│   ├── favorites.html         # Saved bucket-list places
│   ├── my_trips.html          # Saved AI-generated trips & itineraries
│   ├── emergency.html         # Emergency hotline numbers & nearby hospitals
│   └── admin_dashboard.html   # Admin console for content management & moderation
│
└── static/
    ├── css/
    │   └── style.css          # Modern tourism UI styling
    │
    └── js/
        ├── main.js            # Global utilities, geolocation, toasts, active nav
        ├── auth.js            # Authentication state, session handling, RBAC
        ├── explore.js         # Search debouncing, category filtering, card rendering
        ├── map.js             # Leaflet initialization, markers, popups, routing
        ├── planner.js         # Trip generator API client & timeline renderer
        ├── assistant.js       # AI Chatbot client with independent scroll
        └── dashboard.js       # Dashboard metric counters and personalized feeds
```

---

## 🔑 5. Environment Variables Setup

Create a `.env` file in the root folder (`smart_tourist_guide/.env`):

```bash
cp .env.example .env
```

Configure your credentials:

```ini
# Gemini API Key (Obtain from Google AI Studio at https://aistudio.google.com/)
GEMINI_API_KEY="your-gemini-api-key"

# Flask Secret Key
SECRET_KEY="your-secure-random-secret-key"

# Firebase Admin Configuration (Optional for cloud Firestore synchronization)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Port (Defaults to 3000 or 5000)
PORT=3000
```

> **Note:** The application includes a self-contained local resilient dataset. Even before configuring Firebase credentials, the system boots smoothly with pre-seeded attractions, dining, accommodations, and emergency directories.

---

## 🚀 6. Installation & Running Locally

### Step 1: Clone or Navigate to the Directory
```bash
cd smart_tourist_guide
```

### Step 2: Create and Activate a Python Virtual Environment
```bash
# On Linux / macOS:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Required Packages
```bash
pip install -r requirements.txt
```

### Step 4: Run the Flask Application
```bash
python app.py
```

Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 🗄️ 7. Firestore Collections Architecture

The database is organized into the following schema:

1. **`users`**:
   - `user_id`: Unique identifier
   - `name`: User full name
   - `email`: Registered email
   - `language`: Preferred language (English, Tamil, Hindi, etc.)
   - `role`: Role permissions (`user` or `admin`)
   - `created_at`: ISO timestamp

2. **`tourist_places`**:
   - `place_id`, `name`, `category`, `description`, `location`, `latitude`, `longitude`, `image_url`, `rating`, `opening_time`, `closing_time`, `ticket_info`

3. **`restaurants`**:
   - `restaurant_id`, `name`, `cuisine`, `location`, `rating`, `price_range`, `latitude`, `longitude`, `specialty`, `image_url`

4. **`hotels`**:
   - `hotel_id`, `name`, `location`, `rating`, `price_range`, `facilities` (array), `latitude`, `longitude`, `phone`, `image_url`

5. **`events`**:
   - `event_id`, `name`, `location`, `date`, `description`, `image_url`

6. **`favorites`**:
   - `user_id`, `place_id`, `place_name`, `category`, `location`, `image_url`, `created_at`

7. **`trips`**:
   - `trip_id`, `user_id`, `destination`, `duration`, `budget`, `people`, `interests`, `travel_style`, `itinerary` (structured day-by-day JSON), `created_at`

8. **`reviews`**:
   - `review_id`, `user_id`, `user_name`, `place_id`, `rating`, `comment`, `created_at`

9. **`alerts`**:
   - `alert_id`, `title`, `severity` (info/warning/urgent), `message`, `created_at`

---

## 🔐 8. Default Demo Credentials

For quick evaluation during demonstrations:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | `admin@smarttourist.com` | `admin123` | Full Admin Console, Place/Review/Alert Management |
| **Traveler** | `user@example.com` | `traveler123` | Dashboard, Saved Trips, Favorites, Reviews |

You can also register a new account anytime via `/register`.

---

## 🌐 9. Production Deployment

### Deploying with Gunicorn (e.g. Render / Heroku / Cloud Run / VPS)
```bash
gunicorn -w 4 -b 0.0.0.0:3000 app:app
```

Ensure environment variables (`GEMINI_API_KEY`, `SECRET_KEY`, `FIREBASE_PROJECT_ID`) are configured in your hosting provider's dashboard.

---

## 📜 10. License & Credits

Built as a modern, full-stack tourism demonstration application for hackathons and academic software presentations.
- **Imagery**: Curated high-resolution photography from Unsplash.
- **Mapping**: OpenStreetMap contributors via Leaflet.js.
- **AI Core**: Google Gemini 3.8 Flash.
