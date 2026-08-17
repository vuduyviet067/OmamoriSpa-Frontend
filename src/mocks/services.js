/**
 * Mock catalog data used as a development fallback when VITE_USE_MOCK_DATA=true
 * or when the public backend endpoints are not reachable.
 *
 * Shape mirrors what publicService returns so components stay
 * agnostic of the data source.
 */

export const services = [
  {
    id: 1,
    name: 'Massage thư giãn',
    duration: 90,
    price: 450000,
    description:
      'Liệu pháp massage toàn thân giúp giải tỏa căng thẳng, phục hồi năng lượng và mang lại cảm giác thư giãn sâu.',
    image: '/images/spa/source/massage.webp',
    benefits: ['Giảm căng thẳng', 'Cải thiện tuần hoàn máu', 'Phục hồi năng lượng'],
  },
  {
    id: 2,
    name: 'Chăm sóc da mặt',
    duration: 60,
    price: 380000,
    description:
      'Liệu pháp chăm sóc da mặt chuyên sâu với sản phẩm thảo mộc thiên nhiên, giúp làm sạch, cấp ẩm và tái tạo làn da.',
    image: '/images/spa/source/facial.jpg',
    benefits: ['Làm sạch sâu', 'Cấp ẩm', 'Tái tạo da'],
  },
  {
    id: 3,
    name: 'Liệu pháp đá nóng',
    duration: 75,
    price: 520000,
    description:
      'Massage bằng đá basalt nóng giúp giãn cơ sâu, lưu thông khí huyết và giảm đau nhức hiệu quả.',
    image: '/images/spa/source/hot-stone.webp',
    benefits: ['Giãn cơ sâu', 'Lưu thông khí huyết', 'Giảm đau nhức'],
  },
  {
    id: 4,
    name: 'Gội đầu dưỡng sinh',
    duration: 60,
    price: 280000,
    description:
      'Gội đầu kết hợp bấm huyệt vùng đầu, vai, gáy giúp thư giãn, giảm stress và cải thiện giấc ngủ.',
    image: '/images/spa/source/head-spa.jpg',
    benefits: ['Thư giãn đầu - vai - gáy', 'Giảm stress', 'Cải thiện giấc ngủ'],
  },
];

export default services;