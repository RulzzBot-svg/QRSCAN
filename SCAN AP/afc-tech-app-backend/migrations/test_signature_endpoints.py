from app import create_app
import json

app = create_app()
with app.test_client() as c:
    res = c.get('/api/schedule/sample-schedule-1/summary')
    print('GET /api/schedule/sample-schedule-1/summary ->', res.status_code)
    try:
        print(json.dumps(res.get_json(), indent=2))
    except Exception as e:
        print('Response text:', res.get_data(as_text=True))

    payload = {
        'schedule_id': 'sample-schedule-1',
        'supervisor_name': 'Unit Tester',
        'jobs': [],
        'signed_at': '2026-02-05T12:00:00Z'
    }
    res2 = c.post('/api/supervisor_sign', json=payload)
    print('POST /api/supervisor_sign ->', res2.status_code)
    try:
        print(json.dumps(res2.get_json(), indent=2))
    except Exception:
        print('Response text:', res2.get_data(as_text=True))
