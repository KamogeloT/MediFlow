import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FrontDeskDashboard from '../FrontDeskDashboard';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null
      }))
    })),
    rpc: vi.fn(() => ({
      data: null,
      error: null
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock WorkflowExplanation component
vi.mock('../WorkflowExplanation', () => ({
  default: () => <div data-testid="workflow-explanation">Workflow Explanation</div>
}));

describe('FrontDeskDashboard', () => {
  const mockAppointments = [
    {
      id: '1',
      patient_id: 'patient-1',
      department_id: 'dept-1',
      patient_name: 'Sarah Johnson',
      department_name: 'Cardiology',
      appointment_date: '2024-01-15',
      appointment_time: '09:00',
      status: 'scheduled',
      status_name: 'Scheduled',
      reason: 'Heart checkup',
      created_at: '2024-01-15T09:00:00Z'
    }
  ];

  const mockQueueItems = [
    {
      id: '1',
      patient_id: 'patient-1',
      patient_name: 'Sarah Johnson',
      department_name: 'Cardiology',
      priority_id: 3,
      priority_code: 'normal',
      priority_name: 'Normal',
      priority_color: 'gray',
      wait_time_minutes: 30,
      status: 'waiting',
      estimated_wait_time: 30,
      added_at: '2024-01-15T09:00:00Z'
    }
  ];

  const mockDepartments = [
    { id: 'dept-1', name: 'Cardiology' },
    { id: 'dept-2', name: 'Neurology' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    const mockSupabase = supabase as any;
    
    // Mock appointments query
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'appointments_with_status') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: mockAppointments,
                error: null
              }))
            }))
          }))
        };
      }
      if (table === 'patients') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [{ id: 'patient-1', full_name: 'Sarah Johnson' }],
              error: null
            }))
          }))
        };
      }
      if (table === 'departments') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              data: mockDepartments,
              error: null
            }))
          }))
        };
      }
      if (table === 'queue_with_priority_details') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: mockQueueItems,
                  error: null
                }))
              }))
            }))
          }))
        };
      }
      if (table === 'queue') {
        return {
          insert: vi.fn(() => ({
            data: null,
            error: null
          }))
        };
      }
      return {
        select: vi.fn(() => ({
          data: [],
          error: null
        }))
      };
    });

    // Mock RPC call
    mockSupabase.rpc.mockImplementation(() => ({
      data: null,
      error: null
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dashboard header correctly', async () => {
    render(<FrontDeskDashboard />);
    
    expect(screen.getByText('Front Desk Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage appointments, check-ins, and patient flow')).toBeInTheDocument();
  });

  it('renders action buttons', async () => {
    render(<FrontDeskDashboard />);
    
    expect(screen.getByText('New Patient')).toBeInTheDocument();
    expect(screen.getByText('Quick Registration')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('renders stats cards', async () => {
    render(<FrontDeskDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
      expect(screen.getByText('Checked In')).toBeInTheDocument();
      expect(screen.getByText('Active Queue')).toBeInTheDocument();
      expect(screen.getByText('Departments')).toBeInTheDocument();
    });
  });

  it('renders search and filter section', async () => {
    render(<FrontDeskDashboard />);
    
    expect(screen.getByText('Search & Filter')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by patient name or department...')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
  });

  it('renders tabs for appointments and queue', async () => {
    render(<FrontDeskDashboard />);
    
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText('Active Queue')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<FrontDeskDashboard />);
    
    const searchInput = screen.getByPlaceholderText('Search by patient name or department...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(searchInput).toHaveValue('John');
  });

  it('handles department filter', async () => {
    render(<FrontDeskDashboard />);
    
    const departmentSelect = screen.getByDisplayValue('All Departments');
    fireEvent.change(departmentSelect, { target: { value: 'dept-1' } });
    
    expect(departmentSelect).toHaveValue('dept-1');
  });

  it('displays appointments when data is available', async () => {
    render(<FrontDeskDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
      expect(screen.getByText('Heart checkup')).toBeInTheDocument();
    });
  });

  it('displays queue items when data is available', async () => {
    render(<FrontDeskDashboard />);
    
    // Click on queue tab
    const queueTab = screen.getByText('Active Queue');
    fireEvent.click(queueTab);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
    });
  });

  it('shows check-in button for scheduled appointments', async () => {
    render(<FrontDeskDashboard />);
    
    await waitFor(() => {
      const checkInButton = screen.getByText('Check In');
      expect(checkInButton).toBeInTheDocument();
    });
  });

  it('handles check-in process', async () => {
    render(<FrontDeskDashboard />);
    
    await waitFor(() => {
      const checkInButton = screen.getByText('Check In');
      fireEvent.click(checkInButton);
    });
    
    // Verify that the RPC call was made
    expect(supabase.rpc).toHaveBeenCalledWith('update_appointment_status', {
      appointment_uuid: '1',
      new_status_code: 'checked_in',
      user_id: 'test-user-id'
    });
  });

  it('handles navigation to new patient view', async () => {
    render(<FrontDeskDashboard />);
    
    const newPatientButton = screen.getByText('New Patient');
    fireEvent.click(newPatientButton);
    
    expect(screen.getByText('New Patient Registration')).toBeInTheDocument();
    expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
  });

  it('handles navigation to quick registration view', async () => {
    render(<FrontDeskDashboard />);
    
    const quickRegButton = screen.getByText('Quick Registration');
    fireEvent.click(quickRegButton);
    
    expect(screen.getByText('Quick Registration')).toBeInTheDocument();
    expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
  });

  it('handles back navigation from other views', async () => {
    render(<FrontDeskDashboard />);
    
    // Navigate to new patient view
    const newPatientButton = screen.getByText('New Patient');
    fireEvent.click(newPatientButton);
    
    // Go back to dashboard
    const backButton = screen.getByText('← Back to Dashboard');
    fireEvent.click(backButton);
    
    // Should be back on dashboard
    expect(screen.getByText('Front Desk Dashboard')).toBeInTheDocument();
  });

  it('displays loading states', async () => {
    // Mock loading state by delaying the response
    const mockSupabase = supabase as any;
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => new Promise(resolve => 
            setTimeout(() => resolve({ data: [], error: null }), 100)
          ))
        }))
      }))
    }));

    render(<FrontDeskDashboard />);
    
    // Should show loading initially
    expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
  });

  it('handles empty states gracefully', async () => {
    // Mock empty data
    const mockSupabase = supabase as any;
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    }));

    render(<FrontDeskDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No appointments found for today')).toBeInTheDocument();
    });
  });

  it('maintains component state during interactions', async () => {
    render(<FrontDeskDashboard />);
    
    // Set search term
    const searchInput = screen.getByPlaceholderText('Search by patient name or department...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Navigate to different view
    const newPatientButton = screen.getByText('New Patient');
    fireEvent.click(newPatientButton);
    
    // Go back
    const backButton = screen.getByText('← Back to Dashboard');
    fireEvent.click(backButton);
    
    // Search term should still be there
    expect(searchInput).toHaveValue('test search');
  });
});
