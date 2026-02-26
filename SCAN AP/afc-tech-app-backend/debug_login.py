from app import create_app
import json

app = create_app()
with app.app_context():
    client = app.test_client()
    print('GET /api/technicians')
    r = client.get('/api/technicians')
    print(r.status_code)
    try:
        print(r.get_json())
    except Exception as e:
        print('Failed parse JSON', e)

    # try to login with first technician if available
    techs = r.get_json() or []
    if len(techs) > 0:
        t = techs[0]
        name = t.get('name')
        print('Attempting login for', name)
        rr = client.post('/api/technicians/login', json={'name': name, 'pin': '0000'})
        print(rr.status_code)
        try:
            print(rr.get_json())
        except Exception as e:
            print('Login response parse failed', e)
    else:
        print('No technicians found')
