# Steam Idler - Phiên bản cải tiến

Ứng dụng quản lý Steam accounts với giao diện web hiện đại.

## Cấu trúc dự án

```
├── config/           # Cấu hình database
├── controllers/      # Logic xử lý request
├── middleware/       # Middleware xác thực
├── models/          # Model dữ liệu
├── routes/          # Định nghĩa routes
├── utils/           # Utility functions
├── views/           # EJS templates
│   ├── layouts/     # Layout chính
│   ├── partials/    # Components tái sử dụng
│   ├── auth/        # Templates đăng nhập
│   └── pages/       # Templates trang
├── public/          # Static files
│   ├── css/
│   ├── js/
│   └── images/
└── index.js         # Entry point
```

## Tính năng

- ✅ Quản lý Steam accounts
- ✅ Đăng nhập/đăng xuất
- ✅ Pause/Resume Steam clients
- ✅ TOTP 2FA support
- ✅ Giao diện responsive với Tailwind CSS
- ✅ Template engine EJS
- ✅ Cấu trúc MVC rõ ràng

## Cài đặt

```bash
npm install
npm start
```

## Cấu trúc MVC

- **Models**: Quản lý dữ liệu User
- **Views**: Templates EJS với layout system
- **Controllers**: Xử lý logic business
- **Routes**: Định nghĩa endpoints
- **Middleware**: Xác thực và bảo mật
- **Utils**: Steam service và helpers

## Dễ dàng mở rộng

- Thêm models mới trong `models/`
- Tạo controllers mới trong `controllers/`
- Định nghĩa routes trong `routes/`
- Tạo templates trong `views/`
- Thêm static files trong `public/`
