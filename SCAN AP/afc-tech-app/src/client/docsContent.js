/**
 * Hospital IT technical packet.
 *
 * Written for Information Security, Privacy, Clinical Engineering, and Facilities.
 * Control language follows:
 *  - 45 CFR 160.103 (PHI / business associate)
 *  - 45 CFR 164.312 (HIPAA Security Rule technical safeguards)
 *  - NIST SP 800-66r2 (Feb 2024) mapping of the Security Rule to NIST CSF / SP 800-53
 *  - ANSI/ASHRAE/ASHE Standard 170 and Guideline 43-2025 (ventilation / HVAC operations)
 * This is vendor documentation, not legal advice and not an accreditation instrument.
 */

export const TECH_PACKET = {
  id: "AFC-HP-TIP-001",
  title: "Hospital Portal Technical Information Packet",
  version: "2.0",
  classification: "Vendor documentation  |  Equipment operational data  |  Not PHI",
  audience:
    "Hospital Information Security, Privacy Officer, Clinical Engineering / Facilities, IT infrastructure",
  owner: "Advanced Filtration Concepts (AFC)",
  phone: "323.832.8316",
  sections: [
    {
      id: "1",
      title: "1. Purpose and scope",
      paragraphs: [
        "This packet describes the AFC Hospital Portal: a hospital-scoped, read-only web application that shows HVAC filter status for one facility. It is the document Information Security and Facilities typically file with a vendor packet (system description, data classification, IAM, API inventory, and control mapping).",
        "The portal is not an EHR, CMMS, work-order system, or Joint Commission survey instrument. Filter change intervals on the datasheet are operational data that Facilities may use alongside ANSI/ASHRAE/ASHE Standard 170 (Ventilation of Health Care Facilities) and ASHRAE/ASHE Guideline 43-2025 (operations guideline for health-care HVAC). AFC does not certify a hospital against those standards.",
      ],
      bullets: [
        "In scope: authentication, authorization, tenant isolation, data elements, APIs, transport security, rate limits, residual risk.",
        "Out of scope: AFC technician job submission, catalog pricing, QuickBooks, admin import tools, and any write path against the survey.",
      ],
    },
    {
      id: "2",
      title: "2. System description",
      paragraphs: [
        "Two front ends share one HTTPS API. The technician/admin application records service work. The hospital portal (path /client) only reads a field-whitelisted projection of that work for the hospital bound to the login.",
      ],
      table: {
        headers: ["Component", "Technology", "Role"],
        rows: [
          ["Hospital portal", "React (Vite) SPA, optional PWA", "Read-only UI at /client"],
          ["Technician / admin app", "React SPA", "AFC field work; not issued to hospital logins"],
          ["API", "Flask / SQLAlchemy", "JWT issue, hospital-scoped GET"],
          ["Identity store", "client_users table", "Username, bcrypt PIN, role, hospital_id"],
        ],
      },
      paragraphsAfter: [
        "Trust boundary: the browser never selects a hospital. Every portal query is constrained to g.current_hospital_id taken from the authenticated ClientUser row, not from the JWT role claim and not from localStorage.",
      ],
    },
    {
      id: "3",
      title: "3. Data classification and HIPAA determination",
      paragraphs: [
        "Protected health information (PHI) is defined at 45 CFR 160.103 as individually identifiable health information. The HIPAA Security Rule (45 CFR Part 164 Subpart C) protects electronic PHI (ePHI) that a regulated entity creates, receives, maintains, or transmits. NIST SP 800-66 Revision 2 (February 2024) is HHS/NIST's current resource guide for implementing that rule.",
        "HHS business-associate guidance: a business associate is a person that creates, receives, maintains, or transmits PHI on behalf of a covered entity. If the service does not involve PHI, a business associate agreement is not required for that service (hospital counsel remains the authority of record).",
      ],
      table: {
        headers: ["Data element", "Classification", "Notes"],
        rows: [
          ["AHU name, building, location", "Facilities / asset", "Equipment identity, not a patient"],
          ["Filter stage, size, quantity, frequency", "Facilities / asset", "No catalog part numbers in the portal"],
          ["Last serviced / next due / status", "Facilities PM", "Derived from last_service_date + frequency_days"],
          ["Skip comments (held / not replaced)", "Facilities note", "HTML stripped; no technician names"],
          ["Prices, invoices, POs, catalog PNs", "Not exposed", "Stripped from every portal serializer"],
          ["GPS, AFC tech names, job files", "Not exposed", "Internal to the technician app"],
          ["Patient identifiers, clinical notes, MRN", "Not present", "Portal does not store PHI"],
        ],
      },
      bullets: [
        "Determination: this portal does not create, receive, maintain, or transmit PHI. For this application AFC is not acting as a HIPAA business associate.",
        "No ePHI in this dataset means 45 CFR 164.312 does not attach to the portal's records. The control mapping in section 8 still implements the same technical-safeguard families as industry practice (access control, audit, integrity, authentication, transmission security).",
        "This packet is not a HITRUST CSF, SOC 2, or FedRAMP report and does not claim those certifications.",
      ],
    },
    {
      id: "4",
      title: "4. Identity, authentication, and authorization",
      paragraphs: [
        "Accounts are provisioned by AFC (username + numeric PIN), bound to one hospital_id, and stored with bcrypt (2b) hashes. Role is director or tech on client_users. The JWT carries typ=client and sub=client_users.id; role is re-read from the database on every request. Editing localStorage cannot grant director APIs.",
      ],
      table: {
        headers: ["Control", "Implementation"],
        rows: [
          ["Unique user ID", "client_users.username unique; JWT sub is the row id"],
          ["Authenticator", "PIN verified with bcrypt; plaintext PINs re-hashed on successful login"],
          ["Session", "HS256 JWT, default exp 12 hours (JWT_EXPIRY_HOURS)"],
          ["Token isolation", "Technician/admin routes reject typ=client (401); portal rejects non-client tokens (403)"],
          ["RBAC", "require_client vs require_director; hospital-tech is 403 on graphs, datasheet, contact, hospital home"],
          ["Tenant isolation", "Queries filter hospital_id = authenticated hospital; other hospitals 404/empty"],
          ["Lockout / abuse", "Login 5 requests / 15 minutes per IP (Flask-Limiter)"],
          ["SSO / MFA", "Not offered. No SAML 2.0 or OIDC. NIST 800-63 AAL2 is not claimed."],
        ],
      },
      bullets: [
        "Director: dashboard, units, scan, graphs (export), datasheet, this packet, contact form.",
        "Hospital technician: units, scan, unit detail (including read-only skip comments), how-to. No graphs, datasheet, packet PDF, or contact.",
        "Deprovisioning: AFC sets client_users.active = false; subsequent requests 401.",
      ],
    },
    {
      id: "5",
      title: "5. API inventory",
      paragraphs: [
        "Hospital IT can treat this as the complete portal surface. Methods other than those listed return 404 or 405. Portal unit routes do not implement PATCH, PUT, or DELETE (405).",
      ],
      table: {
        headers: ["Method", "Path", "Auth", "Limit"],
        rows: [
          ["POST", "/api/client/login", "Public", "5 / 15 min"],
          ["GET", "/api/client/me", "Any portal login", "Default 2000 / hour"],
          ["GET", "/api/client/ahus", "Any portal login", "Default"],
          ["GET", "/api/client/ahus/<id>", "Any portal login", "Default"],
          ["GET", "/api/client/hospital", "Director", "Default"],
          ["GET", "/api/client/graphs", "Director", "Default"],
          ["GET", "/api/client/datasheet", "Director", "Default"],
          ["POST", "/api/client/contact", "Director", "5 / hour"],
          ["GET", "/api/public/units/<id>", "None (sticker)", "30 / min"],
        ],
      },
      bullets: [
        "Public sticker is GET-only equipment status: name, building, location, filter stage/size/qty/frequency, dates, status. No comments, prices, part numbers, or account APIs.",
        "Hospital users cannot call technician job submit, technician QR (catalog PNs), admin import, signatures, or QuickBooks.",
        "Contact POST stores a ClientInquiry row (name, email, phone, message). Honeypot field website is ignored. It does not mutate units.",
      ],
    },
    {
      id: "6",
      title: "6. Network, transport, and application hardening",
      paragraphs: [
        "The SPA and API are served over HTTPS. CORS is an explicit origin allowlist (CORS_ORIGINS). Responses set X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin.",
      ],
      bullets: [
        "Authorization is a Bearer JWT in localStorage (not a cookie), which avoids classic cookie CSRF. Residual XSS risk is accepted and mitigated by field whitelists, comment sanitization, and the absence of PHI.",
        "ORM parameterized queries (SQLAlchemy). Skip comments: HTML tags stripped, length-capped, only JobFilter rows with is_completed = false.",
        "IDOR: AHU lookup requires hospital_id match. Inactive hospitals 403 at login; public sticker 404 if the hospital is inactive.",
        "Optional PWA (Add to Home Screen) is scoped to the portal; it does not expose technician tools.",
        "Default API rate limit 2000/hour in addition to the tighter login, sticker, and contact limits.",
      ],
    },
    {
      id: "7",
      title: "7. Logging, retention, and availability",
      paragraphs: [
        "Be precise: this is not a HIPAA-required ePHI audit log (45 CFR 164.312(b)), because the dataset is not ePHI. Platform HTTPS access logs and application logs record request metadata and 401/403/429 outcomes. Contact inquiries are stored until AFC deletes them. Equipment status is operational data retained as long as the hospital remains an AFC customer.",
        "RTO/RPO are those of the HTTPS hosts (SPA and API). The portal is a view of AFC's survey database; it is not the hospital's system of record for Joint Commission Environment of Care utility documentation. Facilities should keep their own PM program of record.",
      ],
    },
    {
      id: "8",
      title: "8. Control mapping (Security Rule / NIST)",
      paragraphs: [
        "Mapping uses the HIPAA Security Rule technical safeguards at 45 CFR 164.312 and the corresponding NIST SP 800-53 families referenced by NIST SP 800-66r2. Addressable encryption specs are implemented for transport; there is no ePHI at rest to encrypt under 164.312(a)(2)(iv).",
      ],
      table: {
        headers: ["Safeguard", "Citation", "Portal implementation"],
        rows: [
          ["Unique user identification", "164.312(a)(2)(i); IA-2", "Unique username; JWT sub = user id"],
          ["Emergency access", "164.312(a)(2)(ii)", "N/A clinical emergency. AFC re-issues credentials"],
          ["Automatic logoff", "164.312(a)(2)(iii); AC-12", "JWT exp 12h; 401 clears the SPA session"],
          ["Encryption / decryption", "164.312(a)(2)(iv) addr.", "TLS in transit; bcrypt at rest for PINs"],
          ["Audit controls", "164.312(b); AU-2", "Access logs; not an ePHI audit trail"],
          ["Integrity", "164.312(c); SC-8/SI-7", "Read-only API; signed JWT; ORM"],
          ["Person or entity auth", "164.312(d); IA-5", "Username + bcrypt PIN"],
          ["Transmission security", "164.312(e); SC-8, SC-13", "HTTPS; CORS allowlist"],
          ["Least privilege", "AC-6", "Director vs tech; hospital_id scope"],
          ["Unsuccessful logon", "AC-7 analog", "5 / 15 min at login"],
        ],
      },
    },
    {
      id: "9",
      title: "9. Residual risk and items not offered",
      bullets: [
        "No SAML 2.0 / OIDC single sign-on and no multi-factor authentication. Hospitals that require AAL2 or IdP-brokered access should treat that as a gap.",
        "JWT in localStorage: XSS in the SPA could read the token. Impact is limited to one hospital's equipment status (not PHI). Content Security Policy tightening is a future hardening item.",
        "GET /api/public/units/<id> is unauthenticated equipment status for QR stickers. It is rate-limited and field-whitelisted. It is not an account or write API.",
        "No customer-managed keys, no private connectivity (PrivateLink), no FedRAMP/HITRUST/SOC 2 package attached to this document.",
        "This packet must not be used as a Joint Commission inspection record. Graph export is a status chart for the hospital that holds the login, not an accreditation deliverable.",
      ],
    },
    {
      id: "10",
      title: "10. Contacts and document control",
      paragraphs: [
        "Vendor: Advanced Filtration Concepts. Voice: 323.832.8316. Document ID AFC-HP-TIP-001, version 2.0. Classification: vendor documentation / not PHI. This file is generated from Docs -> Download PDF for the hospital named on the cover. The packet is not rendered in the portal.",
        "Hospital technicians see How to use only. Repo copies live under SCAN AP/docs/ (markdown) and this generated PDF.",
      ],
    },
  ],
};

