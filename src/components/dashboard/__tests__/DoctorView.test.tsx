import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DoctorView from '../DoctorView';
import { useAuth } from '@/lib/auth';
import { fetchQueueByDoctor } from '@/lib/queue';
import { getCurrentDoctorProfile } from '@/lib/consultations';

// Mock the auth hook
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn()
}));

// Mock the queue functions
vi.mock('@/lib/queue', () => ({
  fetchQueueByDoctor: vi.fn()
}));

// Mock the consultations functions
vi.mock('@/lib/consultations', () => ({
  getCurrentDoctorProfile: vi.fn()
}));

// Mock WorkflowAuditPanel component
vi.mock('../WorkflowAuditPanel', () => ({
  default: ({ queueItemId, title }: { queueItemId: string; title: string }) => (
    <div data-testid="workflow-audit-panel">
      {title}: {queueItemId}
    </div>
  )
}));

describe('DoctorView', () => {
  const mockUser = {
    id: 'doctor-123',
    email: 'doctor@example.com',
    role: 'doctor'
  };

  const mockDoctorProfile = {
    id: 'doctor-123',
    full_name: 'Dr. Sarah Johnson',
    department_id: 'dept-1',
    department_name: 'Cardiology'
  };

  const mockQueueItems = [
    {
      id: 'queue-1',
      patient_id: 'patient-1',
      patient_name: 'Sarah Johnson',
      status: 'waiting',
      priority_id: 3,
      priority_code: 'normal',
      priority_name: 'Normal',
      priority_color: 'gray',
      wait_time_minutes: 30,
      added_at: '2024-01-15T09:00:00Z',
      department_id: 'dept-1',
      department_name: 'Cardiology',
      estimated_wait_time: 30
    }
  ];

  // Helper function to click on a queue item
  const clickQueueItem = () => {
    // Find the queue item by looking for the text within the queue section
    const queueSection = screen.getByText('Patient Queue').closest('div');
    if (queueSection) {
      const queueItem = queueSection.querySelector('div[class*="cursor-pointer"]');
      if (queueItem) {
        fireEvent.click(queueItem);
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (useAuth as any).mockReturnValue({ user: mockUser });
    (getCurrentDoctorProfile as any).mockResolvedValue(mockDoctorProfile);
    (fetchQueueByDoctor as any).mockResolvedValue(mockQueueItems);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders doctor view with user information', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
    });
  });

  it('loads and displays queue items', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
    });
  });

  it('handles queue item selection', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      expect(screen.getByText('No Patient Selected')).not.toBeInTheDocument();
    });
  });

  it('displays patient workspace when queue item is selected', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      expect(screen.getByText('Consultation')).toBeInTheDocument();
      expect(screen.getByText('Billing')).toBeInTheDocument();
      expect(screen.getByText('Workflow')).toBeInTheDocument();
      expect(screen.getByText('Routing')).toBeInTheDocument();
    });
  });

  it('handles refresh queue button click', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Refresh Queue')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh Queue');
    fireEvent.click(refreshButton);

    expect(fetchQueueByDoctor).toHaveBeenCalledWith('doctor-123');
  });

  it('handles start consultation button click', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Consultation')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start Consultation');
    fireEvent.click(startButton);

    // This button should trigger consultation start logic
    // We'll need to implement the actual functionality
  });

  it('handles check in button click', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const checkInButton = screen.getByText('Check In');
      expect(checkInButton).toBeInTheDocument();
    });

    const checkInButton = screen.getByText('Check In');
    fireEvent.click(checkInButton);

    // This button should trigger check-in logic
    // We'll need to implement the actual functionality
  });

  it('handles start button click for selected patient', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const startButton = screen.getByText('Start');
      expect(startButton).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    // This button should trigger consultation start for the selected patient
    // We'll need to implement the actual functionality
  });

  it('handles search functionality', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search patients, MRN, visit no…')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search patients, MRN, visit no…');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(searchInput).toHaveValue('John');
  });

  it('handles department filter checkbox', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Only my departments')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText('Only my departments');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('handles consultation notes input', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter detailed consultation notes here…')).toBeInTheDocument();
    });

    const notesTextarea = screen.getByPlaceholderText('Enter detailed consultation notes here…');
    fireEvent.change(notesTextarea, { target: { value: 'Patient shows improvement' } });

    expect(notesTextarea).toHaveValue('Patient shows improvement');
  });

  it('handles vitals input', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('BP')).toBeInTheDocument();
    });

    const bpInput = screen.getByPlaceholderText('BP');
    fireEvent.change(bpInput, { target: { value: '120/80' } });

    expect(bpInput).toHaveValue('120/80');
  });

  it('handles reason for visit input', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter reason for visit')).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText('Enter reason for visit');
    fireEvent.change(reasonInput, { target: { value: 'Follow-up appointment' } });

    expect(reasonInput).toHaveValue('Follow-up appointment');
  });

  it('handles billing service addition', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    // Navigate to billing tab
    const billingTab = screen.getByText('Billing');
    fireEvent.click(billingTab);

    await waitFor(() => {
      const addButton = screen.getByText('Add');
      expect(addButton).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    // This should add the service to the invoice
    // We'll need to implement the actual functionality
  });

  it('handles invoice finalization', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    // Navigate to billing tab
    const billingTab = screen.getByText('Billing');
    fireEvent.click(billingTab);

    // Add a service first
    await waitFor(() => {
      const addButton = screen.getByText('Add');
      expect(addButton).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    // Now finalize the invoice
    await waitFor(() => {
      const finalizeButton = screen.getByText('Finalize Invoice');
      expect(finalizeButton).toBeInTheDocument();
    });

    const finalizeButton = screen.getByText('Finalize Invoice');
    fireEvent.click(finalizeButton);

    // This should finalize the invoice
    // We'll need to implement the actual functionality
  });

  it('handles routing functionality', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    // Navigate to routing tab
    const routingTab = screen.getByText('Routing');
    fireEvent.click(routingTab);

    await waitFor(() => {
      const routeButton = screen.getByText('Route Patient');
      expect(routeButton).toBeInTheDocument();
    });

    const routeButton = screen.getByText('Route Patient');
    fireEvent.click(routeButton);

    // This should route the patient
    // We'll need to implement the actual functionality
  });

  it('handles save and continue button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const saveButton = screen.getByText('Save & Continue');
      expect(saveButton).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save & Continue');
    fireEvent.click(saveButton);

    // This button should save the current consultation state
    // We'll need to implement the actual functionality
  });

  it('handles discard button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const discardButton = screen.getByText('Discard');
      expect(discardButton).toBeInTheDocument();
    });

    const discardButton = screen.getByText('Discard');
    fireEvent.click(discardButton);

    // This button should discard unsaved changes
    // We'll need to implement the actual functionality
  });

  it('handles upload button click', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const uploadButton = screen.getByText('Upload');
      expect(uploadButton).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    // This button should open file upload dialog
    // We'll need to implement the actual functionality
  });

  it('handles open attachment buttons', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const openButtons = screen.getAllByText('Open');
      expect(openButtons.length).toBeGreaterThan(0);
    });

    const openButtons = screen.getAllByText('Open');
    fireEvent.click(openButtons[0]);

    // This button should open the attachment
    // We'll need to implement the actual functionality
  });

  it('handles relink to queue button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const relinkButton = screen.getByText('Relink to Queue');
      expect(relinkButton).toBeInTheDocument();
    });

    const relinkButton = screen.getByText('Relink to Queue');
    fireEvent.click(relinkButton);

    // This button should relink the patient to the queue
    // We'll need to implement the actual functionality
  });

  it('handles view audit log button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const auditButton = screen.getByText('View Audit Log');
      expect(auditButton).toBeInTheDocument();
    });

    const auditButton = screen.getByText('View Audit Log');
    fireEvent.click(auditButton);

    // This button should show the audit log
    // We'll need to implement the actual functionality
  });

  it('handles create invoice button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    // Navigate to billing tab
    const billingTab = screen.getByText('Billing');
    fireEvent.click(billingTab);

    // Add a service first
    await waitFor(() => {
      const addButton = screen.getByText('Add');
      expect(addButton).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    // Now finalize the invoice
    await waitFor(() => {
      const createButton = screen.getByText('Create Invoice');
      expect(createButton).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Invoice');
    fireEvent.click(createButton);

    // This button should create a new invoice
    // We'll need to implement the actual functionality
  });

  it('handles view details button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    // Navigate to billing tab
    const billingTab = screen.getByText('Billing');
    fireEvent.click(billingTab);

    // Add a service first to show the view details button
    await waitFor(() => {
      const addButton = screen.getByText('Add');
      expect(addButton).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    await waitFor(() => {
      const viewDetailsButton = screen.getByText('View Details');
      expect(viewDetailsButton).toBeInTheDocument();
    });

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    // This button should show invoice details
    // We'll need to implement the actual functionality
  });

  it('handles save draft button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    // Navigate to routing tab
    const routingTab = screen.getByText('Routing');
    fireEvent.click(routingTab);

    await waitFor(() => {
      const saveDraftButton = screen.getByText('Save Draft');
      expect(saveDraftButton).toBeInTheDocument();
    });

    const saveDraftButton = screen.getByText('Save Draft');
    fireEvent.click(saveDraftButton);

    // This button should save the routing as a draft
    // We'll need to implement the actual functionality
  });

  it('handles manage billing button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const manageBillingButton = screen.getByText('Manage Billing');
      expect(manageBillingButton).toBeInTheDocument();
    });

    const manageBillingButton = screen.getByText('Manage Billing');
    fireEvent.click(manageBillingButton);

    // This button should navigate to the billing tab
    // We'll need to implement the actual functionality
  });

  it('handles start billing button', async () => {
    render(<DoctorView />);
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    clickQueueItem();

    await waitFor(() => {
      const startBillingButton = screen.getByText('Start Billing');
      expect(startBillingButton).toBeInTheDocument();
    });

    const startBillingButton = screen.getByText('Start Billing');
    fireEvent.click(startBillingButton);

    // This button should navigate to the billing tab
    // We'll need to implement the actual functionality
  });
});
