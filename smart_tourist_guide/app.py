"""
Smart Tourist Guide - Flask Backend Application
Real-Time Tourism Assistance Platform with Gemini AI, Firebase Firestore, and Location Services.
"""

import os
import math
import json
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Import chatbot instructions and firebase config
from config.chatbot_config import SYSTEM_INSTRUCTION, ITINERARY_SYSTEM_INSTRUCTION
import firebase_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart_tourist_guide")

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.getenv("SECRET_KEY", "smart_tourist_guide_secret_2026")

# Gemini Client Setup
gemini_client = None
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Google GenAI client initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize Google GenAI SDK: {e}")

# ==============================================================================
# In-Memory Datasets (Initial Database Seeds & Resilient Offline Provider)
# ==============================================================================

SEED_PLACES = [
    {
        "place_id": "meenakshi_temple",
        "name": "Meenakshi Amman Temple",
        "category": "Religious",
        "location": "Madurai, Tamil Nadu",
        "latitude": 9.9195,
        "longitude": 78.1194,
        "rating": 4.9,
        "review_count": 4820,
        "opening_time": "05:00 AM",
        "closing_time": "10:00 PM",
        "best_time": "Early Morning (6:00 AM) or Evening Aarti",
        "ticket_info": "Free entry for General Darshan; Special Darshan available at temple counters",
        "highlights": "14 monumental gopurams (towers), Thousand Pillar Hall, intricate Dravidian architecture, holy Golden Lotus tank.",
        "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "description": "A historic Hindu temple located on the southern bank of the Vaigai River in Madurai, dedicated to Goddess Meenakshi (a form of Parvati) and her consort Sundareswarar (Shiva). Renowned worldwide for stunning colorful sculptures and sacred spiritual heritage."
    },
    {
        "place_id": "thirumalai_palace",
        "name": "Thirumalai Nayakkar Mahal",
        "category": "Historical",
        "location": "Madurai, Tamil Nadu",
        "latitude": 9.9154,
        "longitude": 78.1238,
        "rating": 4.6,
        "review_count": 1940,
        "opening_time": "09:00 AM",
        "closing_time": "05:00 PM",
        "best_time": "Morning or for the Evening Sound & Light Show",
        "ticket_info": "Entry ₹10-₹50; Camera fees separate",
        "highlights": "Massive 20m stucco pillars, grand courtyard, blend of Dravidian and Islamic architectural styles.",
        "image_url": "https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1200&q=80",
        "description": "A 17th-century palace built by King Thirumalai Nayak in 1636 AD. The palace was four times its present size in its glory days, celebrated for its massive domed ceilings and giant white pillars."
    },
    {
        "place_id": "marina_beach",
        "name": "Marina Beach",
        "category": "Beach",
        "location": "Chennai, Tamil Nadu",
        "latitude": 13.0500,
        "longitude": 80.2824,
        "rating": 4.5,
        "review_count": 8100,
        "opening_time": "Open 24 Hours",
        "closing_time": "Open 24 Hours",
        "best_time": "Sunrise & Sunset",
        "ticket_info": "Free public beach; parking charges apply",
        "highlights": "World's second longest natural urban beach (13 km), promenade statues, fresh fried seafood stalls.",
        "image_url": "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80",
        "description": "A natural urban sandy beach along the Bay of Bengal. Stretches from Fort St. George in the north to Besant Nagar in the south. A vibrant gathering hub with lively evening food kiosks and gentle sea breezes."
    },
    {
        "place_id": "ooty_botanical_garden",
        "name": "Ooty Government Botanical Garden",
        "category": "Nature",
        "location": "Nilgiris, Ooty, Tamil Nadu",
        "latitude": 11.4190,
        "longitude": 76.7110,
        "rating": 4.7,
        "review_count": 3410,
        "opening_time": "07:00 AM",
        "closing_time": "06:30 PM",
        "best_time": "April to June (Annual Flower Show season)",
        "ticket_info": "₹40 for adults, ₹20 for children",
        "highlights": "Fossil tree trunk estimated at 20 million years old, Italian terraced gardens, sprawling exotic flora.",
        "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
        "description": "Spread over 55 hectares on the slopes of Doddabetta peak in Ooty. Home to over a thousand species of indigenous and exotic plants, manicured emerald lawns, and rare flowering shrubs."
    },
    {
        "place_id": "kanyakumari_memorial",
        "name": "Vivekananda Rock Memorial",
        "category": "Culture",
        "location": "Kanyakumari, Tamil Nadu",
        "latitude": 8.0781,
        "longitude": 77.5550,
        "rating": 4.8,
        "review_count": 6200,
        "opening_time": "08:00 AM",
        "closing_time": "04:30 PM",
        "best_time": "Morning ferry trips",
        "ticket_info": "Ferry ticket ₹50; Memorial entry ₹20",
        "highlights": "Triveni Sangam confluence of 3 oceans (Indian Ocean, Arabian Sea, Bay of Bengal), Dhyana Mandapam meditation hall.",
        "image_url": "https://images.unsplash.com/photo-1580281657527-47d204d53cb1?auto=format&fit=crop&w=1200&q=80",
        "description": "Built in 1970 in honor of Swami Vivekananda, who meditated on this very rock outcrop in 1892. Surrounded by the pristine waters of the southern-most tip of mainland India."
    },
    {
        "place_id": "mahabalipuram_shore_temple",
        "name": "Shore Temple & Pancha Rathas",
        "category": "Historical",
        "location": "Mamallapuram, Tamil Nadu",
        "latitude": 12.6160,
        "longitude": 80.1983,
        "rating": 4.8,
        "review_count": 5100,
        "opening_time": "06:00 AM",
        "closing_time": "06:00 PM",
        "best_time": "Sunrise over the Bay of Bengal",
        "ticket_info": "ASI ticket ₹40 for Indians, ₹600 for foreign tourists",
        "highlights": "UNESCO World Heritage Site, 8th-century granite bas-reliefs, monolithic rock chariots.",
        "image_url": "https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=1200&q=80",
        "description": "Overlooking the shore of the Bay of Bengal, this structural temple was carved out of granite blocks during the reign of Pallava king Narasimhavarman II. One of the oldest structural stone temples of Southern India."
    }
]

SEED_RESTAURANTS = [
    {
        "restaurant_id": "murugan_idli",
        "name": "Murugan Idli Shop",
        "cuisine": "South Indian",
        "location": "Town Hall Rd, Madurai",
        "latitude": 9.9180,
        "longitude": 78.1170,
        "rating": 4.8,
        "price_range": "₹",
        "specialty": "Steaming hot mallipoo idlis with 4 varieties of traditional chutneys and podi ghee.",
        "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80"
    },
    {
        "restaurant_id": "famous_jigarthanda",
        "name": "Famous Jigarthanda Stall",
        "cuisine": "Dessert",
        "location": "East Marret St, Madurai",
        "latitude": 9.9175,
        "longitude": 78.1245,
        "rating": 4.9,
        "price_range": "₹",
        "specialty": "Original Madurai Jigarthanda made with almond gum (badam pisin), nannari syrup, basundi, and ice cream.",
        "image_url": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80"
    },
    {
        "restaurant_id": "kumar_mess",
        "name": "Kumar Mess",
        "cuisine": "Chettinad",
        "location": "Near Collectorate, Madurai",
        "latitude": 9.9270,
        "longitude": 78.1340,
        "rating": 4.7,
        "price_range": "₹₹",
        "specialty": "Authentic spicy Chettinad feasts, viral parotta salna, and traditional country chicken roast.",
        "image_url": "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80"
    },
    {
        "restaurant_id": "sangeetha_veg",
        "name": "Sangeetha Veg Restaurant",
        "cuisine": "South Indian",
        "location": "Mylapore, Chennai",
        "latitude": 13.0330,
        "longitude": 80.2680,
        "rating": 4.6,
        "price_range": "₹₹",
        "specialty": "Unlimited banana leaf thali meal, filter coffee, crispy dosas, and ghee pongal.",
        "image_url": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80"
    }
]

SEED_HOTELS = [
    {
        "hotel_id": "heritage_madurai",
        "name": "Heritage Madurai Resort",
        "location": "Kochadai, Madurai",
        "latitude": 9.9320,
        "longitude": 78.0850,
        "rating": 4.7,
        "price_range": "₹6,500 - ₹12,000",
        "facilities": ["Olympic Pool", "Ayurvedic Spa", "Free Wi-Fi", "Geoffrey Bawa Architecture", "24/7 Room Service"],
        "phone": "+91 452 238 5455",
        "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
    },
    {
        "hotel_id": "gateway_pasumalai",
        "name": "The Gateway Hotel Pasumalai (IHCL)",
        "location": "Pasumalai Hills, Madurai",
        "latitude": 9.8970,
        "longitude": 78.0880,
        "rating": 4.8,
        "price_range": "₹5,000 - ₹9,500",
        "facilities": ["Hilltop Views", "Peacock Garden", "Swimming Pool", "Heritage Suites", "Fine Dining"],
        "phone": "+91 452 663 3000",
        "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
    },
    {
        "hotel_id": "residency_towers",
        "name": "The Residency Towers",
        "location": "Madurai / Chennai",
        "latitude": 9.9230,
        "longitude": 78.1280,
        "rating": 4.6,
        "price_range": "₹3,500 - ₹6,000",
        "facilities": ["Central Location", "Buffet Breakfast", "Fitness Gym", "Travel Desk"],
        "phone": "+91 452 435 6000",
        "image_url": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
    }
]

SEED_EVENTS = [
    {
        "event_id": "chithirai_festival",
        "name": "Chithirai Thiruvizha (Grand Chariot & Celestial Wedding)",
        "date": "April - May (Annual)",
        "location": "Madurai Meenakshi Temple Grounds",
        "description": "One of the world's most spectacular temple festivals celebrating the celestial wedding of Meenakshi and Lord Sundareswarar, followed by Lord Kallazhagar entering River Vaigai attended by millions of pilgrims.",
        "image_url": "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80"
    },
    {
        "event_id": "mamallapuram_dance_fest",
        "name": "Mamallapuram Indian Dance Festival",
        "date": "January - February (Annual)",
        "location": "Shore Temple Heritage Stage, Mahabalipuram",
        "description": "A month-long classical festival featuring India's finest Bharatanatyam, Kuchipudi, Kathakali, and Odissi exponents staged before ancient rock sculptures by the crashing waves.",
        "image_url": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80"
    }
]

SEED_EMERGENCY = {
    "hospitals": [
        {
            "name": "Apollo Speciality Hospitals Madurai",
            "location": "Lake View Road, K.K. Nagar, Madurai",
            "latitude": 9.9360,
            "longitude": 78.1480,
            "phone": "+91 452 258 0892",
            "type": "24/7 Multi-Speciality Emergency & Trauma"
        },
        {
            "name": "Government Rajaji Hospital (GRH)",
            "location": "Panagal Rd, Shenoy Nagar, Madurai",
            "latitude": 9.9280,
            "longitude": 78.1320,
            "phone": "+91 452 253 2535",
            "type": "24/7 Government Medical College & Emergency"
        }
    ],
    "police_stations": [
        {
            "name": "Madurai City Central Police Station",
            "location": "Near West Masi St, Madurai",
            "latitude": 9.9190,
            "longitude": 78.1150,
            "phone": "+91 452 234 1100",
            "type": "Tourist Protection Assistance Desk"
        },
        {
            "name": "Madurai Tourist Police Assistance Outpost",
            "location": "Meenakshi Temple East Tower Entrance",
            "latitude": 9.9197,
            "longitude": 78.1210,
            "phone": "112 / +91 452 233 4455",
            "type": "Dedicated Foreign & Domestic Tourist Police"
        }
    ]
}

# Runtime collections storage
runtime_store = {
    "places": list(SEED_PLACES),
    "restaurants": list(SEED_RESTAURANTS),
    "hotels": list(SEED_HOTELS),
    "events": list(SEED_EVENTS),
    "favorites": [],
    "trips": [],
    "reviews": [
        {
            "review_id": "rev_1",
            "place_id": "meenakshi_temple",
            "user_name": "Kavitha R.",
            "rating": 5,
            "comment": "Mesmerizing spiritual atmosphere. The morning darshan at 6 AM was calm and transcendent. Do visit the Golden Lotus pond!",
            "created_at": "Yesterday"
        },
        {
            "review_id": "rev_2",
            "place_id": "thirumalai_palace",
            "user_name": "Arjun Menon",
            "rating": 4,
            "comment": "Grand architecture and gigantic pillars. The evening sound and light show narrated the Nayak history well.",
            "created_at": "3 days ago"
        }
    ],
    "alerts": [
        {
            "alert_id": "alert_1",
            "title": "Comfortable Walking Footwear Advisory",
            "severity": "info",
            "message": "When touring ancient stone temples, footwear must be deposited at official counters. Consider carrying clean socks for walking on warm stone courtyards.",
            "created_at": "Updated this week"
        }
    ],
    "users": [
        {
            "user_id": "admin_default",
            "name": "System Administrator",
            "email": "admin@smarttourist.com",
            "password": "admin123",
            "role": "admin",
            "language": "English"
        },
        {
            "user_id": "traveler_default",
            "name": "Gokul Murugan",
            "email": "user@example.com",
            "password": "traveler123",
            "role": "user",
            "language": "English"
        }
    ]
}

def haversine(lat1, lon1, lat2, lon2):
    """Calculates geodesic distance in kilometers between two coords."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

# ==============================================================================
# HTML Page Routes
# ==============================================================================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")

@app.route("/explore")
def explore_page():
    return render_template("explore.html")

@app.route("/place/<place_id>")
def place_details_page(place_id):
    return render_template("place_details.html", place_id=place_id)

@app.route("/trip-planner")
def trip_planner_page():
    return render_template("trip_planner.html")

@app.route("/ai-assistant")
def ai_assistant_page():
    return render_template("ai_assistant.html")

@app.route("/map")
def map_page():
    return render_template("map.html")

@app.route("/hotels")
def hotels_page():
    return render_template("hotels.html")

@app.route("/restaurants")
def restaurants_page():
    return render_template("restaurants.html")

@app.route("/events")
def events_page():
    return render_template("events.html")

@app.route("/favorites")
def favorites_page():
    return render_template("favorites.html")

@app.route("/my-trips")
def my_trips_page():
    return render_template("my_trips.html")

@app.route("/emergency")
def emergency_page():
    return render_template("emergency.html")

@app.route("/admin")
def admin_page():
    return render_template("admin_dashboard.html")

# ==============================================================================
# API Endpoints
# ==============================================================================

@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    AI Tourist Assistant powered by Gemini API.
    Enforces strict tourism scope according to config/chatbot_config.py
    """
    data = request.get_json() or {}
    user_msg = data.get("message", "").strip()
    history = data.get("history", [])
    user_loc = data.get("user_location")

    if not user_msg:
        return jsonify({"error": "Empty message"}), 400

    # Build prompt with geographical grounding if location is present
    loc_context = ""
    if user_loc and isinstance(user_loc, dict) and "lat" in user_loc:
        loc_context = f"\n[User GPS Coordinates: Latitude {user_loc['lat']}, Longitude {user_loc['lng']}]"

    prompt = f"{SYSTEM_INSTRUCTION}\n{loc_context}\n\nUser Question: {user_msg}"

    ai_reply = None
    if gemini_client:
        try:
            response = gemini_client.models.generateContent(
                model="gemini-3.8-flash",
                contents=prompt
            )
            if response and response.text:
                ai_reply = response.text
        except Exception as e:
            logger.error(f"Gemini API chat error: {e}")

    # Fallback response provider if Gemini key is missing or offline
    if not ai_reply:
        lower_msg = user_msg.lower()
        if "madurai" in lower_msg:
            ai_reply = (
                "For a memorable 1-day visit to **Madurai**, I recommend:\n\n"
                "• **06:30 AM**: Visit the magnificent **Meenakshi Amman Temple** early to experience the morning rituals in tranquility.\n"
                "• **08:30 AM**: Breakfast at **Murugan Idli Shop** on West Masi Street for legendary soft idlis and podi.\n"
                "• **10:30 AM**: Tour the 17th-century **Thirumalai Nayakkar Mahal**.\n"
                "• **01:30 PM**: Traditional banana-leaf meal at Kumar Mess or Sree Sabarees.\n"
                "• **04:30 PM**: Stroll through Puthu Mandapam for handloom cottons and brass souvenirs.\n"
                "• **07:00 PM**: End your evening tasting authentic **Madurai Jigarthanda**!\n\n"
                "*(Please verify temple counter timings and dress requirements locally before setting out.)*"
            )
        elif "near me" in lower_msg or "nearby" in lower_msg:
            ai_reply = (
                "Based on central tourist hub coordinates, top attractions nearby include:\n\n"
                "1. **Meenakshi Amman Temple** (~0.5 km) - World-renowned architectural marvel.\n"
                "2. **Thirumalai Nayakkar Mahal** (~1.2 km) - Grand historic palace.\n"
                "3. **Gandhi Memorial Museum** (~3.5 km) - Peace and freedom movement heritage.\n\n"
                "You can also check our **Live Map** or **Nearby Places** on the dashboard for real-time turn-by-turn routing!"
            )
        elif "food" in lower_msg or "eat" in lower_msg or "restaurant" in lower_msg:
            ai_reply = (
                "Tamil Nadu offers incredible culinary treasures! Top recommendations:\n\n"
                "• **Breakfast**: Piping hot Idlis, Crispy Medu Vada with sambar and coconut/tomato chutney.\n"
                "• **Lunch**: Authentic South Indian Thali served on a fresh banana leaf with rasam, kootu, and appalam.\n"
                "• **Chettinad Specialties**: Aromatic peppery curries and Kozhi roast.\n"
                "• **Refreshing Drinks**: Filter coffee in a traditional dabarah and cool Madurai Jigarthanda."
            )
        elif any(w in lower_msg for w in ["hospital", "police", "danger", "emergency", "doctor"]):
            ai_reply = (
                "For any medical or police emergency, please dial the verified 24/7 national hotlines immediately:\n"
                "• **112**: Unified Emergency\n"
                "• **108**: Ambulance\n"
                "• **1363**: Tourist Helpline\n\n"
                "Visit our dedicated **Emergency Assistance** page in the top menu to view verified nearby hospitals and police desks."
            )
        else:
            ai_reply = (
                f"As your Smart Tourist Guide, I'd love to help you explore and plan your trip. "
                f"I can recommend top attractions, local dining, cultural festivals, or generate day-by-day itineraries. "
                f"Feel free to specify a destination or ask for nearby sights!"
            )

    return jsonify({"response": ai_reply})

@app.route("/api/generate-trip", methods=["POST"])
def api_generate_trip():
    """
    AI Itinerary Generator using Gemini API.
    Synthesizes day-by-day travel plans formatted cleanly for timeline UI.
    """
    data = request.get_json() or {}
    destination = data.get("destination", "Madurai")
    days = int(data.get("days", 2))
    budget = data.get("budget", "Moderate")
    people = data.get("people", 2)
    interests = data.get("interests", ["History", "Culture", "Food"])
    style = data.get("travel_style", "Balanced")

    prompt = (
        f"{ITINERARY_SYSTEM_INSTRUCTION}\n\n"
        f"Generate a {days}-day travel itinerary for:\n"
        f"- Destination: {destination}\n"
        f"- Duration: {days} Days\n"
        f"- Travelers: {people}\n"
        f"- Budget: {budget}\n"
        f"- Interests: {', '.join(interests)}\n"
        f"- Travel Style: {style}\n\n"
        f"Return your answer as valid JSON matching this schema:\n"
        f"{{\n"
        f'  "days": [\n'
        f'    {{\n'
        f'      "day_number": 1,\n'
        f'      "theme": "Heritage Exploration",\n'
        f'      "estimated_cost": "₹1,500",\n'
        f'      "activities": [\n'
        f'        {{\n'
        f'          "time": "09:00 AM",\n'
        f'          "title": "Visit historic landmark",\n'
        f'          "description": "Short explanation",\n'
        f'          "tip": "Practical travel tip"\n'
        f'        }}\n'
        f'      ]\n'
        f'    }}\n'
        f'  ]\n'
        f"}}\n"
        f"Do not include markdown triple backticks. Return raw JSON only."
    )

    itinerary_data = None
    if gemini_client:
        try:
            response = gemini_client.models.generateContent(
                model="gemini-3.8-flash",
                contents=prompt
            )
            if response and response.text:
                cleaned = response.text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                itinerary_data = json.loads(cleaned.strip())
        except Exception as e:
            logger.error(f"Gemini Itinerary Generation Error: {e}")

    # Fallback generator if offline or parse error
    if not itinerary_data or "days" not in itinerary_data:
        days_list = []
        for d in range(1, days + 1):
            if d == 1:
                days_list.append({
                    "day_number": 1,
                    "theme": f"Iconic Landmarks & Heritage of {destination}",
                    "estimated_cost": "₹1,200",
                    "activities": [
                        {"time": "08:30 AM", "title": "Breakfast & Morning Atmosphere", "description": "Start with local specialty breakfast dishes at a reputable traditional restaurant.", "tip": "Reach early to avoid queue."},
                        {"time": "10:00 AM", "title": f"Explore Primary Cultural Center in {destination}", "description": "Tour the prime historical monument, taking in the ancient stone architecture and sacred shrines.", "tip": "Modest clothing recommended."},
                        {"time": "01:00 PM", "title": "Traditional Banana Leaf Lunch", "description": "Enjoy a comforting regional lunch spread with multiple sambars, vegetables, and crisps.", "tip": "Try the local buttermilk."},
                        {"time": "03:30 PM", "title": "Museum & Art Gallery Visit", "description": "Discover colonial and royal artifacts, historical weapons, and ancient bronzes.", "tip": "Photography may require an additional token."},
                        {"time": "06:30 PM", "title": "Local Market & Sunset Stroll", "description": "Browse local bazaars for spices, woven fabrics, and handicraft souvenirs.", "tip": "Friendly bargaining is common in open markets."}
                    ]
                })
            elif d == 2:
                days_list.append({
                    "day_number": 2,
                    "theme": f"Nature, Scenic Panoramas & Culinary Trail in {destination}",
                    "estimated_cost": "₹1,500",
                    "activities": [
                        {"time": "08:00 AM", "title": "Scenic Viewpoint or Lake Visit", "description": "Enjoy crisp morning breezes and picturesque vistas across the surrounding hills or water bodies.", "tip": "Carry a light windbreaker or jacket."},
                        {"time": "11:30 AM", "title": "Artisans & Handicrafts Workshop", "description": "Witness local artisans crafting brassware, textiles, or pottery.", "tip": "Direct purchases support the artisan cooperatives."},
                        {"time": "01:30 PM", "title": "Regional Feast", "description": "Taste distinct spices and regional signature curries.", "tip": "Ask for mild spice if sensitive."},
                        {"time": "04:30 PM", "title": "Botanical Gardens or Heritage Walk", "description": "Walk among centuries-old trees, manicured lawns, or heritage quarters.", "tip": "Stay hydrated."},
                        {"time": "07:30 PM", "title": "Farewell Evening & Sweet Tasting", "description": "Conclude your journey tasting famous regional desserts and sweet delicacies.", "tip": "Fresh sweets make great gifts for home."}
                    ]
                })
            else:
                days_list.append({
                    "day_number": d,
                    "theme": f"Offbeat Discovery & Leisure in {destination}",
                    "estimated_cost": "₹1,400",
                    "activities": [
                        {"time": "09:00 AM", "title": "Excursion to Surrounding Countryside", "description": "Take a short drive to peaceful village trails or historic rock-cut shrines.", "tip": "Book a reliable local taxi in advance."},
                        {"time": "01:00 PM", "title": "Country Kitchen Dining", "description": "Authentic countryside home-style lunch.", "tip": "Fresh local ingredients."},
                        {"time": "04:00 PM", "title": "Relaxed Evening & Souvenir Collection", "description": "Pick up souvenirs and take memorable final photos.", "tip": "Sunset light provides the best photographs."}
                    ]
                })
        itinerary_data = {"days": days_list}

    return jsonify({"itinerary": itinerary_data})

@app.route("/api/places", methods=["GET", "POST", "DELETE"])
def api_places():
    """Manage tourist attractions."""
    if request.method == "GET":
        place_id = request.args.get("id")
        if place_id:
            place = next((p for p in runtime_store["places"] if p["place_id"] == place_id), None)
            if place:
                return jsonify({"place": place})
            return jsonify({"error": "Place not found"}), 404

        cat = request.args.get("category")
        q = request.args.get("q", "").lower().strip()
        limit = request.args.get("limit", type=int)

        results = list(runtime_store["places"])
        if cat and cat.lower() != "all":
            results = [p for p in results if p.get("category", "").lower() == cat.lower()]
        if q:
            results = [p for p in results if q in p.get("name", "").lower() or q in p.get("location", "").lower()]
        if limit:
            results = results[:limit]

        return jsonify({"places": results})

    elif request.method == "POST":
        new_place = request.get_json() or {}
        if not new_place.get("name"):
            return jsonify({"error": "Missing place name"}), 400
        if not new_place.get("place_id"):
            new_place["place_id"] = "place_" + str(int(datetime.now().timestamp()))
        runtime_store["places"].append(new_place)
        return jsonify({"message": "Place created successfully", "place": new_place}), 201

    elif request.method == "DELETE":
        pid = request.args.get("id")
        runtime_store["places"] = [p for p in runtime_store["places"] if p["place_id"] != pid]
        return jsonify({"message": "Place deleted successfully"})

@app.route("/api/nearby", methods=["GET"])
def api_nearby():
    """Returns nearest attractions, hotels, and emergency centers based on user GPS."""
    try:
        user_lat = float(request.args.get("lat", 9.9195))
        user_lng = float(request.args.get("lng", 78.1194))
    except ValueError:
        user_lat, user_lng = 9.9195, 78.1194

    limit = request.args.get("limit", 10, type=int)

    places_with_dist = []
    for p in runtime_store["places"]:
        p_lat = p.get("latitude")
        p_lng = p.get("longitude")
        dist = haversine(user_lat, user_lng, p_lat, p_lng) if p_lat and p_lng else 9999
        places_with_dist.append({**p, "distance_km": dist})

    places_with_dist.sort(key=lambda x: x["distance_km"])
    return jsonify({
        "user_coords": {"lat": user_lat, "lng": user_lng},
        "places": places_with_dist[:limit]
    })

@app.route("/api/favorites", methods=["GET", "POST"])
def api_favorites():
    """Manage user favorite places."""
    if request.method == "GET":
        uid = request.args.get("user_id", "traveler_default")
        user_favs = [f for f in runtime_store["favorites"] if f.get("user_id") == uid]
        return jsonify({"favorites": user_favs})

    elif request.method == "POST":
        data = request.get_json() or {}
        uid = data.get("user_id", "traveler_default")
        pid = data.get("place_id")

        if not pid:
            return jsonify({"error": "Missing place_id"}), 400

        # Toggle favorite
        existing = next((f for f in runtime_store["favorites"] if f["user_id"] == uid and f["place_id"] == pid), None)
        if existing:
            runtime_store["favorites"] = [f for f in runtime_store["favorites"] if not (f["user_id"] == uid and f["place_id"] == pid)]
            return jsonify({"message": "Removed from favorites", "is_favorite": False})
        else:
            place = next((p for p in runtime_store["places"] if p["place_id"] == pid), {})
            fav_entry = {
                "user_id": uid,
                "place_id": pid,
                "place_name": place.get("name", pid),
                "category": place.get("category", "Attraction"),
                "location": place.get("location", ""),
                "image_url": place.get("image_url", ""),
                "rating": place.get("rating", 4.8),
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
            runtime_store["favorites"].append(fav_entry)
            return jsonify({"message": "Added to favorites", "is_favorite": True})

@app.route("/api/trips", methods=["GET", "POST", "DELETE"])
def api_trips():
    """Manage user saved itineraries."""
    if request.method == "GET":
        uid = request.args.get("user_id", "traveler_default")
        user_trips = [t for t in runtime_store["trips"] if t.get("user_id") == uid]
        return jsonify({"trips": user_trips})

    elif request.method == "POST":
        data = request.get_json() or {}
        trip_entry = {
            "trip_id": "trip_" + str(int(datetime.now().timestamp())),
            "user_id": data.get("user_id", "traveler_default"),
            "destination": data.get("destination", "Destination"),
            "duration": data.get("duration", "2 Days"),
            "budget": data.get("budget", "Standard"),
            "people": data.get("people", 2),
            "interests": data.get("interests", "Heritage"),
            "travel_style": data.get("travel_style", "Balanced"),
            "itinerary": data.get("itinerary", {}),
            "created_at": datetime.now().strftime("%d %b %Y")
        }
        runtime_store["trips"].append(trip_entry)
        return jsonify({"message": "Trip saved successfully", "trip": trip_entry}), 201

    elif request.method == "DELETE":
        tid = request.args.get("trip_id")
        runtime_store["trips"] = [t for t in runtime_store["trips"] if t["trip_id"] != tid]
        return jsonify({"message": "Trip deleted successfully"})

@app.route("/api/reviews", methods=["GET", "POST", "DELETE"])
def api_reviews():
    """Manage user reviews for places."""
    if request.method == "GET":
        pid = request.args.get("place_id")
        if pid:
            revs = [r for r in runtime_store["reviews"] if r.get("place_id") == pid]
        else:
            revs = runtime_store["reviews"]
        return jsonify({"reviews": revs})

    elif request.method == "POST":
        data = request.get_json() or {}
        rev = {
            "review_id": "rev_" + str(int(datetime.now().timestamp())),
            "place_id": data.get("place_id"),
            "user_id": data.get("user_id", "anonymous"),
            "user_name": data.get("user_name", "Traveler"),
            "rating": data.get("rating", 5),
            "comment": data.get("comment", ""),
            "created_at": "Just now"
        }
        runtime_store["reviews"].insert(0, rev)
        return jsonify({"message": "Review added successfully", "review": rev}), 201

    elif request.method == "DELETE":
        rid = request.args.get("id")
        runtime_store["reviews"] = [r for r in runtime_store["reviews"] if r["review_id"] != rid]
        return jsonify({"message": "Review removed successfully"})

@app.route("/api/hotels", methods=["GET", "POST"])
def api_hotels():
    if request.method == "GET":
        return jsonify({"hotels": runtime_store["hotels"]})
    elif request.method == "POST":
        data = request.get_json() or {}
        runtime_store["hotels"].append(data)
        return jsonify({"message": "Hotel added", "hotel": data}), 201

@app.route("/api/restaurants", methods=["GET", "POST"])
def api_restaurants():
    if request.method == "GET":
        return jsonify({"restaurants": runtime_store["restaurants"]})
    elif request.method == "POST":
        data = request.get_json() or {}
        runtime_store["restaurants"].append(data)
        return jsonify({"message": "Restaurant added", "restaurant": data}), 201

@app.route("/api/events", methods=["GET", "POST"])
def api_events():
    if request.method == "GET":
        return jsonify({"events": runtime_store["events"]})
    elif request.method == "POST":
        data = request.get_json() or {}
        runtime_store["events"].append(data)
        return jsonify({"message": "Event added", "event": data}), 201

@app.route("/api/emergency", methods=["GET"])
def api_emergency():
    return jsonify(SEED_EMERGENCY)

@app.route("/api/alerts", methods=["GET", "POST"])
def api_alerts():
    if request.method == "GET":
        return jsonify({"alerts": runtime_store["alerts"]})
    elif request.method == "POST":
        data = request.get_json() or {}
        alert_entry = {
            "alert_id": "alert_" + str(int(datetime.now().timestamp())),
            "title": data.get("title", "Advisory"),
            "severity": data.get("severity", "info"),
            "message": data.get("message", ""),
            "created_at": datetime.now().strftime("%d %b %Y, %H:%M")
        }
        runtime_store["alerts"].insert(0, alert_entry)
        return jsonify({"message": "Alert broadcasted", "alert": alert_entry}), 201

# ==============================================================================
# Authentication Endpoints
# ==============================================================================

@app.route("/api/auth/register", methods=["POST"])
def api_auth_register():
    data = request.get_json() or {}
    email = data.get("email", "").lower().strip()
    name = data.get("name", "").strip()
    password = data.get("password", "")
    language = data.get("language", "English")

    if not email or not password or not name:
        return jsonify({"message": "Full Name, Email and Password are required"}), 400

    existing = next((u for u in runtime_store["users"] if u["email"] == email), None)
    if existing:
        return jsonify({"message": "An account with this email already exists"}), 409

    new_user = {
        "user_id": "usr_" + str(int(datetime.now().timestamp())),
        "name": name,
        "email": email,
        "password": password,
        "language": language,
        "role": "user",
        "created_at": datetime.now().isoformat()
    }
    runtime_store["users"].append(new_user)
    session["user"] = {"user_id": new_user["user_id"], "name": name, "email": email, "role": "user"}

    # Never return password
    clean_user = {k: v for k, v in new_user.items() if k != "password"}
    return jsonify({"message": "Account created successfully", "user": clean_user}), 201

@app.route("/api/auth/login", methods=["POST"])
def api_auth_login():
    data = request.get_json() or {}
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    user = next((u for u in runtime_store["users"] if u["email"] == email and u["password"] == password), None)
    if not user:
        return jsonify({"message": "Invalid email or password"}), 401

    session["user"] = {"user_id": user["user_id"], "name": user["name"], "email": email, "role": user.get("role", "user")}
    clean_user = {k: v for k, v in user.items() if k != "password"}
    return jsonify({"message": "Logged in successfully", "user": clean_user})

@app.route("/api/auth/logout", methods=["POST"])
def api_auth_logout():
    session.pop("user", None)
    return jsonify({"message": "Logged out successfully"})

@app.route("/api/auth/me", methods=["GET"])
def api_auth_me():
    user = session.get("user")
    if not user:
        return jsonify({"user": None}), 401
    return jsonify({"user": user})

# ==============================================================================
# Error Handlers (User-Friendly Messages)
# ==============================================================================

@app.errorhandler(404)
def handle_404(e):
    return render_template("explore.html"), 404

@app.errorhandler(500)
def handle_500(e):
    return jsonify({"error": "Something went wrong. Please try again."}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=True)
