// 国际化配置
const i18n = {
    zh: {
        // 通用
        common: {
            home: '首页',
            dashboard: '控制台',
            docs: '文档',
            docCenter: '文档中心',
            login: '登录',
            register: '注册',
            logout: '退出登录',
            submit: '提交',
            cancel: '取消',
            confirm: '确认',
            save: '保存',
            delete: '删除',
            edit: '编辑',
            loading: '加载中...',
            success: '成功',
            error: '错误',
            warning: '警告',
            info: '信息',
            yes: '是',
            no: '否',
            close: '关闭',
            copy: '复制',
            refresh: '刷新',
            export: '导出',
            search: '搜索',
            filter: '筛选',
            all: '全部',
            none: '无',
            darkMode: '夜间模式',
            lightMode: '日间模式',
            switchToDark: '切换到夜间模式',
            switchToLight: '切换到日间模式',
            language: '语言',
            chinese: '中文',
            english: 'English',
            justNow: '刚刚',
            minutesAgo: '分钟前',
            hoursAgo: '小时前',
            daysAgo: '天前'
        },
        
        // 导航
        nav: {
            welcome: '欢迎，{username}',
            welcomeBack: '欢迎回来'
        },
        
        // 首页
        home: {
            title: '回声 (Huisheen)',
            subtitle: '专注于通知接收的开源服务平台，支持主动和被动两种订阅模式，让您不再错过任何重要信息',
            getStarted: '立即开始',
            loginAccount: '登录账户',
            enterDashboard: '进入控制台',
            
            // 公益项目介绍
            charity: {
                title: '公益开源项目',
                description: '回声是一个完全免费的公益项目，旨在为开发者和用户提供统一的通知管理解决方案。我们相信信息的及时传达应该是每个人都能享受的基础服务。',
                features: {
                    free: {
                        title: '完全免费',
                        desc: '无需付费，永久免费使用所有功能'
                    },
                    opensource: {
                        title: '开源透明',
                        desc: '源代码完全开放，欢迎贡献代码和提出建议'
                    },
                    community: {
                        title: '社区驱动',
                        desc: '由开发者社区共同维护，持续改进和优化'
                    }
                }
            },
            
            // 功能特性
            features: {
                passive: {
                    title: '被动模式',
                    description: '提供API接口给第三方服务，回声平台会定期轮询获取最新通知。适用于无法主动推送的服务。',
                    items: [
                        '定时轮询，自动获取',
                        '灵活配置轮询频率',
                        '支持多种数据格式'
                    ]
                },
                active: {
                    title: '主动模式',
                    description: '获取唯一标识码，第三方服务可直接向回声平台推送通知。实时性更好，适用于即时通知场景。',
                    items: [
                        '实时推送，零延迟',
                        '安全认证机制',
                        '支持回调链接'
                    ]
                }
            },
            
            // 使用场景
            scenarios: {
                title: '适用场景',
                modes: {
                    active: {
                        name: '主动模式',
                        description: '实时推送，即时响应'
                    },
                    passive: {
                        name: '被动模式', 
                        description: '定期轮询，公开透明'
                    },
                    hybrid: {
                        name: '混合模式',
                        description: '双模并用，灵活高效'
                    }
                },
                // 主动模式示例（可以有部分非重要隐私）
                system: {
                    title: '系统监控',
                    desc: '服务器状态、应用健康度、性能指标等系统运维通知',
                    mode: 'active',
                    icon: 'fas fa-server'
                },
                business: {
                    title: '运营数据',
                    desc: '网站访问统计、功能使用情况、用户增长等运营指标通知',
                    mode: 'active',
                    icon: 'fas fa-chart-line'
                },
                security: {
                    title: '安全警报',
                    desc: '登录异常、权限变更、安全事件等实时安全通知',
                    mode: 'active',
                    icon: 'fas fa-shield-alt'
                },
                // 被动模式示例（完全公开）
                content: {
                    title: '内容发布',
                    desc: '博客更新、新闻发布、活动通知等公开内容推送',
                    mode: 'passive',
                    icon: 'fas fa-newspaper'
                },
                opensource: {
                    title: '开源项目',
                    desc: '代码提交、版本发布、问题追踪等开源项目动态',
                    mode: 'passive',
                    icon: 'fab fa-github'
                },
                announcement: {
                    title: '公告通知',
                    desc: '维护公告、功能更新、服务状态等官方公开通知',
                    mode: 'passive',
                    icon: 'fas fa-bullhorn'
                },
                // 二合一模式示例
                community: {
                    title: '社区平台',
                    desc: '用户互动实时推送 + 定期获取热门内容和话题动态',
                    mode: 'hybrid',
                    icon: 'fas fa-users'
                },
                project: {
                    title: '项目管理',
                    desc: '任务分配即时通知 + 定期获取进度报告和团队动态',
                    mode: 'hybrid',
                    icon: 'fas fa-project-diagram'
                }
            },
            
            // 快速开始
            quickStart: {
                title: '快速开始',
                step1: {
                    title: '注册账户',
                    desc: '点击注册按钮，填写基本信息即可快速创建账户'
                },
                step2: {
                    title: '配置订阅',
                    desc: '选择被动模式或主动模式，添加您的通知源'
                },
                step3: {
                    title: '接收通知',
                    desc: '开始接收和管理来自各个源的通知信息'
                },
                registerNow: '立即注册，开始使用'
            },
            
            // 页脚
            footer: {
                features: ['开源项目', '公益免费', '社区驱动'],
                copyright: '© 2025 回声 (Huisheen) - 让每个通知都有回声'
            }
        },
        
        // 用户页面
        user: {
            stats: {
                totalNotifications: '总通知',
                unreadNotifications: '未读',
                todayNotifications: '今日',
                totalSubscriptions: '订阅'
            },
            
            tabs: {
                notifications: '通知管理',
                subscriptions: '订阅管理',
                settings: '账户设置'
            },
            
            // 通知管理
            notifications: {
                filters: {
                    allTypes: '全部类型',
                    allPriorities: '全部优先级',
                    allStatuses: '全部状态',
                    allTimes: '全部时间',
                    allServices: '全部服务',
                    allModes: '全部模式',
                    today: '今天',
                    last7Days: '最近7天',
                    last30Days: '最近30天',
                    unread: '未读',
                    read: '已读',
                    activeMode: '主动模式',
                    passiveMode: '被动模式',
                    low: '低',
                    normal: '普通',
                    high: '高',
                    urgent: '紧急'
                },
                actions: {
                    markAllAsRead: '全部标记已读',
                    markAsRead: '标记已读',
                    openLink: '打开链接',
                    viewDetails: '查看详情',
                    deleteNotification: '删除通知'
                },
                empty: '暂无通知',
                pagination: {
                    showing: '显示第 {start} - {end} 条，共 {total} 条通知',
                    first: '首页',
                    prev: '上一页',
                    next: '下一页',
                    last: '末页'
                }
            },
            
            // 订阅管理
            subscriptions: {
                addPassive: '添加被动订阅',
                generateCode: '生成标识码',
                empty: '暂无订阅',
                status: {
                    enabled: '启用',
                    disabled: '禁用'
                },
                actions: {
                    pause: '暂停',
                    resume: '恢复',
                    poll: '立即轮询',
                    delete: '删除订阅'
                },
                info: {
                    subscribeTime: '订阅时间',
                    notificationCount: '条通知',
                    pollingInterval: '分钟轮询',
                    directPush: '直接推送'
                }
            },
            
            // 账户设置
            settings: {
                title: '账户设置',
                username: '用户名',
                email: '邮箱',
                notifyId: '通知ID',
                registerTime: '注册时间',
                currentCode: '当前标识码',
                codeExpire: '此标识码5分钟后过期，请及时使用',
                storageUsage: '存储使用情况',
                storageUsageDesc: '查看您的消息和订阅数据占用情况',
                notificationsStorage: '通知数据',
                subscriptionsStorage: '订阅数据',
                totalUsage: '总使用量',
                remaining: '剩余',
                usageDetails: '使用详情',
                notifications: '条通知',
                subscriptions: '个订阅',
                storageLimit: '存储限制：1MB',
                // 邮箱验证相关
                emailVerification: '邮箱验证',
                emailStatus: '邮箱状态',
                verified: '已验证',
                unverified: '未验证',
                sendVerificationCode: '发送验证码',
                verificationCode: '验证码',
                verifyEmail: '验证邮箱',
                verificationCodePlaceholder: '请输入6位验证码',
                emailVerificationDesc: '验证您的邮箱以确保账户安全和接收重要通知',
                verificationSent: '验证码已发送',
                verificationSuccess: '邮箱验证成功',
                resendCode: '重新发送',
                codeExpireTime: '验证码将在10分钟后过期',
                verificationSuccessDesc: '您的邮箱已通过验证，可以接收重要的账户通知。',
                // 我的服务相关
                myServices: '我的服务',
                myServicesDesc: '管理您创建的服务和订阅者',
                noServices: '您还没有创建任何服务',
                serviceDetails: '服务详情',
                subscriberCount: '订阅用户数',
                subscribers: '订阅用户',
                serviceName: '服务名称',
                serviceUrl: '服务地址',
                serviceApiEndpoint: 'API接口',
                createService: '创建服务',
                serviceGuide: '如何将您的服务接入回声平台？',
                serviceGuideDesc: '要将您的服务接入回声平台，需要在您的服务中实现以下接口：',
                serviceInfoApi: '服务信息接口',
                addOwnerNotifyId: '在服务信息中添加您的通知ID(owner_notify_id)，这样其他用户订阅您的服务后，您就可以在此处查看订阅统计。'
            }
        },
        
        // 文档页面
        docs: {
            userDocs: '用户文档',
            developerDocs: '开发者文档',
            userGuide: '用户指南',
            developerGuide: '开发者指南',
            tableOfContents: '目录',
            loadingDocs: '加载文档中...',
            loadError: '文档加载失败',
            reload: '重新加载'
        },
        
        // 表单
        forms: {
            login: {
                title: '用户登录',
                email: '邮箱',
                password: '密码',
                loginButton: '登录',
                loggingIn: '登录中...'
            },
            register: {
                title: '用户注册',
                username: '用户名',
                email: '邮箱',
                password: '密码',
                registerButton: '注册',
                registering: '注册中...'
            },
            passiveSubscription: {
                title: '创建被动订阅',
                description: '输入第三方服务的通知API地址，系统将自动获取服务信息并设置轮询。',
                apiUrl: '第三方服务API地址',
                apiUrlPlaceholder: 'https://example.com/api/notifications',
                example: '示例：http://localhost:5000/api/notifications',
                servicePreview: '服务信息预览',
                serviceName: '服务名称',
                serviceDesc: '描述',
                pollingInterval: '轮询间隔',
                version: '版本',
                minutes: '分钟',
                previewService: '预览服务',
                createSubscription: '创建订阅',
                previewing: '获取中...',
                creating: '创建中...'
            }
        },
        
        // 通知详情
        notificationDetail: {
            title: '通知详情',
            basicInfo: '基本信息',
            notificationTitle: '标题',
            type: '类型',
            priority: '优先级',
            receivedTime: '接收时间',
            content: '内容',
            callbackUrl: '回调链接',
            source: '来源',
            fullJsonData: '完整JSON数据',
            copyJson: '复制JSON',
            metadata: '元数据'
        },
        
        // 消息提示
        messages: {
            loginSuccess: '登录成功',
            loginFailed: '登录失败',
            registerSuccess: '注册成功',
            registerFailed: '注册失败',
            logoutSuccess: '已退出登录',
            copySuccess: '复制成功',
            copyFailed: '复制失败',
            deleteSuccess: '删除成功',
            deleteFailed: '删除失败',
            saveSuccess: '保存成功',
            saveFailed: '保存失败',
            networkError: '网络错误，请稍后重试',
            unknownError: '未知错误',
            darkModeOn: '已切换到夜间模式',
            lightModeOn: '已切换到日间模式',
            generateCodeSuccess: '标识码生成成功',
            generateCodeFailed: '生成标识码失败',
            subscriptionCreated: '被动订阅创建成功',
            subscriptionCreateFailed: '创建订阅失败',
            serviceInfoFetched: '服务信息获取成功',
            serviceInfoFetchFailed: '无法获取服务信息，将使用默认配置',
            subscriptionToggled: '订阅状态已更新',
            subscriptionDeleted: '订阅删除成功',
            subscriptionDeleteFailed: '删除订阅失败',
            notificationDetailFailed: '获取通知详情失败',
            operationFailed: '操作失败',
            notificationDeleted: '通知删除成功',
            notificationDeleteFailed: '删除通知失败',
            formatDataFailed: '无法格式化数据',
            pollSuccess: '轮询成功！获取到 {count} 条新通知',
            pollCooldown: '请等待 {seconds} 秒后再次触发',
            pollFailed: '轮询触发失败',
            unknownSource: '未知来源',
            thirdPartyService: '第三方服务',
            systemNotification: '系统通知',
            notificationsRefreshed: '通知已刷新',
            noNotificationsToExport: '没有通知可导出',
            notificationsExported: '已导出 {count} 条通知',
            exportFailed: '导出失败',
            deletedSubscription: '已删除的订阅'
        },
        
        // 确认对话框
        confirmDialog: {
            deleteNotification: {
                title: '删除通知',
                message: '确定要删除这条通知吗？此操作不可撤销。',
                confirm: '删除'
            },
            deleteSubscription: {
                title: '删除订阅',
                message: '确定要删除这个订阅吗？相关的通知历史将会保留。',
                confirm: '删除'
            },
            markAllAsRead: {
                title: '标记全部已读',
                message: '确定要将所有未读通知标记为已读吗？',
                confirm: '标记已读'
            },
            noUnreadNotifications: '没有未读通知',
            markedNotificationsAsRead: '已标记 {count} 条通知为已读'
        }
    },
    
    en: {
        // Common
        common: {
            home: 'Home',
            dashboard: 'Dashboard',
            docs: 'Docs',
            docCenter: 'Documentation',
            login: 'Login',
            register: 'Register',
            logout: 'Logout',
            submit: 'Submit',
            cancel: 'Cancel',
            confirm: 'Confirm',
            save: 'Save',
            delete: 'Delete',
            edit: 'Edit',
            loading: 'Loading...',
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info',
            yes: 'Yes',
            no: 'No',
            close: 'Close',
            copy: 'Copy',
            refresh: 'Refresh',
            export: 'Export',
            search: 'Search',
            filter: 'Filter',
            all: 'All',
            none: 'None',
            darkMode: 'Dark Mode',
            lightMode: 'Light Mode',
            switchToDark: 'Switch to Dark Mode',
            switchToLight: 'Switch to Light Mode',
            language: 'Language',
            chinese: '中文',
            english: 'English',
            justNow: 'Just now',
            minutesAgo: 'minutes ago',
            hoursAgo: 'hours ago',
            daysAgo: 'days ago'
        },
        
        // Navigation
        nav: {
            welcome: 'Welcome, {username}',
            welcomeBack: 'Welcome back'
        },
        
        // Home
        home: {
            title: 'Huisheen',
            subtitle: 'An open-source notification service platform focused on notification receiving, supporting both active and passive subscription modes, ensuring you never miss any important information',
            getStarted: 'Get Started',
            loginAccount: 'Login Account',
            enterDashboard: 'Enter Dashboard',
            
            // Charity project
            charity: {
                title: 'Public Welfare Open Source Project',
                description: 'Huisheen is a completely free public welfare project aimed at providing developers and users with a unified notification management solution. We believe that timely information delivery should be a basic service that everyone can enjoy.',
                features: {
                    free: {
                        title: 'Completely Free',
                        desc: 'No payment required, permanent free access to all features'
                    },
                    opensource: {
                        title: 'Open & Transparent',
                        desc: 'Source code is completely open, welcome to contribute code and suggestions'
                    },
                    community: {
                        title: 'Community Driven',
                        desc: 'Maintained by the developer community, continuously improved and optimized'
                    }
                }
            },
            
            // Features
            features: {
                passive: {
                    title: 'Passive Mode',
                    description: 'Provide API interfaces for third-party services, Huisheen platform will periodically poll to get the latest notifications. Suitable for services that cannot actively push.',
                    items: [
                        'Scheduled polling, automatic retrieval',
                        'Flexible polling frequency configuration',
                        'Support for multiple data formats'
                    ]
                },
                active: {
                    title: 'Active Mode',
                    description: 'Get a unique identifier, third-party services can directly push notifications to Huisheen platform. Better real-time performance, suitable for instant notification scenarios.',
                    items: [
                        'Real-time push, zero delay',
                        'Secure authentication mechanism',
                        'Support for callback links'
                    ]
                }
            },
            
            // Use cases
            scenarios: {
                title: 'Use Cases',
                modes: {
                    active: {
                        name: 'Active Mode',
                        description: 'Real-time push, instant response'
                    },
                    passive: {
                        name: 'Passive Mode', 
                        description: 'Scheduled polling, open and transparent'
                    },
                    hybrid: {
                        name: 'Hybrid Mode',
                        description: 'Dual mode, flexible and efficient'
                    }
                },
                // 主动模式示例（可以有部分非重要隐私）
                system: {
                    title: 'System Monitoring',
                    desc: 'System operation and maintenance notifications such as server status, application health, performance indicators',
                    mode: 'active',
                    icon: 'fas fa-server'
                },
                business: {
                    title: 'Operational Data',
                    desc: 'Website traffic statistics, feature usage, user growth and other operational metrics notifications',
                    mode: 'active',
                    icon: 'fas fa-chart-line'
                },
                security: {
                    title: 'Security Alerts',
                    desc: 'Real-time security notifications such as login exceptions, permission changes, security events',
                    mode: 'active',
                    icon: 'fas fa-shield-alt'
                },
                // 被动模式示例（完全公开）
                content: {
                    title: 'Content Publishing',
                    desc: 'Public content notifications such as blog updates, news releases, event notifications',
                    mode: 'passive',
                    icon: 'fas fa-newspaper'
                },
                opensource: {
                    title: 'Open Source Project',
                    desc: 'Open source project notifications such as code commits, version releases, problem tracking',
                    mode: 'passive',
                    icon: 'fab fa-github'
                },
                announcement: {
                    title: 'Announcement Notifications',
                    desc: 'Official public notifications such as maintenance announcements, feature updates, service status',
                    mode: 'passive',
                    icon: 'fas fa-bullhorn'
                },
                // 二合一模式示例
                community: {
                    title: 'Community Platform',
                    desc: 'Real-time user interaction push + periodic access to popular content and topic dynamics',
                    mode: 'hybrid',
                    icon: 'fas fa-users'
                },
                project: {
                    title: 'Project Management',
                    desc: 'Instant task assignment notification + periodic access to progress reports and team dynamics',
                    mode: 'hybrid',
                    icon: 'fas fa-project-diagram'
                }
            },
            
            // Quick start
            quickStart: {
                title: 'Quick Start',
                step1: {
                    title: 'Register Account',
                    desc: 'Click the register button and fill in basic information to quickly create an account'
                },
                step2: {
                    title: 'Configure Subscription',
                    desc: 'Choose passive or active mode and add your notification sources'
                },
                step3: {
                    title: 'Receive Notifications',
                    desc: 'Start receiving and managing notifications from various sources'
                },
                registerNow: 'Register Now and Start Using'
            },
            
            // Footer
            footer: {
                features: ['Open Source', 'Public Welfare', 'Community Driven'],
                copyright: '© 2025 Huisheen (Echo) - Let every notification have an echo'
            }
        },
        
        // User page
        user: {
            stats: {
                totalNotifications: 'Total',
                unreadNotifications: 'Unread',
                todayNotifications: 'Today',
                totalSubscriptions: 'Subscriptions'
            },
            
            tabs: {
                notifications: 'Notifications',
                subscriptions: 'Subscriptions',
                settings: 'Account Settings'
            },
            
            // Notification management
            notifications: {
                filters: {
                    allTypes: 'All Types',
                    allPriorities: 'All Priorities',
                    allStatuses: 'All Status',
                    allTimes: 'All Time',
                    allServices: 'All Services',
                    allModes: 'All Modes',
                    today: 'Today',
                    last7Days: 'Last 7 Days',
                    last30Days: 'Last 30 Days',
                    unread: 'Unread',
                    read: 'Read',
                    activeMode: 'Active Mode',
                    passiveMode: 'Passive Mode',
                    low: 'Low',
                    normal: 'Normal',
                    high: 'High',
                    urgent: 'Urgent'
                },
                actions: {
                    markAllAsRead: 'Mark All as Read',
                    markAsRead: 'Mark as Read',
                    openLink: 'Open Link',
                    viewDetails: 'View Details',
                    deleteNotification: 'Delete Notification'
                },
                empty: 'No notifications',
                pagination: {
                    showing: 'Showing {start} - {end} of {total} notifications',
                    first: 'First',
                    prev: 'Previous',
                    next: 'Next',
                    last: 'Last'
                }
            },
            
            // Subscription management
            subscriptions: {
                addPassive: 'Add Passive Subscription',
                generateCode: 'Generate Code',
                empty: 'No subscriptions',
                status: {
                    enabled: 'Enabled',
                    disabled: 'Disabled'
                },
                actions: {
                    pause: 'Pause',
                    resume: 'Resume',
                    poll: 'Poll Now',
                    delete: 'Delete Subscription'
                },
                info: {
                    subscribeTime: 'Subscribe Time',
                    notificationCount: 'notifications',
                    pollingInterval: 'min polling',
                    directPush: 'Direct Push'
                }
            },
            
            // Account settings
            settings: {
                title: 'Account Settings',
                username: 'Username',
                email: 'Email',
                notifyId: 'Notify ID',
                registerTime: 'Register Time',
                currentCode: 'Current Notify Code',
                codeExpire: 'This code will expire in 5 minutes, please use it promptly',
                storageUsage: 'Storage Usage',
                storageUsageDesc: 'View your message and subscription data usage',
                notificationsStorage: 'Notifications Storage',
                subscriptionsStorage: 'Subscriptions Storage',
                totalUsage: 'Total Usage',
                remaining: 'Remaining',
                usageDetails: 'Usage Details',
                notifications: 'notifications',
                subscriptions: 'subscriptions',
                storageLimit: 'Storage Limit: 1MB',
                // Email verification related
                emailVerification: 'Email Verification',
                emailStatus: 'Email Status',
                verified: 'Verified',
                unverified: 'Unverified',
                sendVerificationCode: 'Send Verification Code',
                verificationCode: 'Verification Code',
                verifyEmail: 'Verify Email',
                verificationCodePlaceholder: 'Enter 6-digit verification code',
                emailVerificationDesc: 'Verify your email to ensure account security and receive important notifications',
                verificationSent: 'Verification code sent',
                verificationSuccess: 'Email verification successful',
                resendCode: 'Resend',
                codeExpireTime: 'Verification code will expire in 10 minutes',
                verificationSuccessDesc: 'Your email has been verified, you can receive important account notifications.',
                // My services related
                myServices: 'My Services',
                myServicesDesc: 'Manage your created services and subscribers',
                noServices: 'You haven\'t created any services yet',
                serviceDetails: 'Service Details',
                subscriberCount: 'Subscriber Count',
                subscribers: 'Subscribers',
                serviceName: 'Service Name',
                serviceUrl: 'Service URL',
                serviceApiEndpoint: 'API Endpoint',
                createService: 'Create Service',
                serviceGuide: 'How to integrate your service with Huisheen?',
                serviceGuideDesc: 'To integrate your service with Huisheen, you need to implement the following APIs:',
                serviceInfoApi: 'Service Info API',
                addOwnerNotifyId: 'Add your Notify ID(owner_notify_id) in your service info, so you can see subscription statistics when other users subscribe to your service.'
            }
        },
        
        // Documentation
        docs: {
            userDocs: 'User Docs',
            developerDocs: 'Developer Docs',
            userGuide: 'User Guide',
            developerGuide: 'Developer Guide',
            tableOfContents: 'Table of Contents',
            loadingDocs: 'Loading documentation...',
            loadError: 'Failed to load documentation',
            reload: 'Reload'
        },
        
        // Forms
        forms: {
            login: {
                title: 'User Login',
                email: 'Email',
                password: 'Password',
                loginButton: 'Login',
                loggingIn: 'Logging in...'
            },
            register: {
                title: 'User Registration',
                username: 'Username',
                email: 'Email',
                password: 'Password',
                registerButton: 'Register',
                registering: 'Registering...'
            },
            passiveSubscription: {
                title: 'Create Passive Subscription',
                description: 'Enter the notification API address of the third-party service, the system will automatically obtain service information and set up polling.',
                apiUrl: 'Third-party Service API URL',
                apiUrlPlaceholder: 'https://example.com/api/notifications',
                example: 'Example: http://localhost:5000/api/notifications',
                servicePreview: 'Service Information Preview',
                serviceName: 'Service Name',
                serviceDesc: 'Description',
                pollingInterval: 'Polling Interval',
                version: 'Version',
                minutes: 'minutes',
                previewService: 'Preview Service',
                createSubscription: 'Create Subscription',
                previewing: 'Fetching...',
                creating: 'Creating...'
            }
        },
        
        // Notification details
        notificationDetail: {
            title: 'Notification Details',
            basicInfo: 'Basic Information',
            notificationTitle: 'Title',
            type: 'Type',
            priority: 'Priority',
            receivedTime: 'Received Time',
            content: 'Content',
            callbackUrl: 'Callback URL',
            source: 'Source',
            fullJsonData: 'Full JSON Data',
            copyJson: 'Copy JSON',
            metadata: 'Metadata'
        },
        
        // Messages
        messages: {
            loginSuccess: 'Login successful',
            loginFailed: 'Login failed',
            registerSuccess: 'Registration successful',
            registerFailed: 'Registration failed',
            logoutSuccess: 'Logout successful',
            copySuccess: 'Copied successfully',
            copyFailed: 'Copy failed',
            deleteSuccess: 'Deleted successfully',
            deleteFailed: 'Delete failed',
            saveSuccess: 'Saved successfully',
            saveFailed: 'Save failed',
            networkError: 'Network error, please try again later',
            unknownError: 'Unknown error',
            darkModeOn: 'Switched to dark mode',
            lightModeOn: 'Switched to light mode',
            generateCodeSuccess: 'Identifier code generated successfully',
            generateCodeFailed: 'Failed to generate identifier code',
            subscriptionCreated: 'Passive subscription created successfully',
            subscriptionCreateFailed: 'Failed to create subscription',
            serviceInfoFetched: 'Service information fetched successfully',
            serviceInfoFetchFailed: 'Failed to fetch service information, default configuration will be used',
            subscriptionToggled: 'Subscription status updated',
            subscriptionDeleted: 'Subscription deleted successfully',
            subscriptionDeleteFailed: 'Failed to delete subscription',
            notificationDetailFailed: 'Failed to fetch notification details',
            operationFailed: 'Operation failed',
            notificationDeleted: 'Notification deleted successfully',
            notificationDeleteFailed: 'Failed to delete notification',
            formatDataFailed: 'Failed to format data',
            pollSuccess: 'Poll successful! Retrieved {count} new notifications',
            pollCooldown: 'Please wait {seconds} seconds before triggering again',
            pollFailed: 'Failed to trigger poll',
            unknownSource: 'Unknown source',
            thirdPartyService: 'Third-party service',
            systemNotification: 'System Notification',
            notificationsRefreshed: 'Notifications refreshed',
            noNotificationsToExport: 'No notifications to export',
            notificationsExported: 'Exported {count} notifications',
            exportFailed: 'Export failed',
            deletedSubscription: 'Deleted subscription'
        },
        
        // Confirm dialogs
        confirmDialog: {
            deleteNotification: {
                title: 'Delete Notification',
                message: 'Are you sure you want to delete this notification? This action cannot be undone.',
                confirm: 'Delete'
            },
            deleteSubscription: {
                title: 'Delete Subscription',
                message: 'Are you sure you want to delete this subscription? Related notification history will be retained.',
                confirm: 'Delete'
            },
            markAllAsRead: {
                title: 'Mark All as Read',
                message: 'Are you sure you want to mark all unread notifications as read?',
                confirm: 'Mark as Read'
            },
            noUnreadNotifications: 'No unread notifications',
            markedNotificationsAsRead: 'Marked {count} notifications as read'
        }
    }
};