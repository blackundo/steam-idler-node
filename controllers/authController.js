const authController = {
    showLogin: (req, res) => {
        if (req.session.isAuthenticated) {
            return res.redirect('/');
        }
        res.render('auth/login', { title: 'Đăng nhập' });
    },

    login: (req, res) => {
        const { username, password } = req.body;
        
        if (username === 'admin' && password === 'handsome') {
            req.session.isAuthenticated = true;
            res.redirect('/');
        } else {
            res.render('auth/login', { 
                title: 'Đăng nhập',
                error: 'Tài khoản hoặc mật khẩu không đúng!' 
            });
        }
    },

    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    }
};

module.exports = authController; 