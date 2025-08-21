# Priority Lookup System Migration

## 🎯 **Overview**

This migration converts the MediFlow system from **hardcoded priority values** to a **flexible priority lookup table system**, similar to the appointment status system already implemented.

## 🔄 **What Changed**

### **Before (Hardcoded):**
- Priority values: `'low'`, `'normal'`, `'high'`, `'urgent'` (hardcoded in database constraints)
- Frontend components had hardcoded Select options
- Business logic used hardcoded wait times and colors
- No flexibility to add/modify priority levels

### **After (Lookup Table):**
- **`queue_priorities`** table with configurable priority definitions
- Dynamic priority management through database
- Flexible wait times, colors, and descriptions per priority
- Easy to add/remove/modify priority levels without code changes

## 🗄️ **Database Changes**

### **1. New Table: `queue_priorities`**
```sql
CREATE TABLE queue_priorities (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,        -- 'urgent', 'high', 'normal', 'low'
    name VARCHAR(100) NOT NULL,              -- 'Urgent', 'High', 'Normal', 'Low'
    description TEXT,                         -- 'Emergency cases - immediate attention'
    wait_time_minutes INTEGER DEFAULT 30,    -- 0, 15, 30, 45
    color VARCHAR(20) DEFAULT 'gray',        -- 'red', 'blue', 'gray', 'white'
    sort_order INTEGER DEFAULT 0,            -- 1, 2, 3, 4
    is_active BOOLEAN DEFAULT true
);
```

### **2. Updated Table: `queue`**
- **Removed:** `priority` text column
- **Added:** `priority_id` integer column (foreign key to `queue_priorities.id`)
- **Added:** Foreign key constraint `fk_queue_priority_id`

### **3. New View: `queue_with_priority_details`**
- Provides backward compatibility
- Joins queue with priority details
- Includes all priority information (code, name, color, wait time)

### **4. New Functions:**
- `get_queue_priority_id(priority_code)` - Convert code to ID
- `get_queue_priority_code(priority_id)` - Convert ID to code
- Updated `get_queue_by_doctor_departments()` function

## 🚀 **Migration Steps**

### **Step 1: Run the Migration Script**
```sql
-- Execute this in Supabase SQL Editor
\i migrate_to_priority_lookup_system.sql
```

### **Step 2: Verify Migration**
```sql
-- Run the test script
\i test_priority_system.sql
```

## 🔧 **Frontend Updates**

### **1. Updated Interfaces:**
```typescript
// Before
interface QueueItem {
  priority: "low" | "normal" | "high" | "urgent";
}

// After
interface QueueItem {
  priority_id: number;
  priority_code: string;
  priority_name: string;
  priority_color: string;
  wait_time_minutes: number;
}
```

### **2. Updated Components:**
- **`FrontDeskDashboard.tsx`** - Uses `queue_with_priority_details` view
- **`AddToQueueModal.tsx`** - Sends `priority_code` instead of `priority`
- **`QueuePage.tsx`** - Updated to use new priority system
- **`PatientRegistration.tsx`** - Updated to use new priority system

### **3. New Helper Functions:**
```typescript
// Get priority ID from code
const priorityId = await getPriorityId('urgent'); // Returns 1

// Get priority code from ID
const priorityCode = await getPriorityCode(1); // Returns 'urgent'

// Get all active priorities
const priorities = await getActivePriorities();
```

## 📊 **Priority Configuration**

| ID | Code   | Name   | Description                           | Wait Time | Color | Sort Order |
|----|--------|--------|---------------------------------------|-----------|-------|------------|
| 1  | urgent | Urgent | Emergency cases - immediate attention | 0 min     | red   | 1          |
| 2  | high   | High   | High priority cases                   | 15 min    | blue  | 2          |
| 3  | normal | Normal | Standard priority cases               | 30 min    | gray  | 3          |
| 4  | low    | Low    | Low priority cases                    | 45 min    | white | 4          |

## 🎨 **Benefits**

### **1. Flexibility:**
- Add new priority levels without code changes
- Modify wait times, colors, and descriptions dynamically
- Deactivate priority levels temporarily

### **2. Consistency:**
- Single source of truth for priority definitions
- Consistent behavior across all components
- Easy to maintain and update

### **3. Scalability:**
- Support for priority-specific configurations
- Easy to add priority-based business rules
- Future enhancements (e.g., priority-based routing)

### **4. Maintainability:**
- No more hardcoded values scattered throughout code
- Centralized priority management
- Easy to debug and modify

## 🔍 **Usage Examples**

### **Adding a New Priority:**
```sql
INSERT INTO queue_priorities (code, name, description, wait_time_minutes, color, sort_order) 
VALUES ('critical', 'Critical', 'Life-threatening cases', 0, 'red', 0);
```

### **Modifying Wait Time:**
```sql
UPDATE queue_priorities 
SET wait_time_minutes = 60 
WHERE code = 'low';
```

### **Deactivating a Priority:**
```sql
UPDATE queue_priorities 
SET is_active = false 
WHERE code = 'low';
```

## 🚨 **Breaking Changes**

### **1. Database Schema:**
- `queue.priority` column removed
- New `queue.priority_id` column required
- Foreign key constraint enforced

### **2. Frontend Code:**
- Components must use `priority_code` instead of `priority`
- Queue item interfaces updated
- Priority display logic changed

### **3. API Calls:**
- `addToQueue` now expects `priority_code` instead of `priority`
- Queue queries return priority details from lookup table

## 🔧 **Rollback Plan**

If issues arise, you can rollback by:

1. **Restore old priority column:**
```sql
ALTER TABLE queue ADD COLUMN priority TEXT;
UPDATE queue SET priority = 
  CASE priority_id 
    WHEN 1 THEN 'urgent'
    WHEN 2 THEN 'high' 
    WHEN 3 THEN 'normal'
    WHEN 4 THEN 'low'
    ELSE 'normal'
  END;
```

2. **Drop new columns and constraints:**
```sql
ALTER TABLE queue DROP CONSTRAINT fk_queue_priority_id;
ALTER TABLE queue DROP COLUMN priority_id;
```

3. **Restore old CHECK constraint:**
```sql
ALTER TABLE queue ADD CONSTRAINT queue_priority_check 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
```

## ✅ **Verification Checklist**

- [ ] Migration script runs without errors
- [ ] `queue_priorities` table created with data
- [ ] `queue` table updated with `priority_id` column
- [ ] Foreign key constraint created
- [ ] `queue_with_priority_details` view works
- [ ] Priority lookup functions work
- [ ] Frontend components updated
- [ ] Queue operations work with new system
- [ ] Priority badges display correctly
- [ ] Test script passes all checks

## 🎉 **Next Steps**

After successful migration:

1. **Monitor system performance** with new priority system
2. **Consider adding priority-based features** (routing, notifications)
3. **Implement priority analytics** and reporting
4. **Add priority-based business rules** and workflows

## 📞 **Support**

If you encounter issues during migration:

1. Check the test script output for specific errors
2. Verify database permissions and RLS policies
3. Check frontend console for TypeScript errors
4. Review the rollback plan if needed

---

**Migration completed successfully! 🚀**

Your MediFlow system now has a flexible, maintainable priority management system that will make future enhancements much easier.
