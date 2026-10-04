import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from smart_tourist_guide/static
const staticDir = path.resolve(process.cwd(), 'smart_tourist_guide', 'static');
const templatesDir = path.resolve(process.cwd(), 'smart_tourist_guide', 'templates');

app.use('/static', express.static(staticDir));

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System Instructions
const SYSTEM_INSTRUCTION = `You are Smart Tourist Guide, an AI-powered tourism assistant.
Your job is to help users discover destinations, plan trips, find tourist attractions, understand travel options and get tourism-related recommendations.
Give clear, practical and concise answers.
Do not invent exact prices, opening hours, emergency numbers, availability or live information.
When real-time information is required, tell the user that the information needs to be verified through the relevant live data source.
Do not provide medical, legal or financial advice.
For unrelated questions, politely explain that you specialize in tourism assistance.`;

const ITINERARY_SYSTEM_INSTRUCTION = `You are Smart Tourist Guide's expert itinerary planner.
Generate a structured, realistic, day-by-day travel itinerary based on user preferences.
Focus on logical geographical progression, reasonable travel times, local culture, dining suggestions, and safety.
Never invent exact entry fees or guaranteed opening hours. Mention that hours and fees should be verified locally.`;

// Seed Data
const places = [
  {
    place_id: "meenakshi_temple",
    name: "Meenakshi Amman Temple",
    category: "Religious",
    location: "Madurai, Tamil Nadu",
    latitude: 9.9195,
    longitude: 78.1194,
    rating: 4.9,
    review_count: 4820,
    opening_time: "05:00 AM",
    closing_time: "10:00 PM",
    best_time: "Early Morning (6:00 AM) or Evening Aarti",
    ticket_info: "Free entry for General Darshan; Special Darshan available at temple counters",
    highlights: "14 monumental gopurams (towers), Thousand Pillar Hall, intricate Dravidian architecture, holy Golden Lotus tank.",
    image_url: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
    description: "A historic Hindu temple located on the southern bank of the Vaigai River in Madurai, dedicated to Goddess Meenakshi (a form of Parvati) and her consort Sundareswarar (Shiva). Renowned worldwide for stunning colorful sculptures and sacred spiritual heritage."
  },
  {
    place_id: "thirumalai_palace",
    name: "Thirumalai Nayakkar Mahal",
    category: "Historical",
    location: "Madurai, Tamil Nadu",
    latitude: 9.9154,
    longitude: 78.1238,
    rating: 4.6,
    review_count: 1940,
    opening_time: "09:00 AM",
    closing_time: "05:00 PM",
    best_time: "Morning or for the Evening Sound & Light Show",
    ticket_info: "Entry ₹10-₹50; Camera fees separate",
    highlights: "Massive 20m stucco pillars, grand courtyard, blend of Dravidian and Islamic architectural styles.",
    image_url: "https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1200&q=80",
    description: "A 17th-century palace built by King Thirumalai Nayak in 1636 AD. The palace was four times its present size in its glory days, celebrated for its massive domed ceilings and giant white pillars."
  },
  {
    place_id: "marina_beach",
    name: "Marina Beach",
    category: "Beach",
    location: "Chennai, Tamil Nadu",
    latitude: 13.0500,
    longitude: 80.2824,
    rating: 4.5,
    review_count: 8100,
    opening_time: "Open 24 Hours",
    closing_time: "Open 24 Hours",
    best_time: "Sunrise & Sunset",
    ticket_info: "Free public beach; parking charges apply",
    highlights: "World's second longest natural urban beach (13 km), promenade statues, fresh fried seafood stalls.",
    image_url: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80",
    description: "A natural urban sandy beach along the Bay of Bengal. Stretches from Fort St. George in the north to Besant Nagar in the south. A vibrant gathering hub with lively evening food kiosks and gentle sea breezes."
  },
  {
    place_id: "ooty_botanical_garden",
    name: "Ooty Government Botanical Garden",
    category: "Nature",
    location: "Nilgiris, Ooty, Tamil Nadu",
    latitude: 11.4190,
    longitude: 76.7110,
    rating: 4.7,
    review_count: 3410,
    opening_time: "07:00 AM",
    closing_time: "06:30 PM",
    best_time: "April to June (Annual Flower Show season)",
    ticket_info: "₹40 for adults, ₹20 for children",
    highlights: "Fossil tree trunk estimated at 20 million years old, Italian terraced gardens, sprawling exotic flora.",
    image_url: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    description: "Spread over 55 hectares on the slopes of Doddabetta peak in Ooty. Home to over a thousand species of indigenous and exotic plants, manicured emerald lawns, and rare flowering shrubs."
  },
  {
    place_id: "kanyakumari_memorial",
    name: "Vivekananda Rock Memorial",
    category: "Culture",
    location: "Kanyakumari, Tamil Nadu",
    latitude: 8.0781,
    longitude: 77.5550,
    rating: 4.8,
    review_count: 6200,
    opening_time: "08:00 AM",
    closing_time: "04:30 PM",
    best_time: "Morning ferry trips",
    ticket_info: "Ferry ticket ₹50; Memorial entry ₹20",
    highlights: "Triveni Sangam confluence of 3 oceans, Dhyana Mandapam meditation hall.",
    image_url: "https://images.unsplash.com/photo-1580281657527-47d204d53cb1?auto=format&fit=crop&w=1200&q=80",
    description: "Built in 1970 in honor of Swami Vivekananda, who meditated on this very rock outcrop in 1892. Surrounded by the pristine waters of the southern-most tip of mainland India."
  },
  {
    place_id: "mahabalipuram_shore_temple",
    name: "Shore Temple & Pancha Rathas",
    category: "Historical",
    location: "Mamallapuram, Tamil Nadu",
    latitude: 12.6160,
    longitude: 80.1983,
    rating: 4.8,
    review_count: 5100,
    opening_time: "06:00 AM",
    closing_time: "06:00 PM",
    best_time: "Sunrise over the Bay of Bengal",
    ticket_info: "ASI ticket ₹40 for Indians, ₹600 for foreign tourists",
    highlights: "UNESCO World Heritage Site, 8th-century granite bas-reliefs, monolithic rock chariots.",
    image_url: "https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=1200&q=80",
    description: "Overlooking the shore of the Bay of Bengal, this structural temple was carved out of granite blocks during the reign of Pallava king Narasimhavarman II. One of the oldest structural stone temples of Southern India."
  }
];

const restaurants = [
  {
    restaurant_id: "murugan_idli",
    name: "Murugan Idli Shop",
    cuisine: "South Indian",
    location: "Town Hall Rd, Madurai",
    latitude: 9.9180,
    longitude: 78.1170,
    rating: 4.8,
    price_range: "₹",
    specialty: "Steaming hot mallipoo idlis with 4 varieties of traditional chutneys and podi ghee.",
    image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80"
  },
  {
    restaurant_id: "famous_jigarthanda",
    name: "Famous Jigarthanda Stall",
    cuisine: "Dessert",
    location: "East Marret St, Madurai",
    latitude: 9.9175,
    longitude: 78.1245,
    rating: 4.9,
    price_range: "₹",
    specialty: "Original Madurai Jigarthanda made with almond gum (badam pisin), nannari syrup, basundi, and ice cream.",
    image_url: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80"
  },
  {
    restaurant_id: "kumar_mess",
    name: "Kumar Mess",
    cuisine: "Chettinad",
    location: "Near Collectorate, Madurai",
    latitude: 9.9270,
    longitude: 78.1340,
    rating: 4.7,
    price_range: "₹₹",
    specialty: "Authentic spicy Chettinad feasts, viral parotta salna, and traditional country chicken roast.",
    image_url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80"
  },
  {
    restaurant_id: "sangeetha_veg",
    name: "Sangeetha Veg Restaurant",
    cuisine: "South Indian",
    location: "Mylapore, Chennai",
    latitude: 13.0330,
    longitude: 80.2680,
    rating: 4.6,
    price_range: "₹₹",
    specialty: "Unlimited banana leaf thali meal, filter coffee, crispy dosas, and ghee pongal.",
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80"
  }
];

const hotels = [
  {
    hotel_id: "heritage_madurai",
    name: "Heritage Madurai Resort",
    location: "Kochadai, Madurai",
    latitude: 9.9320,
    longitude: 78.0850,
    rating: 4.7,
    price_range: "₹6,500 - ₹12,000",
    facilities: ["Olympic Pool", "Ayurvedic Spa", "Free Wi-Fi", "Geoffrey Bawa Architecture", "24/7 Room Service"],
    phone: "+91 452 238 5455",
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
  },
  {
    hotel_id: "gateway_pasumalai",
    name: "The Gateway Hotel Pasumalai (IHCL)",
    location: "Pasumalai Hills, Madurai",
    latitude: 9.8970,
    longitude: 78.0880,
    rating: 4.8,
    price_range: "₹5,000 - ₹9,500",
    facilities: ["Hilltop Views", "Peacock Garden", "Swimming Pool", "Heritage Suites", "Fine Dining"],
    phone: "+91 452 663 3000",
    image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
  },
  {
    hotel_id: "residency_towers",
    name: "The Residency Towers",
    location: "Madurai / Chennai",
    latitude: 9.9230,
    longitude: 78.1280,
    rating: 4.6,
    price_range: "₹3,500 - ₹6,000",
    facilities: ["Central Location", "Buffet Breakfast", "Fitness Gym", "Travel Desk"],
    phone: "+91 452 435 6000",
    image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
  }
];

const events = [
  {
    event_id: "chithirai_festival",
    name: "Chithirai Thiruvizha (Grand Chariot & Celestial Wedding)",
    date: "April - May (Annual)",
    location: "Madurai Meenakshi Temple Grounds",
    description: "One of the world's most spectacular temple festivals celebrating the celestial wedding of Meenakshi and Lord Sundareswarar, followed by Lord Kallazhagar entering River Vaigai attended by millions of pilgrims.",
    image_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80"
  },
  {
    event_id: "mamallapuram_dance_fest",
    name: "Mamallapuram Indian Dance Festival",
    date: "January - February (Annual)",
    location: "Shore Temple Heritage Stage, Mamallapuram",
    description: "A month-long classical festival featuring India's finest Bharatanatyam, Kuchipudi, Kathakali, and Odissi exponents staged before ancient rock sculptures by the crashing waves.",
    image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80"
  }
];

const emergency = {
  hospitals: [
    {
      name: "Apollo Speciality Hospitals Madurai",
      location: "Lake View Road, K.K. Nagar, Madurai",
      latitude: 9.9360,
      longitude: 78.1480,
      phone: "+91 452 258 0892",
      type: "24/7 Multi-Speciality Emergency & Trauma"
    },
    {
      name: "Government Rajaji Hospital (GRH)",
      location: "Panagal Rd, Shenoy Nagar, Madurai",
      latitude: 9.9280,
      longitude: 78.1320,
      phone: "+91 452 253 2535",
      type: "24/7 Government Medical College & Emergency"
    }
  ],
  police_stations: [
    {
      name: "Madurai City Central Police Station",
      location: "Near West Masi St, Madurai",
      latitude: 9.9190,
      longitude: 78.1150,
      phone: "+91 452 234 1100",
      type: "Tourist Protection Assistance Desk"
    },
    {
      name: "Madurai Tourist Police Assistance Outpost",
      location: "Meenakshi Temple East Tower Entrance",
      latitude: 9.9197,
      longitude: 78.1210,
      phone: "112 / +91 452 233 4455",
      type: "Dedicated Foreign & Domestic Tourist Police"
    }
  ]
};

let reviews: any[] = [
  {
    review_id: "rev_1",
    place_id: "meenakshi_temple",
    user_name: "Kavitha R.",
    rating: 5,
    comment: "Mesmerizing spiritual atmosphere. The morning darshan at 6 AM was calm and transcendent. Do visit the Golden Lotus pond!",
    created_at: "Yesterday"
  },
  {
    review_id: "rev_2",
    place_id: "thirumalai_palace",
    user_name: "Arjun Menon",
    rating: 4,
    comment: "Grand architecture and gigantic pillars. The evening sound and light show narrated the Nayak history well.",
    created_at: "3 days ago"
  }
];

let alerts: any[] = [
  {
    alert_id: "alert_1",
    title: "Comfortable Walking Footwear Advisory",
    severity: "info",
    message: "When touring ancient stone temples, footwear must be deposited at official counters. Consider carrying clean socks for walking on warm stone courtyards.",
    created_at: "Updated this week"
  }
];

let favorites: any[] = [];
let trips: any[] = [];
let users: any[] = [
  {
    user_id: "admin_default",
    name: "System Administrator",
    email: "admin@smarttourist.com",
    password: "admin123",
    role: "admin",
    language: "English"
  },
  {
    user_id: "traveler_default",
    name: "Gokul Murugan",
    email: "user@example.com",
    password: "traveler123",
    role: "user",
    language: "English"
  }
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Helper to serve template files
function sendTemplate(res: express.Response, templateName: string) {
  const filePath = path.join(templatesDir, templateName);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Page not found');
  }
}

// HTML Routes
app.get('/', (_req, res) => sendTemplate(res, 'index.html'));
app.get('/login', (_req, res) => sendTemplate(res, 'login.html'));
app.get('/register', (_req, res) => sendTemplate(res, 'register.html'));
app.get('/dashboard', (_req, res) => sendTemplate(res, 'dashboard.html'));
app.get('/explore', (_req, res) => sendTemplate(res, 'explore.html'));
app.get('/place/:place_id', (_req, res) => sendTemplate(res, 'place_details.html'));
app.get('/trip-planner', (_req, res) => sendTemplate(res, 'trip_planner.html'));
app.get('/ai-assistant', (_req, res) => sendTemplate(res, 'ai_assistant.html'));
app.get('/map', (_req, res) => sendTemplate(res, 'map.html'));
app.get('/hotels', (_req, res) => sendTemplate(res, 'hotels.html'));
app.get('/restaurants', (_req, res) => sendTemplate(res, 'restaurants.html'));
app.get('/events', (_req, res) => sendTemplate(res, 'events.html'));
app.get('/favorites', (_req, res) => sendTemplate(res, 'favorites.html'));
app.get('/my-trips', (_req, res) => sendTemplate(res, 'my_trips.html'));
app.get('/emergency', (_req, res) => sendTemplate(res, 'emergency.html'));
app.get('/admin', (_req, res) => sendTemplate(res, 'admin_dashboard.html'));

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, user_location } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let locContext = '';
    if (user_location && user_location.lat && user_location.lng) {
      locContext = `\n[User Location Coordinates: Lat ${user_location.lat}, Lng ${user_location.lng}]`;
    }

    const prompt = `${locContext}\n\nUser Question: ${message}`;

    let reply = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
        reply = response.text || '';
      } catch (err) {
        console.error('Gemini chat error:', err);
      }
    }

    if (!reply) {
      const lower = message.toLowerCase();
      if (lower.includes('madurai')) {
        reply = 'For a 1-day trip in **Madurai**, visit **Meenakshi Amman Temple** at 6:30 AM, have idlis at Murugan Idli Shop, tour **Thirumalai Nayakkar Mahal** by 10:30 AM, and finish with evening shopping at Puthu Mandapam with authentic Jigarthanda!';
      } else if (lower.includes('near me') || lower.includes('nearby')) {
        reply = 'Top attractions near you include **Meenakshi Amman Temple** (0.5 km) and **Thirumalai Nayakkar Palace** (1.2 km). Check our **Interactive Map** for live GPS routes!';
      } else {
        reply = 'Hello! I am your Smart Tourist Guide AI assistant. Tell me which destination you would like to explore or plan an itinerary for!';
      }
    }

    res.json({ response: reply });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to process message', message: e.message });
  }
});

app.post('/api/generate-trip', async (req, res) => {
  try {
    const { destination, days = 2, budget = 'Moderate', people = 2, interests = [], travel_style = 'Balanced' } = req.body;
    const prompt = `Generate a ${days}-day travel itinerary for ${destination}.\nTravelers: ${people}, Budget: ${budget}, Style: ${travel_style}, Interests: ${interests.join(', ')}.\nFormat as structured JSON with array "days", each having "day_number", "theme", "estimated_cost", and "activities" array with "time", "title", "description", "tip". Return valid JSON only.`;

    let itineraryData: any = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: ITINERARY_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
          },
        });
        if (response.text) {
          itineraryData = JSON.parse(response.text);
        }
      } catch (err) {
        console.error('Gemini itinerary generation error:', err);
      }
    }

    if (!itineraryData || !itineraryData.days) {
      const daysList = [];
      for (let i = 1; i <= days; i++) {
        daysList.push({
          day_number: i,
          theme: i === 1 ? `Historic Landmarks of ${destination}` : `Culture & Scenic Highlights of ${destination}`,
          estimated_cost: '₹1,500',
          activities: [
            { time: '08:30 AM', title: 'Traditional Breakfast & Coffee', description: 'Kickstart your day with regional breakfast items at a popular local eatery.', tip: 'Arrive early.' },
            { time: '10:00 AM', title: `Explore Top Monument in ${destination}`, description: 'Immerse yourself in heritage architecture and historical shrines.', tip: 'Modest attire recommended.' },
            { time: '01:00 PM', title: 'Authentic Banana Leaf Lunch', description: 'Sample aromatic curries, vegetables, and rice specialities.', tip: 'Local filter coffee afterwards is a must.' },
            { time: '04:00 PM', title: 'Museum & Evening Market Walk', description: 'Stroll traditional craft shops and pick up local textiles or souvenirs.', tip: 'Sunset gives the best photo lighting.' }
          ]
        });
      }
      itineraryData = { days: daysList };
    }

    res.json({ itinerary: itineraryData });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to generate itinerary', message: e.message });
  }
});

app.get('/api/places', (req, res) => {
  const { id, category, q, limit } = req.query;
  if (id) {
    const place = places.find(p => p.place_id === id);
    if (!place) return res.status(404).json({ error: 'Place not found' });
    return res.json({ place });
  }

  let filtered = [...places];
  if (category && category !== 'All') {
    filtered = filtered.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
  }
  if (q) {
    const query = String(q).toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.location.toLowerCase().includes(query));
  }
  if (limit) {
    filtered = filtered.slice(0, Number(limit));
  }
  res.json({ places: filtered });
});

app.post('/api/places', (req, res) => {
  const newPlace = req.body;
  if (!newPlace.name) return res.status(400).json({ error: 'Place name required' });
  if (!newPlace.place_id) newPlace.place_id = 'place_' + Date.now();
  places.push(newPlace);
  res.status(201).json({ message: 'Place created', place: newPlace });
});

app.delete('/api/places', (req, res) => {
  const { id } = req.query;
  const idx = places.findIndex(p => p.place_id === id);
  if (idx !== -1) places.splice(idx, 1);
  res.json({ message: 'Place deleted' });
});

app.get('/api/nearby', (req, res) => {
  const lat = parseFloat(String(req.query.lat || '9.9195'));
  const lng = parseFloat(String(req.query.lng || '78.1194'));
  const limit = parseInt(String(req.query.limit || '6'), 10);

  const placesWithDist = places.map(p => ({
    ...p,
    distance_km: haversine(lat, lng, p.latitude, p.longitude)
  }));
  placesWithDist.sort((a, b) => a.distance_km - b.distance_km);

  res.json({
    user_coords: { lat, lng },
    places: placesWithDist.slice(0, limit)
  });
});

app.get('/api/favorites', (req, res) => {
  const uid = String(req.query.user_id || 'traveler_default');
  const userFavs = favorites.filter(f => f.user_id === uid);
  res.json({ favorites: userFavs });
});

app.post('/api/favorites', (req, res) => {
  const { user_id = 'traveler_default', place_id } = req.body;
  if (!place_id) return res.status(400).json({ error: 'Missing place_id' });

  const existingIdx = favorites.findIndex(f => f.user_id === user_id && f.place_id === place_id);
  if (existingIdx !== -1) {
    favorites.splice(existingIdx, 1);
    return res.json({ message: 'Removed from favorites', is_favorite: false });
  } else {
    const place = places.find(p => p.place_id === place_id) || {};
    const item = {
      user_id,
      place_id,
      place_name: (place as any).name || place_id,
      category: (place as any).category || 'Attraction',
      location: (place as any).location || '',
      image_url: (place as any).image_url || '',
      rating: (place as any).rating || 4.8,
      created_at: new Date().toLocaleDateString()
    };
    favorites.push(item);
    return res.json({ message: 'Added to favorites', is_favorite: true });
  }
});

app.get('/api/trips', (req, res) => {
  const uid = String(req.query.user_id || 'traveler_default');
  const userTrips = trips.filter(t => t.user_id === uid);
  res.json({ trips: userTrips });
});

app.post('/api/trips', (req, res) => {
  const newTrip = {
    trip_id: 'trip_' + Date.now(),
    user_id: req.body.user_id || 'traveler_default',
    destination: req.body.destination || 'Destination',
    duration: req.body.duration || '2 Days',
    budget: req.body.budget || 'Standard',
    people: req.body.people || 2,
    interests: req.body.interests || 'Culture',
    travel_style: req.body.travel_style || 'Balanced',
    itinerary: req.body.itinerary || {},
    created_at: new Date().toLocaleDateString()
  };
  trips.unshift(newTrip);
  res.status(201).json({ message: 'Trip saved successfully', trip: newTrip });
});

app.delete('/api/trips', (req, res) => {
  const { trip_id } = req.query;
  const idx = trips.findIndex(t => t.trip_id === trip_id);
  if (idx !== -1) trips.splice(idx, 1);
  res.json({ message: 'Trip deleted' });
});

app.get('/api/reviews', (req, res) => {
  const { place_id } = req.query;
  if (place_id) {
    return res.json({ reviews: reviews.filter(r => r.place_id === place_id) });
  }
  res.json({ reviews });
});

app.post('/api/reviews', (req, res) => {
  const newRev = {
    review_id: 'rev_' + Date.now(),
    place_id: req.body.place_id,
    user_id: req.body.user_id || 'anonymous',
    user_name: req.body.user_name || 'Traveler',
    rating: req.body.rating || 5,
    comment: req.body.comment || '',
    created_at: 'Just now'
  };
  reviews.unshift(newRev);
  res.status(201).json({ message: 'Review added', review: newRev });
});

app.delete('/api/reviews', (req, res) => {
  const { id } = req.query;
  const idx = reviews.findIndex(r => r.review_id === id);
  if (idx !== -1) reviews.splice(idx, 1);
  res.json({ message: 'Review deleted' });
});

app.get('/api/hotels', (_req, res) => res.json({ hotels }));
app.get('/api/restaurants', (_req, res) => res.json({ restaurants }));
app.get('/api/events', (_req, res) => res.json({ events }));
app.get('/api/emergency', (_req, res) => res.json(emergency));
app.get('/api/alerts', (_req, res) => res.json({ alerts }));

app.post('/api/alerts', (req, res) => {
  const newAlert = {
    alert_id: 'alert_' + Date.now(),
    title: req.body.title || 'Advisory',
    severity: req.body.severity || 'info',
    message: req.body.message || '',
    created_at: 'Just now'
  };
  alerts.unshift(newAlert);
  res.status(201).json({ message: 'Alert posted', alert: newAlert });
});

// Authentication
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, language = 'English' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const existing = users.find(u => u.email === cleanEmail);
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }
  const newUser = {
    user_id: 'usr_' + Date.now(),
    name,
    email: cleanEmail,
    password,
    language,
    role: 'user',
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  const { password: _, ...cleanUser } = newUser;
  res.status(201).json({ message: 'User registered', user: cleanUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();
  const user = users.find(u => u.email === cleanEmail && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const { password: _, ...cleanUser } = user;
  res.json({ message: 'Logged in successfully', user: cleanUser });
});

app.post('/api/auth/logout', (_req, res) => res.json({ message: 'Logged out' }));

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧭 Smart Tourist Guide server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
