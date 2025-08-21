# South African ID Number Feature

## Overview
This feature adds South African ID Number support to the patient management system. The SA ID Number is a unique 13-digit identifier for every South African citizen and is now the primary way to identify and search for patients.

**Note**: The validation now extracts and validates the date of birth from the ID number format YYMMDD0000000, while maintaining simple validation rules.

## Features

### 1. **Required Field in Patient Registration**
- SA ID Number is now a **required field** when creating new patients
- Real-time validation with immediate feedback
- **Format**: YYMMDD0000000 (13 digits)
  - **YY** = Year (last 2 digits of birth year, e.g., 90 = 1990)
  - **MM** = Month (01-12, e.g., 01 = January)
  - **DD** = Day (01-31, e.g., 09 = 9th)
  - **0000000** = Generic identifier digits

### 2. **Enhanced Search Functionality**
- **Primary Search Method**: Search by SA ID Number (exact match gets highest priority)
- **Secondary Search**: Search by name, email, or phone
- **Smart Ranking**: Results are automatically sorted by relevance

### 3. **Database Validation**
- **Format Validation**: Ensures exactly 13 digits
- **Date Validation**: Extracts and validates date of birth from YYMMDD format
- **Uniqueness**: Each ID number can only be used once

### 4. **User Interface Improvements**
- **Prominent Display**: SA ID Number is prominently shown in patient cards
- **Formatted Display**: ID numbers are formatted as YY-MM-DD-0000-000 for readability
- **Date Extraction**: Automatically displays extracted date of birth during validation
- **Validation Feedback**: Real-time validation with color-coded messages

## Database Changes

### New Column
```sql
ALTER TABLE public.patients 
ADD COLUMN sa_id_number VARCHAR(13) UNIQUE;
```

### New Functions
- `validate_sa_id_number(id_number)` - Database-level validation with date extraction
- `extract_dob_from_sa_id(id_number)` - Extracts date of birth from ID number
- `get_dob_from_sa_id(id_number)` - Gets date of birth from ID number
- `search_patients_by_id_number(search_id)` - Fast ID number lookup

### New Constraints
- **Unique Constraint**: Prevents duplicate ID numbers
- **Format Constraint**: Ensures 13-digit format with valid date
- **Trigger**: Automatically validates ID numbers on insert/update

## Frontend Changes

### Patient Interface
```typescript
export interface Patient {
  id: string;
  full_name: string;
  sa_id_number?: string; // New field
  email?: string;
  phone?: string;
  // ... other fields
}
```

### Search Function
```typescript
// Enhanced search with ID number priority
export async function searchPatients(query: string): Promise<Patient[]>
```

### Validation Utility
```typescript
// Frontend validation function with date extraction
export function validateSAIdNumber(idNumber: string): {
  isValid: boolean;
  error?: string;
  formatted?: string;
  dateOfBirth?: string; // New: extracted date of birth
}
```

## Usage Examples

### 1. **Patient Registration**
```typescript
// The SA ID Number field is now required
const patient = await createPatient({ 
  full_name: "John Doe",
  sa_id_number: "9001095679089" // Required field
});

// This ID number represents:
// 90 = 1990 (birth year)
// 01 = January (birth month)
// 09 = 9th (birth day)
// 5679089 = Generic identifier
```

### 2. **Patient Search**
```typescript
// Search by ID number (highest priority)
const results = await searchPatients("9001095679089");

// Search by name (secondary priority)
const results = await searchPatients("John Doe");
```

### 3. **Validation with Date Extraction**
```typescript
// Real-time validation with date extraction
const validation = validateSAIdNumber("9001095679089");
if (validation.isValid) {
  console.log("Valid ID:", validation.formatted); // "90-01-09-567908-9"
  console.log("Date of Birth:", validation.dateOfBirth); // "09/01/1990"
} else {
  console.log("Error:", validation.error);
}
```

## Implementation Steps

### 1. **Database Setup**
Run the migration script:
```bash
# Execute in Supabase SQL Editor
\i add_sa_id_number_field.sql
```

### 2. **Frontend Updates**
- ✅ Patient interface updated
- ✅ PatientRegistration form enhanced with date extraction
- ✅ Search functionality improved
- ✅ Patient display updated
- ✅ Validation utilities added with date extraction

### 3. **Testing**
- Test patient creation with valid ID numbers
- Test date extraction (e.g., "9001095679089" → "09/01/1990")
- Test search functionality with ID numbers
- Test validation with invalid ID numbers
- Test duplicate ID number prevention

## Benefits

### 1. **Unique Patient Identification**
- No more duplicate patient records
- Reliable patient lookup system
- Better data integrity

### 2. **Improved Search Experience**
- Faster patient finding
- More accurate results
- Better user experience

### 3. **Automatic Date Extraction**
- Date of birth automatically extracted from ID number
- Reduces manual data entry errors
- Ensures data consistency

### 4. **Compliance**
- Follows South African healthcare standards
- Meets regulatory requirements
- Industry best practice

## Validation Rules

### 1. **Format Requirements**
- Exactly 13 digits
- No spaces or special characters
- Numeric only

### 2. **Date Validation**
- **Year**: Extracted from first 2 digits (YY) → 1900 + YY
- **Month**: Must be 01-12
- **Day**: Must be 01-31
- **Valid Date**: Must be a real calendar date

### 3. **Examples**
- `9001095679089` → 1990-01-09 ✅
- `8001015009087` → 1980-01-01 ✅
- `9503151234567` → 1995-03-15 ✅
- `9902321234567` → 1999-02-32 ❌ (Invalid date)

## Error Handling

### 1. **Validation Errors**
- Format errors (wrong length, non-numeric)
- Date errors (invalid month, day, or impossible date)
- Database constraint violations

### 2. **Database Errors**
- Duplicate ID number
- Constraint violations
- Trigger validation failures

### 3. **User Feedback**
- Real-time validation messages
- Color-coded feedback (green/red/blue)
- Clear error descriptions
- Date of birth display when valid

## Future Enhancements

### 1. **Additional Validation**
- Gender validation from ID number
- Citizenship validation
- Province validation
- Age range validation

### 2. **Bulk Operations**
- Bulk patient import with ID validation
- Batch validation tools
- Data migration utilities

### 3. **Reporting**
- ID number usage statistics
- Validation failure reports
- Duplicate detection reports
- Age distribution reports

## Troubleshooting

### Common Issues

1. **"Invalid ID Number Format"**
   - Ensure exactly 13 digits
   - Remove any spaces or dashes
   - Check for non-numeric characters

2. **"Invalid date in ID Number"**
   - Check month (01-12)
   - Check day (01-31)
   - Verify the date actually exists (e.g., February 30th is invalid)

3. **"Duplicate ID Number"**
   - ID number already exists in system
   - Check if patient was previously registered
   - Use search to find existing patient

4. **"Validation Failed"**
   - Ensure ID number follows YYMMDD0000000 format
   - Verify date components are valid
   - Check for impossible dates

### Support
For technical issues or questions about this feature, refer to the database migration script and frontend implementation details above.
