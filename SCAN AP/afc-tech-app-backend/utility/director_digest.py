"""Weekly director digest email. Sends only when SMTP_HOST is set."""
import os
import smtplib
from email.message import EmailMessage

from models import AHU, ClientUser, Hospital
from sqlalchemy.orm import joinedload, selectinload
from utility.client_portal import hospital_held_filters, hospital_upcoming, hospital_week_digest, walk_sorted_ahus


def format_digest_text(hospital_name, week, upcoming_summary, held):
    asap = (upcoming_summary or {}).get("ahus_asap") or 0
    month = (upcoming_summary or {}).get("ahus_month") or 0
    lines = [
        f"{hospital_name} — weekly filter status",
        f"Week of {week.get('week_start') or '—'}.",
        "",
        f"AFC replaced filters on {week.get('units_serviced') or 0} unit(s) "
        f"({week.get('filters_replaced') or 0} filters).",
        f"Still overdue: {week.get('still_overdue') or 0} unit(s).",
        f"Held / not replaced this week: {week.get('held') or 0}.",
        f"Due ASAP: {asap} unit(s). Due this month: {month} unit(s).",
    ]
    visits = week.get("visits") or []
    if visits:
        lines.append("")
        lines.append("This week:")
        for row in visits[:8]:
            stages = ", ".join(row.get("stages") or []) or "visit"
            where = " · ".join([p for p in (row.get("building"), row.get("name")) if p])
            lines.append(f"  {row.get('at')}  {where}  {stages}")
    held_rows = held or []
    if held_rows:
        lines.append("")
        lines.append("Held / not replaced:")
        for row in held_rows[:8]:
            lines.append(
                f"  {row.get('name')} {row.get('filter') or ''} — {row.get('text') or ''}"
            )
    lines.append("")
    lines.append("Open the hospital portal for the 30-day due list. This message is status only — not a Joint Commission record.")
    return "\n".join(lines)


def _smtp_settings():
    host = (os.getenv("SMTP_HOST") or "").strip()
    if not host:
        return None
    return {
        "host": host,
        "port": int(os.getenv("SMTP_PORT") or 587),
        "user": (os.getenv("SMTP_USER") or "").strip() or None,
        "password": os.getenv("SMTP_PASSWORD") or "",
        "from_addr": (os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or "noreply@localhost").strip(),
        "use_tls": (os.getenv("SMTP_TLS") or "1").strip() not in ("0", "false", "no"),
    }


def send_mail(to_addr, subject, body, settings=None):
    cfg = settings or _smtp_settings()
    if not cfg:
        return False
    msg = EmailMessage()
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(cfg["host"], cfg["port"], timeout=20) as smtp:
        if cfg["use_tls"]:
            smtp.starttls()
        if cfg["user"]:
            smtp.login(cfg["user"], cfg["password"])
        smtp.send_message(msg)
    return True


def send_director_digests():
    cfg = _smtp_settings()
    directors = ClientUser.query.filter_by(active=True, role="director").all()
    recipients = [c for c in directors if (c.email or "").strip()]
    skipped_no_mail = [c.username for c in directors if not (c.email or "").strip()]
    if not cfg:
        return {
            "sent": 0,
            "skipped": "SMTP_HOST is not set — digest stays in the portal Home.",
            "directors": len(recipients),
            "skipped_no_email": skipped_no_mail,
        }

    sent = 0
    errors = []
    for client in recipients:
        to_addr = (client.email or "").strip()
        if not to_addr:
            continue
        hospital = client.hospital
        if hospital is None and client.hospital_id:
            from db import db
            hospital = db.session.get(Hospital, client.hospital_id)
        ahus = []
        if client.hospital_id:
            rows = (
                AHU.query.options(joinedload(AHU.building), selectinload(AHU.filters))
                .filter(AHU.hospital_id == client.hospital_id)
                .all()
            )
            ahus = walk_sorted_ahus(rows)
        week = hospital_week_digest(client.hospital_id, ahus)
        upcoming = hospital_upcoming(ahus)
        held = hospital_held_filters(client.hospital_id)
        name = hospital.name if hospital else "Hospital"
        body = format_digest_text(name, week, upcoming.get("summary") or {}, held)
        try:
            send_mail(to_addr, f"{name}: weekly filter status", body, cfg)
            sent += 1
        except Exception as exc:
            errors.append({"username": client.username, "error": str(exc)})
    return {
        "sent": sent,
        "skipped_no_email": skipped_no_mail,
        "errors": errors,
    }
