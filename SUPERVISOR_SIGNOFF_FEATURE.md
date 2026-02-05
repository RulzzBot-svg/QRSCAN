# Supervisor Signature Modal Feature

## Overview
The Supervisor Signature modal allows supervisors to sign off on completed AHU (Air Handling Unit) jobs for a specified period and hospital.

## Backend API

### GET /api/schedule/<schedule_id>
Fetches a schedule summary for a given schedule_id (currently interpreted as hospital_id).

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format. Defaults to 30 days ago.
- `end_date` (optional): End date in YYYY-MM-DD format. Defaults to today.

**Example Request:**
```
GET /api/schedule/1?start_date=2024-01-01&end_date=2024-01-31
```

**Response:**
```json
{
  "schedule_id": 1,
  "hospital_id": 1,
  "hospital_name": "Example Hospital",
  "hospital_address": "123 Main St",
  "hospital_city": "Springfield",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "total_jobs": 25,
  "unique_ahus_serviced": 10,
  "total_filters_serviced": 45,
  "jobs": [
    {
      "job_id": 123,
      "ahu_id": "H1-AHU-1",
      "ahu_name": "AHU 1",
      "ahu_location": "Floor 2",
      "technician": "John Doe",
      "completed_at": "2024-01-15T10:30:00",
      "overall_notes": "All filters replaced",
      "filters": [...]
    }
  ]
}
```

### POST /api/admin/supervisor-signoff
Creates a new supervisor signoff record.

**Request Body:**
```json
{
  "hospital_id": 1,
  "date": "2024-01-31",
  "supervisor_name": "Jane Smith",
  "summary": "All monthly maintenance completed successfully",
  "signature_data": "data:image/png;base64,...",
  "job_ids": "123,124,125"
}
```

### GET /api/admin/supervisor-signoff
Retrieves supervisor signoff records.

**Query Parameters:**
- `hospital_id` (optional): Filter by hospital ID
- `date` (optional): Filter by date in YYYY-MM-DD format

## Frontend Component

### SupervisorSignoff Modal

**Props:**
- `open` (boolean): Controls modal visibility
- `onClose` (function): Callback when modal is closed
- `hospitals` (array): List of hospital objects
- `ahus` (array): List of AHU objects
- `scheduleId` (number, optional): Schedule ID to auto-load. When provided, automatically fetches schedule data.

**Usage Example:**
```jsx
import SupervisorSignoff from "./components/common/SupervisorSignoff";

function MyComponent() {
  const [showSignoff, setShowSignoff] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowSignoff(true)}>
        Open Supervisor Signoff
      </button>
      
      <SupervisorSignoff
        open={showSignoff}
        onClose={() => setShowSignoff(false)}
        hospitals={hospitals}
        ahus={ahus}
        scheduleId={1}  // Optional: auto-load schedule for hospital 1
      />
    </>
  );
}
```

## Features

1. **Automatic Schedule Loading**: When `scheduleId` prop is provided, the modal automatically fetches and displays the schedule summary.

2. **Manual Job Loading**: Users can manually select a date range and hospital, then click "Load Completed Work" to fetch jobs.

3. **Digital Signature**: Supports both mouse and touch input for capturing signatures on a canvas.

4. **Auto-Summary**: When loading a schedule, automatically generates a summary of completed work.

5. **Responsive Design**: Works on desktop and mobile devices with an enhanced, visually appealing UI.

## Design Enhancements

The modal features:
- Gradient header with descriptive title and subtitle
- Icon indicators for each field
- Color-coded statistics (blue for jobs, green for AHUs)
- Hover effects and smooth transitions
- Loading states with spinner animations
- Mobile-responsive layout
- Clear visual hierarchy with proper spacing
