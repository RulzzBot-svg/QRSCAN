# Supervisor Signature Feature

## Overview
This feature allows supervisors to review completed jobs for a schedule and provide their digital signature to sign off on the work.

## Components

### Backend (`/backend/routes/signature.py`)

Two new API endpoints:

1. **GET `/api/schedule/:id/summary`**
   - Fetches a summary of jobs for a given schedule ID
   - Returns job details including AHU info, technician, completion time, and filter details
   - Response format:
   ```json
   {
     "schedule_id": "sample-schedule-1",
     "jobs": [
       {
         "id": 1,
         "ahu_id": "H1-ahu-1",
         "ahu_name": "AHU 1",
         "technician": "John Doe",
         "completed_at": "2026-02-05T16:00:00Z",
         "overall_notes": "Job notes",
         "filters": [...]
       }
     ]
   }
   ```

2. **POST `/api/supervisor_sign`**
   - Records a supervisor sign-off for a schedule
   - Request body:
   ```json
   {
     "schedule_id": "sample-schedule-1",
     "supervisor_name": "Jane Smith",
     "jobs": [1, 2, 3],
     "signed_at": "2026-02-05T16:00:00Z",
     "signature_image": "data:image/png;base64,..."
   }
   ```
   - Creates a `SupervisorSignoff` record in the database
   - Returns success message with record ID

### Frontend

#### `SignatureModal.jsx` (`/frontend/src/components/SignatureModal.jsx`)

A reusable React modal component for supervisor sign-offs:

**Props:**
- `isOpen` (boolean): Controls modal visibility
- `onClose` (function): Callback when modal is closed
- `scheduleId` (string): The schedule ID to fetch jobs for

**Features:**
- Fetches jobs automatically when opened
- Displays jobs as green cards with key information
- Provides a text input for supervisor name
- Includes a signature canvas using `react-signature-canvas`
- Validates input before submission
- Shows loading and error states
- Responsive design using TailwindCSS/DaisyUI

**Usage:**
```jsx
import SignatureModal from '../components/SignatureModal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Sign Off
      </button>
      <SignatureModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        scheduleId="sample-schedule-1"
      />
    </>
  );
}
```

#### `SummaryExample.jsx` (`/frontend/src/pages/SummaryExample.jsx`)

A demonstration page showcasing the SignatureModal component:

**Route:** `/summary-example`

**Features:**
- Informative landing page explaining the feature
- Button to open the signature modal
- Technical documentation section showing API endpoints
- Stats cards displaying demo information
- Fully styled with TailwindCSS/DaisyUI

**Access:**
Navigate to `http://localhost:5173/summary-example` (or your dev server URL)

## Installation

### Backend
The blueprint is automatically registered in `app.py`:
```python
from routes.signature import signature_bp
app.register_blueprint(signature_bp, url_prefix="/api")
```

### Frontend
1. The component uses `react-signature-canvas` (already in dependencies)
2. Import and use the modal in any component
3. The demo page is registered in `main.jsx` at route `/summary-example`

## Database Schema

The feature uses the existing `SupervisorSignoff` model:
```python
class SupervisorSignoff(db.Model):
    id: Integer (Primary Key)
    hospital_id: Integer (Foreign Key)
    date: Date
    supervisor_name: String(150)
    summary: Text
    signature_data: Text (base64 PNG)
    job_ids: Text (comma-separated)
    created_at: DateTime
```

## Testing

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```

2. Start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173/summary-example`

4. Click "Open Supervisor Signature Modal"

5. The modal will:
   - Fetch recent jobs from the backend
   - Display them as green cards
   - Allow you to enter your name and draw a signature
   - Submit the sign-off to the backend

## API Examples

### Fetch Schedule Summary
```bash
curl http://localhost:5000/api/schedule/sample-schedule-1/summary
```

### Submit Sign-off
```bash
curl -X POST http://localhost:5000/api/supervisor_sign \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_id": "sample-schedule-1",
    "supervisor_name": "Jane Smith",
    "jobs": [1, 2, 3],
    "signed_at": "2026-02-05T16:00:00Z",
    "signature_image": "data:image/png;base64,iVBORw0KG..."
  }'
```

## Notes

- The signature is stored as a base64-encoded PNG image
- Jobs are displayed with green background to indicate completion
- The modal is fully responsive and works on mobile devices
- Touch events are supported for signature drawing on mobile
- The component handles loading and error states gracefully
