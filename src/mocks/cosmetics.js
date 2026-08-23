/**
 * Mock catalog data used as a development fallback when VITE_USE_MOCK_DATA=true
 * or when the public backend endpoints are not reachable.
 */

export const cosmetics = [
  {
    id: 1,
    name: 'Serum phục hồi',
    brand: 'Omamori',
    price: 420000,
    description:
      'Serum phục hồi chuyên sâu với chiết xuất thảo mộc thiên nhiên, giúp tái tạo tế bào da và cấp ẩm sâu.',
    stock: 35,
    volume: '30ml',
    image: '/images/spa/cosmetics/serum.jpg',
    ingredients: ['Chiết xuất lô hội', 'Vitamin E', 'Hyaluronic Acid'],
  },
  {
    id: 2,
    name: 'Kem dưỡng ẩm',
    brand: 'Omamori',
    price: 350000,
    description:
      'Kem dưỡng ẩm giàu dưỡng chất, giúp da mềm mịn, căng mướt và bảo vệ da khỏi các tác nhân gây khô.',
    stock: 50,
    volume: '50ml',
    image: '/images/spa/cosmetics/moisturizer.jpg',
    ingredients: ['Bơ hạt mỡ', 'Dầu jojoba', 'Glycerin thực vật'],
  },
  {
    id: 3,
    name: 'Tinh dầu oải hương',
    brand: 'Omamori',
    price: 280000,
    description:
      'Tinh dầu oải hương nguyên chất 100%, giúp thư giãn tinh thần, giảm căng thẳng và cải thiện giấc ngủ.',
    stock: 80,
    volume: '15ml',
    image: '/images/spa/cosmetics/lavender-oil.jpg',
    ingredients: ['Tinh dầu oải hương nguyên chất'],
  },
  {
    id: 4,
    name: 'Mặt nạ thải độc',
    brand: 'Omamori',
    price: 180000,
    description:
      'Mặt nạ thải độc chiết xuất từ đất sét trắng và than hoạt tính, giúp hút sạch bã nhờn và làm sáng da.',
    stock: 60,
    volume: '100ml',
    image: '/images/spa/cosmetics/detox-mask.jpg',
    ingredients: ['Đất sét trắng', 'Than hoạt tính', 'Chiết xuất trà xanh'],
  },
];

export default cosmetics;