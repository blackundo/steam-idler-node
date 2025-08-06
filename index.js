const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Import các module
const User = require('./models/User');
const SteamService = require('./utils/steamService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const PORT = 8080;

// Cấu hình middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
    secret: 'steam-idler-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Cấu hình EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Cấu hình layout engine
const expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Routes
app.use('/', authRoutes);
app.use('/', userRoutes);

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
    
    // Đăng nhập tất cả user khi server khởi động
    const users = User.readUsers();
    SteamService.loginAllUsers(users);
});
