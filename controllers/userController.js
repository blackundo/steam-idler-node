const User = require('../models/User');
const SteamService = require('../utils/steamService');

const userController = {
    showHome: (req, res) => {
        res.render('pages/home', { title: 'Thêm User Steam' });
    },

    showUsers: (req, res) => {
        const users = User.readUsers();
        
        // Helper functions cho template
        const getUserStatus = (userId) => {
            return SteamService.getUserStatus(userId);
        };

        const getUserStatusClass = (userId) => {
            const status = getUserStatus(userId);
            return status === 'Hoạt động' ? 'text-green-600' :
                   status === 'Đã tạm dừng' ? 'text-orange-600' :
                   status === 'Lỗi' ? 'text-red-600' : 'text-gray-600';
        };

        const isUserPaused = (userId) => {
            return SteamService.isUserPaused(userId);
        };

        res.render('pages/users', { 
            title: 'Danh sách User', 
            users,
            getUserStatus,
            getUserStatusClass,
            isUserPaused
        });
    },

    createUser: (req, res) => {
        const userData = req.body;
        const user = User.create(userData);
        SteamService.loginUser(user);
        res.redirect('/users');
    },

    deleteUser: (req, res) => {
        const userId = req.params.id;
        
        // Logoff Steam client nếu đang chạy
        const steamClients = SteamService.getSteamClients();
        if (steamClients[userId]) {
            steamClients[userId].logOff();
        }
        
        User.delete(userId);
        res.redirect('/users');
    },

    pauseUser: (req, res) => {
        const userId = req.params.id;
        SteamService.pauseUser(userId);
        User.updateRunningStatus(userId, false);
        res.redirect('/users');
    },

    resumeUser: (req, res) => {
        const userId = req.params.id;
        const user = User.findById(userId);
        if (user) {
            SteamService.resumeUser(userId);
            User.updateRunningStatus(userId, true);
            SteamService.loginUser(user);
        }
        res.redirect('/users');
    },

    showTOTP: (req, res) => {
        const userId = req.params.id;
        const user = User.findById(userId);
        
        if (!user) {
            return res.status(404).send('User không tồn tại');
        }
        
        if (!user.shared_secret) {
            return res.send('User này không có shared_secret');
        }
        
        const code = SteamService.generateTOTP(user.shared_secret);
        const timeLeft = SteamService.getTOTPTimeLeft();
        
        res.render('pages/totp', { 
            title: `TwoFactorCode - ${user.username}`,
            user, 
            code, 
            timeLeft 
        });
    }
};

module.exports = userController; 