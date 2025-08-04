import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { z } from 'zod';

const mockToast = vi.fn();

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/patient', () => {
  const patientSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dob: z.string().min(1, 'Date of birth is required'),
    gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
    address: z.string().optional(),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email').optional(),
    allergies: z.string().optional(),
    medications: z.string().optional(),
    bloodType: z.string().optional(),
    emergencyName: z.string().optional(),
    emergencyRelation: z.string().optional(),
    emergencyPhone: z.string().optional(),
  });
  return { patientSchema, createPatient: vi.fn() };
});

import PatientRegistration from '../PatientRegistration';
import { createPatient } from '@/lib/patient';

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe('PatientRegistration', () => {
  it('shows validation errors for required fields and prevents submission', async () => {
    const onSubmit = vi.fn();
    render(<PatientRegistration onSubmit={onSubmit} />);

    const forms = document.querySelectorAll('form');
    fireEvent.submit(forms[forms.length - 1]);

    expect(await screen.findByText(/First name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(createPatient).not.toHaveBeenCalled();
  });

  it('submits valid data and shows success toast', async () => {
    const onSubmit = vi.fn();
    const mockedCreate = createPatient as unknown as vi.Mock;
    mockedCreate.mockResolvedValueOnce(undefined);

    render(
      <PatientRegistration
        onSubmit={onSubmit}
        initialData={{ firstName: 'John', lastName: 'Doe', dob: '1990-01-01', gender: 'male', phone: '1234567890' }}
      />
    );

    const forms = document.querySelectorAll('form');
    fireEvent.submit(forms[forms.length - 1]);

    expect(onSubmit).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Patient registered' }));
  });

  it('shows error toast when backend fails', async () => {
    const onSubmit = vi.fn();
    const mockedCreate = createPatient as unknown as vi.Mock;
    mockedCreate.mockRejectedValueOnce(new Error('fail'));

    render(
      <PatientRegistration
        onSubmit={onSubmit}
        initialData={{ firstName: 'John', lastName: 'Doe', dob: '1990-01-01', gender: 'male', phone: '1234567890' }}
      />
    );

    const forms = document.querySelectorAll('form');
    fireEvent.submit(forms[forms.length - 1]);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Registration failed', variant: 'destructive' })
    );
  });
});
