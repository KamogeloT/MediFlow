import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates a South African ID Number
 * @param idNumber - The 13-digit ID number to validate
 * @returns Object with validation result and any error messages
 */
export function validateSAIdNumber(idNumber: string): {
  isValid: boolean;
  error?: string;
  formatted?: string;
  dateOfBirth?: string;
} {
  // Remove any spaces or dashes
  const clean = idNumber.replace(/[\s-]/g, '');
  
  // Check if it's exactly 13 digits
  if (!/^\d{13}$/.test(clean)) {
    return {
      isValid: false,
      error: 'ID Number must be exactly 13 digits'
    };
  }
  
  // Extract date components from YYMMDD0000000 format
  const yearPart = parseInt(clean.substring(0, 2));
  const monthPart = parseInt(clean.substring(2, 4));
  const dayPart = parseInt(clean.substring(4, 6));
  
  // Convert 2-digit year to 4-digit year (assume 1900s for years 00-99)
  const fullYear = 1900 + yearPart;
  
  // Basic date validation
  if (monthPart < 1 || monthPart > 12) {
    return {
      isValid: false,
      error: `Invalid month in ID Number: ${monthPart}`
    };
  }
  
  if (dayPart < 1 || dayPart > 31) {
    return {
      isValid: false,
      error: `Invalid day in ID Number: ${dayPart}`
    };
  }
  
  // Try to create a valid date
  try {
    const dateOfBirth = new Date(fullYear, monthPart - 1, dayPart);
    
    // Check if the date is valid (handles edge cases like February 30th)
    if (dateOfBirth.getFullYear() !== fullYear || 
        dateOfBirth.getMonth() !== monthPart - 1 || 
        dateOfBirth.getDate() !== dayPart) {
      return {
        isValid: false,
        error: `Invalid date in ID Number: ${fullYear}-${monthPart.toString().padStart(2, '0')}-${dayPart.toString().padStart(2, '0')}`
      };
    }
    
    // Format the ID number for display (YY-MM-DD-0000-000)
    const formatted = `${clean.substring(0, 2)}-${clean.substring(2, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 12)}-${clean.substring(12)}`;
    
    // Format the date of birth
    const dobFormatted = dateOfBirth.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return {
      isValid: true,
      formatted,
      dateOfBirth: dobFormatted
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid date in ID Number: ${fullYear}-${monthPart.toString().padStart(2, '0')}-${dayPart.toString().padStart(2, '0')}`
    };
  }
}

/**
 * Formats a South African ID Number for display
 * @param idNumber - The raw ID number
 * @returns Formatted ID number with dashes
 */
export function formatSAIdNumber(idNumber: string): string {
  if (!idNumber || idNumber.length !== 13) {
    return idNumber;
  }
  
  return `${idNumber.substring(0, 4)}-${idNumber.substring(4, 6)}-${idNumber.substring(6, 8)}-${idNumber.substring(8, 12)}-${idNumber.substring(12)}`;
}
