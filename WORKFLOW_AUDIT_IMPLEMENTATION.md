# 🚀 Workflow and Audit Logging System Implementation

This document explains how to implement a comprehensive workflow and audit logging system for queue items created from the front desk.

## 📋 What This System Provides

### **1. Workflow Tracking**
- **Patient Journey**: Track each patient from registration to discharge
- **State Transitions**: Monitor status changes (queued → checked-in → consultation → completed)
- **Timeline**: Complete history of all patient interactions

### **2. Audit Logging**
- **User Actions**: Record who did what and when
- **Data Changes**: Track all modifications to queue items
- **Compliance**: Maintain detailed logs for regulatory requirements

### **3. Real-time Monitoring**
- **Live Updates**: See workflow changes as they happen
- **Performance Metrics**: Track department efficiency
- **Error Tracking**: Identify bottlenecks and issues

## 🗄️ Database Schema

### **Core Tables Created**

#### **`workflow_states`**
```sql
- id: Unique identifier
- queue_item_id: Links to queue item
- patient_id: Links to patient
- current_state: Current workflow state
- previous_state: Previous workflow state
- state_data: Additional context (JSON)
- transition_reason: Why state changed
- created_by: User who made the change
- created_at: Timestamp
```

#### **`audit_logs`**
```sql
- id: Unique identifier
- action_type: INSERT/UPDATE/DELETE
- table_name: Which table was affected
- record_id: Which record was affected
- old_values: Previous state (JSON)
- new_values: New state (JSON)
- user_id: Who made the change
- user_role: Role of the user
- user_department_id: Department of the user
- action_details: Additional context (JSON)
- created_at: Timestamp
```

#### **`patient_journey`**
```sql
- id: Unique identifier
- patient_id: Links to patient
- queue_item_id: Links to queue item
- event_type: Type of event
- event_description: Human-readable description
- event_data: Additional data (JSON)
- performed_by: User who performed action
- performed_by_role: Role of the user
- performed_by_department_id: Department
- timestamp: When it happened
```

## 🚀 Implementation Steps

### **Step 1: Run the Database Script**

1. Go to your **Supabase Dashboard → SQL Editor**
2. Copy and paste the entire `workflow_audit_logging.sql` script
3. Click **Run**
4. Verify success message: "Workflow and Audit Logging System created successfully!"

### **Step 2: Update Your Frontend Code**

The system automatically works with your existing code! When you:

- **Add a patient to queue** → Workflow state automatically created
- **Update queue status** → Workflow state automatically updated
- **Remove from queue** → Audit log automatically created

### **Step 3: Use the New Components**

#### **Display Workflow & Audit Logs**
```tsx
import WorkflowAuditPanel from "@/components/dashboard/WorkflowAuditPanel";

// For a specific queue item
<WorkflowAuditPanel 
  queueItemId="queue-item-uuid" 
  title="Patient Workflow"
/>

// For a specific patient
<WorkflowAuditPanel 
  patientId="patient-uuid" 
  title="Patient Journey"
/>
```

#### **Use Enhanced Queue Functions**
```tsx
import { addToQueueWithWorkflow, updateQueueStatusWithWorkflow } from "@/lib/workflow";

// Add to queue with automatic workflow logging
const queueItem = await addToQueueWithWorkflow({
  patient_name: "John Doe",
  priority: "high",
  department_id: "dept-uuid",
  is_walk_in: true
});

// Update status with workflow logging
await updateQueueStatusWithWorkflow(
  queueItem.id, 
  "in-consultation", 
  "doctor-uuid"
);
```

## 🔄 How It Works

### **Automatic Workflow Creation**
1. **Front desk adds patient to queue**
2. **Database trigger fires** → Creates workflow state
3. **Patient journey entry created** → Tracks the event
4. **Audit log created** → Records the action

### **Automatic State Updates**
1. **Queue status changes** (e.g., "waiting" → "in-consultation")
2. **Database trigger fires** → Updates workflow state
3. **New journey entry** → Shows the transition
4. **Audit log updated** → Records the change

### **Real-time Monitoring**
- **Workflow states** show current patient status
- **Patient journey** shows complete timeline
- **Audit logs** show all system changes

## 📊 Available Reports

### **Patient Workflow History**
```tsx
import { getPatientWorkflowHistory } from "@/lib/workflow";

const history = await getPatientWorkflowHistory("patient-uuid", 30);
// Returns: Array of workflow events for last 30 days
```

### **Queue Item Workflow**
```tsx
import { getQueueItemWorkflow } from "@/lib/workflow";

const workflow = await getQueueItemWorkflow("queue-item-uuid");
// Returns: Array of workflow states for the queue item
```

### **Audit Trail**
```tsx
import { getAuditTrail } from "@/lib/workflow";

const audit = await getAuditTrail("queue", "record-uuid", 30);
// Returns: Array of audit log entries for the last 30 days
```

### **Department Summary**
```tsx
import { getDepartmentWorkflowSummary } from "@/lib/workflow";

const summary = await getDepartmentWorkflowSummary("dept-uuid", 7);
// Returns: Department statistics for the last 7 days
```

## 🎯 Workflow States

The system tracks these workflow states:

| State | Description | Color |
|-------|-------------|-------|
| `registered` | Patient registered | Blue |
| `queued` | In queue | Yellow |
| `checked_in` | Checked in | Orange |
| `in_consultation` | In consultation | Purple |
| `consultation_completed` | Consultation done | Green |
| `prescribed` | Prescription given | Indigo |
| `referred` | Referred elsewhere | Pink |
| `discharged` | Patient discharged | Gray |

## 🔍 Monitoring & Analytics

### **Real-time Dashboard**
- **Current patients** in each workflow state
- **Department performance** metrics
- **Wait times** and bottlenecks
- **User activity** logs

### **Historical Analysis**
- **Patient flow** patterns
- **Department efficiency** trends
- **User productivity** metrics
- **Compliance** reporting

## 🛡️ Security & Compliance

### **Data Protection**
- **User authentication** required for all operations
- **Role-based access** control
- **Audit trail** for all changes
- **Data encryption** at rest and in transit

### **Compliance Features**
- **HIPAA compliance** ready
- **Audit trail** for regulatory requirements
- **User accountability** tracking
- **Data retention** policies

## 🚨 Troubleshooting

### **Common Issues**

#### **"Function not found" errors**
- Ensure you've run the SQL script completely
- Check that all functions were created successfully
- Verify database permissions

#### **No workflow data showing**
- Check that database triggers are active
- Verify queue items are being created
- Check console for error messages

#### **Permission denied errors**
- Ensure user has authenticated
- Check database role permissions
- Verify RLS policies are correct

### **Debug Mode**
Enable debug logging in your browser console:
```tsx
// Add this to see detailed workflow information
console.log('Workflow data:', workflowData);
console.log('Audit data:', auditData);
```

## 📈 Performance Considerations

### **Database Optimization**
- **Indexes** created for fast queries
- **Partitioning** support for large datasets
- **Cleanup jobs** for old audit logs

### **Frontend Optimization**
- **Lazy loading** of workflow data
- **Pagination** for large datasets
- **Caching** of frequently accessed data

## 🔮 Future Enhancements

### **Planned Features**
- **Email notifications** for workflow changes
- **SMS alerts** for urgent status updates
- **Mobile app** support
- **Advanced analytics** dashboard
- **Integration** with external systems

### **Customization Options**
- **Custom workflow states** for your needs
- **Department-specific** workflows
- **Role-based** workflow views
- **Custom audit** fields

## 📞 Support

If you encounter any issues:

1. **Check the console** for error messages
2. **Verify database** functions exist
3. **Test with simple** queue operations
4. **Review permissions** and RLS policies

## 🎉 Success!

Once implemented, you'll have:

✅ **Complete patient journey tracking**  
✅ **Automatic audit logging**  
✅ **Real-time workflow monitoring**  
✅ **Compliance-ready reporting**  
✅ **Performance analytics**  
✅ **User accountability**  

Your front desk operations will now have full visibility into every patient's journey through the system! 🚀
