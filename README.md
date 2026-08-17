# Omamori Spa Frontend

Frontend cho hệ thống quản lý dịch vụ Spa.

## Công nghệ

- React 18
- React Router v6
- Vite
- clsx

## Cài đặt

```bash
npm install
```

## Chạy development

```bash
npm run dev
```

## Build production

```bash
npm run build
```

## Cấu trúc thư mục

```
src/
├── app/
│   ├── layouts/       # Layouts cho từng role
│   └── router/        # Routing và RouteGuard
├── components/
│   └── common/        # Components dùng chung
├── features/
│   ├── auth/          # Authentication
│   ├── public/        # Trang công khai
│   ├── customer/       # Trang khách hàng
│   ├── therapist/      # Trang chuyên gia
│   └── admin/          # Trang quản trị
├── services/          # API services
├── hooks/             # Custom hooks
├── utils/             # Utility functions
└── styles/            # Global styles
```

## Demo Accounts

- customer@omamori.vn - Vai trò: Khách hàng
- therapist@omamori.vn - Vai trò: Chuyên gia
- admin@omamori.vn - Vai trò: Quản trị

## Design System

- Màu nền: Ivory (#FEFEF8)
- Màu xanh spa: Deep Green (#2D5A4A)
- Text: Charcoal (#2C2C2C)
- Accent: Warm Gold (#C9A959)
