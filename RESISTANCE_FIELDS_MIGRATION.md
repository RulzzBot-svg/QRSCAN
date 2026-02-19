# Database Migration for Resistance Fields

## Changes Made

### Backend
1. **Updated `models.py`**
   - Added `initial_resistance` (Float, nullable) to `JobFilter` model
   - Added `final_resistance` (Float, nullable) to `JobFilter` model

2. **Created Migration Script**
   - File: `migrations/2026_02_19_add_resistance_fields.py`
   - Adds two new columns to the `job_filters` table:
     - `initial_resistance` (FLOAT)
     - `final_resistance` (FLOAT)

3. **Updated `job_routes.py`**
   - Updated job creation endpoint to accept and store resistance values
   - Updated job retrieval endpoints to return resistance values

### Frontend
1. **Updated `FilterInfo.jsx`**
   - Converted table layout to collapsible card-based layout
   - Summary view shows: Qty, Phase, Part, Size, Last Serviced
   - Expanded view shows:
     - Inspected and Replaced checkboxes
     - Initial Resistance input field (number)
     - Final Resistance input field (number)
     - Notes textarea
   - Added state management for:
     - Expanded/collapsed rows
     - Initial resistance values
     - Final resistance values

## How to Deploy

### Step 1: Run Database Migration

**IMPORTANT:** You need to run this migration script on your Neon database before deploying the backend.

```bash
cd "SCAN AP/afc-tech-app-backend"
python migrations/2026_02_19_add_resistance_fields.py
```

This will add the `initial_resistance` and `final_resistance` columns to the `job_filters` table.

### Step 2: Deploy Backend

After running the migration, deploy the backend:
- The backend changes are in:
  - `models.py`
  - `routes/job_routes.py`
- These changes are backward compatible (the new fields are nullable)

### Step 3: Deploy Frontend

The frontend changes are in:
- `src/components/common/FilterInfo.jsx`

Deploy the frontend normally. The new UI will be available immediately.

## Testing

1. **Test Backend**
   - Verify the migration ran successfully
   - Test job submission with resistance values
   - Test job submission without resistance values (should still work)
   - Verify resistance values are stored and retrieved correctly

2. **Test Frontend**
   - Verify the collapsible card layout displays correctly
   - Test expanding/collapsing filter rows
   - Test entering resistance values
   - Test submitting a job with resistance values
   - Verify the data is saved correctly

## Database Schema Changes

### Before
```sql
CREATE TABLE job_filters (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    filter_id INTEGER NOT NULL REFERENCES filters(id),
    is_inspected BOOLEAN NOT NULL DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    note TEXT
);
```

### After
```sql
CREATE TABLE job_filters (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    filter_id INTEGER NOT NULL REFERENCES filters(id),
    is_inspected BOOLEAN NOT NULL DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    note TEXT,
    initial_resistance FLOAT,
    final_resistance FLOAT
);
```

## Notes

- The resistance fields are optional (nullable) so existing jobs without resistance values will continue to work
- The migration script uses `IF NOT EXISTS` to be idempotent (can be run multiple times safely)
- The frontend changes maintain the existing functionality while adding the new dropdown behavior
- All existing features (checkboxes, notes, progress tracking) are preserved
