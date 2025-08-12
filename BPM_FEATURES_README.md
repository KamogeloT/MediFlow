# MediFlow BPM Consultation System

## Overview

The Business Process Management (BPM) consultation system provides comprehensive workflow management for patient consultations, including session management, department routing, and complete audit logging.

## Features

### 1. Consultation Session Management
- **Start Consultation**: Initiate a new consultation session with comprehensive logging
- **Complete Session**: Finalize consultations with diagnosis, prescription, and follow-up details
- **Archive Consultation**: Store completed consultations for record keeping
- **Workflow States**: Track consultation progress through defined workflow states

### 2. Department Routing
- **Smart Routing**: Route patients to appropriate departments based on medical needs
- **Routing Rules**: Predefined rules for automatic department routing
- **Manual Routing**: Doctors can manually route patients with detailed reasoning
- **Queue Integration**: Seamlessly create new queue items in target departments

### 3. Comprehensive Audit Trail
- **Action Logging**: Every consultation action is logged with timestamps
- **User Tracking**: All actions are associated with the performing doctor
- **State Transitions**: Complete workflow state change history
- **Department Changes**: Track patient movement between departments

### 4. Department Isolation
- **Role-Based Access**: Doctors only see patients in their assigned department
- **Secure Data**: Row-level security ensures data privacy
- **Cross-Department Visibility**: Routing maintains patient history across departments

## Database Schema

### Core Tables

#### `consultation_sessions`
- Stores active and completed consultation sessions
- Links to queue items, patients, doctors, and departments
- Tracks consultation status, duration, and outcomes

#### `consultation_logs`
- Comprehensive audit trail of all consultation actions
- Includes action types, details, and metadata
- Supports JSONB for flexible action data storage

#### `consultation_workflow_states`
- Tracks workflow progression through consultation lifecycle
- Maintains state transition history with reasons
- Supports complex workflow state management

#### `department_routing_rules`
- Predefined routing rules between departments
- Configurable conditions and reasons for routing
- Supports both automatic and manual routing decisions

### Workflow States

1. **started** - Consultation session initiated
2. **in_progress** - Active consultation in progress
3. **examination** - Physical examination phase
4. **diagnosis** - Diagnosis and assessment phase
5. **prescription** - Treatment and prescription phase
6. **routing** - Patient being routed to another department
7. **completed** - Consultation successfully completed
8. **archived** - Consultation archived for record keeping

## API Functions

### Core Consultation Functions

#### `start_consultation(queue_item_id, doctor_id, notes)`
- Creates new consultation session
- Logs consultation start action
- Updates queue item status
- Returns session ID

#### `complete_consultation(queue_item_id, diagnosis, prescription, follow_up_required, follow_up_date, notes)`
- Finalizes consultation session
- Records diagnosis and prescription
- Calculates consultation duration
- Updates workflow state

#### `route_consultation(queue_item_id, new_department_id, routing_reason, notes)`
- Routes patient to new department
- Creates new queue item in target department
- Logs routing action with reasoning
- Maintains patient history

#### `archive_consultation(queue_item_id, archive_reason)`
- Archives completed consultations
- Maintains audit trail
- Supports record keeping requirements

### Query Functions

#### `getConsultationLogs(queue_item_id)`
- Retrieves complete audit trail for a consultation
- Includes all actions, timestamps, and metadata

#### `getConsultationWorkflowStates(session_id)`
- Returns workflow state progression
- Shows state transitions with reasons

#### `getDepartmentRoutingRules()`
- Lists available routing rules
- Supports routing decision making

## User Interface

### BPM Consultation Panel

The main consultation interface provides:

1. **Consultation Tab**
   - Patient information and visit reason
   - Consultation notes input
   - Diagnosis and prescription forms
   - Follow-up scheduling

2. **Workflow Tab**
   - Visual workflow state progression
   - State transition history
   - Current consultation status

3. **Routing Tab**
   - Available departments for routing
   - Routing rules and conditions
   - Manual routing interface

4. **Audit Logs Tab**
   - Complete action history
   - Detailed action metadata
   - User and timestamp information

### Queue Integration

- **Start Consultation**: Available for doctors on waiting patients
- **Continue Consultation**: Available for active consultations
- **Seamless Transition**: Direct access from queue to consultation panel
- **Status Updates**: Real-time queue status synchronization

## Security Features

### Row-Level Security (RLS)
- **Department Isolation**: Users only see data from their department
- **Role-Based Access**: Different permissions for doctors, nurses, and admins
- **Secure Functions**: Database functions run with proper security context

### Authentication
- **Session Validation**: All operations require valid authentication
- **User Tracking**: All actions are associated with authenticated users
- **Audit Compliance**: Complete trail for compliance requirements

## Usage Examples

### Starting a Consultation

```typescript
import { startConsultation } from '@/lib/consultations';

const sessionId = await startConsultation({
  queue_item_id: 'queue-item-uuid',
  doctor_id: 'doctor-uuid',
  notes: 'Initial consultation notes'
});
```

### Routing a Patient

```typescript
import { routeConsultation } from '@/lib/consultations';

await routeConsultation({
  queue_item_id: 'queue-item-uuid',
  new_department_id: 'cardiology-uuid',
  routing_reason: 'Cardiac symptoms detected',
  notes: 'Patient shows signs of heart condition'
});
```

### Completing a Consultation

```typescript
import { completeConsultation } from '@/lib/consultations';

await completeConsultation({
  queue_item_id: 'queue-item-uuid',
  diagnosis: 'Hypertension',
  prescription: 'Lisinopril 10mg daily',
  follow_up_required: true,
  follow_up_date: '2024-02-15',
  notes: 'Patient advised on lifestyle changes'
});
```

## Configuration

### Department Routing Rules

Default routing rules are automatically created for common scenarios:

- General Medicine → Cardiology (cardiac symptoms)
- General Medicine → Orthopedics (musculoskeletal issues)
- General Medicine → Surgery (surgical intervention)
- Emergency Medicine → Surgery (emergency procedures)

### Customization

Routing rules can be customized through the database:

```sql
INSERT INTO department_routing_rules (
  from_department_id, 
  to_department_id, 
  routing_condition, 
  routing_reason
) VALUES (
  'dept-uuid', 
  'target-dept-uuid', 
  'custom_condition', 
  'Custom routing reason'
);
```

## Migration

To set up the BPM system, run the migration:

```bash
# Apply the BPM migration
psql -d your_database -f supabase/migrations/20240611000000_create_consultation_bpm_system.sql
```

## Benefits

1. **Improved Patient Care**: Structured workflow ensures consistent care delivery
2. **Better Coordination**: Seamless department routing improves patient flow
3. **Compliance**: Complete audit trail meets regulatory requirements
4. **Efficiency**: Automated routing rules reduce manual decision making
5. **Data Quality**: Structured data capture improves medical record quality
6. **Analytics**: Rich data supports process improvement and analytics

## Future Enhancements

- **AI-Powered Routing**: Machine learning for automatic routing decisions
- **Workflow Automation**: Automated task assignment and reminders
- **Integration**: Connect with external medical systems
- **Mobile Support**: Mobile-optimized consultation interface
- **Advanced Analytics**: Process mining and performance metrics
