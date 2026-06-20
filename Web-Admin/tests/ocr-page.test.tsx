import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OCRPage from '../src/app/(dashboard)/ocr/page';
import { apiClient } from '../src/lib/api/axios';

// Mock Axios API Client
jest.mock('../src/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockSeasons = [
  {
    id: 'season-1',
    season_name: 'Vụ lúa Chiêm Xuân 2026',
    farm_zone: { zone_name: 'Khu A' },
    status: 'ACTIVE',
  },
];

const mockMaterials = [
  { id: 'mat-1', material_name: 'Phân NPK 16-16-8', unit: 'Bao 50kg' },
];

const mockFarmers = [
  { id: 'farmer-1', full_name: 'Nguyễn Văn A', farmer_code: 'HTX-001' },
];

const mockBatches = [
  {
    batch_id: 'batch-101',
    status: 'AWAITING_REVIEW',
    total_files: 2,
    processed_files: 1,
    failed_files: 0,
    created_at: '2026-06-20T12:00:00Z',
    documents: [
      {
        document_id: 'doc-123',
        filename: 'invoice_npk.jpg',
        status: 'AWAITING_REVIEW',
        document_type: 'MATERIAL_INVOICE',
      },
      {
        document_id: 'doc-124',
        filename: 'logbook_rice.pdf',
        status: 'CONFIRMED',
        document_type: 'FARMING_LOGBOOK',
      },
    ],
  },
];

const mockDocumentReview = {
  document: {
    id: 'doc-123',
    document_type: 'MATERIAL_INVOICE',
    status: 'AWAITING_REVIEW',
    original_filename: 'invoice_npk.jpg',
    mime_type: 'image/jpeg',
    file_preview_url: 'http://localhost/uploads/invoice_npk.jpg',
    raw_ocr_text: 'Hóa đơn mua phân bón NPK 100kg...',
  },
  draft_records: [
    {
      id: 'draft-99',
      target_entity: 'WAREHOUSE_TRANSACTION',
      status: 'DRAFT',
      ai_normalized_data: {
        transaction_type: 'IMPORT',
        material_id: 'mat-1',
        quantity: 2,
        transaction_date: '2026-06-20T00:00:00Z',
        supplier: 'Công ty TakaTech',
        invoice_no: 'HD-9988',
        unit_price: 500000,
        notes: 'Nhập kho phân bón',
      },
      confirmed_data: null,
      validation_errors: [],
      confidence_score: 0.95,
      official_record_id: null,
    },
  ],
};

describe('OCR Module Integrated Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup API mocks
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/seasons')) {
        return Promise.resolve({ data: { success: true, data: mockSeasons } });
      }
      if (url.includes('/warehouse/materials')) {
        return Promise.resolve({ data: { success: true, data: mockMaterials } });
      }
      if (url.includes('/farmers')) {
        return Promise.resolve({ data: { success: true, data: mockFarmers } });
      }
      if (url.includes('/ocr/batches')) {
        return Promise.resolve({ data: { success: true, data: mockBatches, meta: { total_pages: 1 } } });
      }
      if (url.includes('/ocr/documents/doc-123/review')) {
        return Promise.resolve({ data: { success: true, data: mockDocumentReview } });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    (apiClient.patch as jest.Mock).mockResolvedValue({ data: { success: true, data: { validation_errors: [] } } });
  });

  it('renders default Upload Tab, changes configurations, and submits', async () => {
    render(<OCRPage />);
    
    // Check main headers
    expect(screen.getByText('Số hóa tài liệu (OCR)')).toBeInTheDocument();
    expect(screen.getByText('Tải lên tài liệu')).toBeInTheDocument();

    // Select FARMING_LOGBOOK document hint
    const hintSelect = screen.getByLabelText('Loại tài liệu gốc (Hint)');
    fireEvent.change(hintSelect, { target: { value: 'FARMING_LOGBOOK' } });

    // Wait for season dropdown to appear and populate
    await waitFor(() => {
      expect(screen.getByLabelText('Vụ mùa tương ứng')).toBeInTheDocument();
    });
    
    expect(apiClient.get).toHaveBeenCalledWith('/seasons');
  });

  it('toggles to History Tab, expands batch list, and opens Review Panel', async () => {
    render(<OCRPage />);

    // Switch to history tab
    fireEvent.click(screen.getByText('Lịch sử lô quét'));

    // Wait for batches to load
    await waitFor(() => {
      expect(screen.getByText('batch-101')).toBeInTheDocument();
    });

    // Expand the batch row to display documents list
    fireEvent.click(screen.getByText('batch-101'));

    await waitFor(() => {
      expect(screen.getByText('invoice_npk.jpg')).toBeInTheDocument();
      expect(screen.getByText('Duyệt hồ sơ')).toBeInTheDocument();
    });

    // Click "Duyệt hồ sơ"
    fireEvent.click(screen.getByText('Duyệt hồ sơ'));

    // Wait for Review screen loading
    await waitFor(() => {
      expect(screen.getByText('Hiệu chỉnh thông tin số hóa')).toBeInTheDocument();
    });

    // Left preview should display jpeg img preview
    const previewImg = screen.getByAltKey ? screen.getByAltText('Review preview') : screen.getByRole('img');
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute('src', 'http://localhost/uploads/invoice_npk.jpg');

    // Right editor form must load values correctly
    expect(screen.getByLabelText('Nhà cung cấp *')).toHaveValue('Công ty TakaTech');
    expect(screen.getByLabelText('Số hóa đơn *')).toHaveValue('HD-9988');

    // Test Save Draft button calls patch endpoint
    fireEvent.click(screen.getByText('Lưu nháp'));
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/ocr/draft-records/draft-99', expect.any(Object));
    });

    // Test Confirm Record
    fireEvent.click(screen.getByText('Xác nhận ghi sổ'));
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/ocr/draft-records/draft-99/confirm');
    });
  });
});
