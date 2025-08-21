# Front Desk Dashboard

## Overview
The Front Desk Dashboard is now the default landing page for front desk users, providing a comprehensive overview of today's appointments, patient check-ins, and queue management. The system implements a clear **Appointment-to-Queue Workflow** where appointments are archived after check-in and only queue items remain active for consultation.

## Core Workflow: Appointment → Check-in → Queue → Archive

### 1. **Appointment Exists** (Future Date)
- Patient has a scheduled appointment
- Appointment status: `scheduled`
- **Appointments are NOT queue items** - they are separate entities

### 2. **Patient Check-in** (On Appointment Day)
- Patient arrives at front desk
- Front desk staff locates appointment
- Clicks "Check In" button

### 3. **Automatic Process**
- **Appointment archived**: Status changes to `checked_in`
- **Queue item created**: Patient added to department queue
- **Audit log created**: Tracks the workflow action

### 4. **Result**
- **Appointment archived**: No longer active for consultation
- **Queue item active**: Only this remains for doctor consultation
- **Patient flow**: Now managed through queue system

## Features

### 1. Dashboard Overview
- **Stats Cards**: Shows counts for today's appointments, checked-in patients, active queue, and departments
- **Workflow Explanation**: Visual guide showing the appointment-to-queue process
- **Quick Actions**: Buttons for new patient registration and quick registration
- **Real-time Updates**: Automatically refreshes data when patients are checked in

### 2. Appointments Management
- **Today's Appointments**: Lists all scheduled appointments for the current date
- **Check-in Functionality**: One-click check-in for scheduled patients
- **Status Tracking**: Visual status badges (Scheduled, Checked In, Completed, Cancelled)
- **Department Filtering**: Filter appointments by department
- **Search**: Search patients by name or department

### 3. Queue Management
- **Active Queue**: Shows all patients currently waiting
- **Priority Levels**: Visual priority badges (Emergency, High, Medium, Low)
- **Wait Time Estimates**: Shows estimated wait times for each patient
- **Real-time Status**: Current queue status and patient flow

### 4. Workflow Integration
- **Appointment to Queue**: When a patient checks in, they're automatically added to the department queue
- **Status Updates**: Appointment status changes from 'scheduled' to 'checked_in' (archived)
- **Queue Creation**: New queue items are created with appointment references
- **Audit Logging**: All check-in actions are logged for compliance

## Setup Instructions

### 1. Database Schema Updates
Run the following SQL scripts in order:

```sql
-- Fix appointments table structure
\i fix_appointments_table.sql

-- Add sample data (optional, for testing)
\i sample_appointments_data.sql
```

### 2. Component Updates
The following components have been updated:
- `FrontDeskDashboard.tsx` - New main dashboard component with workflow explanation
- `WorkflowExplanation.tsx` - Visual workflow guide component
- `Home.tsx` - Updated to use dashboard as default view
- `Sidebar.tsx` - Added dashboard navigation option

### 3. Navigation Changes
- **Default View**: Front desk users now land on the dashboard instead of registration
- **New Menu Item**: "Dashboard" option added to sidebar navigation
- **Quick Access**: Easy switching between dashboard, registration, and other views

## Usage

### For Front Desk Staff

1. **Daily Overview**: Start each day by reviewing the dashboard stats and workflow explanation
2. **Patient Check-ins**: Use the "Check In" button for scheduled appointments
3. **Queue Monitoring**: Monitor active queue and patient wait times
4. **Quick Actions**: Use quick registration for walk-in patients

### Check-in Process

1. **Patient arrives** for scheduled appointment
2. **Front desk staff** locates appointment in "Today's Appointments" tab
3. **Click "Check In"** button
4. **System automatically**:
   - Archives the appointment (status = 'checked_in')
   - Adds patient to department queue
   - Creates audit log entry
5. **Patient appears** in "Active Queue" tab
6. **Original appointment** is archived and no longer active

### Queue Management

- **Priority Handling**: Emergency and high-priority patients appear first
- **Department Filtering**: Filter queue by specific departments
- **Wait Time Updates**: Monitor estimated wait times
- **Status Tracking**: Track patient progress through consultation

## Technical Details

### Database Tables Used
- `appointments` - Patient appointments with status tracking (archived after check-in)
- `queue` - Active patient queue with priority and status (only active items)
- `patients` - Patient information
- `departments` - Department information
- `audit_logs` - Workflow action logging

### Key Functions
- `handleCheckIn()` - Processes patient check-in, archives appointment, creates queue item
- `fetchDashboardData()` - Retrieves appointments and queue data
- `fetchDepartments()` - Gets available departments for filtering

### State Management
- Real-time data fetching with useEffect
- Local state for appointments, queue items, and filters
- Toast notifications for user feedback
- Automatic data refresh after check-in

## Workflow Benefits

### 1. **Clear Separation of Concerns**
- **Appointments**: Scheduling and check-in records
- **Queue Items**: Active patient flow for consultation

### 2. **Audit Trail**
- All check-in actions are logged
- Complete patient journey tracking
- Compliance and reporting capabilities

### 3. **Efficient Patient Flow**
- No duplicate entries between appointments and queue
- Clear status progression
- Department-specific queue management

### 4. **Data Integrity**
- Appointments remain as historical records
- Queue items represent current active state
- No confusion about patient status

## Troubleshooting

### Common Issues

1. **No Appointments Showing**
   - Check if appointments table has data for today
   - Verify department_id is properly set
   - Run the sample data script if needed

2. **Check-in Fails**
   - Ensure appointments table has required columns
   - Check database permissions
   - Verify foreign key constraints

3. **Queue Not Updating**
   - Check if queue table exists and has proper structure
   - Verify RLS policies allow insert operations
   - Check console for error messages

### Data Validation
- Appointments must have valid `patient_id` and `department_id`
- Queue items require proper priority and status values
- All foreign key relationships must be maintained
- Check-in process requires both appointment and queue operations

## Future Enhancements

- **Real-time Notifications**: WebSocket updates for queue changes
- **Advanced Filtering**: Date range, doctor-specific filters
- **Bulk Operations**: Check-in multiple patients at once
- **Reporting**: Daily/weekly appointment and queue statistics
- **Integration**: Connect with external scheduling systems
- **Workflow Automation**: Automatic queue management based on department capacity
