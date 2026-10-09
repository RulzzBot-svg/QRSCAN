/** In-portal documentation. Safe to show hospital IT. No secrets, no write APIs. */

export const IT_SECTIONS = [
  {
    title: "What this system is",
    body: [
      "The AFC Hospital Portal is a read-only website (and optional home-screen app) for one hospital at a time.",
      "It shows filter status, due dates, and technician comments when a filter was not replaced. It is not a work-order system and it cannot change AFC’s survey.",
    ],
  },
  {
    title: "Accounts",
    body: [
      "Director — dashboard, units, scan, graphs, datasheet, this documentation, and contact AFC.",
      "Hospital technician — units, scan, and the how-to page only.",
      "Each login is a username and PIN issued by AFC. It is bound to one hospital. Sessions expire automatically. Portal tokens are rejected by AFC technician and admin tools.",
    ],
  },
  {
    title: "Data shown",
    body: [
      "AHU name, building, and location.",
      "Filter stage, size, quantity, and change frequency.",
      "Last serviced, next due, and on-schedule / due soon / overdue.",
      "Read-only comments when an AFC technician recorded why a filter was not replaced.",
    ],
  },
  {
    title: "Data not shown and not writable",
    body: [
      "No prices, invoices, purchase orders, or catalog part numbers.",
      "No GPS, AFC technician names, or internal job files.",
      "Hospital users cannot add, edit, or delete units or filters.",
      "A logged-out QR sticker shows status only. It cannot change anything.",
    ],
  },
  {
    title: "Network and hosting",
    body: [
      "HTTPS web app. Optional Add to Home Screen (PWA) opens the portal only.",
      "Login and public sticker requests are rate-limited.",
      "No protected health information is stored in this portal.",
      "Questions: AFC, 323.832.8316.",
    ],
  },
];

export const CODE_SECTIONS = [
  {
    title: "Architecture",
    body: [
      "Two apps share one API. The technician / admin app records jobs. The hospital portal only reads status for one hospital.",
      "Frontend: React (Vite) on /client. Backend: Flask. Portal routes live under /api/client/*. Public sticker: GET /api/public/units/<id>.",
      "Hospital data is scoped by the logged-in client_users.hospital_id. The browser cannot pick another hospital.",
    ],
  },
  {
    title: "Authentication",
    body: [
      "POST /api/client/login with username + PIN. Rate limit 5 / 15 minutes.",
      "The API returns a JWT with typ=client. Technician and admin routes reject that token (401).",
      "Role (director | tech) is stored on client_users and checked on the server every request. Changing localStorage does not grant director APIs.",
    ],
  },
  {
    title: "Portal APIs hospital IT may see",
    body: [
      "GET /api/client/me — who is signed in.",
      "GET /api/client/ahus and GET /api/client/ahus/<id> — units and filters (both roles).",
      "GET /api/client/hospital, /graphs, /datasheet — director only.",
      "POST /api/client/contact — director only; stores a message, does not change units.",
      "GET /api/public/units/<id> — logged-out sticker card. GET only. No comments, prices, or part numbers.",
    ],
  },
  {
    title: "What hospital users cannot call",
    body: [
      "Technician job submit, QR payload with catalog part numbers, admin hospital/import tools, QuickBooks, and signatures.",
      "PATCH / PUT / DELETE on portal unit routes return 405.",
    ],
  },
  {
    title: "Code map (AFC maintainers)",
    body: [
      "Frontend portal: SCAN AP/afc-tech-app/src/client/.",
      "Backend portal: routes/client_routes.py, utility/client_portal.py, middleware/auth.py (require_client / require_director).",
      "Tests: test_client_portal.py (roles, comments, sticker, no prices/PNs, no writes).",
    ],
  },
];
