# AFC Hospital Portal — technical documentation

This is the coding / architecture brief for hospital IT and AFC maintainers. It describes the **hospital portal only**. It does not include secrets, admin PINs, or write APIs.

## Systems

| Piece | Role |
| --- | --- |
| Hospital portal (`/client`) | Read-only status for one hospital |
| Technician / admin app | AFC field work, imports, prices — not exposed to hospital logins |
| Flask API | Issues portal JWTs and serves hospital-scoped GET data |

Frontend: `SCAN AP/afc-tech-app/src/client/`  
Backend: `SCAN AP/afc-tech-app-backend/routes/client_routes.py`, `utility/client_portal.py`

## Authentication

1. `POST /api/client/login` with username + PIN (5 attempts / 15 minutes).
2. Response includes a JWT (`typ=client`) and `role` (`director` or `tech`).
3. Role is stored on `client_users` and checked on the server every request.
4. Technician and admin routes reject portal tokens.

## Portal APIs

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/client/login` | Public (rate-limited) |
| GET | `/api/client/me` | Any portal login |
| GET | `/api/client/ahus`, `/api/client/ahus/<id>` | Any portal login |
| GET | `/api/client/hospital`, `/graphs`, `/datasheet` | Director |
| POST | `/api/client/contact` | Director (inquiry only) |
| GET | `/api/public/units/<id>` | Logged-out QR card |

Hospital users cannot call job submit, technician QR (catalog PNs), admin import, or QuickBooks. PATCH/PUT/DELETE on portal units return 405.

## Data rules

Shown: unit name, building, location, filter stage/size/qty/frequency, dates, status, skip comments.  
Not shown: prices, invoices, catalog PNs, GPS, AFC technician names.

## In-app location

Directors: **Docs** tab → How to use, Datasheet, IT brief, Technical docs.  
Hospital technicians: **Guide** (how to use only).
