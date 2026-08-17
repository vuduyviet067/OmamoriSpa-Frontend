/**
 * Mock catalog data used as a development fallback when VITE_USE_MOCK_DATA=true
 * or when the public backend endpoints are not reachable.
 */

export const rooms = [
  {
    id: 1,
    name: 'Phòng VIP',
    description:
      'Không gian riêng tư cao cấp, trang bị bồn ngâm và giường massage nhập khẩu, phù hợp cho các liệu trình cao cấp.',
    capacity: 2,
    image: '',
    features: ['Bồn ngâm massage', 'Giường massage cao cấp', 'Phòng thay đồ riêng'],
  },
  {
    id: 2,
    name: 'Phòng cá nhân',
    description:
      'Phòng đơn yên tĩnh, thiết kế ấm cúng với ánh sáng dịu nhẹ - lý tưởng cho liệu trình cá nhân.',
    capacity: 1,
    image: '',
    features: ['Giường massage đơn', 'Hệ thống âm thanh riêng', 'Trà thảo mộc'],
  },
  {
    id: 3,
    name: 'Phòng gia đình',
    description:
      'Phòng rộng rãi cho cả gia đình hoặc nhóm bạn, có thể phục vụ đồng thời nhiều khách.',
    capacity: 6,
    image: '',
    features: ['Không gian mở', 'Nhiều giường massage', 'Khu vực chờ riêng'],
  },
  {
    id: 4,
    name: 'Phòng thường',
    description:
      'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản, không gian sạch sẽ và thoáng mát.',
    capacity: 1,
    image: '',
    features: ['Giường massage', 'Điều hòa', 'Khăn tắm sạch'],
  },
];

export default rooms;