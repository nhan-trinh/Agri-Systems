import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRPage from '../src/app/(dashboard)/qr/page';
import { apiClient } from '../src/lib/api/axios';
import { useAuthStore } from '../src/store/auth';

// Mock dependencies
jest.mock('../src/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockBatches = [
  {
    id: 'batch-1',
    batch_code: 'ZONE1-20260612-001',
    batch_name: 'Lô gạo ST25 Hè Thu',
    total_weight_kg: 5000,
    quantity_qr_requested: 100,
    packaging_unit: 'Bao 50kg',
    status: 'ACTIVE',
    checkvn_batch_id: 'cvn-123',
    created_at: '2026-06-12T00:00:00Z',
    season: {
      season_name: 'Vụ Hè Thu ST25',
      crop_variety: 'ST25',
      actual_yield_kg: 6000,
      farm_zone: {
        zone_name: 'Vùng trồng ST25 Tây Nam',
        farmer: { full_name: 'Nguyễn Văn A' },
      },
    },
  },
];

const mockSeasons = [
  {
    id: 'season-completed-1',
    season_name: 'Vụ Hè Thu ST25',
    crop_variety: 'ST25',
    actual_yield_kg: 6000,
    status: 'COMPLETED',
    batch: null,
    farm_zone: {
      zone_name: 'Vùng trồng ST25 Tây Nam',
      farm_zone_code: 'ZONE1',
    },
  },
];

describe('QR Management & Batch Platform Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'manager-123',
        phone: '0987654321',
        role: 'HTX_MANAGER',
        cooperativeId: 'coop-123',
        farmerId: null,
        zaloId: null,
        zaloName: 'HTX Manager Test',
        avatarUrl: null,
        isFirstLogin: false,
        isActive: true,
        lastLoginAt: null,
      },
      accessToken: 'token-123',
      isInitialized: true,
    });
    (apiClient.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/qr/batches/batch-1/qr-codes')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { id: 'qr-1', code: 'https://check.gov.vn/qr-1', status: 'ACTIVE', scan_count: 5 },
            ],
          },
        });
      }
      if (url.includes('/qr/batches')) {
        return Promise.resolve({ data: { success: true, data: mockBatches } });
      }
      if (url.includes('/seasons')) {
        return Promise.resolve({ data: { success: true, data: mockSeasons } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('Refers main title and lists batches', async () => {
    render(<QRPage />);
    expect(screen.getByText('Quản lý Lô Hàng & QR Code')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Lô gạo ST25 Hè Thu')).toBeInTheDocument();
      expect(screen.getByText('ZONE1-20260612-001')).toBeInTheDocument();
    });
  });

  it('Displays detailed view on batch selection', async () => {
    render(<QRPage />);
    
    await waitFor(() => {
      const batchItem = screen.getByText('Lô gạo ST25 Hè Thu');
      fireEvent.click(batchItem);
    });

    await waitFor(() => {
      expect(screen.getByText('Thông tin lô hàng')).toBeInTheDocument();
      expect(screen.getByText('Quy cách đóng gói')).toBeInTheDocument();
      expect(screen.getByText('Bao 50kg')).toBeInTheDocument();
    });
  });

  it('Open create modal and triggers validation on input error limit', async () => {
    render(<QRPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Lô gạo ST25 Hè Thu')).toBeInTheDocument();
    });

    const openBtn = screen.getByText('Khai Báo Lô Mới');
    fireEvent.click(openBtn);

    expect(screen.getByText('Khai báo Lô Hàng mới')).toBeInTheDocument();

    // Select completed season
    const selectSeason = screen.getAllByRole('combobox')[1];
    fireEvent.change(selectSeason, { target: { value: 'season-completed-1' } });

    // Set weight higher than actual_yield_kg (6000)
    const weightInput = screen.getByPlaceholderText('Khối lượng lô hàng');
    fireEvent.change(weightInput, { target: { value: '7000' } });

    const submitBtn = screen.getByRole('button', { name: 'Tạo Lô Hàng' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Khối lượng vượt quá sản lượng thu hoạch thực tế.*của vụ mùa/)).toBeInTheDocument();
    });
  });
});
