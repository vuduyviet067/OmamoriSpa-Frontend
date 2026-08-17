/**
 * Admin-specific mock data used as a development fallback when
 * VITE_USE_MOCK_DATA=true and the admin backend endpoints are not reachable.
 *
 * Shapes mirror what adminService returns so components stay
 * agnostic of the data source.
 */

import { services as catalogServices } from './services';
import { cosmetics as catalogCosmetics } from './cosmetics';
import { rooms as catalogRooms } from './rooms';
import { therapists as catalogTherapists } from './therapists';

const today = new Date();
const isoDate = (d) => d.toISOString().split('T')[0];
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// --- Customers (admin view) ---
export const adminCustomers = [
  {
    id: 1,
    name: 'Nguyễn Văn A',
    username: 'khachhang',
    email: 'nguyenvana@email.com',
    phone: '0901234567',
    role: 'CUSTOMER',
    active: true,
    avatar: null,
    createdAt: '2024-01-15T08:00:00Z',
    totalAppointments: 8,
    totalSpent: 3_400_000,
  },
  {
    id: 2,
    name: 'Trần Thị B',
    username: 'tranthib',
    email: 'tranthib@email.com',
    phone: '0912345678',
    role: 'CUSTOMER',
    active: true,
    avatar: null,
    createdAt: '2024-02-22T08:00:00Z',
    totalAppointments: 12,
    totalSpent: 5_800_000,
  },
  {
    id: 3,
    name: 'Lê Văn C',
    username: 'levanc',
    email: 'levanc@email.com',
    phone: '0923456789',
    role: 'CUSTOMER',
    active: true,
    avatar: null,
    createdAt: '2024-03-10T08:00:00Z',
    totalAppointments: 5,
    totalSpent: 1_900_000,
  },
  {
    id: 4,
    name: 'Phạm Thị D',
    username: 'phamthid',
    email: 'phamthid@email.com',
    phone: '0934567890',
    role: 'CUSTOMER',
    active: false,
    avatar: null,
    createdAt: '2024-04-05T08:00:00Z',
    totalAppointments: 3,
    totalSpent: 980_000,
  },
  {
    id: 5,
    name: 'Hoàng Văn E',
    username: 'hoangvane',
    email: 'hoangvane@email.com',
    phone: '0945678901',
    role: 'CUSTOMER',
    active: true,
    avatar: null,
    createdAt: '2024-05-18T08:00:00Z',
    totalAppointments: 9,
    totalSpent: 4_200_000,
  },
  {
    id: 6,
    name: 'Võ Thị F',
    username: 'vothif',
    email: 'vothif@email.com',
    phone: '0956789012',
    role: 'CUSTOMER',
    active: true,
    avatar: null,
    createdAt: '2024-06-30T08:00:00Z',
    totalAppointments: 6,
    totalSpent: 2_700_000,
  },
];

// --- Therapists (admin view) ---
// We extend the catalog therapists with username/password & active for admin CRUD.
export const adminTherapists = catalogTherapists.map((t) => ({
  ...t,
  username: t.username || `ktv_${t.id}`,
  password: '******',
  email: t.email || `ktv${t.id}@omamorispa.com`,
  phone: t.phone || `09${(10000000 + t.id * 137).toString().slice(0, 8)}`,
  active: t.id !== 999, // exclude sentinel
  bio: t.description,
  createdAt: '2024-01-10T08:00:00Z',
}));

// --- Appointments (admin overview of all) ---
const mockTherapist = (id) => adminTherapists.find((t) => t.id === id) || adminTherapists[0];
const mockCustomer = (id) => adminCustomers.find((c) => c.id === id) || adminCustomers[0];
const mockService = (id) => catalogServices.find((s) => s.id === id) || catalogServices[0];
const mockRoom = (id) => catalogRooms.find((r) => r.id === id) || catalogRooms[0];

export const adminAppointments = [
  {
    id: 501,
    code: 'APT-2026-0001',
    customerId: 1,
    customerName: 'Nguyễn Văn A',
    customer: mockCustomer(1),
    therapistId: 1,
    therapistName: 'Hà Linh',
    therapist: mockTherapist(1),
    serviceId: 1,
    serviceName: 'Massage thư giãn',
    service: mockService(1),
    roomId: 1,
    roomName: 'Phòng VIP',
    room: mockRoom(1),
    date: isoDate(today),
    startTime: '09:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    price: mockService(1).price,
    notes: '',
  },
  {
    id: 502,
    code: 'APT-2026-0002',
    customerId: 2,
    customerName: 'Trần Thị B',
    customer: mockCustomer(2),
    therapistId: 2,
    therapistName: 'Thảo Vy',
    therapist: mockTherapist(2),
    serviceId: 2,
    serviceName: 'Chăm sóc da mặt',
    service: mockService(2),
    roomId: 2,
    roomName: 'Phòng cá nhân',
    room: mockRoom(2),
    date: isoDate(today),
    startTime: '11:00',
    endTime: '12:00',
    status: 'CONFIRMED',
    price: mockService(2).price,
    notes: '',
  },
  {
    id: 503,
    code: 'APT-2026-0003',
    customerId: 3,
    customerName: 'Lê Văn C',
    customer: mockCustomer(3),
    therapistId: 3,
    therapistName: 'Minh Anh',
    therapist: mockTherapist(3),
    serviceId: 3,
    serviceName: 'Liệu pháp đá nóng',
    service: mockService(3),
    roomId: 3,
    roomName: 'Phòng gia đình',
    room: mockRoom(3),
    date: isoDate(today),
    startTime: '14:00',
    endTime: '15:15',
    status: 'PENDING',
    price: mockService(3).price,
    notes: '',
  },
  {
    id: 504,
    code: 'APT-2026-0004',
    customerId: 4,
    customerName: 'Phạm Thị D',
    customer: mockCustomer(4),
    therapistId: 4,
    therapistName: 'Khánh Chi',
    therapist: mockTherapist(4),
    serviceId: 4,
    serviceName: 'Gội đầu dưỡng sinh',
    service: mockService(4),
    roomId: 4,
    roomName: 'Phòng thường',
    room: mockRoom(4),
    date: isoDate(addDays(today, 1)),
    startTime: '10:00',
    endTime: '11:00',
    status: 'PENDING',
    price: mockService(4).price,
    notes: '',
  },
  {
    id: 505,
    code: 'APT-2026-0005',
    customerId: 5,
    customerName: 'Hoàng Văn E',
    customer: mockCustomer(5),
    therapistId: 1,
    therapistName: 'Hà Linh',
    therapist: mockTherapist(1),
    serviceId: 1,
    serviceName: 'Massage thư giãn',
    service: mockService(1),
    roomId: 1,
    roomName: 'Phòng VIP',
    room: mockRoom(1),
    date: isoDate(addDays(today, -1)),
    startTime: '15:00',
    endTime: '16:30',
    status: 'COMPLETED',
    price: mockService(1).price,
    notes: '',
  },
  {
    id: 506,
    code: 'APT-2026-0006',
    customerId: 6,
    customerName: 'Võ Thị F',
    customer: mockCustomer(6),
    therapistId: 2,
    therapistName: 'Thảo Vy',
    therapist: mockTherapist(2),
    serviceId: 2,
    serviceName: 'Chăm sóc da mặt',
    service: mockService(2),
    roomId: 2,
    roomName: 'Phòng cá nhân',
    room: mockRoom(2),
    date: isoDate(addDays(today, -3)),
    startTime: '13:00',
    endTime: '14:00',
    status: 'COMPLETED',
    price: mockService(2).price,
    notes: '',
  },
  {
    id: 507,
    code: 'APT-2026-0007',
    customerId: 1,
    customerName: 'Nguyễn Văn A',
    customer: mockCustomer(1),
    therapistId: 3,
    therapistName: 'Minh Anh',
    therapist: mockTherapist(3),
    serviceId: 3,
    serviceName: 'Liệu pháp đá nóng',
    service: mockService(3),
    roomId: 3,
    roomName: 'Phòng gia đình',
    room: mockRoom(3),
    date: isoDate(addDays(today, -5)),
    startTime: '16:00',
    endTime: '17:15',
    status: 'COMPLETED',
    price: mockService(3).price,
    notes: '',
  },
];

// --- Invoices (admin view) ---
const makeInvoice = (id, code, customerId, items, status, method, daysOffset) => {
  const d = addDays(today, daysOffset);
  const cust = mockCustomer(customerId);
  const total = items.reduce((sum, it) => sum + it.total, 0);
  return {
    id,
    code,
    invoiceCode: code,
    customerId,
    customerName: cust.name,
    customer: cust,
    items,
    subtotal: total,
    totalAmount: total,
    amount: total,
    status,
    paidAt: status === 'PAID' ? d.toISOString() : null,
    createdAt: d.toISOString(),
    date: isoDate(d),
    paymentMethod: status === 'PAID' ? method : null,
  };
};

export const adminInvoices = [
  makeInvoice(
    701,
    'INV-2026-0001',
    1,
    [
      { id: 1, name: 'Massage thư giãn', type: 'SERVICE', quantity: 1, unitPrice: 450000, total: 450000 },
    ],
    'PAID',
    'CASH',
    -1
  ),
  makeInvoice(
    702,
    'INV-2026-0002',
    2,
    [
      { id: 2, name: 'Chăm sóc da mặt', type: 'SERVICE', quantity: 1, unitPrice: 380000, total: 380000 },
      { id: 3, name: 'Serum phục hồi', type: 'COSMETIC', quantity: 1, unitPrice: 420000, total: 420000 },
    ],
    'PAID',
    'BANK_TRANSFER',
    -2
  ),
  makeInvoice(
    703,
    'INV-2026-0003',
    3,
    [
      { id: 4, name: 'Liệu pháp đá nóng', type: 'SERVICE', quantity: 1, unitPrice: 520000, total: 520000 },
    ],
    'UNPAID',
    null,
    0
  ),
  makeInvoice(
    704,
    'INV-2026-0004',
    5,
    [
      { id: 5, name: 'Gội đầu dưỡng sinh', type: 'SERVICE', quantity: 1, unitPrice: 280000, total: 280000 },
      { id: 6, name: 'Kem dưỡng ẩm', type: 'COSMETIC', quantity: 2, unitPrice: 350000, total: 700000 },
    ],
    'PENDING',
    null,
    0
  ),
  makeInvoice(
    705,
    'INV-2026-0005',
    6,
    [
      { id: 7, name: 'Massage thư giãn', type: 'SERVICE', quantity: 1, unitPrice: 450000, total: 450000 },
    ],
    'PAID',
    'CARD',
    -5
  ),
  makeInvoice(
    706,
    'INV-2026-0006',
    2,
    [
      { id: 8, name: 'Tinh dầu oải hương', type: 'COSMETIC', quantity: 1, unitPrice: 280000, total: 280000 },
    ],
    'PAID',
    'CARD',
    -7
  ),
  makeInvoice(
    707,
    'INV-2026-0007',
    1,
    [
      { id: 9, name: 'Chăm sóc da mặt', type: 'SERVICE', quantity: 1, unitPrice: 380000, total: 380000 },
    ],
    'CANCELLED',
    null,
    -10
  ),
];

// --- Admin inventory lots: per-cosmetic lots ---
const inventoryStockMap = {
  // Bump some items up to be "healthy", drop others to trigger low/out warnings.
  1: 12, // Serum phục hồi - low (under minStock=30)
  2: 60, // Kem dưỡng ẩm - healthy
  3: 5,  // Tinh dầu oải hương - low (under minStock=20)
  4: 0,  // Mặt nạ thải độc - out of stock
};

export const adminInventory = catalogCosmetics.map((c) => {
  const stockValue = inventoryStockMap[c.id] ?? c.stock ?? 20;
  return {
    ...c,
    stock: stockValue,
    sku: `OM-COS-${String(c.id).padStart(3, '0')}`,
    minStock: c.id === 1 ? 30 : 20,
    lowStockThreshold: c.id === 1 ? 30 : 20,
    lots: [
      {
        id: c.id * 100 + 1,
        batchNo: `LOT-2025-${String(c.id).padStart(3, '0')}`,
        code: `LOT-2025-${String(c.id).padStart(3, '0')}`,
        quantity: Math.floor(stockValue * 0.6),
        expiryDate: isoDate(addDays(today, 240)),
        expiresAt: isoDate(addDays(today, 240)),
        receivedAt: '2025-08-01',
      },
      {
        id: c.id * 100 + 2,
        batchNo: `LOT-2025-${String(c.id).padStart(3, '0')}B`,
        code: `LOT-2025-${String(c.id).padStart(3, '0')}B`,
        quantity: Math.max(0, Math.floor(stockValue - stockValue * 0.6)),
        expiryDate: isoDate(addDays(today, 60)),
        expiresAt: isoDate(addDays(today, 60)),
        receivedAt: '2025-12-15',
      },
    ],
  };
});

// --- Dashboard overview shape (computed) ---
export const computeDashboardOverview = () => {
  const todayStr = isoDate(today);
  const todays = adminAppointments.filter((a) => a.date === todayStr);
  const paidInvoices = adminInvoices.filter((inv) => inv.status === 'PAID');

  // Build a 7-day revenue trend (oldest to newest).
  const trend = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(today, -(6 - i));
    const dStr = isoDate(d);
    const revenue = adminInvoices
      .filter((inv) => inv.status === 'PAID' && isoDate(new Date(inv.createdAt)) === dStr)
      .reduce((s, inv) => s + (inv.totalAmount || 0), 0);
    return { date: dStr, label: `${d.getDate()}/${d.getMonth() + 1}`, value: revenue };
  });

  // Flattened shape so AdminDashboard.jsx can read keys directly off the root.
  const stats = {
    totalAppointments: adminAppointments.length,
    todayAppointments: todays.length,
    pendingAppointments: adminAppointments.filter((a) => a.status === 'PENDING').length,
    revenueMonth: paidInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0),
    totalInvoices: adminInvoices.length,
    pendingInvoices: adminInvoices.filter((i) => i.status === 'UNPAID' || i.status === 'PENDING').length,
    totalCustomers: adminCustomers.length,
    activeCustomers: adminCustomers.filter((c) => c.active).length,
    totalTherapists: adminTherapists.length,
    activeTherapists: adminTherapists.filter((t) => t.active).length,
    lowStockCount: adminInventory.filter((c) => (c.stock || 0) < (c.minStock || 20)).length,
    outOfStockCount: adminInventory.filter((c) => !c.stock).length,
  };

  return {
    ...stats,
    stats,
    todayAppointmentsList: todays,
    todayAppointments: todays.length,
    lowStockItems: adminInventory.filter((c) => (c.stock || 0) < (c.minStock || 20)).length,
    lowStockList: adminInventory.filter((c) => (c.stock || 0) < (c.minStock || 20)),
    revenueTrend: trend,
  };
};

// --- Report data: aggregated by date range ---
export const computeReport = (from, to) => {
  const paid = adminInvoices.filter((inv) => {
    if (inv.status !== 'PAID') return false;
    const d = new Date(inv.createdAt);
    if (from && d < new Date(from)) return false;
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      if (d > t) return false;
    }
    return true;
  });

  const items = paid.flatMap((inv) =>
    (inv.items || []).map((line) => ({
      ...line,
      invoiceId: inv.id,
      invoiceCode: inv.code || inv.invoiceCode,
      date: inv.createdAt,
    }))
  );

  const serviceRevenue = items
    .filter((it) => (it.type || 'SERVICE') === 'SERVICE')
    .reduce((s, it) => s + (it.total || 0), 0);
  const cosmeticRevenue = items
    .filter((it) => it.type === 'COSMETIC')
    .reduce((s, it) => s + (it.total || 0), 0);

  // Build a daily trend within range.
  const dayMap = new Map();
  paid.forEach((inv) => {
    const day = isoDate(new Date(inv.createdAt));
    dayMap.set(day, (dayMap.get(day) || 0) + (inv.totalAmount || 0));
  });
  const trend = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, value]) => ({
      date: day,
      label: day.slice(5),
      value,
    }));

  const byCosmetic = new Map();
  items
    .filter((it) => it.type === 'COSMETIC')
    .forEach((it) => {
      const key = it.name;
      const cur = byCosmetic.get(key) || { name: it.name, quantity: 0, revenue: 0 };
      cur.quantity += it.quantity || 0;
      cur.revenue += it.total || 0;
      byCosmetic.set(key, cur);
    });

  const topCosmetics = Array.from(byCosmetic.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    revenue: paid.reduce((s, inv) => s + (inv.totalAmount || 0), 0),
    serviceRevenue,
    cosmeticRevenue,
    invoicesCount: paid.length,
    items,
    trend,
    topCosmetics,
    customersCount: adminCustomers.length,
    appointmentsCount: adminAppointments.length,
    // Backend-shape envelope so Reports.jsx's readBackendKpis() picks it up:
    revenue_block: {
      total: paid.reduce((s, inv) => s + (inv.totalAmount || 0), 0),
      serviceAmount: serviceRevenue,
      cosmeticAmount: cosmeticRevenue,
      byDay: Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, value]) => ({ date: day, value })),
      topCosmetics,
    },
    customers: { total: adminCustomers.length },
    appointments: { total: adminAppointments.length },
    inventory: { totalStock: adminInventory.reduce((s, row) => s + (row.stock || 0), 0) },
  };
};

export default {
  customers: adminCustomers,
  therapists: adminTherapists,
  appointments: adminAppointments,
  invoices: adminInvoices,
  inventory: adminInventory,
  computeDashboardOverview,
  computeReport,
};
