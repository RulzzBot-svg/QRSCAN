# AFC Hospital Portal — information for hospital IT

Advanced Filtration Concepts (AFC)  
323.832.8316  
Document: **AFC-HP-TIP-001** v2.0

This brief is the cover sheet. The full control mapping, API inventory, and residual-risk statement are in `hospital-portal-architecture.md` and in the downloadable **Technical packet PDF** (Docs → Download PDF). The packet is not rendered in the portal.

## What to file

Hospital IS / Privacy typically want, for a non-clinical vendor:

1. System description and data-flow / tenant isolation  
2. **HIPAA determination** — does it create, receive, maintain, or transmit PHI? (45 CFR 160.103; HHS business-associate guidance)  
3. Technical safeguards analogous to **45 CFR 164.312**, mapped via **NIST SP 800-66r2**  
4. IAM (unique IDs, authenticator, session timeout, RBAC, SSO/MFA status)  
5. API inventory and public endpoints  
6. Transport (TLS, CORS, security headers) and rate limits  
7. Logging honesty (this is not an ePHI audit log)  
8. Residual risk (no SAML/MFA; sticker GET is unauthenticated equipment status)

## Determination (short)

The portal shows HVAC equipment and filter PM status for one hospital. It does **not** store patient identifiers or clinical information. For this application AFC is not acting as a HIPAA business associate. Hospital counsel decides whether any other AFC relationship still needs a BAA.

## Accounts

| Role | Access |
| --- | --- |
| **Director** | Home, units, scan, graphs (PDF export), datasheet (PDF), technical packet (PDF), contact |
| **Hospital technician** | Units, scan, how-to |

Username + PIN issued by AFC, bcrypt stored, JWT `typ=client` expires in 12 hours. Role is enforced on the server.

## Facilities note

Filter frequencies support facilities operations in the spirit of **ANSI/ASHRAE/ASHE 170** and **Guideline 43-2025**. The portal is **not** a Joint Commission inspection record. Graph PDF is a status chart only.

## Network (short)

HTTPS, CORS allowlist, `X-Frame-Options: DENY`, login 5/15 min, public sticker GET 30/min, contact 5/hour. No catalog PNs, prices, GPS, or writes.

Questions: AFC, 323.832.8316.
