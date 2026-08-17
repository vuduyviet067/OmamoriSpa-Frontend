/**
 * Therapist mock data for development & demo.
 * Used when VITE_USE_MOCK_DATA=true.
 * All appointments belong to the logged-in therapist: Trần Thị Linh.
 */

import { services } from './services';
import { cosmetics } from './cosmetics';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

const isoDate = (d) => d.toISOString().split('T')[0];

export const therapistProfile = {
  id: 5,
  name: 'Trần Thị Linh',
  username: 'tranthilinh',
  email: 'tranthilinh@omamori.vn',
  phone: '0905123456',
  role: 'THERAPIST',
  avatar: null,
  createdAt: '2024-03-01T08:00:00Z',
};

export const therapistAppointments = [
  // TODAY
  {
    id: 201,
    customer: { id: 1, name: 'Nguyễn Văn A', phone: '0901111222' },
    customerName: 'Nguyễn Văn A',
    service: services[0],
    serviceName: services[0].name,
    roomName: 'A1',
    room: { id: 1, name: 'Phòng A1' },
    date: isoDate(today),
    startTime: '09:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    duration: 90,
    notes: 'Khách yêu cầu lực massage nhẹ nhàng.',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  {
    id: 202,
    customer: { id: 2, name: 'Lê Thu Hương', phone: '0902333444' },
    customerName: 'Lê Thu Hương',
    service: services[1],
    serviceName: services[1].name,
    roomName: 'B2',
    room: { id: 2, name: 'Phòng B2' },
    date: isoDate(today),
    startTime: '11:00',
    endTime: '12:00',
    status: 'ACCEPTED',
    duration: 60,
    notes: '',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  {
    id: 203,
    customer: { id: 3, name: 'Phạm Minh Anh', phone: '0903555666' },
    customerName: 'Phạm Minh Anh',
    service: services[2],
    serviceName: services[2].name,
    roomName: 'C1',
    room: { id: 3, name: 'Phòng C1' },
    date: isoDate(today),
    startTime: '14:00',
    endTime: '15:15',
    status: 'IN_TREATMENT',
    duration: 75,
    notes: 'Da dầu, cần làm sạch sâu trước khi massage đá nóng.',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  {
    id: 204,
    customer: { id: 4, name: 'Nguyễn Hải Yến', phone: '0904777888' },
    customerName: 'Nguyễn Hải Yến',
    service: services[3],
    serviceName: services[3].name,
    roomName: 'A2',
    room: { id: 4, name: 'Phòng A2' },
    date: isoDate(today),
    startTime: '16:30',
    endTime: '17:30',
    status: 'COMPLETED',
    duration: 60,
    notes: '',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  // TOMORROW
  {
    id: 205,
    customer: { id: 5, name: 'Trần Đình Khoa', phone: '0905888999' },
    customerName: 'Trần Đình Khoa',
    service: services[0],
    serviceName: services[0].name,
    roomName: 'A1',
    room: { id: 1, name: 'Phòng A1' },
    date: isoDate(tomorrow),
    startTime: '09:30',
    endTime: '11:00',
    status: 'CONFIRMED',
    duration: 90,
    notes: '',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  {
    id: 206,
    customer: { id: 6, name: 'Đặng Thị Mai', phone: '0906000111' },
    customerName: 'Đặng Thị Mai',
    service: services[1],
    serviceName: services[1].name,
    roomName: 'B2',
    room: { id: 2, name: 'Phòng B2' },
    date: isoDate(tomorrow),
    startTime: '14:00',
    endTime: '15:00',
    status: 'CONFIRMED',
    duration: 60,
    notes: 'Da nhạy cảm, cẩn thận với sản phẩm có hương liệu.',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  // DAY AFTER TOMORROW
  {
    id: 207,
    customer: { id: 7, name: 'Hoàng Văn Nam', phone: '0907111222' },
    customerName: 'Hoàng Văn Nam',
    service: services[2],
    serviceName: services[2].name,
    roomName: 'C1',
    room: { id: 3, name: 'Phòng C1' },
    date: isoDate(dayAfter),
    startTime: '10:00',
    endTime: '11:15',
    status: 'CONFIRMED',
    duration: 75,
    notes: '',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  // YESTERDAY - completed
  {
    id: 208,
    customer: { id: 8, name: 'Phan Thị Lan', phone: '0908222333' },
    customerName: 'Phan Thị Lan',
    service: services[3],
    serviceName: services[3].name,
    roomName: 'A2',
    room: { id: 4, name: 'Phòng A2' },
    date: isoDate(yesterday),
    startTime: '15:00',
    endTime: '16:00',
    status: 'COMPLETED',
    duration: 60,
    notes: '',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
  // LAST WEEK - completed
  {
    id: 209,
    customer: { id: 9, name: 'Lý Văn Hùng', phone: '0909333444' },
    customerName: 'Lý Văn Hùng',
    service: services[0],
    serviceName: services[0].name,
    roomName: 'A1',
    room: { id: 1, name: 'Phòng A1' },
    date: isoDate(lastWeek),
    startTime: '10:00',
    endTime: '11:30',
    status: 'COMPLETED',
    duration: 90,
    notes: '',
    therapistId: 5,
    therapistName: 'Trần Thị Linh',
  },
];

// Treatment history per customer
export const treatmentHistory = [
  {
    id: 301,
    appointmentId: 209,
    customerId: 9,
    customerName: 'Lý Văn Hùng',
    date: isoDate(lastWeek),
    serviceName: 'Massage thư giãn',
    notes: 'Khách hài lòng với dịch vụ. Cơ vùng vai gáy có phần căng cứng, đã massage giãn cơ kỹ.',
    outcome: 'GOOD',
    cosmetics: [],
  },
  {
    id: 302,
    appointmentId: 208,
    customerId: 8,
    customerName: 'Phan Thị Lan',
    date: isoDate(yesterday),
    serviceName: 'Gội đầu dưỡng sinh',
    notes: 'Da đầu khô nhẹ, đã sử dụng tinh dầu oải hương để tăng độ ẩm. Khách thư giãn và hài lòng.',
    outcome: 'EXCELLENT',
    cosmetics: [
      { cosmeticId: 3, cosmeticName: 'Tinh dầu oải hương', quantity: 1 },
    ],
  },
];

export default {
  appointments: therapistAppointments,
  profile: therapistProfile,
  history: treatmentHistory,
  cosmetics,
};
