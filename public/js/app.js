const { createApp } = Vue;

createApp({
    data() {
        return {
            user: null,
            token: localStorage.getItem('token'),
            loading: false,
            message: null,
            currentTab: 'notifications',
            
            // 路由状态
            currentRoute: '/',
            
            // 夜间模式状态
            darkMode: localStorage.getItem('darkMode') === 'true' || false,
            
            // 移动端菜单状态
            showMobileMenu: false,
            
            // 语言相关状态
            currentLanguage: localStorage.getItem('language') || 'zh',
            showLanguageDropdown: false,
            
            // 弹窗状态
            showLogin: false,
            showRegister: false,
            showPassiveSubscription: false,
            
            // 确认弹窗状态
            showConfirm: false,
            confirmData: {
                title: '',
                message: '',
                type: 'normal', // 'normal' 或 'danger'
                confirmText: '',
                onConfirm: null
            },
            
            // 表单数据
            loginForm: {
                email: '',
                password: ''
            },
            registerForm: {
                username: '',
                email: '',
                password: ''
            },
            passiveForm: {
                apiUrl: ''
            },
            
            // 数据
            notifications: [],
            subscriptions: [],
            stats: {},
            notifyCode: null,
            servicePreview: null,
            pollingTriggers: new Map(), // 记录各订阅的触发状态和冷却时间
            
            // 通知详情弹窗
            showNotificationModal: false,
            selectedNotification: null,
            
            // 分页和筛选
            filters: {
                type: '',
                priority: '',
                read: '',
                days: '',
                service: '',
                mode: ''
            },
            currentPage: 1,
            itemsPerPage: 10,
            
            categories: {
                sources: [],
                types: [],
                priorities: [],
                times: {}
            },
            showFilters: false,
            
            // 下拉组件状态
            dropdownStates: {
                type: false,
                priority: false,
                read: false,
                days: false,
                service: false,
                mode: false,
                mobileTab: false,
                language: false
            },
            
            // 文档相关状态
            documentContent: '',
            tableOfContents: '',
            documentLoading: false,
            documentError: null,
            showBackToTop: false,
            
            // 邮箱验证相关状态
            emailVerification: {
                isVerifying: false,
                isSending: false,
                code: '',
                showCodeInput: false,
                codeSent: false,
                remainingTime: 0,
                timer: null
            }
        };
    },
    
    computed: {
        // 获取当前语言的翻译对象
        t() {
            return i18n[this.currentLanguage] || i18n.zh;
        },
        
        // 判断是否在首页
        isHomePage() {
            return this.currentRoute === '/';
        },
        
        // 判断是否在用户页面
        isUserPage() {
            return this.currentRoute === '/user';
        },
        
        // 判断是否在文档页面
        isDocsPage() {
            return this.currentRoute.startsWith('/docs');
        },
        
        // 获取当前文档类型
        currentDocType() {
            if (this.currentRoute === '/docs/developer-guide') {
                return 'developer';
            }
            return 'user'; // 默认为用户文档
        },
        
        // 统计数据计算属性
        totalNotifications() {
            return this.notifications.length;
        },
        
        unreadNotifications() {
            return this.notifications.filter(n => !this.isNotificationRead(n)).length;
        },
        
        todayNotifications() {
            const today = new Date().toDateString();
            return this.notifications.filter(n => {
                const timestamp = n.timestamp || n.receivedAt;
                if (!timestamp) return false;
                try {
                    return new Date(timestamp).toDateString() === today;
                } catch (error) {
                    return false;
                }
            }).length;
        },
        
        totalSubscriptions() {
            return this.subscriptions.length;
        },
        
        // 服务列表（去重）
        servicesList() {
            const services = new Set();
            // 从通知数据中获取服务列表，而不是订阅数据
            this.notifications.forEach(notification => {
                if (notification.subscription) {
                    let serviceName = '';
                    if (notification.subscription.name) {
                        serviceName = notification.subscription.name;
                    } else if (notification.subscription.url) {
                        try {
                            const url = new URL(notification.subscription.url);
                            serviceName = url.host;
                        } catch (e) {
                            serviceName = notification.subscription.url;
                        }
                    } else {
                        serviceName = this.t.messages.unknownSource;
                    }
                    services.add(serviceName);
                } else if (notification.source && notification.source.name) {
                    services.add(notification.source.name);
                }
            });
            return Array.from(services).sort();
        },
        
        // 模式列表
        modesList() {
            return [
                { value: 'active', label: this.t.user.notifications.filters.activeMode },
                { value: 'passive', label: this.t.user.notifications.filters.passiveMode }
            ];
        },
        
        // 筛选后的通知
        filteredNotifications() {
            let result = [...this.notifications];
            
            if (this.filters.type) {
                result = result.filter(n => n.type === this.filters.type);
            }
            if (this.filters.priority) {
                result = result.filter(n => n.priority === this.filters.priority);
            }
            if (this.filters.read !== '') {
                result = result.filter(n => this.isNotificationRead(n) === (this.filters.read === 'true'));
            }
            if (this.filters.days) {
                const days = parseInt(this.filters.days);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                result = result.filter(n => {
                    const timestamp = n.timestamp || n.receivedAt;
                    if (!timestamp) return false;
                    try {
                        return new Date(timestamp) >= cutoffDate;
                    } catch (error) {
                        return false;
                    }
                });
            }
            if (this.filters.service) {
                result = result.filter(n => {
                    let serviceName = '';
                    
                    if (n.subscription) {
                        if (n.subscription.name) {
                            serviceName = n.subscription.name;
                        } else if (n.subscription.url) {
                            try {
                                const url = new URL(n.subscription.url);
                                serviceName = url.host;
                            } catch (e) {
                                serviceName = n.subscription.url;
                            }
                        } else {
                            serviceName = this.t.messages.unknownSource;
                        }
                    } else if (n.source && n.source.name) {
                        serviceName = n.source.name;
                    } else {
                        serviceName = this.t.messages.unknownSource;
                    }
                    
                    return serviceName === this.filters.service;
                });
            }
            if (this.filters.mode) {
                result = result.filter(n => {
                    return n.subscription && n.subscription.mode === this.filters.mode;
                });
            }
            
            return result.sort((a, b) => {
                const timeA = a.timestamp || a.receivedAt;
                const timeB = b.timestamp || b.receivedAt;
                return new Date(timeB) - new Date(timeA);
            });
        },
        
        // 分页相关
        totalPages() {
            return Math.ceil(this.filteredNotifications.length / this.itemsPerPage);
        },
        
        paginatedNotifications() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredNotifications.slice(start, end);
        },
        
        // 支持参数化的翻译文本获取
        getText() {
            return (key, params = {}) => {
                const keys = key.split('.');
                let text = this.t;
                
                for (const k of keys) {
                    text = text[k];
                    if (!text) return key;
                }
                
                // 替换参数
                if (typeof text === 'string' && Object.keys(params).length > 0) {
                    return text.replace(/\{(\w+)\}/g, (match, paramKey) => {
                        return params[paramKey] !== undefined ? params[paramKey] : match;
                    });
                }
                
                return text;
            };
        }
    },
    
    mounted() {
        this.initAxios();
        this.initDarkMode();
        
        // 设置初始页面标题
        document.title = this.currentLanguage === 'zh' 
            ? '回声 (Huisheen) - 通知接收平台' 
            : 'Huisheen (Echo) - Notification Platform';
        
        // 如果有token，先尝试加载用户数据，然后初始化路由
        if (this.token) {
            this.loadUserData().then(() => {
                this.initRouter();
            }).catch(() => {
                // 如果token无效，清除并初始化路由
                this.logout(true); // 跳过导航，避免初始化时的路由问题
                this.initRouter();
            });
        } else {
            // 没有token直接初始化路由
            this.initRouter();
        }
        
        // 每秒更新一次冷却时间显示
        setInterval(() => {
            this.$forceUpdate();
        }, 1000);
        
        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                this.closeAllDropdowns();
            }
        });
        
        // 监听滚动事件，用于返回顶部按钮
        window.addEventListener('scroll', this.handleScroll);
    },
    
    methods: {
        // 初始化路由
        initRouter() {
            // 获取当前路径
            this.currentRoute = window.location.pathname;
            
            // 监听浏览器前进后退
            window.addEventListener('popstate', () => {
                this.currentRoute = window.location.pathname;
                this.handleRouteChange();
            });
            
            // 处理初始路由
            this.handleRouteChange();
        },
        
        // 路由导航
        navigateTo(path) {
            // 分离路径和hash
            const [pathname, hash] = path.split('#');
            
            if (this.currentRoute === pathname) {
                // 如果路径相同但有hash，只需滚动到指定位置
                if (hash) {
                    // 更新URL hash
                    window.location.hash = hash;
                    // 延迟滚动，确保内容已渲染
                    setTimeout(() => {
                        this.scrollToSection(decodeURIComponent(hash));
                    }, 100);
                }
                return;
            }
            
            this.currentRoute = pathname;
            // 完整的URL包含hash
            const fullPath = hash ? `${pathname}#${hash}` : pathname;
            window.history.pushState({}, '', fullPath);
            this.handleRouteChange();
        },
        
        // 处理路由变化
        handleRouteChange() {
            // 关闭移动端菜单
            this.showMobileMenu = false;
            
            // 处理文档路由
            if (this.currentRoute === '/docs') {
                // /docs 默认跳转到 /docs/user-guide
                this.navigateTo('/docs/user-guide');
                return;
            }
            
            // 如果是文档页面，加载对应文档
            if (this.isDocsPage) {
                this.loadDocument();
                return;
            }
            
            // 检查用户权限 - 如果访问用户页面但既没有用户信息也没有token
            if (this.currentRoute === '/user' && !this.user && !this.token) {
                // 如果访问用户页面但未登录，跳转到首页并显示登录弹窗
                this.navigateTo('/');
                this.showLogin = true;
                return;
            }
            
            // 如果有token但没有用户信息，尝试加载用户数据
            if (this.currentRoute === '/user' && this.token && !this.user) {
                this.loadUserData().catch(() => {
                    // 如果加载失败（token无效），跳转到首页
                    this.navigateTo('/');
                    this.showLogin = true;
                });
                return;
            }
            
            // 如果已登录用户访问首页，可以选择跳转到用户页面
            // if (this.currentRoute === '/' && this.user) {
            //     this.navigateTo('/user');
            //     return;
            // }
        },
        
        // 初始化夜间模式
        initDarkMode() {
            // 应用夜间模式到document.documentElement
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
                // 设置暗色主题
                const markdownTheme = document.getElementById('markdown-theme');
                const highlightTheme = document.getElementById('highlight-theme');
                if (markdownTheme) {
                    markdownTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.4.0/github-markdown-dark.min.css';
                }
                if (highlightTheme) {
                    highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
                }
            } else {
                document.documentElement.classList.remove('dark');
                // 设置亮色主题
                const markdownTheme = document.getElementById('markdown-theme');
                const highlightTheme = document.getElementById('highlight-theme');
                if (markdownTheme) {
                    markdownTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.4.0/github-markdown-light.min.css';
                }
                if (highlightTheme) {
                    highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
                }
            }
        },
        
        // 切换夜间模式
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode.toString());
            
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
                // 切换到暗色主题
                const markdownTheme = document.getElementById('markdown-theme');
                const highlightTheme = document.getElementById('highlight-theme');
                if (markdownTheme) {
                    markdownTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.4.0/github-markdown-dark.min.css';
                }
                if (highlightTheme) {
                    highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
                }
            } else {
                document.documentElement.classList.remove('dark');
                // 切换到亮色主题
                const markdownTheme = document.getElementById('markdown-theme');
                const highlightTheme = document.getElementById('highlight-theme');
                if (markdownTheme) {
                    markdownTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.4.0/github-markdown-light.min.css';
                }
                if (highlightTheme) {
                    highlightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
                }
            }
            
            this.showMessage(this.darkMode ? this.t.messages.darkModeOn : this.t.messages.lightModeOn);
        },
        
        // 切换语言
        toggleLanguage(lang) {
            if (lang && lang !== this.currentLanguage) {
                this.currentLanguage = lang;
                localStorage.setItem('language', lang);
                this.closeAllDropdowns();
                
                // 动态更新页面标题
                document.title = this.currentLanguage === 'zh' 
                    ? '回声 (Huisheen) - 通知接收平台' 
                    : 'Huisheen (Echo) - Notification Platform';
                
                // 显示切换成功消息
                const message = lang === 'zh' ? '已切换到中文' : 'Switched to English';
                this.showMessage(message);
                
                // 如果在文档页面，重新加载文档
                if (this.isDocsPage) {
                    this.loadDocument();
                }
            }
        },
        
        // 显示确认弹窗
        showConfirmDialog(options) {
            return new Promise((resolve) => {
                this.confirmData = {
                    title: options.title || '确认操作',
                    message: options.message || '您确定要执行此操作吗？',
                    type: options.type || 'normal',
                    confirmText: options.confirmText || '确认',
                    onConfirm: resolve
                };
                this.showConfirm = true;
            });
        },
        
        // 确认操作
        confirmAction() {
            this.showConfirm = false;
            if (this.confirmData.onConfirm) {
                this.confirmData.onConfirm(true);
            }
        },
        
        // 取消确认
        cancelConfirm() {
            this.showConfirm = false;
            if (this.confirmData.onConfirm) {
                this.confirmData.onConfirm(false);
            }
        },
        
        // 初始化axios
        initAxios() {
            axios.defaults.baseURL = '/api';
            if (this.token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
            }
        },
        
        // 显示消息
        showMessage(text, type = 'success') {
            this.message = { text, type };
            setTimeout(() => {
                this.message = null;
            }, 3000);
        },
        
        // 登录
        async login() {
            try {
                this.loading = true;
                const response = await axios.post('/auth/login', this.loginForm);
                
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('token', this.token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
                
                this.showLogin = false;
                this.loginForm = { email: '', password: '' };
                this.showMessage(this.t.messages.loginSuccess);
                
                // 登录成功后跳转到用户页面
                this.navigateTo('/user');
                this.loadUserData();
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.loginFailed, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 注册
        async register() {
            try {
                this.loading = true;
                const response = await axios.post('/auth/register', this.registerForm);
                
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('token', this.token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
                
                this.showRegister = false;
                this.registerForm = { username: '', email: '', password: '' };
                this.showMessage(this.t.messages.registerSuccess);
                
                // 注册成功后跳转到用户页面
                this.navigateTo('/user');
                this.loadUserData();
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.registerFailed, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 退出登录
        logout(skipNavigation = false) {
            this.user = null;
            this.token = null;
            this.notifications = [];
            this.subscriptions = [];
            this.stats = {};
            this.notifyCode = null;
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            
            // 退出登录后跳转到首页（除非明确跳过导航）
            if (!skipNavigation) {
                this.navigateTo('/');
                this.showMessage(this.t.messages.logoutSuccess);
            }
        },
        
        // 加载用户数据
        async loadUserData() {
            try {
                await Promise.all([
                    this.loadUserInfo(),
                    this.loadNotifications(),
                    this.loadSubscriptions(),
                    this.loadStats()
                ]);
            } catch (error) {
                console.error('Failed to load user data:', error);
                if (error.response?.status === 401) {
                    this.logout();
                }
            }
        },
        
        // 加载用户信息
        async loadUserInfo() {
            const response = await axios.get('/auth/me');
            this.user = response.data.user;
        },
        
        // 加载通知列表
        async loadNotifications() {
            try {
                const params = new URLSearchParams();
                
                // 添加筛选参数
                if (this.filters.type) params.append('type', this.filters.type);
                if (this.filters.priority) params.append('priority', this.filters.priority);
                if (this.filters.read !== '') params.append('read', this.filters.read === 'true');
                if (this.filters.days) params.append('days', this.filters.days);
                
                const queryString = params.toString();
                const url = queryString ? `/notifications?${queryString}` : '/notifications';
                
                const response = await axios.get(url);
                this.notifications = response.data.notifications;
            } catch (error) {
                console.error('Failed to load notifications:', error);
            }
        },
        
        // 加载订阅列表
        async loadSubscriptions() {
            try {
                const response = await axios.get('/subscriptions');
                this.subscriptions = response.data.subscriptions;
            } catch (error) {
                console.error('Failed to load subscriptions:', error);
            }
        },
        
        // 加载统计信息
        async loadStats() {
            try {
                const response = await axios.get('/notifications/stats');
                this.stats = response.data;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        },
        
        // 生成通知标识码
        async generateNotifyCode() {
            try {
                const response = await axios.post('/auth/generate-notify-code');
                this.notifyCode = response.data.notifyCode;
                this.currentTab = 'settings';
                this.showMessage(this.t.messages.generateCodeSuccess);
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.generateCodeFailed, 'error');
            }
        },
        
        // 发送邮箱验证码
        async sendEmailVerification() {
            try {
                this.emailVerification.isSending = true;
                const response = await axios.post('/auth/send-email-verification');
                
                this.emailVerification.codeSent = true;
                this.emailVerification.showCodeInput = true;
                this.emailVerification.code = '';
                this.showMessage(response.data.message);
                
                // 开始倒计时
                this.startVerificationTimer();
                
            } catch (error) {
                this.showMessage(error.response?.data?.error || '发送验证码失败', 'error');
            } finally {
                this.emailVerification.isSending = false;
            }
        },
        
        // 验证邮箱验证码
        async verifyEmailCode() {
            if (!this.emailVerification.code || this.emailVerification.code.length !== 6) {
                this.showMessage('请输入6位验证码', 'error');
                return;
            }
            
            try {
                this.emailVerification.isVerifying = true;
                const response = await axios.post('/auth/verify-email', {
                    code: this.emailVerification.code
                });
                
                // 更新用户信息
                if (this.user) {
                    this.user.isEmailVerified = response.data.isEmailVerified;
                }
                
                // 重置验证状态
                this.resetEmailVerificationState();
                
                this.showMessage(response.data.message);
                
            } catch (error) {
                this.showMessage(error.response?.data?.error || '验证失败', 'error');
            } finally {
                this.emailVerification.isVerifying = false;
            }
        },
        
        // 开始验证码倒计时
        startVerificationTimer() {
            this.emailVerification.remainingTime = 300; // 5分钟倒计时
            
            if (this.emailVerification.timer) {
                clearInterval(this.emailVerification.timer);
            }
            
            this.emailVerification.timer = setInterval(() => {
                this.emailVerification.remainingTime--;
                
                if (this.emailVerification.remainingTime <= 0) {
                    this.stopVerificationTimer();
                }
            }, 1000);
        },
        
        // 停止验证码倒计时
        stopVerificationTimer() {
            if (this.emailVerification.timer) {
                clearInterval(this.emailVerification.timer);
                this.emailVerification.timer = null;
            }
            this.emailVerification.remainingTime = 0;
        },
        
        // 重置邮箱验证状态
        resetEmailVerificationState() {
            this.emailVerification.showCodeInput = false;
            this.emailVerification.codeSent = false;
            this.emailVerification.code = '';
            this.emailVerification.isVerifying = false;
            this.emailVerification.isSending = false;
            this.stopVerificationTimer();
        },
        
        // 格式化倒计时时间
        formatRemainingTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        },
        
        // 创建被动订阅
        async createPassiveSubscription() {
            try {
                this.loading = true;
                await axios.post('/subscriptions/passive', this.passiveForm);
                
                this.showPassiveSubscription = false;
                this.passiveForm = {
                    apiUrl: ''
                };
                this.servicePreview = null;
                this.showMessage(this.t.messages.subscriptionCreated);
                this.loadSubscriptions();
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.subscriptionCreateFailed, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 预览服务信息
        async previewService() {
            if (!this.passiveForm.apiUrl) return;
            
            try {
                this.loading = true;
                this.servicePreview = null;
                
                // 从API URL推导服务信息端点
                const url = new URL(this.passiveForm.apiUrl);
                const baseUrl = `${url.protocol}//${url.host}`;
                const serviceInfoUrl = `${baseUrl}/api/service-info`;
                
                const response = await axios.get(serviceInfoUrl);
                this.servicePreview = response.data;
                this.showMessage(this.t.messages.serviceInfoFetched);
            } catch (error) {
                this.showMessage(this.t.messages.serviceInfoFetchFailed, 'error');
                console.error('Failed to fetch service info:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // 切换订阅状态
        async toggleSubscription(subscription) {
            try {
                await axios.patch(`/subscriptions/${subscription.id}/status`, {
                    isActive: !subscription.isActive
                });
                subscription.isActive = !subscription.isActive;
                const statusText = subscription.isActive ? this.t.user.subscriptions.status.enabled : this.t.user.subscriptions.status.disabled;
                this.showMessage(`${this.t.messages.subscriptionToggled} - ${statusText}`);
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.operationFailed, 'error');
            }
        },
        
        // 删除订阅（带确认）
        async deleteSubscription(subscriptionId) {
            const confirmed = await this.showConfirmDialog({
                title: '删除订阅',
                message: '确定要删除这个订阅吗？删除后将不再接收此订阅的通知。',
                type: 'danger',
                confirmText: '删除'
            });

            if (!confirmed) return;

            try {
                this.loading = true;
                await axios.delete(`/subscriptions/${subscriptionId}`);
                this.subscriptions = this.subscriptions.filter(s => s.id !== subscriptionId);
                this.showMessage(this.t.messages.subscriptionDeleted);
                this.loadStats();
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.subscriptionDeleteFailed, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 查看通知详情
        async viewNotificationDetail(notificationId) {
            try {
                this.loading = true;
                const response = await axios.get(`/notifications/${notificationId}`);
                this.selectedNotification = response.data.notification;
                this.showNotificationModal = true;
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.notificationDetailFailed, 'error');
            } finally {
                this.loading = false;
            }
        },

        // 处理通知点击 - 如果有回调链接则跳转，否则显示详情
        handleNotificationClick(notification) {
            if (notification.callbackUrl) {
                // 在新标签页打开回调链接
                window.open(notification.callbackUrl, '_blank');
                
                // 同时标记为已读
                if (!notification.isRead) {
                    this.markAsRead(notification.id);
                }
            } else {
                // 显示通知详情
                this.viewNotificationDetail(notification.id);
            }
        },

        // 格式化JSON数据显示
        formatJsonData(data) {
            if (!data) return '';
            try {
                return JSON.stringify(data, null, 2);
            } catch (error) {
                return this.t.messages.formatDataFailed;
            }
        },

        // 复制JSON数据到剪贴板
        async copyJsonData(data) {
            try {
                const jsonString = this.formatJsonData(data);
                await this.copyToClipboard(jsonString);
            } catch (error) {
                this.showMessage(this.t.messages.copyFailed, 'error');
            }
        },

        // 标记通知为已读
        async markAsRead(notificationId) {
            try {
                await axios.patch(`/notifications/${notificationId}/read`);
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.isRead = true;
                    notification.readAt = new Date().toISOString();
                }
                this.loadStats();
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.operationFailed, 'error');
            }
        },
        
        // 删除通知（带确认）
        async deleteNotification(notificationId) {
            const confirmed = await this.showConfirmDialog({
                title: this.t.confirmDialog.deleteNotification.title,
                message: this.t.confirmDialog.deleteNotification.message,
                type: 'danger',
                confirmText: this.t.confirmDialog.deleteNotification.confirm
            });

            if (!confirmed) return;

            try {
                this.loading = true;
                await axios.delete(`/notifications/${notificationId}`);
                this.notifications = this.notifications.filter(n => n.id !== notificationId);
                this.showMessage(this.t.messages.notificationDeleted);
                this.loadStats();
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.notificationDeleteFailed, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 复制到剪贴板
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                this.showMessage(this.t.messages.copySuccess);
            } catch (error) {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showMessage(this.t.messages.copySuccess);
            }
        },
        
        // 格式化用户名显示
        formatUsername(username) {
            if (!username) return '';
            // 如果用户名太长，截断并添加省略号
            return username.length > 20 ? username.substring(0, 20) + '...' : username;
        },
        
        // 格式化日期
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            
            // 小于1分钟
            if (diff < 60000) {
                return this.t.common.justNow;
            }
            // 小于1小时
            if (diff < 3600000) {
                return Math.floor(diff / 60000) + this.t.common.minutesAgo;
            }
            // 小于1天
            if (diff < 86400000) {
                return Math.floor(diff / 3600000) + this.t.common.hoursAgo;
            }
            // 小于7天
            if (diff < 604800000) {
                return Math.floor(diff / 86400000) + this.t.common.daysAgo;
            }
            
            // 超过7天显示具体日期
            return date.toLocaleDateString(this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        // 获取通知类型图标
        getTypeIcon(type) {
            const icons = {
                info: 'fas fa-info-circle text-blue-500',
                warning: 'fas fa-exclamation-triangle text-yellow-500',
                error: 'fas fa-times-circle text-red-500',
                success: 'fas fa-check-circle text-green-500'
            };
            return icons[type] || icons.info;
        },
        
        // 获取优先级样式
        getPriorityClass(priority) {
            const classes = {
                low: 'text-gray-500',
                normal: 'text-blue-500',
                high: 'text-orange-500',
                urgent: 'text-red-500'
            };
            return classes[priority] || classes.normal;
        },
        
        // 获取优先级文本
        getPriorityText(priority) {
            const priorities = {
                'low': '低',
                'normal': '普通',
                'high': '高',
                'urgent': '紧急'
            };
            return priorities[priority] || priority;
        },
        
        // 获取同一服务的其他模式订阅数量
        getOtherModeCount(serviceHost) {
            return this.subscriptions.filter(s => 
                s.serviceHost === serviceHost
            ).length - 1;
        },
        
        // 获取同一服务的其他模式订阅
        getOtherModeSubscriptions(serviceHost, currentMode) {
            return this.subscriptions.filter(s => 
                s.serviceHost === serviceHost && s.mode !== currentMode
            );
        },
        
        // 获取其他模式的文本描述
        getOtherModeText(currentMode) {
            return currentMode === 'active' ? '被动' : '主动';
        },

        // 手动触发被动轮询
        async triggerPassivePoll(subscription) {
            try {
                this.pollingTriggers.set(subscription.id, { loading: true });
                
                const response = await axios.post(`/subscriptions/${subscription.id}/trigger-poll`);
                
                this.showMessage(this.getText('messages.pollSuccess', { count: response.data.result.newNotifications }));
                
                // 重新加载通知和订阅列表
                this.loadNotifications();
                this.loadSubscriptions();
                this.loadStats();
                
                // 设置冷却状态
                this.pollingTriggers.set(subscription.id, { 
                    loading: false, 
                    lastTrigger: new Date(),
                    cooldownUntil: new Date(Date.now() + 60000) // 1分钟冷却
                });
                
                // 1分钟后清除冷却状态
                setTimeout(() => {
                    this.pollingTriggers.delete(subscription.id);
                }, 60000);
                
            } catch (error) {
                this.pollingTriggers.set(subscription.id, { loading: false });
                
                if (error.response?.status === 429) {
                    const remainingSeconds = error.response.data.remainingSeconds;
                    this.showMessage(this.getText('messages.pollCooldown', { seconds: remainingSeconds }), 'error');
                    
                    // 设置剩余冷却时间
                    this.pollingTriggers.set(subscription.id, {
                        loading: false,
                        cooldownUntil: new Date(Date.now() + remainingSeconds * 1000)
                    });
                    
                    // 剩余时间后清除冷却状态
                    setTimeout(() => {
                        this.pollingTriggers.delete(subscription.id);
                    }, remainingSeconds * 1000);
                } else {
                    this.showMessage(error.response?.data?.error || this.t.messages.pollFailed, 'error');
                }
            }
        },

        // 检查订阅是否在冷却期
        isSubscriptionInCooldown(subscriptionId) {
            const trigger = this.pollingTriggers.get(subscriptionId);
            if (!trigger) return false;
            
            return trigger.loading || (trigger.cooldownUntil && new Date() < trigger.cooldownUntil);
        },

        // 获取订阅的冷却剩余时间（秒）
        getSubscriptionCooldownRemaining(subscriptionId) {
            const trigger = this.pollingTriggers.get(subscriptionId);
            if (!trigger || !trigger.cooldownUntil) return 0;
            
            const remaining = Math.ceil((trigger.cooldownUntil.getTime() - Date.now()) / 1000);
            return Math.max(0, remaining);
        },

        // 检查订阅是否正在加载
        isSubscriptionLoading(subscriptionId) {
            const trigger = this.pollingTriggers.get(subscriptionId);
            return trigger?.loading || false;
        },
        
        // 加载分类统计信息
        async loadCategories() {
            try {
                const response = await axios.get('/notifications/categories/stats');
                this.categories = response.data;
            } catch (error) {
                console.error('Failed to load categories:', error);
            }
        },
        
        // 批量标记所有通知为已读（带确认）
        async markAllAsRead() {
            const unreadCount = this.unreadNotifications;
            if (unreadCount === 0) {
                this.showMessage(this.t.confirmDialog.noUnreadNotifications, 'error');
                return;
            }

            const confirmed = await this.showConfirmDialog({
                title: this.t.confirmDialog.markAllAsRead.title,
                message: this.t.confirmDialog.markAllAsRead.message,
                confirmText: this.t.confirmDialog.markAllAsRead.confirm
            });

            if (!confirmed) return;

            try {
                this.loading = true;
                await axios.patch('/notifications/all/read');
                this.notifications.forEach(n => n.isRead = true);
                this.showMessage(this.getText('confirmDialog.markedNotificationsAsRead', { count: unreadCount }));
                this.loadStats();
            } catch (error) {
                this.showMessage(error.response?.data?.error || this.t.messages.operationFailed, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 应用筛选
        async applyFilters() {
            await this.loadNotifications();
        },
        
        // 清空筛选
        async clearFilters() {
            this.filters = {
                type: '',
                priority: '',
                read: '',
                days: '',
                service: '',
                mode: ''
            };
            this.closeAllDropdowns();
            await this.loadNotifications();
        },
        
        // 获取类型文本
        getTypeText(type) {
            const texts = {
                info: '信息',
                success: '成功',
                warning: '警告',
                error: '错误'
            };
            return texts[type] || '信息';
        },
        
        // 获取时间范围文本
        getTimeRangeText(timeRange) {
            const ranges = {
                'today': '今天',
                'yesterday': '昨天',
                'thisWeek': '本周',
                'thisMonth': '本月',
                'older': '更早'
            };
            return ranges[timeRange] || timeRange;
        },
        
        // 刷新通知
        async refreshNotifications() {
            await this.loadNotifications();
            this.showMessage(this.t.messages.notificationsRefreshed);
        },
        
        // 导出通知
        async exportNotifications() {
            try {
                const notifications = this.filteredNotifications;
                if (notifications.length === 0) {
                    this.showMessage(this.t.messages.noNotificationsToExport, 'error');
                    return;
                }
                
                const dataStr = JSON.stringify(notifications, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `notifications_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showMessage(this.getText('messages.notificationsExported', { count: notifications.length }));
            } catch (error) {
                this.showMessage(this.t.messages.exportFailed, 'error');
            }
        },
        
        // 显示通知详情
        showNotificationDetail(notification) {
            this.selectedNotification = notification;
            this.showNotificationModal = true;
        },
        
        // 打开回调链接
        openCallback(url) {
            window.open(url, '_blank');
        },
        
        // 获取类型颜色
        getTypeColor(type) {
            const colors = {
                info: '#3b82f6',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444'
            };
            return colors[type] || colors.info;
        },
        
        // 获取类型样式类
        getTypeClass(type) {
            const classes = {
                info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
                warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
                error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            };
            return classes[type] || classes.info;
        },
        
        // 获取优先级样式类
        getPriorityClass(priority) {
            const classes = {
                low: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200',
                normal: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
                high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
                urgent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            };
            return classes[priority] || classes.normal;
        },
        
        // 获取优先级文本
        getPriorityText(priority) {
            const texts = {
                low: '低',
                normal: '普通',
                high: '高',
                urgent: '紧急'
            };
            return texts[priority] || '普通';
        },
        
        // 格式化时间
        formatTime(timestamp) {
            if (!timestamp) return this.t.common.none || '未知时间';
            
            try {
                const date = new Date(timestamp);
                
                // 检查日期是否有效
                if (isNaN(date.getTime())) {
                    return this.currentLanguage === 'zh' ? '时间格式错误' : 'Invalid time format';
                }
                
                const now = new Date();
                const diff = now - date;
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                
                if (minutes < 1) return this.t.common.justNow;
                if (minutes < 60) return `${minutes}${this.t.common.minutesAgo}`;
                if (hours < 24) return `${hours}${this.t.common.hoursAgo}`;
                if (days < 7) return `${days}${this.t.common.daysAgo}`;
                
                return date.toLocaleString(this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US');
            } catch (error) {
                console.error('Time formatting error:', error, timestamp);
                return this.currentLanguage === 'zh' ? '时间错误' : 'Time error';
            }
        },
        
        // 格式化存储大小
        formatSize(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2);
            
            return `${size} ${sizes[i]}`;
        },
        
        // 获取存储使用进度条颜色
        getStorageProgressColor(percentage) {
            if (percentage < 50) return 'bg-green-500';
            if (percentage < 80) return 'bg-yellow-500';
            return 'bg-red-500';
        },
        
        // 获取存储使用级别文本和样式
        getStorageUsageLevel(percentage) {
            if (percentage < 30) {
                return {
                    text: this.currentLanguage === 'zh' ? '使用量较低' : 'Low usage',
                    color: 'text-green-600 dark:text-green-400'
                };
            } else if (percentage < 60) {
                return {
                    text: this.currentLanguage === 'zh' ? '使用量适中' : 'Moderate usage',
                    color: 'text-blue-600 dark:text-blue-400'
                };
            } else if (percentage < 80) {
                return {
                    text: this.currentLanguage === 'zh' ? '使用量较高' : 'High usage',
                    color: 'text-yellow-600 dark:text-yellow-400'
                };
            } else {
                return {
                    text: this.currentLanguage === 'zh' ? '使用量很高' : 'Very high usage',
                    color: 'text-red-600 dark:text-red-400'
                };
            }
        },
        
        // 格式化来源显示
        formatSource(source) {
            if (!source) return this.t.messages.unknownSource;
            
            // 如果是字符串，直接返回
            if (typeof source === 'string') {
                return source;
            }
            
            // 如果是对象，尝试获取名称
            if (typeof source === 'object') {
                return source.name || source.title || source.serviceName || this.t.messages.thirdPartyService;
            }
            
            return String(source);
        },
        
        // 统一的确认操作处理（用于直接调用，不通过确认弹窗）
        async executeAction(action, ...args) {
            switch (action) {
                case 'markAllAsRead':
                    await this.markAllAsRead();
                    break;
                case 'deleteNotification':
                    await this.deleteNotification(args[0]);
                    break;
                case 'deleteSubscription':
                    await this.deleteSubscription(args[0]);
                    break;
                default:
                    console.warn('Unknown action:', action);
            }
        },
        
        // 检查通知是否已读
        isNotificationRead(notification) {
            return notification.read || notification.isRead || false;
        },
        
        // 下拉组件方法
        toggleDropdown(key) {
            // 关闭其他下拉
            Object.keys(this.dropdownStates).forEach(k => {
                if (k !== key) {
                    this.dropdownStates[k] = false;
                }
            });
            // 切换当前下拉
            this.dropdownStates[key] = !this.dropdownStates[key];
        },
        
        closeAllDropdowns() {
            Object.keys(this.dropdownStates).forEach(key => {
                this.dropdownStates[key] = false;
            });
        },
        
        selectOption(key, value) {
            this.filters[key] = value;
            this.dropdownStates[key] = false;
            this.loadNotifications();
        },
        
        getFilterDisplayText(key) {
            const value = this.filters[key];
            
            // 获取筛选类型标签
            const getFilterLabel = (filterKey) => {
                const labelMap = {
                    type: 'allTypes',
                    priority: 'allPriorities', 
                    read: 'allStatuses',
                    days: 'allTimes',
                    service: 'allServices',
                    mode: 'allModes'
                };
                return this.t.user.notifications.filters[labelMap[filterKey]] || filterKey;
            };
            
            const label = getFilterLabel(key).split(' - ')[0] || key;
            
            if (!value) return `${label} - ${this.t.common.all}`;
            
            switch (key) {
                case 'type':
                    const typeKey = `${value}`;
                    return `${label} - ${this.t.common[typeKey] || value}`;
                case 'priority':
                    return `${label} - ${this.t.user.notifications.filters[value] || value}`;
                case 'read':
                    const readKey = value === 'true' ? 'read' : 'unread';
                    return `${label} - ${this.t.user.notifications.filters[readKey]}`;
                case 'days':
                    const dayMap = { '1': 'today', '7': 'last7Days', '30': 'last30Days' };
                    return `${label} - ${this.t.user.notifications.filters[dayMap[value]] || value}`;
                case 'service':
                    return `${label} - ${value}`;
                case 'mode':
                    const modeKey = value === 'active' ? 'activeMode' : 'passiveMode';
                    return `${label} - ${this.t.user.notifications.filters[modeKey]}`;
                default:
                    return `${label} - ${value}`;
            }
        },
        
        // 标签页相关方法
        selectTab(tab) {
            this.currentTab = tab;
            this.dropdownStates.mobileTab = false;
        },
        
        getTabDisplayText() {
            const tabIconMap = {
                notifications: '📢',
                subscriptions: '🔗', 
                settings: '⚙️'
            };
            const icon = tabIconMap[this.currentTab] || '';
            const text = this.t.user.tabs[this.currentTab] || this.currentTab;
            return `${icon} ${text}`;
        },
        
        // 文档相关方法
        
        // 切换文档类型
        switchDocType(type) {
            const targetRoute = type === 'developer' ? '/docs/developer-guide' : '/docs/user-guide';
            this.navigateTo(targetRoute);
        },
        
        // 加载文档
        async loadDocument() {
            this.documentLoading = true;
            this.documentError = null;
            
            try {
                const fileName = this.currentDocType === 'developer' ? 'developer-guide.md' : 'user-guide.md';
                // 直接请求静态文件，不使用API路径
                const response = await axios.get(`/docs/${fileName}`, {
                    baseURL: '' // 覆盖默认的baseURL
                });
                
                // 创建自定义渲染器
                if (typeof marked !== 'undefined') {
                    const renderer = new marked.Renderer();
                    renderer.heading = function(text, level) {
                        const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                        return `<h${level} id="${id}">${text}</h${level}>`;
                    };
                    
                    // 配置marked选项
                    marked.setOptions({
                        renderer: renderer,
                        highlight: function(code, lang) {
                            if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                                return hljs.highlight(code, { language: lang }).value;
                            }
                            if (typeof hljs !== 'undefined') {
                                return hljs.highlightAuto(code).value;
                            }
                            return code;
                        },
                        breaks: true,
                        gfm: true
                    });
                    
                    // 解析Markdown
                    this.documentContent = marked.parse(response.data);
                } else {
                    // 如果没有marked，直接显示纯文本
                    this.documentContent = `<pre>${response.data}</pre>`;
                }
                
                // 生成目录
                this.generateTableOfContents(response.data);
                
                // 在下一个tick中处理滚动，确保DOM已更新
                this.$nextTick(() => {
                    // 检查URL中是否有hash片段
                    const hash = window.location.hash;
                    if (hash) {
                        // 移除#号，并处理URL编码
                        const sectionId = decodeURIComponent(hash.substring(1));
                        // 延迟滚动，确保内容已完全渲染
                        setTimeout(() => {
                            this.scrollToSection(sectionId);
                        }, 100);
                    } else {
                        // 没有hash时滚动到顶部
                        window.scrollTo(0, 0);
                    }
                });
                
            } catch (error) {
                console.error('加载文档失败:', error);
                this.documentError = '加载文档失败，请稍后重试';
            } finally {
                this.documentLoading = false;
            }
        },
        
        // 生成目录
        generateTableOfContents(markdown) {
            // 首先移除代码块内容，避免代码块中的#被识别为标题
            let cleanMarkdown = markdown;
            
            // 移除代码块（```包围的内容）
            cleanMarkdown = cleanMarkdown.replace(/```[\s\S]*?```/g, '');
            
            // 移除行内代码（`包围的内容）
            cleanMarkdown = cleanMarkdown.replace(/`[^`]*`/g, '');
            
            const headings = cleanMarkdown.match(/^#{1,6}\s.+$/gm) || [];
            let toc = '';
            
            headings.forEach(heading => {
                const level = heading.match(/^#+/)[0].length;
                const text = heading.replace(/^#+\s/, '');
                const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                const indent = level > 1 ? `ml-${(level - 1) * 4}` : '';
                
                toc += `<div class="${indent} mb-1">
                    <a href="#${id}" 
                       data-section-id="${id}"
                       class="toc-link text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 block py-1 transition cursor-pointer">
                        ${text}
                    </a>
                </div>`;
            });
            
            this.tableOfContents = toc;
        },
        
        // 处理滚动事件
        handleScroll() {
            this.showBackToTop = window.pageYOffset > 300;
        },
        
        // 返回顶部
        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        },
        
        // 滚动到指定章节
        scrollToSection(sectionId) {
            // 尝试多种方式查找元素
            let element = document.getElementById(sectionId);
            
            // 如果直接查找失败，尝试查找data-section-id属性
            if (!element) {
                element = document.querySelector(`[data-section-id="${sectionId}"]`);
            }
            
            // 如果还是找不到，尝试根据文本内容查找标题
            if (!element) {
                const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                for (let heading of headings) {
                    const headingText = heading.textContent.trim();
                    const headingId = headingText.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
                    if (headingId === sectionId || headingText === sectionId) {
                        element = heading;
                        break;
                    }
                }
            }
            
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            } else {
                console.warn(`Element with ID "${sectionId}" not found`);
            }
        },
        
        // 处理目录点击事件（事件委托）
        handleTocClick(event) {
            // 检查点击的是否是目录链接
            const link = event.target.closest('.toc-link');
            if (link) {
                event.preventDefault();
                const sectionId = link.getAttribute('data-section-id');
                if (sectionId) {
                    this.scrollToSection(sectionId);
                }
            }
        }
    }
}).mount('#app'); 