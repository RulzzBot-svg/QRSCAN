# AFC Hospital Portal — information for hospital IT

Advanced Filtration Concepts (AFC)  
323.832.8316

This brief describes the **hospital client portal** only. It is a read-only status site for the hospital that holds the login. It is not AFC’s technician job app and it cannot change survey data.

## Purpose

Facilities directors and hospital technicians can see filter status, due dates, and (when recorded) why a filter was not replaced. They can print an inspection snapshot and a technical datasheet. They cannot edit air handlers, filters, prices, or jobs.

## Accounts

| Role | What they can do |
| --- | --- |
| **Director** | Home dashboard, unit list, QR scan, graphs, inspection PDF, technical datasheet, IT brief, how-to, contact AFC |
| **Hospital technician** | Unit list, QR scan, filter pages (including read-only comments), how-to |

Logins are a username and PIN issued by AFC. Each login is bound to **one hospital**. A session token expires automatically. Portal tokens are rejected by AFC technician and admin APIs.

## Data shown

- AHU name, building, location
- Filter stage, size, quantity, change frequency
- Last serviced, next due, on-schedule / due soon / overdue
- Read-only technician comments when a filter was held or not replaced

## Data not shown and not writable

- No prices, invoices, purchase orders, or catalog part numbers
- No GPS, AFC technician names, or internal job files
- No ability to add, edit, or delete units or filters
- Logged-out QR stickers show status only (no comments, no login, no writes)

## Access model

- HTTPS web application; optional Add to Home Screen (PWA) for the portal path
- Hospital-scoped API
- Login and public sticker endpoints are rate-limited
- Public sticker is GET-only
- No protected health information is stored in this portal

## Technical datasheet

The datasheet lists each AHU’s filter stages, sizes, quantities, and change frequencies for Joint Commission / facilities files. It does not include catalog part numbers or commercial terms.

Questions: AFC, 323.832.8316.
