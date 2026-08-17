/**
 * Mock data for public website
 * This file contains all static data used across public pages.
 * When backend is ready, replace these with API calls.
 */

export const services = [
  {
    id: 1,
    name: 'Massage body toàn thân',
    duration: 90,
    price: 450000,
    description: 'Liệu pháp massage toàn thân sử dụng kỹ thuật bấm huyệt kết hợp xoa bóp, giúp giảm căng thẳng cơ bắp và mang lại cảm giác thư giãn sâu.',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    benefits: ['Giảm đau nhức cơ', 'Cải thiện tuần hoàn máu', 'Thư giãn tinh thần'],
  },
  {
    id: 2,
    name: 'Massage bấm huyệt',
    duration: 60,
    price: 350000,
    description: 'Phương pháp y học cổ truyền tác động vào các huyệt đạo trên cơ thể, giúp cân bằng năng lượng và cải thiện sức khỏe tổng thể.',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80',
    benefits: ['Kích thích huyệt đạo', 'Cải thiện giấc ngủ', 'Tăng cường miễn dịch'],
  },
  {
    id: 3,
    name: 'Đá nóng therapy',
    duration: 75,
    price: 400000,
    description: 'Sử dụng đá basalt nóng để massage nhẹ nhàng, tỏa nhiệt sâu vào cơ thể giúp giãn cơ và lưu thông khí huyết hiệu quả.',
    image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80',
    benefits: ['Giãn cơ hiệu quả', 'Lưu thông khí huyết', 'Thải độc tự nhiên'],
  },
  {
    id: 4,
    name: 'Foot massage',
    duration: 45,
    price: 250000,
    description: 'Massage chân tập trung vào các huyệt đạo ở bàn chân, giúp thư giãn sau một ngày dài và cải thiện giấc ngủ.',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
    benefits: ['Thư giãn bàn chân', 'Cải thiện giấc ngủ', 'Giảm phù chân'],
  },
  {
    id: 5,
    name: 'Face treatment',
    duration: 60,
    price: 380000,
    description: 'Liệu pháp chăm sóc da mặt sử dụng sản phẩm thảo mộc, giúp làm sạch sâu, cấp ẩm và mang lại làn da tươi sáng.',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80',
    benefits: ['Làm sạch sâu', 'Cấp ẩm da', 'Se khít lỗ chân lông'],
  },
  {
    id: 6,
    name: 'Body wrap',
    duration: 90,
    price: 520000,
    description: 'Phương pháp wraps toàn thân sử dụng nguyên liệu thiên nhiên, giúp thải độc, giảm cellulose và nuôi dưỡng làn da.',
    image: 'https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=800&q=80',
    benefits: ['Thải độc da', 'Giảm cellulose', 'Nuôi dưỡng da'],
  },
];

export const rooms = [
  {
    id: 1,
    name: 'Phòng VIP',
    description: 'Không gian riêng tư cao cấp với tiện nghi hiện đại, phù hợp cho những ai muốn trải nghiệm xa hoa.',
    capacity: 2,
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    features: ['Điều hòa riêng', 'Bồn ngâm massage', 'Tủ đồ cá nhân'],
  },
  {
    id: 2,
    name: 'Phòng cá nhân',
    description: 'Phòng riêng cho một người, thiết kế ấm cúng và yên tĩnh.',
    capacity: 1,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
    features: ['Điều hòa riêng', 'Giường massage cao cấp', 'Góc thư giãn'],
  },
  {
    id: 3,
    name: 'Phòng gia đình',
    description: 'Không gian rộng rãi cho gia đình hoặc nhóm bạn, có thể phục vụ 4-6 người cùng lúc.',
    capacity: 6,
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&q=80',
    features: ['Không gian mở', 'Nhiều giường massage', 'Khu vực chờ riêng'],
  },
  {
    id: 4,
    name: 'Phòng thường',
    description: 'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản, không gian sạch sẽ và thoáng mát.',
    capacity: 1,
    image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    features: ['Điều hòa', 'Giường massage', 'Khăn tắm sạch'],
  },
];

export const cosmetics = [
  {
    id: 1,
    name: 'Tinh dầu massage nguyên chất',
    brand: 'Omamori',
    price: 280000,
    description: 'Tinh dầu chiết xuất từ thảo mộc tự nhiên 100%, không chứa hóa chất độc hại. Thích hợp cho các liệu pháp massage và thư giãn.',
    volume: '100ml',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80',
    ingredients: ['Tinh dầu bạc hà', 'Tinh dầu lavender', 'Dầu nền jojoba'],
  },
  {
    id: 2,
    name: 'Kem dưỡng da thảo mộc',
    brand: 'Omamori',
    price: 350000,
    description: 'Kem dưỡng ẩm chiết xuất từ thảo mộc Việt Nam, giúp nuôi dưỡng làn da mềm mịn và tươi sáng.',
    volume: '50ml',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80',
    ingredients: ['Chiết xuất nha đam', 'Vitamin E', 'Dầu argan'],
  },
  {
    id: 3,
    name: 'Sữa tắm thảo mộc',
    brand: 'Omamori',
    price: 180000,
    description: 'Sữa tắm thảo mộc dịu nhẹ, phù hợp với mọi loại da. Hương thơm tự nhiên từ tinh dầu cây tràm.',
    volume: '250ml',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
    ingredients: ['Chiết xuất tràm', 'Glycerin', 'Aloe vera'],
  },
  {
    id: 4,
    name: 'Dầu gội thảo mộc',
    brand: 'Omamori',
    price: 160000,
    description: 'Dầu gội dịu nhẹ cho da đầu nhạy cảm, chiết xuất từ bồ kết và hà thủ ô giúp nuôi dưỡng tóc.',
    volume: '250ml',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80',
    ingredients: ['Chiết xuất bồ kết', 'Hà thủ ô', 'Tinh dầu bưởi'],
  },
  {
    id: 5,
    name: 'Kem chống nắng thảo mộc',
    brand: 'Omamori',
    price: 420000,
    description: 'Kem chống nắng SPF 50+ chiết xuất từ thảo mộc, bảo vệ da khỏi tia UV mà không gây kích ứng.',
    volume: '50ml',
    image: 'https://images.unsplash.com/photo-1556227703-a5e8e4c4f3b7?w=800&q=80',
    ingredients: ['Chiết xuất rong biển', 'Titanium dioxide', 'Vitamin E'],
  },
  {
    id: 6,
    name: 'Mặt nạ ngủ dưỡng ẩm',
    brand: 'Omamori',
    price: 320000,
    description: 'Mặt nạ ngủ cấp ẩm sâu qua đêm, giúp da mềm mịn và tươi sáng vào buổi sáng.',
    volume: '80ml',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
    ingredients: ['Chiết xuất mật ong', 'Acid hyaluronic', 'Niacinamide'],
  },
];

export const therapists = [
  {
    id: 1,
    name: 'Trần Minh Linh',
    specialty: 'Massage body, Bấm huyệt',
    experience: 5,
    description: 'Chuyên gia massage body với 5 năm kinh nghiệm. Được đào tạo chuyên sâu về kỹ thuật bấm huyệt y học cổ truyền.',
    certifications: ['Chứng chỉ massage body', 'Kỹ thuật bấm huyệt'],
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80',
  },
  {
    id: 2,
    name: 'Nguyễn Hoàng Minh',
    specialty: 'Đá nóng, Foot massage',
    experience: 3,
    description: 'Chuyên gia trị liệu đá nóng với kỹ thuật stone therapy chuyên nghiệp. Kinh nghiệm foot massage cho hàng nghìn khách hàng.',
    certifications: ['Stone therapy certification', 'Foot reflexology'],
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  },
  {
    id: 3,
    name: 'Lê Thị Hương',
    specialty: 'Face treatment, Body wrap',
    experience: 4,
    description: 'Chuyên gia chăm sóc da mặt và body wrap với kiến thức sâu về các sản phẩm thảo mộc và liệu pháp spa cao cấp.',
    certifications: ['Skin care specialist', 'Body treatment certificate'],
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
  },
  {
    id: 4,
    name: 'Phạm Quốc Việt',
    specialty: 'Massage body toàn thân',
    experience: 6,
    description: 'Chuyên gia massage với 6 năm kinh nghiệm. Thành thạo nhiều kỹ thuật massage từ truyền thống đến hiện đại.',
    certifications: ['Swedish massage', 'Deep tissue massage'],
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
  },
];

// Helper function to get service by ID
export const getServiceById = (id) => {
  return services.find(s => s.id === parseInt(id));
};

// Helper function to get cosmetic by ID
export const getCosmeticById = (id) => {
  return cosmetics.find(c => c.id === parseInt(id));
};

// Helper function to get therapist by ID
export const getTherapistById = (id) => {
  return therapists.find(t => t.id === parseInt(id));
};
