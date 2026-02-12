# Admin Role Setup Guide

This guide explains how to set up and manage admin roles in the AFC Technician application.

## Overview

The application now supports role-based access control (RBAC) with two roles:
- **technician** (default): Can access technician features only
- **admin**: Can access both technician features AND the admin dashboard

## Database Migration

Before the role system will work, you must run the database migration to add the `role` column to the `technicians` table.

### Running the Migration

1. Navigate to the backend directory:
   ```bash
   cd "SCAN AP/afc-tech-app-backend"
   ```

2. Run the migration script:
   ```bash
   python migrations/2026_02_12_add_role_to_technicians.py
   ```

3. The migration will:
   - Add a `role` column to the `technicians` table
   - Set the default role to `'technician'` for all existing users
   - Set all existing NULL roles to `'technician'`

## Granting Admin Access

After running the migration, you need to manually update the database to grant admin access to specific users.

### Using SQL

Connect to your database and run:

```sql
-- To make a user an admin (replace 'John Doe' with the technician's name)
UPDATE technicians 
SET role = 'admin' 
WHERE name = 'John Doe';

-- To verify admin users
SELECT id, name, role, active 
FROM technicians 
WHERE role = 'admin';
```

### Using Python Script

You can also create a Python script to manage admin users:

```python
from app import create_app
from db import db
from models import Technician

app = create_app()

with app.app_context():
    # Grant admin access
    tech = Technician.query.filter_by(name="John Doe").first()
    if tech:
        tech.role = "admin"
        db.session.commit()
        print(f"✓ {tech.name} is now an admin")
    else:
        print("✗ Technician not found")
```

## How It Works

### Frontend Protection

1. **Login**: When a user logs in, their role is stored in localStorage
2. **AdminLayout**: Checks the user's role before allowing access to admin routes
3. **App.jsx**: Only shows the "Admin Dashboard" button to users with admin role
4. **Navigation**: Non-admin users are redirected to the home page if they try to access `/admin`

### Backend Protection

1. **require_admin Decorator**: All admin API endpoints now require:
   - Valid tech ID in the `X-Tech-ID` header
   - The tech must have `role = 'admin'`
   
2. **Protected Endpoints**:
   - `/api/admin/*` - All admin routes
   - `/api/admin/ahus/*` - AHU management
   - `/api/admin/filters/*` - Filter management
   - `/api/admin/jobs` - Job management
   - `/api/admin/hospitals` - Hospital management
   - `/api/admin/supervisor-signoff` - Supervisor signoffs

3. **Error Responses**:
   - `401 Unauthorized`: No tech ID provided or invalid tech ID
   - `403 Forbidden`: Valid tech ID but not an admin

## Testing

### Test Admin Access

1. Create or update a technician with admin role
2. Log in with that technician's credentials
3. Verify you can see the "Admin Dashboard" button on the home page
4. Click the button and verify you can access the admin dashboard
5. Verify all admin features work (AHUs, filters, jobs, etc.)

### Test Non-Admin Access

1. Create or ensure a technician with `role = 'technician'`
2. Log in with that technician's credentials
3. Verify you CANNOT see the "Admin Dashboard" button
4. Try to manually navigate to `/admin` (type in URL bar)
5. Verify you are redirected to the home page with an alert
6. Verify API calls to admin endpoints return 403 errors

## Security Notes

1. **PIN Storage**: Currently PINs are stored in plain text. Consider hashing them for production.
2. **Session Management**: The app uses localStorage for session management. Consider implementing proper JWT tokens.
3. **Role Assignment**: Only database administrators can assign admin roles. There is no UI for this by design.
4. **Backend Validation**: All admin endpoints are protected on the backend, even if frontend checks are bypassed.

## Troubleshooting

### "Access denied" alert on admin dashboard access
- Check that the user's role is set to 'admin' in the database
- Clear browser localStorage and log in again
- Check browser console for errors

### API returns 401 or 403 errors
- Verify the tech ID is being sent in the `X-Tech-ID` header
- Check that the user has `role = 'admin'` in the database
- Verify the migration was run successfully

### Admin button not showing
- Check that localStorage contains `tech.role = 'admin'`
- Clear cache and log in again
- Verify the login endpoint is returning the role field

## Future Enhancements

Consider adding:
- UI for managing user roles (admin-only feature)
- More granular permissions (e.g., read-only admin)
- Audit logging for admin actions
- Password/PIN hashing
- JWT-based authentication
- Session timeout and refresh tokens
