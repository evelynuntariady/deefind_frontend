const AUTH_STORAGE_KEY = 'deepguard_auth';
const DETECTIONS_STORAGE_KEY = 'deepguard_detections';
const USERS_STORAGE_KEY = 'deepguard_users';
const FREE_LIMIT = 5;

class AuthManager {
    constructor() {
        this.currentUser = this.loadUser();
    }

    loadUser() {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    }

    saveUser(user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        this.currentUser = user;
    }

    register(email, password, name) {
        // Validation
        if (!email || !password || !name) {
            throw new Error('All fields are required');
        }
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        if (!email.includes('@')) {
            throw new Error('Invalid email address');
        }

        // Check if user exists
        const users = this.getAllUsers();
        if (users.some(u => u.email === email)) {
            throw new Error('Email already registered');
        }

        // Create user with premium subscription
        const user = {
            id: 'user_' + Date.now(),
            email,
            password: this.hashPassword(password),
            name,
            plan: 'premium',
            subscriptionDate: new Date().toISOString(),
            detections: 0
        };

        users.push(user);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        this.saveUser({ id: user.id, email: user.email, name: user.name, plan: user.plan });
        
        return user;
    }

    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.password === this.hashPassword(password));

        if (!user) {
            throw new Error('Invalid email or password');
        }

        this.saveUser({ id: user.id, email: user.email, name: user.name, plan: user.plan });
        return user;
    }

    logout() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        this.currentUser = null;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    isPremium() {
        return this.currentUser?.plan === 'premium';
    }

    getAllUsers() {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    hashPassword(password) {
        // Simple hash - in production use bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(36);
    }
}

class DetectionCounter {
    constructor() {
        this.loadCount();
    }

    loadCount() {
        const stored = localStorage.getItem(DETECTIONS_STORAGE_KEY);
        if (!stored) {
            this.resetCount();
            return;
        }

        const data = JSON.parse(stored);
        const now = new Date();
        const lastReset = new Date(data.lastReset);

        // Reset if month changed
        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            this.resetCount();
        } else {
            this.count = data.count;
        }
    }

    resetCount() {
        this.count = 0;
        localStorage.setItem(DETECTIONS_STORAGE_KEY, JSON.stringify({
            count: 0,
            lastReset: new Date().toISOString()
        }));
    }

    increment() {
        this.count++;
        localStorage.setItem(DETECTIONS_STORAGE_KEY, JSON.stringify({
            count: this.count,
            lastReset: new Date().toISOString()
        }));
    }

    getCount() {
        return this.count;
    }

    canDetect(isPremium) {
        if (isPremium) return true;
        return this.count < FREE_LIMIT;
    }

    getRemainingDetections() {
        return Math.max(0, FREE_LIMIT - this.count);
    }
}

// Global instances
const auth = new AuthManager();
const counter = new DetectionCounter();

// Modal management
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    const container = document.getElementById('auth-container');

    container.innerHTML = `
        <div class="auth-form">
            <div class="auth-tabs">
                <button class="auth-tab ${tab === 'login' ? 'active' : ''}" onclick="switchAuthTab('login')">
                    Sign In
                </button>
                <button class="auth-tab ${tab === 'register' ? 'active' : ''}" onclick="switchAuthTab('register')">
                    Create Account
                </button>
            </div>
            <div id="auth-content"></div>
        </div>
    `;

    switchAuthTab(tab);
    modal.classList.remove('hidden');
}

function switchAuthTab(tab) {
    const content = document.getElementById('auth-content');
    const tabs = document.querySelectorAll('.auth-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'login') {
        content.innerHTML = `
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="login-email" placeholder="your@email.com">
            </div>
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" class="form-input" id="login-password" placeholder="••••••">
            </div>
            <div id="login-error"></div>
            <button class="btn btn-primary btn-wide" onclick="handleLogin()">Sign In</button>
        `;
    } else {
        content.innerHTML = `
            <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" id="register-name" placeholder="Your name">
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="register-email" placeholder="your@email.com">
            </div>
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" class="form-input" id="register-password" placeholder="••••••">
            </div>
            <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input type="password" class="form-input" id="register-confirm" placeholder="••••••">
            </div>
            <div id="register-error"></div>
            <button class="btn btn-primary btn-wide" onclick="handleRegister()">Create Account & Subscribe</button>
            <p style="text-align: center; color: var(--text-secondary); font-size: 0.9rem;">Rp 15,000/month after 7-day trial</p>
        `;
    }
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.innerHTML = '';

    try {
        auth.login(email, password);
        closeAuthModal();
        updateUI();
    } catch (error) {
        errorDiv.innerHTML = `<div class="form-error">${error.message}</div>`;
    }
}

function handleRegister() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorDiv = document.getElementById('register-error');

    errorDiv.innerHTML = '';

    if (password !== confirm) {
        errorDiv.innerHTML = '<div class="form-error">Passwords do not match</div>';
        return;
    }

    try {
        auth.register(email, password, name);
        closeAuthModal();
        updateUI();
    } catch (error) {
        errorDiv.innerHTML = `<div class="form-error">${error.message}</div>`;
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function closeLimitModal() {
    document.getElementById('limit-modal').classList.add('hidden');
}

function openLimitModal() {
    document.getElementById('limit-modal').classList.remove('hidden');
}

function handleLogout() {
    auth.logout();
    counter.resetCount();
    updateUI();
}
