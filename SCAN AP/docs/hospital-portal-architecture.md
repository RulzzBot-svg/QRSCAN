# AFC Hospital Portal — Technical Information Packet (AFC-HP-TIP-001)

Version 2.0. Vendor documentation for hospital Information Security, Privacy, Clinical Engineering, and Facilities. **Not PHI. Not legal advice. Not an accreditation instrument.**

The same packet is generated as PDF from the portal: **Docs → Download PDF**. It is not rendered on the website.

## Purpose and scope

Read-only, hospital-scoped HVAC filter status. Not an EHR, CMMS, work-order system, or Joint Commission survey form. Filter intervals may be used with ANSI/ASHRAE/ASHE Standard 170 and Guideline 43-2025; AFC does not certify the hospital against those standards.

## HIPAA determination

PHI is defined at **45 CFR 160.103**. The Security Rule (**45 CFR Part 164 Subpart C**) protects ePHI a regulated entity creates, receives, maintains, or transmits. NIST **SP 800-66r2** (February 2024) maps that rule to NIST CSF / SP 800-53.

This portal stores equipment identity, filter geometry, PM dates, and skip comments. It does not create, receive, maintain, or transmit PHI. For this application AFC is not a HIPAA business associate (HHS BA guidance). Hospital counsel remains the authority of record. No HITRUST / SOC 2 / FedRAMP claim is attached.

## Architecture

| Component | Technology | Role |
| --- | --- | --- |
| Hospital portal | React (Vite) SPA, optional PWA | Read-only UI at `/client` |
| Technician / admin app | React SPA | AFC field work — not issued to hospital logins |
| API | Flask / SQLAlchemy | JWT issue, hospital-scoped GET |
| Identity | `client_users` | Username, bcrypt PIN, role, `hospital_id` |

Tenant isolation: `g.current_hospital_id` from the authenticated row, not from JWT role and not from `localStorage`.

## Identity

- Unique username; PIN bcrypt `$2b$`; JWT HS256, `typ=client`, default exp 12 hours
- Role re-read from DB every request (`require_client` / `require_director`)
- Technician/admin routes reject portal tokens
- Login rate limit 5 / 15 minutes
- **No SAML/OIDC, no MFA** (NIST 800-63 AAL2 not claimed)

## APIs

| Method | Path | Auth | Limit |
| --- | --- | --- | --- |
| POST | `/api/client/login` | Public | 5 / 15 min |
| GET | `/api/client/me` | Portal | default |
| GET | `/api/client/ahus`, `/ahus/<id>` | Portal | default |
| GET | `/api/client/hospital`, `/graphs`, `/datasheet` | Director | default |
| POST | `/api/client/contact` | Director | 5 / hour |
| GET | `/api/public/units/<id>` | Public GET | 30 / min |

PATCH/PUT/DELETE on portal units → 405. Public sticker has no comments, prices, or part numbers.

## Control mapping (excerpt)

| Safeguard | Citation | Implementation |
| --- | --- | --- |
| Unique user ID | 164.312(a)(2)(i); IA-2 | Unique username; JWT `sub` |
| Automatic logoff | 164.312(a)(2)(iii); AC-12 | JWT 12h; 401 clears SPA |
| Encryption | 164.312(a)(2)(iv) addressable | TLS in transit; bcrypt PINs |
| Audit | 164.312(b); AU-2 | Access logs; not an ePHI audit trail |
| Integrity | 164.312(c) | Read-only API; signed JWT; ORM |
| Authentication | 164.312(d); IA-5 | Username + bcrypt PIN |
| Transmission | 164.312(e); SC-8 | HTTPS; CORS allowlist |
| Least privilege | AC-6 | Director vs tech; `hospital_id` |

Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

## Residual risk

JWT in `localStorage` (XSS residual; no PHI). Unauthenticated sticker GET is equipment status only. No customer-managed keys, private connectivity, or certification package.

## Contacts

AFC, 323.832.8316. Code: `SCAN AP/afc-tech-app/src/client/`, `routes/client_routes.py`, `utility/client_portal.py`, `middleware/auth.py`. Tests: `test_client_portal.py`.
