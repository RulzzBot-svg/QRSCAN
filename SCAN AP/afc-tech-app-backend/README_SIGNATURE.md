# Supervisor signature feature (local testing)

Run backend (Flask):

1. cd backend
2. (optional) create and activate venv:
   python -m venv venv && source venv/bin/activate
3. pip install flask
4. Ensure your main Flask app registers the blueprint from backend/signature.py:
   from backend.signature import bp as signature_bp
   app.register_blueprint(signature_bp)
   If you don't have an app entrypoint, create a minimal app.py that imports and registers the blueprint.
5. flask run

Run frontend (React):

1. cd frontend
2. npm install
3. (optional) add proxy to frontend/package.json:
   "proxy": "http://localhost:5000"
4. npm start

Open the demo page and click "Open Supervisor Sign-Off" (render SummaryExample in your app routes or import it directly into App during dev).

Example curl to POST a sign-off (without signature image):

```bash
curl -X POST http://localhost:5000/api/supervisor_sign \
  -H "Content-Type: application/json" \
  -d '{"schedule_id":"sample-schedule-1","supervisor_name":"Dr. Smith","jobs":[],"signed_at":"2026-02-05T12:00:00Z"}'
```

Notes:
- The backend persists sign-offs under backend/data/signed_records.json.
- No authentication is included (per request). Add auth checks in production.
- If you want to persist the full base64 signature image, modify backend/signature.py to save the `signature_image` string to disk or DB.
