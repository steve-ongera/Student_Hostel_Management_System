# 🏠 HMS — Student Hostel Management System

A full-stack hostel allocation system built with **Django REST Framework** + **React (Vite)**.

---

## ✨ Features

### Student Module
- Login with registration number (e.g. `SC211/0530/2022`)
- Default password = date of birth in `DDMMYYYY` format
- Forced password change on first login
- Hostel eligibility check (Year 1, Semester 1 only + deferred students)
- Browse hostels filtered by gender (boys/girls automatically)
- Real-time bed availability with WebSocket live updates
- 3-minute bed lock during booking (prevents double-booking)
- M-Pesa STK Push payment (dev bypass when `DEBUG=True`)
- View current booking + all historical bookings
- Occupancy history across all academic years

### Warden Module
- Dashboard with live stats and occupancy rate
- Interactive occupancy map (hostel → floor → room → bed)
- Click any bed to see its full occupancy history
- All bookings with filters (year, status, search)
- Student directory
- Academic year management (set current year, open/close applications)
- Occupancy history with per-bed, per-room, per-hostel filters
- Reports page

### Technical
- JWT authentication with auto token refresh
- WebSocket (Django Channels) for real-time bed status
- M-Pesa Daraja API (STK Push) with dev bypass
- Room capacity: 2, 4, or 6 beds per room
- Bed lock TTL: 3 minutes
- Gender-based hostel filtering (enforced server-side)

---

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Seed demo data
python manage.py seed_data

# Create superuser (optional)
python manage.py createsuperuser

# Start server
python manage.py runserver
# OR with WebSocket support:
daphne -b 0.0.0.0 -p 8000 hostel_system.asgi:application
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Start dev server
npm run dev
```

Visit: **http://localhost:3000**

---

## 🔑 Demo Login Credentials

| Role    | Username             | Password         |
|---------|----------------------|------------------|
| Warden  | `W001`               | `warden1234`     |
| Student | `SC211/0530/2022`    | `15031998`       |
| Student | `SC211/0531/2022`    | `22071999`       |
| Student | `SC211/0532/2022`    | `05112000`       |

> Default student password = DOB in DDMMYYYY format. Students are forced to change it on first login.

---

## 📁 Project Structure

```
hostel_system/
├── backend/
│   ├── hostel_system/         # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py            # WebSocket entry point
│   │   └── wsgi.py
│   ├── core/                  # Main app
│   │   ├── models.py          # All data models
│   │   ├── serializers.py     # DRF serializers
│   │   ├── views.py           # ViewSets + business logic
│   │   ├── urls.py            # API routes
│   │   ├── admin.py
│   │   ├── consumers.py       # WebSocket consumer
│   │   ├── routing.py         # WebSocket URL routing
│   │   └── management/
│   │       └── commands/
│   │           └── seed_data.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx             # Router + auth guards
        ├── styles/
        │   └── main.css        # Full design system
        ├── context/
        │   └── AuthContext.jsx
        ├── utils/
        │   └── api.js          # Axios + JWT interceptors
        ├── hooks/
        │   └── useBedSocket.js # WebSocket hook
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Sidebar.jsx
        │   └── Layout.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── student/
            │   ├── Dashboard.jsx
            │   ├── BookBed.jsx       # Full booking flow
            │   └── StudentPages.jsx  # Profile, History, etc.
            └── warden/
                ├── Dashboard.jsx
                ├── OccupancyMap.jsx  # Live bed map
                └── WardenPages.jsx   # Bookings, Students, etc.
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login → JWT tokens |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| POST | `/api/auth/change-password/` | Change password |
| GET  | `/api/auth/me/` | Current user profile |
| GET  | `/api/students/my-eligibility/` | Check hostel eligibility |
| GET  | `/api/hostels/available-for-student/` | Gender-filtered hostels |
| POST | `/api/beds/{id}/lock/` | Lock bed (3 min) |
| POST | `/api/beds/{id}/unlock/` | Release bed lock |
| POST | `/api/bookings/apply/` | Book + initiate payment |
| POST | `/api/mpesa/callback/` | M-Pesa payment callback |
| GET  | `/api/warden-dashboard/stats/` | Live stats |
| GET  | `/api/warden-dashboard/occupancy-matrix/` | Full bed map |
| GET  | `/api/warden-dashboard/room-history/` | Filter occupancy history |

WebSocket: `ws://localhost:8000/ws/beds/` — real-time bed status updates

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback/
CURRENT_ACADEMIC_YEAR=2024-2025
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws/beds/
```

---

## 🏗️ Data Models

```
User ──────────── Student (reg_number, gender, year, semester)
                └── Enrollment (per academic year)
                └── BookingApplication ── MpesaPayment
                └── OccupancyHistory

User ──────────── Warden

Hostel ────────── Room ──── Bed
                           └── BookingApplication
                           └── OccupancyHistory

AcademicYear ──── BookingApplication
               └── Enrollment
```

---

## 📱 M-Pesa Integration

In **DEBUG mode**: payment is auto-approved, no real charge.  
In **production**: real STK Push is sent to the student's phone.

Set up your M-Pesa callback URL via ngrok during development:
```bash
ngrok http 8000
# Then set MPESA_CALLBACK_URL=https://xxxx.ngrok.io/api/mpesa/callback/
```

---

## 🔒 Security Notes

- JWT tokens expire in 8 hours; refresh tokens in 7 days
- Bed lock expires in 3 minutes server-side + client countdown
- Gender matching enforced server-side (not just UI)
- Students can only book in the current academic year
- Only Year 1, Semester 1 students (or deferred) are eligible
- All endpoints protected by role-based permissions