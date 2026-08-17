/**
 * Mock catalog data used as a development fallback when VITE_USE_MOCK_DATA=true
 * or when the public backend endpoints are not reachable.
 */

export const therapists = [
  {
    id: 1,
    name: 'Hà Linh',
    specialty: 'Massage thư giãn, Chăm sóc da mặt',
    experience: 5,
    description:
      'Chuyên viên với 5 năm kinh nghiệm trong liệu pháp massage thư giãn và chăm sóc da mặt chuyên sâu.',
    image: '/images/spa/source/ha-linh.webp',
    certifications: ['Chứng chỉ Massage trị liệu', 'Chứng chỉ Chăm sóc da'],
  },
  {
    id: 2,
    name: 'Thảo Vy',
    specialty: 'Liệu pháp đá nóng, Gội đầu dưỡng sinh',
    experience: 4,
    description:
      'Chuyên viên trị liệu đá nóng với phong cách nhẹ nhàng, tận tâm và kỹ thuật chuyên nghiệp.',
    image: '/images/spa/source/thao-vy.webp',
    certifications: ['Stone Therapy Certificate', 'Chứng chỉ Dưỡng sinh đầu'],
  },
  {
    id: 3,
    name: 'Minh Anh',
    specialty: 'Massage body, Bấm huyệt',
    experience: 6,
    description:
      'Chuyên gia bấm huyệt cổ truyền với hơn 6 năm kinh nghiệm, từng tu nghiệp tại Nhật Bản.',
    image: '/images/spa/source/minh-anh.webp',
    certifications: ['Bấm huyệt cổ truyền', 'Massage trị liệu Nhật Bản'],
  },
  {
    id: 4,
    name: 'Khánh Chi',
    specialty: 'Chăm sóc da mặt, Tư vấn thảo mộc',
    experience: 3,
    description:
      'Chuyên viên chăm sóc da với kiến thức sâu về thảo mộc thiên nhiên, tư vấn liệu trình cá nhân hóa.',
    image: '/images/spa/source/khanh-chi.webp',
    certifications: ['Skincare Specialist', 'Herbal Therapy'],
  },
];

export default therapists;