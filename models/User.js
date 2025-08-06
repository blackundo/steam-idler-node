const fs = require('fs');
const { USERS_FILE } = require('../config/database');

class User {
    static readUsers() {
        if (!fs.existsSync(USERS_FILE)) return [];
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }

    static writeUsers(users) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }

    static findById(id) {
        const users = this.readUsers();
        return users.find(u => u.id == id);
    }

    static create(userData) {
        const users = this.readUsers();
        const id = Date.now();
        const user = {
            id,
            username: userData.username.trim(),
            password: userData.password.trim(),
            shared_secret: userData.shared_secret?.trim() || '',
            games: userData.games?.trim() || '',
            status: userData.status?.trim() || '1',
            isRunning: true
        };
        users.push(user);
        this.writeUsers(users);
        return user;
    }

    static delete(id) {
        let users = this.readUsers();
        users = users.filter(u => u.id != id);
        this.writeUsers(users);
    }

    static updateRunningStatus(id, isRunning) {
        const users = this.readUsers();
        const userIndex = users.findIndex(u => u.id == id);
        if (userIndex !== -1) {
            users[userIndex].isRunning = isRunning;
            this.writeUsers(users);
        }
    }
}

module.exports = User; 