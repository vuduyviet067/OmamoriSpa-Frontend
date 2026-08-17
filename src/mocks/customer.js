/**
 * Customer-specific mock data for development & demo.
 * Shapes mirror what customerService returns so components
 * stay agnostic of the data source.
 */

import { services } from './services';
import { therapists } from './therapists';

const mockTherapist = (id) => ({
  id,
  name: therapists.find((t) => t.id === id)?.name || 'Kỹ thuật viên',
  specialty: therapists.find((t) => t.id === id)?.specialty || '',
  image: therapists.find((t) => t.id === id)?.image || '',
});

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 3);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);
const lastMonth = new Date(today);
lastMonth.setDate(lastMonth.getDate() - 30);

const isoDate = (d) => d.toISOString().split('T')[0];

export const customerAppointments = [
  {
    id: 101,
    service: services[0],
    serviceName: services[0].name,
    therapist: mockTherapist(1),
    therapistName: mockTherapist(1).name,
    therapistId: 1,
    room: { id: 1, name: 'Phòng A1', type: 'Phòng VIP' },
    roomName: 'Phòng A1',
    roomId: 1,
    date: isoDate(tomorrow),
    startTime: '10:00',
    endTime: '11:30',
    status: 'CONFIRMED',
    price: services[0].price,
    notes: '',
  },
  {
    id: 102,
    service: services[1],
    serviceName: services[1].name,
    therapist: mockTherapist(4),
    therapistName: mockTherapist(4).name,
    therapistId: 4,
    room: { id: 2, name: 'Phòng B2', type: 'Phòng tiêu chuẩn' },
    roomName: 'Phòng B2',
    roomId: 2,
    date: isoDate(dayAfter),
    startTime: '14:00',
    endTime: '15:00',
    status: 'PENDING',
    price: services[1].price,
    notes: '',
  },
  {
    id: 103,
    service: services[2],
    serviceName: services[2].name,
    therapist: mockTherapist(2),
    therapistName: mockTherapist(2).name,
    therapistId: 2,
    room: { id: 3, name: 'Phòng C1', type: 'Phòng VIP' },
    roomName: 'Phòng C1',
    roomId: 3,
    date: isoDate(dayAfter),
    startTime: '16:00',
    endTime: '17:15',
    status: 'PENDING',
    price: services[2].price,
    notes: '',
  },
  {
    id: 104,
    service: services[0],
    serviceName: services[0].name,
    therapist: mockTherapist(3),
    therapistName: mockTherapist(3).name,
    therapistId: 3,
    room: { id: 1, name: 'Phòng A1', type: 'Phòng VIP' },
    roomName: 'Phòng A1',
    roomId: 1,
    date: isoDate(lastWeek),
    startTime: '09:00',
    endTime: '10:30',
    status: 'COMPLETED',
    price: services[0].price,
    notes: '',
  },
  {
    id: 105,
    service: services[3],
    serviceName: services[3].name,
    therapist: mockTherapist(2),
    therapistName: mockTherapist(2).name,
    therapistId: 2,
    room: { id: 2, name: 'Phòng B2', type: 'Phòng tiêu chuẩn' },
    roomName: 'Phòng B2',
    roomId: 2,
    date: isoDate(lastMonth),
    startTime: '15:00',
    endTime: '16:00',
    status: 'COMPLETED',
    price: services[3].price,
    notes: '',
  },
  {
    id: 106,
    service: services[1],
    serviceName: services[1].name,
    therapist: mockTherapist(4),
    therapistName: mockTherapist(4).name,
    therapistId: 4,
    room: { id: 3, name: 'Phòng C1', type: 'Phòng VIP' },
    roomName: 'Phòng C1',
    roomId: 3,
    date: isoDate(lastMonth),
    startTime: '11:00',
    endTime: '12:00',
    status: 'CANCELLED',
    price: services[1].price,
    notes: '',
  },
];

export const customerTransactions = [
  {
    id: 201,
    invoiceCode: 'INV-2025-0001',
    serviceName: services[0].name,
    appointment: customerAppointments[3],
    items: [
      {
        id: 1,
        name: services[0].name,
        type: 'SERVICE',
        quantity: 1,
        unitPrice: services[0].price,
        total: services[0].price,
      },
    ],
    amount: services[0].price,
    totalAmount: services[0].price,
    status: 'PAID',
    paidAt: lastWeek.toISOString(),
    createdAt: lastWeek.toISOString(),
    paymentMethod: 'CASH',
  },
  {
    id: 202,
    invoiceCode: 'INV-2025-0002',
    serviceName: services[3].name,
    appointment: customerAppointments[4],
    items: [
      {
        id: 2,
        name: services[3].name,
        type: 'SERVICE',
        quantity: 1,
        unitPrice: services[3].price,
        total: services[3].price,
      },
    ],
    amount: services[3].price,
    totalAmount: services[3].price,
    status: 'PAID',
    paidAt: lastMonth.toISOString(),
    createdAt: lastMonth.toISOString(),
    paymentMethod: 'BANK_TRANSFER',
  },
  {
    id: 203,
    invoiceCode: 'INV-2025-0003',
    serviceName: services[1].name,
    appointment: customerAppointments[5],
    items: [
      {
        id: 3,
        name: services[1].name,
        type: 'SERVICE',
        quantity: 1,
        unitPrice: services[1].price,
        total: services[1].price,
      },
    ],
    amount: services[1].price,
    totalAmount: services[1].price,
    status: 'CANCELLED',
    paidAt: null,
    createdAt: lastMonth.toISOString(),
    paymentMethod: null,
  },
];

export const customerProfile = {
  id: 1,
  name: 'Nguyễn Văn A',
  username: 'khachhang',
  email: 'nguyenvana@email.com',
  phone: '0901234567',
  role: 'CUSTOMER',
  avatar: null,
  createdAt: '2024-01-15T08:00:00Z',
};

export default {
  appointments: customerAppointments,
  transactions: customerTransactions,
  profile: customerProfile,
};
