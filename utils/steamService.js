const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');

// Quản lý các Steam client đang chạy
const steamClients = {};
const userStatus = {};
const userPaused = {};

class SteamService {
    static loginUser(user) {
        // Kiểm tra nếu user đang bị pause thì không đăng nhập
        if (userPaused[user.id]) {
            userStatus[user.id] = 'Đã tạm dừng';
            return;
        }

        const client = new SteamUser();
        const logOnOptions = {
            accountName: user.username,
            password: user.password,
        };

        if (user.shared_secret) {
            const code = SteamTotp.generateAuthCode(user.shared_secret);
            console.log('TwoFactorCode:', code);
            logOnOptions.twoFactorCode = code;
        }

        client.logOn(logOnOptions);

        client.on('loggedOn', () => {
            console.log(`${user.username} - Successfully logged on`);
            client.setPersona(1);
            client.setPersona(user.status ? parseInt(user.status) : 1);
            
            if (user.games) {
                let gamesArr = Array.isArray(user.games) ? user.games : 
                    String(user.games).split(',').map(g => parseInt(g.trim())).filter(Boolean);
                client.gamesPlayed(gamesArr);
            }
            userStatus[user.id] = 'Hoạt động';
        });

        client.on('error', (err) => {
            console.log(`${user.username} - Steam error:`, err.message);
            userStatus[user.id] = 'Lỗi';
        });

        steamClients[user.id] = client;
        userStatus[user.id] = 'Đang đăng nhập...';
    }

    static pauseUser(userId) {
        if (steamClients[userId]) {
            steamClients[userId].logOff();
            delete steamClients[userId];
            userStatus[userId] = 'Đã tạm dừng';
            userPaused[userId] = true;
        }
    }

    static resumeUser(userId) {
        userPaused[userId] = false;
    }

    static loginAllUsers(users) {
        users.forEach(user => {
            if (user.isRunning !== false) {
                userPaused[user.id] = false;
                this.loginUser(user);
            } else {
                userPaused[user.id] = true;
                userStatus[user.id] = 'Đã tạm dừng';
            }
        });
    }

    static getUserStatus(userId) {
        return userStatus[userId] || 'Chưa đăng nhập';
    }

    static isUserPaused(userId) {
        return userPaused[userId] || false;
    }

    static getSteamClients() {
        return steamClients;
    }

    static generateTOTP(sharedSecret) {
        return SteamTotp.generateAuthCode(sharedSecret);
    }

    static getTOTPTimeLeft() {
        const currentTime = SteamTotp.time();
        return 30 - (currentTime % 30);
    }
}

module.exports = SteamService; 