const { createApp } = Vue;

createApp({
    data() {
        return {
            user: null,
            token: localStorage.getItem('token'),
            loading: false,
            message: null,
            currentTab: 'notifications',
            
            // 夜间模式状态
            darkMode: localStorage.getItem('darkMode') === 'true' || false,
            
            // 移动端菜单状态
            showMobileMenu: false,
            
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
                confirmText: '确认',
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
                mobileTab: false
            }
        };
    },
    
    computed: {
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
            this.subscriptions.forEach(sub => {
                if (sub.serviceHost) {
                    services.add(sub.serviceHost);
                } else if (sub.thirdPartyUrl) {
                    try {
                        const url = new URL(sub.thirdPartyUrl);
                        services.add(url.host);
                    } catch (e) {
                        services.add(sub.thirdPartyName || '未知服务');
                    }
                } else {
                    services.add(sub.thirdPartyName || '未知服务');
                }
            });
            return Array.from(services).sort();
        },
        
        // 模式列表
        modesList() {
            return [
                { value: 'active', label: '主动模式' },
                { value: 'passive', label: '被动模式' }
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
                    if (!n.subscription) return false;
                    let serviceHost = '';
                    if (n.subscription.serviceHost) {
                        serviceHost = n.subscription.serviceHost;
                    } else if (n.subscription.thirdPartyUrl) {
                        try {
                            const url = new URL(n.subscription.thirdPartyUrl);
                            serviceHost = url.host;
                        } catch (e) {
                            serviceHost = n.subscription.thirdPartyName || '未知服务';
                        }
                    } else {
                        serviceHost = n.subscription.thirdPartyName || '未知服务';
                    }
                    return serviceHost === this.filters.service;
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
        }
    },
    
    mounted() {
        this.initAxios();
        this.initDarkMode();
        if (this.token) {
            this.loadUserData();
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
    },
    
    methods: {
        // 初始化夜间模式
        initDarkMode() {
            // 应用夜间模式到document.documentElement
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        
        // 切换夜间模式
        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode.toString());
            
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            
            this.showMessage(this.darkMode ? '已切换到夜间模式' : '已切换到日间模式');
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
                this.showMessage('登录成功！');
                this.loadUserData();
            } catch (error) {
                this.showMessage(error.response?.data?.error || '登录失败', 'error');
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
                this.showMessage('注册成功！');
                this.loadUserData();
            } catch (error) {
                this.showMessage(error.response?.data?.error || '注册失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 退出登录
        logout() {
            this.user = null;
            this.token = null;
            this.notifications = [];
            this.subscriptions = [];
            this.stats = {};
            this.notifyCode = null;
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            this.showMessage('已退出登录');
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
                console.error('加载用户数据失败:', error);
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
                console.error('加载通知失败:', error);
            }
        },
        
        // 加载订阅列表
        async loadSubscriptions() {
            try {
                const response = await axios.get('/subscriptions');
                this.subscriptions = response.data.subscriptions;
            } catch (error) {
                console.error('加载订阅失败:', error);
            }
        },
        
        // 加载统计信息
        async loadStats() {
            try {
                const response = await axios.get('/notifications/stats');
                this.stats = response.data;
            } catch (error) {
                console.error('加载统计失败:', error);
            }
        },
        
        // 生成通知标识码
        async generateNotifyCode() {
            try {
                const response = await axios.post('/auth/generate-notify-code');
                this.notifyCode = response.data.notifyCode;
                this.currentTab = 'settings';
                this.showMessage('标识码生成成功！');
            } catch (error) {
                this.showMessage(error.response?.data?.error || '生成标识码失败', 'error');
            }
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
                this.showMessage('被动订阅创建成功！');
                this.loadSubscriptions();
            } catch (error) {
                this.showMessage(error.response?.data?.error || '创建订阅失败', 'error');
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
                this.showMessage('服务信息获取成功！');
            } catch (error) {
                this.showMessage('无法获取服务信息，将使用默认配置', 'error');
                console.error('获取服务信息失败:', error);
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
                this.showMessage(`订阅已${subscription.isActive ? '启用' : '禁用'}`);
            } catch (error) {
                this.showMessage(error.response?.data?.error || '操作失败', 'error');
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
                this.showMessage('订阅删除成功！');
                this.loadStats();
            } catch (error) {
                this.showMessage(error.response?.data?.error || '删除订阅失败', 'error');
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
                this.showMessage(error.response?.data?.error || '获取通知详情失败', 'error');
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
                return '无法格式化数据';
            }
        },

        // 复制JSON数据到剪贴板
        async copyJsonData(data) {
            try {
                const jsonString = this.formatJsonData(data);
                await this.copyToClipboard(jsonString);
            } catch (error) {
                this.showMessage('复制失败', 'error');
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
                this.showMessage(error.response?.data?.error || '操作失败', 'error');
            }
        },
        
        // 删除通知（带确认）
        async deleteNotification(notificationId) {
            const confirmed = await this.showConfirmDialog({
                title: '删除通知',
                message: '确定要删除这条通知吗？删除后无法恢复。',
                type: 'danger',
                confirmText: '删除'
            });

            if (!confirmed) return;

            try {
                this.loading = true;
                await axios.delete(`/notifications/${notificationId}`);
                this.notifications = this.notifications.filter(n => n.id !== notificationId);
                this.showMessage('通知删除成功！');
                this.loadStats();
            } catch (error) {
                this.showMessage(error.response?.data?.error || '删除通知失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // 复制到剪贴板
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                this.showMessage('复制成功！');
            } catch (error) {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showMessage('复制成功！');
            }
        },
        
        // 格式化日期
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            
            // 小于1分钟
            if (diff < 60000) {
                return '刚刚';
            }
            // 小于1小时
            if (diff < 3600000) {
                return Math.floor(diff / 60000) + '分钟前';
            }
            // 小于1天
            if (diff < 86400000) {
                return Math.floor(diff / 3600000) + '小时前';
            }
            // 小于7天
            if (diff < 604800000) {
                return Math.floor(diff / 86400000) + '天前';
            }
            
            // 超过7天显示具体日期
            return date.toLocaleDateString('zh-CN', {
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
                
                this.showMessage(`轮询成功！获取到 ${response.data.result.newNotifications} 条新通知`);
                
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
                    this.showMessage(`请等待 ${remainingSeconds} 秒后再次触发`, 'error');
                    
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
                    this.showMessage(error.response?.data?.error || '轮询触发失败', 'error');
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
                console.error('加载分类信息失败:', error);
            }
        },
        
        // 批量标记所有通知为已读（带确认）
        async markAllAsRead() {
            const unreadCount = this.unreadNotifications;
            if (unreadCount === 0) {
                this.showMessage('没有未读通知', 'error');
                return;
            }

            const confirmed = await this.showConfirmDialog({
                title: '标记全部已读',
                message: `确定要将所有 ${unreadCount} 条未读通知标记为已读吗？`,
                confirmText: '标记已读'
            });

            if (!confirmed) return;

            try {
                this.loading = true;
                await axios.patch('/notifications/mark-all-read');
                this.notifications.forEach(n => n.isRead = true);
                this.showMessage(`已标记 ${unreadCount} 条通知为已读`);
                this.loadStats();
            } catch (error) {
                this.showMessage(error.response?.data?.error || '操作失败', 'error');
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
            this.showMessage('通知已刷新');
        },
        
        // 导出通知
        async exportNotifications() {
            try {
                const notifications = this.filteredNotifications;
                if (notifications.length === 0) {
                    this.showMessage('没有通知可导出', 'error');
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
                
                this.showMessage(`已导出 ${notifications.length} 条通知`);
            } catch (error) {
                this.showMessage('导出失败', 'error');
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
            if (!timestamp) return '未知时间';
            
            try {
                const date = new Date(timestamp);
                
                // 检查日期是否有效
                if (isNaN(date.getTime())) {
                    return '时间格式错误';
                }
                
                const now = new Date();
                const diff = now - date;
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                
                if (minutes < 1) return '刚刚';
                if (minutes < 60) return `${minutes}分钟前`;
                if (hours < 24) return `${hours}小时前`;
                if (days < 7) return `${days}天前`;
                
                return date.toLocaleString('zh-CN');
            } catch (error) {
                console.error('时间格式化错误:', error, timestamp);
                return '时间错误';
            }
        },
        
        // 格式化来源显示
        formatSource(source) {
            if (!source) return '未知来源';
            
            // 如果是字符串，直接返回
            if (typeof source === 'string') {
                return source;
            }
            
            // 如果是对象，尝试获取名称
            if (typeof source === 'object') {
                return source.name || source.title || source.serviceName || '第三方服务';
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
            
            // 定义筛选类型标签
            const filterLabels = {
                type: '类型',
                priority: '优先级', 
                read: '状态',
                days: '时间',
                service: '服务',
                mode: '模式'
            };
            
            const label = filterLabels[key] || key;
            
            if (!value) return `${label} - 全部`;
            
            switch (key) {
                case 'type':
                    const typeTexts = { info: '信息', success: '成功', warning: '警告', error: '错误' };
                    return `${label} - ${typeTexts[value] || value}`;
                case 'priority':
                    const priorityTexts = { low: '低', normal: '普通', high: '高', urgent: '紧急' };
                    return `${label} - ${priorityTexts[value] || value}`;
                case 'read':
                    const readText = value === 'true' ? '已读' : '未读';
                    return `${label} - ${readText}`;
                case 'days':
                    const dayTexts = { '1': '今天', '7': '最近7天', '30': '最近30天' };
                    return `${label} - ${dayTexts[value] || value}`;
                case 'service':
                    return `${label} - ${value}`;
                case 'mode':
                    const modeText = value === 'active' ? '主动模式' : '被动模式';
                    return `${label} - ${modeText}`;
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
            const tabTexts = {
                notifications: '📢 通知管理',
                subscriptions: '🔗 订阅管理', 
                settings: '⚙️ 账户设置'
            };
            return tabTexts[this.currentTab] || this.currentTab;
        }
    }
}).mount('#app'); 