const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = 8080;

const USERS_FILE = path.join(__dirname, 'users.json');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');

// Quản lý các Steam client đang chạy
const steamClients = {};
// Thêm biến lưu trạng thái user
const userStatus = {};
// Thêm biến lưu trạng thái pause
const userPaused = {};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
	secret: 'steam-idler-secret-key',
	resave: false,
	saveUninitialized: false,
	cookie: { secure: false }
}));

// Middleware kiểm tra đăng nhập
function requireAuth(req, res, next) {
	if (req.session.isAuthenticated) {
		next();
	} else {
		res.redirect('/login');
	}
}

// Đọc users từ file
function readUsers() {
	if (!fs.existsSync(USERS_FILE)) return [];
	return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
// Ghi users vào file
function writeUsers(users) {
	fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Hàm đăng nhập Steam cho 1 user
function loginSteamUser(user) {
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
	var games = [730];  // Enter here AppIDs of the needed games
	var status = 1;  // 1 - online, 7 - invisible

	client.logOn(logOnOptions);
	client.on('loggedOn', () => {
		console.log(`${user.username} - Successfully logged on`);
		client.setPersona(status);
		client.gamesPlayed(games);
		client.setPersona(user.status ? parseInt(user.status) : 1);
		if (user.games) {
			let gamesArr = Array.isArray(user.games) ? user.games : String(user.games).split(',').map(g => parseInt(g.trim())).filter(Boolean);
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

// Hàm pause user (logoff)
function pauseUser(userId) {
	if (steamClients[userId]) {
		steamClients[userId].logOff();
		delete steamClients[userId];
		userStatus[userId] = 'Đã tạm dừng';
		userPaused[userId] = true;

		// Lưu trạng thái pause vào file
		const users = readUsers();
		const userIndex = users.findIndex(u => u.id == userId);
		if (userIndex !== -1) {
			users[userIndex].isRunning = false;
			writeUsers(users);
		}
	}
}

// Hàm resume user (logon lại)
function resumeUser(userId) {
	const users = readUsers();
	const user = users.find(u => u.id == userId);
	if (user) {
		userPaused[userId] = false;

		// Cập nhật trạng thái trong file
		const userIndex = users.findIndex(u => u.id == userId);
		if (userIndex !== -1) {
			users[userIndex].isRunning = true;
			writeUsers(users);
		}

		loginSteamUser(user);
	}
}

// Đăng nhập tất cả user khi server khởi động
function loginAllUsers() {
	const users = readUsers();
	users.forEach(user => {
		// Kiểm tra trạng thái từ file
		if (user.isRunning !== false) {
			userPaused[user.id] = false;
			loginSteamUser(user);
		} else {
			userPaused[user.id] = true;
			userStatus[user.id] = 'Đã tạm dừng';
		}
	});
}

// Trang login
app.get('/login', (req, res) => {
	if (req.session.isAuthenticated) {
		return res.redirect('/');
	}
	res.send(`
    <html>
    <head>
      <title>Đăng nhập - Vào đây làm gì ?</title>
      <link href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" rel=\"stylesheet\">
    </head>
    <body class=\"bg-gray-100 min-h-screen flex flex-col items-center justify-center\">
      <div class=\"bg-white p-8 rounded shadow-md w-full max-w-md\">
        <h2 class=\"text-2xl font-bold mb-4 text-center\">Đăng nhập - Vào đây làm gì ?</h2>
        <form method=\"POST\" action=\"/login\" class=\"space-y-4\">
          <input name=\"username\" placeholder=\"Tài khoản\" required class=\"w-full border p-2 rounded\"/><br/>
          <input name=\"password\" type=\"password\" placeholder=\"Mật khẩu\" required class=\"w-full border p-2 rounded\"/><br/>
          <button type=\"submit\" class=\"w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600\">Đăng nhập</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Xử lý đăng nhập
app.post('/login', (req, res) => {
	const { username, password } = req.body;
	
	if (username === 'admin' && password === 'handsome') {
		req.session.isAuthenticated = true;
		res.redirect('/');
	} else {
		res.send(`
			<html>
			<head>
				<title>Đăng nhập</title>
				<link href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" rel=\"stylesheet\">
			</head>
			<body class=\"bg-gray-100 min-h-screen flex flex-col items-center justify-center\">
				<div class=\"bg-white p-8 rounded shadow-md w-full max-w-md\">
					<h2 class=\"text-2xl font-bold mb-4 text-center\">Đăng nhập</h2>
					<div class=\"bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4\">
						Tài khoản hoặc mật khẩu không đúng!
					</div>
					<form method=\"POST\" action=\"/login\" class=\"space-y-4\">
						<input name=\"username\" placeholder=\"Tài khoản\" required class=\"w-full border p-2 rounded\"/><br/>
						<input name=\"password\" type=\"password\" placeholder=\"Mật khẩu\" required class=\"w-full border p-2 rounded\"/><br/>
						<button type=\"submit\" class=\"w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600\">Đăng nhập</button>
					</form>
				</div>
			</body>
			</html>
		`);
	}
});

// Đăng xuất
app.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect('/login');
});

// Trang chính (cần đăng nhập)
app.get('/', requireAuth, (req, res) => {
	res.send(`
    <html>
    <head>
      <title>Thêm User Steam</title>
      <link href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" rel=\"stylesheet\">
    </head>
    <body class=\"bg-gray-100 min-h-screen flex flex-col items-center justify-center\">
      <div class=\"bg-white p-8 rounded shadow-md w-full max-w-md\">
        <div class=\"flex justify-between items-center mb-4\">
          <h2 class=\"text-2xl font-bold\">Thêm User Steam</h2>
          <a href=\"/logout\" class=\"text-red-500 hover:underline\">Đăng xuất</a>
        </div>
        <form method=\"POST\" action=\"/users\" class=\"space-y-4\">
          <input name=\"username\" placeholder=\"Username\" required class=\"w-full border p-2 rounded\"/><br/>
          <input name=\"password\" type=\"password\" placeholder=\"Password\" required class=\"w-full border p-2 rounded\"/><br/>
          <input name=\"shared_secret\" placeholder=\"Shared Secret\" class=\"w-full border p-2 rounded\"/><br/>
          <input name=\"games\" placeholder=\"List Game (cách nhau bởi dấu phẩy)\" class=\"w-full border p-2 rounded\"/><br/>
          <input name=\"status\" placeholder=\"Status\" value=\"1\" class=\"w-full border p-2 rounded\"/><br/>
          <button type=\"submit\" class=\"w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600\">Thêm User</button>
        </form>
        <div class=\"mt-4 text-center\">
          <a href=\"/users\" class=\"text-blue-500 hover:underline\">Xem danh sách user</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Thêm user
app.post('/users', requireAuth, (req, res) => {
	const users = readUsers();
	const { username, password, shared_secret, games, status } = req.body;
	const id = Date.now();
	const user = {
		id,
		username: username.trim(),
		password: password.trim(),
		shared_secret: shared_secret.trim(),
		games: games.trim(),
		status: status.trim(),
		isRunning: true // Mặc định là running khi tạo mới
	};
	users.push(user);
	writeUsers(users);
	loginSteamUser(user); // Đăng nhập Steam cho user mới
	res.redirect('/users');
});

// Xem danh sách user
app.get('/users', requireAuth, (req, res) => {
	const users = readUsers();
	let html = `
    <html>
    <head>
      <title>Danh sách User</title>
      <link href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" rel=\"stylesheet\">
    </head>
    <body class=\"bg-gray-100 min-h-screen flex flex-col items-center justify-center\">
      <div class=\"bg-white p-8 rounded shadow-md w-full max-w-4xl\">
        <div class=\"flex justify-between items-center mb-4\">
          <h2 class=\"text-2xl font-bold\">Danh sách User</h2>
          <a href=\"/logout\" class=\"text-red-500 hover:underline\">Đăng xuất</a>
        </div>
        <table class=\"w-full table-auto border\">
          <thead>
            <tr class=\"bg-gray-200\">
              <th class=\"p-2 border\">ID</th>
              <th class=\"p-2 border\">Username</th>
              <th class=\"p-2 border\">Trạng thái</th>
              <th class=\"p-2 border\">Hành động</th>
            </tr>
          </thead>
          <tbody>
  `;
	users.forEach(u => {
		const isPaused = userPaused[u.id];
		const statusText = userStatus[u.id] || 'Chưa đăng nhập';
		const statusClass = statusText === 'Hoạt động' ? 'text-green-600' :
			statusText === 'Đã tạm dừng' ? 'text-orange-600' :
				statusText === 'Lỗi' ? 'text-red-600' : 'text-gray-600';

		html += `<tr>
      <td class=\"p-2 border\">${u.id}</td>
      <td class=\"p-2 border\">${u.username}</td>
      <td class=\"p-2 border ${statusClass}\">${statusText}</td>
      <td class=\"p-2 border\">
        <a href=\"/users/${u.id}/totp\" class=\"bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-1\">Mã 2FA</a>
        ${isPaused ?
				`<form style='display:inline' method='POST' action='/users/${u.id}/resume'>
            <button type='submit' class=\"bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 mr-1\">Resume</button>
          </form>` :
				`<form style='display:inline' method='POST' action='/users/${u.id}/pause'>
            <button type='submit' class=\"bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-1\">Pause</button>
          </form>`
			}
        <form style='display:inline' method='POST' action='/users/${u.id}?_method=DELETE'>
          <button type='submit' class=\"bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600\">Xóa</button>
        </form>
      </td>
    </tr>`;
	});
	html += `</tbody></table>
        <div class=\"mt-4 text-center\">
          <a href=\"/\" class=\"text-blue-500 hover:underline\">Thêm user mới</a>
        </div>
      </div>
    </body>
    </html>
  `;
	res.send(html);
});

// Xóa user
app.post('/users/:id', requireAuth, (req, res) => {
	if (req.query._method === 'DELETE') {
		let users = readUsers();
		const userId = req.params.id;
		// Nếu user đang đăng nhập thì logOff
		if (steamClients[userId]) {
			steamClients[userId].logOff();
			delete steamClients[userId];
			userStatus[userId] = 'Đã log off';
		}
		users = users.filter(u => u.id != userId);
		writeUsers(users);
		return res.redirect('/users');
	}
	res.status(400).send('Bad request');
});

// Lấy mã TwoFactorCode của user
app.get('/users/:id/totp', requireAuth, (req, res) => {
	const users = readUsers();
	const user = users.find(u => u.id == req.params.id);
	if (!user) {
		return res.status(404).send('User không tồn tại');
	}
	if (!user.shared_secret) {
		return res.send('User này không có shared_secret');
	}
	const code = SteamTotp.generateAuthCode(user.shared_secret);
	// Tính thời gian còn lại (TOTP có chu kỳ 30 giây)
	const currentTime = SteamTotp.time();
	const timeLeft = 30 - (currentTime % 30);
	
	res.send(`
		<html>
		<head>
			<title>TwoFactorCode - ${user.username}</title>
			<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
		</head>
		<body class="bg-gray-100 min-h-screen flex flex-col items-center justify-center">
			<div class="bg-white p-8 rounded shadow-md w-full max-w-md">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-2xl font-bold">TwoFactorCode</h2>
					<a href="/users" class="text-blue-500 hover:underline">Quay lại</a>
				</div>
				<div class="text-center space-y-4">
					<p class="mb-2"><strong>Username:</strong> ${user.username}</p>
					<div class="bg-gray-100 p-4 rounded-lg">
						<p class="mb-2"><strong>Mã 2FA:</strong></p>
						<div class="flex items-center justify-center space-x-2">
							<span id="code" class="text-2xl font-mono bg-white px-3 py-2 rounded border">${code}</span>
							<button onclick="copyCode()" class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600">
								Copy
							</button>
						</div>
					</div>
					<div class="bg-yellow-100 p-3 rounded-lg">
						<p class="text-sm"><strong>Thời gian còn lại:</strong> <span id="timer" class="font-mono">${timeLeft}</span> giây</p>
					</div>
					<div class="space-x-2">
						<button onclick="location.reload()" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Reload</button>
					</div>
				</div>
			</div>
			
			<script>
				let timeLeft = ${timeLeft};
				const timerElement = document.getElementById('timer');
				const codeElement = document.getElementById('code');
				
				function copyCode() {
					const code = codeElement.textContent;
					navigator.clipboard.writeText(code).then(() => {
						const button = event.target;
						const originalText = button.textContent;
						button.textContent = 'Copied!';
						button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
						button.classList.add('bg-green-500');
						
						setTimeout(() => {
							button.textContent = originalText;
							button.classList.remove('bg-green-500');
							button.classList.add('bg-blue-500', 'hover:bg-blue-600');
						}, 2000);
					}).catch(err => {
						console.error('Lỗi copy:', err);
						alert('Không thể copy code!');
					});
				}
				
				function updateTimer() {
					if (timeLeft > 0) {
						timerElement.textContent = timeLeft;
						timeLeft--;
						setTimeout(updateTimer, 1000);
					} else {
						timerElement.textContent = '0';
						timerElement.classList.add('text-red-600', 'font-bold');
						// Tự động reload sau 1 giây
						setTimeout(() => {
							location.reload();
						}, 1000);
					}
				}
				
				// Bắt đầu đếm ngược
				updateTimer();
			</script>
		</body>
		</html>
	`);
});

// Pause user
app.post('/users/:id/pause', requireAuth, (req, res) => {
	const userId = req.params.id;
	pauseUser(userId);
	res.redirect('/users');
});

// Resume user
app.post('/users/:id/resume', requireAuth, (req, res) => {
	const userId = req.params.id;
	resumeUser(userId);
	res.redirect('/users');
});

app.listen(PORT, () => {
	console.log(`Server chạy tại http://localhost:${PORT}`);
	loginAllUsers();
});
