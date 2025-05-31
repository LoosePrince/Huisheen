#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第三方示例网站 - 支持回声(Huisheen)通知平台
支持被动模式（提供API供回声轮询）和主动模式（主动推送通知到回声）
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import requests
import json
import uuid
import time
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import logging
import os
from dataclasses import dataclass, asdict
from enum import Enum

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'demo_secret_key_change_in_production'

# 配置
HUISHEEN_BASE_URL = os.getenv('HUISHEEN_BASE_URL', 'http://localhost:3000')
DEMO_BASE_URL = os.getenv('DEMO_BASE_URL', 'http://localhost:5000')

class HuisheenExternalAPI:
    """回声外部API客户端"""
    
    def __init__(self, base_url: str = HUISHEEN_BASE_URL):
        self.base_url = base_url
        self.api_base = f"{base_url}/api/external"
        self.session = requests.Session()
        self.session.timeout = 10
        
    def authenticate(self, notify_code: str, third_party_name: str = "Demo应用") -> Optional[Dict]:
        """使用通知标识码获取访问Token"""
        try:
            response = self.session.post(f"{self.api_base}/auth", json={
                "notifyCode": notify_code,
                "thirdPartyName": third_party_name,
                "thirdPartyUrl": DEMO_BASE_URL
            })
            
            if response.status_code == 201:
                data = response.json()
                # 设置认证头
                self.session.headers.update({
                    'Authorization': f'Bearer {data["token"]}'
                })
                return data
            else:
                logger.error(f"认证失败: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"认证请求异常: {e}")
            return None
            
    def get_notifications(self, limit: int = 20, **filters) -> Optional[Dict]:
        """获取未读通知"""
        try:
            params = {"limit": limit}
            params.update(filters)
            
            response = self.session.get(f"{self.api_base}/notifications", params=params)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"获取通知失败: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"获取通知异常: {e}")
            return None
            
    def mark_as_read(self, notification_id: str) -> bool:
        """标记通知为已读"""
        try:
            response = self.session.patch(f"{self.api_base}/notifications/{notification_id}/read")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"标记已读异常: {e}")
            return False
            
    def get_stats(self) -> Optional[Dict]:
        """获取统计信息"""
        try:
            response = self.session.get(f"{self.api_base}/stats")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"获取统计异常: {e}")
            return None

class NotificationType(Enum):
    INFO = "info"
    WARNING = "warning" 
    ERROR = "error"
    SUCCESS = "success"

class Priority(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class Notification:
    """通知数据结构"""
    id: str
    title: str
    content: str
    type: str
    priority: str
    timestamp: str
    source: str
    callback_url: str = None  # 回调链接
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

# 内存存储（生产环境应使用数据库）
notifications_db: List[Notification] = []
subscribers_db: List[Dict[str, Any]] = []
tokens_db: List[Dict[str, Any]] = []  # 存储已验证的token
external_tokens_db: List[Dict[str, Any]] = []  # 存储外部API token

@dataclass
class SavedExternalToken:
    """保存的外部API token信息"""
    notify_id: str
    notify_code: str
    token: str
    username: str
    third_party_name: str
    created_at: str
    expires_in: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class SavedToken:
    """保存的token信息"""
    notify_id: str
    notify_code: str
    token: str
    third_party_name: str
    created_at: str
    subscription_info: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

def generate_id() -> str:
    """生成唯一ID"""
    return str(uuid.uuid4())

def get_current_timestamp() -> str:
    """获取当前时间戳"""
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

def create_sample_notifications():
    """创建一些示例通知"""
    sample_notifications = [
        Notification(
            id="demo-notification-001",  # 固定ID: 系统维护通知
            title="系统维护通知",
            content="系统将于今晚22:00-24:00进行维护，期间服务可能中断。请提前保存工作并安全退出系统。",
            type=NotificationType.WARNING.value,
            priority=Priority.HIGH.value,
            timestamp=get_current_timestamp(),
            source="系统管理",
            callback_url=f"{DEMO_BASE_URL}/maintenance-info",
            metadata={
                "category": "maintenance",
                "duration": "2小时",
                "affected_services": ["web", "api", "database"],
                "contact": {
                    "name": "运维团队",
                    "email": "ops@example.com",
                    "phone": "+86-400-123-4567"
                },
                "maintenance_steps": [
                    {"step": 1, "action": "停止web服务", "estimated_time": "5分钟"},
                    {"step": 2, "action": "数据库升级", "estimated_time": "90分钟"},
                    {"step": 3, "action": "系统测试", "estimated_time": "20分钟"},
                    {"step": 4, "action": "服务重启", "estimated_time": "5分钟"}
                ],
                "backup_plan": {
                    "enabled": True,
                    "fallback_servers": ["backup1.example.com", "backup2.example.com"],
                    "rollback_time": "15分钟"
                }
            }
        ),
        Notification(
            id="demo-notification-002",  # 固定ID: 新功能上线
            title="新功能上线",
            content="我们刚刚发布了新的用户界面，请查看最新功能。包含全新的仪表板、实时数据展示和移动端优化。",
            type=NotificationType.SUCCESS.value,
            priority=Priority.NORMAL.value,
            timestamp=get_current_timestamp(),
            source="产品团队",
            callback_url=f"{DEMO_BASE_URL}/new-features",
            metadata={
                "version": "2.1.0",
                "release_date": "2024-01-15",
                "features": [
                    {
                        "name": "新UI设计",
                        "description": "全新的Material Design风格界面",
                        "status": "已完成",
                        "impact": "high"
                    },
                    {
                        "name": "性能优化",
                        "description": "页面加载速度提升50%",
                        "status": "已完成",
                        "metrics": {
                            "load_time_before": "2.3s",
                            "load_time_after": "1.1s",
                            "improvement": "52%"
                        }
                    },
                    {
                        "name": "移动端适配",
                        "description": "响应式设计，支持各种屏幕尺寸",
                        "status": "已完成",
                        "supported_devices": ["iOS", "Android", "平板"]
                    }
                ],
                "statistics": {
                    "code_lines_changed": 15420,
                    "bugs_fixed": 47,
                    "test_coverage": "95.2%",
                    "performance_score": 98
                },
                "team": {
                    "lead": "张三",
                    "developers": ["李四", "王五", "赵六"],
                    "testers": ["钱七", "孙八"],
                    "designers": ["周九"]
                }
            }
        ),
        Notification(
            id="demo-notification-003",  # 固定ID: 安全警告
            title="安全警告",
            content="检测到异常登录尝试，请检查您的账户安全。建议立即更改密码并启用两步验证。",
            type=NotificationType.ERROR.value,
            priority=Priority.URGENT.value,
            timestamp=get_current_timestamp(),
            source="安全系统",
            callback_url=f"{DEMO_BASE_URL}/security-report",
            metadata={
                "alert_id": "SEC-2024-001",
                "threat_level": "高",
                "attack_details": {
                    "source_ip": "192.168.1.100",
                    "location": {
                        "country": "中国",
                        "region": "北京",
                        "city": "北京市",
                        "coordinates": {"lat": 39.9042, "lng": 116.4074}
                    },
                    "attempts": 5,
                    "first_attempt": "2024-01-15T14:30:00Z",
                    "last_attempt": "2024-01-15T14:45:00Z",
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "methods_used": ["bruteforce", "dictionary_attack"]
                },
                "affected_accounts": [
                    {"username": "admin", "status": "blocked"},
                    {"username": "user123", "status": "suspicious"}
                ],
                "recommendations": [
                    {
                        "action": "change_password",
                        "priority": "immediate",
                        "description": "立即更改密码"
                    },
                    {
                        "action": "enable_2fa",
                        "priority": "high",
                        "description": "启用两步验证"
                    },
                    {
                        "action": "review_sessions",
                        "priority": "medium",
                        "description": "检查活跃会话"
                    }
                ],
                "system_response": {
                    "ip_blocked": True,
                    "notifications_sent": 3,
                    "escalation_level": 2,
                    "auto_actions": ["rate_limit", "captcha_enabled", "admin_notified"]
                }
            }
        ),
        Notification(
            id="demo-notification-004",  # 固定ID: 订单处理通知
            title="订单处理通知",
            content="您的订单 #ORD-20240115-001 已成功处理，预计3-5个工作日内送达。",
            type=NotificationType.INFO.value,
            priority=Priority.NORMAL.value,
            timestamp=get_current_timestamp(),
            source="订单系统",
            callback_url=f"{DEMO_BASE_URL}/order-details",
            metadata={
                "order": {
                    "id": "ORD-20240115-001",
                    "number": "20240115001",
                    "status": "processing",
                    "total_amount": 299.99,
                    "currency": "CNY",
                    "payment_method": "支付宝",
                    "created_at": "2024-01-15T10:30:00Z"
                },
                "customer": {
                    "id": "CUST-12345",
                    "name": "张三",
                    "email": "zhangsan@example.com",
                    "phone": "+86-138-0000-0000",
                    "vip_level": "gold"
                },
                "items": [
                    {
                        "product_id": "PROD-001",
                        "name": "MacBook Pro 14英寸",
                        "sku": "MBP14-M2-512GB",
                        "quantity": 1,
                        "unit_price": 14999.00,
                        "discount": 500.00,
                        "final_price": 14499.00
                    },
                    {
                        "product_id": "PROD-002", 
                        "name": "Magic Mouse",
                        "sku": "MM-WHITE",
                        "quantity": 1,
                        "unit_price": 799.00,
                        "discount": 0.00,
                        "final_price": 799.00
                    }
                ],
                "shipping": {
                    "method": "顺丰快递",
                    "tracking_number": "SF1234567890",
                    "estimated_delivery": "2024-01-20",
                    "address": {
                        "recipient": "张三",
                        "phone": "+86-138-0000-0000",
                        "province": "北京市",
                        "city": "北京市",
                        "district": "朝阳区",
                        "street": "建国路1号",
                        "postal_code": "100000"
                    }
                },
                "tracking_events": [
                    {"time": "2024-01-15T10:30:00Z", "status": "订单创建", "location": "北京"},
                    {"time": "2024-01-15T11:00:00Z", "status": "支付确认", "location": "北京"},
                    {"time": "2024-01-15T11:30:00Z", "status": "开始处理", "location": "北京仓库"},
                    {"time": "2024-01-15T14:00:00Z", "status": "已出库", "location": "北京仓库"}
                ]
            }
        ),
        Notification(
            id="demo-notification-005",  # 固定ID: 普通信息
            title="普通信息",
            content="这是一条不带回调链接的普通通知，用于测试基础功能。",
            type=NotificationType.INFO.value,
            priority=Priority.LOW.value,
            timestamp=get_current_timestamp(),
            source="系统信息",
            callback_url=None,  # 无回调链接
            metadata={
                "test": True,
                "simple_fields": {
                    "string": "文本内容",
                    "number": 42,
                    "boolean": True,
                    "null_value": None,
                    "array": ["item1", "item2", "item3"],
                    "nested_object": {
                        "level1": {
                            "level2": {
                                "deep_value": "深层嵌套的值"
                            }
                        }
                    }
                },
                "unicode_test": {
                    "chinese": "中文测试",
                    "japanese": "日本語テスト", 
                    "korean": "한국어 테스트",
                    "emoji": "🎉🔥💎⭐🚀",
                    "special_chars": "特殊字符: @#$%^&*()[]{}|\\:;\"'<>,.?/~`"
                },
                "timestamp_formats": {
                    "iso_format": "2024-01-15T12:30:00.000Z",
                    "unix_timestamp": 1705319400,
                    "readable": "2024年1月15日 12:30:00"
                }
            }
        )
    ]
    
    notifications_db.extend(sample_notifications)
    logger.info(f"创建了 {len(sample_notifications)} 个示例通知，使用固定ID")

@app.route('/')
def index():
    """首页 - 显示第三方网站功能"""
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return render_template('index.html', 
                         notifications=notifications_db,
                         subscribers=subscribers_db,
                         huisheen_url=HUISHEEN_BASE_URL,
                         demo_url=DEMO_BASE_URL,
                         current_time=current_time)

# ============ 被动模式 API ============

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """
    被动模式API - 供回声平台轮询
    回声平台会定期调用此接口获取新通知
    """
    try:
        # 获取查询参数
        since = request.args.get('since')  # 时间戳，获取此时间之后的通知
        limit = int(request.args.get('limit', 10))  # 限制返回数量
        
        # 过滤通知
        filtered_notifications = notifications_db.copy()
        
        if since:
            try:
                since_time = datetime.fromisoformat(since.replace('Z', '+00:00'))
                filtered_notifications = [
                    n for n in filtered_notifications 
                    if datetime.fromisoformat(n.timestamp.replace('Z', '+00:00')) > since_time
                ]
            except ValueError:
                logger.warning(f"无效的since参数: {since}")
        
        # 限制返回数量
        filtered_notifications = filtered_notifications[:limit]
        
        # 转换为回声平台期望的格式
        notifications_formatted = []
        for n in filtered_notifications:
            notification_dict = {
                'id': n.id,
                'title': n.title,
                'content': n.content,
                'type': n.type,
                'priority': n.priority,
                'timestamp': n.timestamp,
                'source': n.source,
                'callback_url': n.callback_url,  # 添加回调链接
                'metadata': n.metadata or {}
            }
            notifications_formatted.append(notification_dict)
        
        logger.info(f"被动模式API调用 - 返回 {len(notifications_formatted)} 个通知")
        
        # 返回回声平台期望的格式
        return jsonify({
            'notifications': notifications_formatted
        })
        
    except Exception as e:
        logger.error(f"获取通知失败: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/notifications/<notification_id>', methods=['GET'])
def get_notification(notification_id: str):
    """获取单个通知详情"""
    try:
        notification = next((n for n in notifications_db if n.id == notification_id), None)
        
        if not notification:
            return jsonify({
                'success': False,
                'error': '通知不存在'
            }), 404
            
        return jsonify({
            'success': True,
            'notification': notification.to_dict()
        })
        
    except Exception as e:
        logger.error(f"获取通知详情失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ 主动模式功能 ============

@app.route('/api/send-notification', methods=['POST'])
def send_notification():
    """
    主动模式 - 向回声平台发送通知
    优先使用已保存的token，如果没有则验证notify_code获取新token
    """
    try:
        data = request.get_json()
        
        # 验证必需字段
        required_fields = ['title', 'content']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'缺少必需字段: {", ".join(missing_fields)}'
            }), 400
        
        token = None
        notify_id = None
        verify_result = None
        
        # 方式1：使用已保存的token
        if data.get('use_saved_token') and data.get('notify_id'):
            notify_id = data['notify_id']
            saved_token = next((t for t in tokens_db if t['notify_id'] == notify_id), None)
            
            if saved_token:
                token = saved_token['token']
                logger.info(f"使用已保存的token: {notify_id}")
            else:
                return jsonify({
                    'success': False,
                    'error': f'未找到保存的token: {notify_id}'
                }), 400
        
        # 方式2：使用新的notify_code验证
        elif data.get('notify_code'):
            notify_code = data['notify_code']
            
            # 解析notify_code获取notifyId
            if not notify_code.startswith('notify:user:'):
                return jsonify({'error': '通知标识码格式不正确，应为: notify:user:xxxx-xxxx-xxxx:xxxxxx@huisheen.com'}), 400
                
            # 处理新格式的通知标识码（支持@域名后缀）
            # 新格式: notify:user:1234-5678-9abc:ABC123@huisheen.com
            at_index = notify_code.find('@')
            if at_index != -1:
                code_without_domain = notify_code[:at_index]
            else:
                code_without_domain = notify_code
                
            parts = code_without_domain.split(':')
            if len(parts) != 4:
                return jsonify({
                    'success': False,
                    'error': '通知标识码格式不正确'
                }), 400
                
            notify_id = parts[2]  # 提取notifyId部分
            
            # 检查是否已经保存过这个token
            existing_token = next((t for t in tokens_db if t['notify_id'] == notify_id), None)
            if existing_token:
                token = existing_token['token']
                logger.info(f"使用已存在的token: {notify_id}")
            else:
                # 验证notify_code并获取新token
                verify_url = f"{HUISHEEN_BASE_URL}/api/subscriptions/active/verify"
                verify_data = {
                    'notifyCode': notify_code,
                    'thirdPartyName': data.get('source', '第三方演示服务'),
                    'thirdPartyUrl': DEMO_BASE_URL
                }
                
                logger.info(f"验证新的通知标识码: {verify_url}")
                logger.info(f"验证数据: {json.dumps(verify_data, ensure_ascii=False, indent=2)}")
                
                try:
                    verify_response = requests.post(
                        verify_url,
                        json=verify_data,
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    
                    if verify_response.status_code not in [200, 201]:
                        try:
                            error_detail = verify_response.json()
                            error_message = error_detail.get('error', '未知错误')
                            error_code = error_detail.get('code', 'UNKNOWN_ERROR')
                            error_details = error_detail.get('details', {})
                            
                            logger.error(f"验证通知标识码失败: {verify_response.status_code} - {error_message}")
                            
                            return jsonify({
                                'success': False,
                                'error': error_message,
                                'error_code': error_code,
                                'error_details': error_details,
                                'step': 'verify_notify_code',
                                'status_code': verify_response.status_code
                            }), verify_response.status_code  # 保留原始状态码
                        except:
                            error_msg = f"验证通知标识码失败: {verify_response.status_code} - {verify_response.text}"
                            logger.error(error_msg)
                            
                            return jsonify({
                                'success': False,
                                'error': error_msg,
                                'step': 'verify_notify_code',
                                'status_code': verify_response.status_code
                            }), verify_response.status_code  # 保留原始状态码
                        
                    verify_result = verify_response.json()
                    token = verify_result.get('token')
                    
                    if not token:
                        return jsonify({
                            'success': False,
                            'error': '验证成功但未获取到token'
                        }), 500
                        
                    # 保存新token
                    saved_token = {
                        'notify_id': notify_id,
                        'notify_code': notify_code,
                        'token': token,
                        'third_party_name': data.get('source', '第三方演示服务'),
                        'created_at': get_current_timestamp(),
                        'subscription_info': verify_result
                    }
                    tokens_db.append(saved_token)
                    
                    logger.info(f"验证成功并保存token: {notify_id}")
                    
                except requests.exceptions.RequestException as e:
                    error_msg = f"无法连接到回声平台进行验证: {str(e)}"
                    logger.error(error_msg)
                    return jsonify({
                        'success': False,
                        'error': error_msg,
                        'step': 'verify_notify_code'
                    }), 503
        else:
            return jsonify({
                'success': False,
                'error': '必须提供notify_code或选择已保存的token'
            }), 400
        
        # 发送通知
        notification_data = {
            'notifyId': notify_id,
            'token': token,
            'title': data['title'],
            'content': data['content'],
            'type': data.get('type', NotificationType.INFO.value),
            'priority': data.get('priority', Priority.NORMAL.value),
            'source': {
                'name': data.get('source', '第三方演示服务'),
                'url': DEMO_BASE_URL,
                'icon': None  # 可选字段
            },
            'metadata': data.get('metadata', {})
        }
        
        # 添加回调链接（如果提供）
        callback_url = data.get('callback_url')
        if callback_url and callback_url.strip():
            notification_data['callbackUrl'] = callback_url.strip()
        
        # 只有在提供了外部ID时才添加，避免空字符串
        external_id = data.get('external_id')
        if external_id and external_id.strip():
            notification_data['externalId'] = external_id.strip()
        
        send_url = f"{HUISHEEN_BASE_URL}/api/notifications/receive"
        
        logger.info(f"发送通知: {send_url}")
        logger.info(f"通知数据: {json.dumps(notification_data, ensure_ascii=False, indent=2)}")
        
        try:
            send_response = requests.post(
                send_url,
                json=notification_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if send_response.status_code in [200, 201]:
                result = send_response.json()
                logger.info(f"通知发送成功: {result}")
                
                return jsonify({
                    'success': True,
                    'message': '通知已成功发送到回声平台',
                    'verify_result': verify_result,
                    'send_result': result,
                    'notify_id': notify_id,
                    'used_saved_token': data.get('use_saved_token', False)
                })
            else:
                try:
                    error_detail = send_response.json()
                    error_message = error_detail.get('error', '未知错误')
                    error_code = error_detail.get('code', 'UNKNOWN_ERROR')
                    error_details = error_detail.get('details', {})
                    
                    logger.error(f"发送通知失败: {send_response.status_code} - {error_message}")
                    
                    return jsonify({
                        'success': False,
                        'error': error_message,
                        'error_code': error_code,
                        'error_details': error_details,
                        'step': 'send_notification',
                        'status_code': send_response.status_code
                    }), send_response.status_code  # 保留原始状态码
                except:
                    error_msg = f"发送通知失败: {send_response.status_code} - {send_response.text}"
                    logger.error(error_msg)
                    
                    return jsonify({
                        'success': False,
                        'error': error_msg,
                        'step': 'send_notification',
                        'status_code': send_response.status_code
                    }), send_response.status_code  # 保留原始状态码
                
        except requests.exceptions.RequestException as e:
            error_msg = f"无法连接到回声平台: {str(e)}"
            logger.error(error_msg)
            return jsonify({
                'success': False,
                'error': error_msg,
                'step': 'send_notification',
                'status_code': 503
            }), 503
        
    except Exception as e:
        logger.error(f"发送通知失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ 管理功能 ============

@app.route('/admin/create-notification', methods=['POST'])
def create_notification():
    """创建新通知（管理功能）"""
    try:
        data = request.get_json() or request.form.to_dict()
        
        notification = Notification(
            id=generate_id(),
            title=data.get('title', ''),
            content=data.get('content', ''),
            type=data.get('type', NotificationType.INFO.value),
            priority=data.get('priority', Priority.NORMAL.value),
            timestamp=get_current_timestamp(),
            source=data.get('source', '管理员'),
            callback_url=data.get('callback_url'),  # 添加回调链接支持
            metadata=data.get('metadata', {})
        )
        
        notifications_db.append(notification)
        logger.info(f"创建新通知: {notification.title}")
        
        if request.is_json:
            return jsonify({
                'success': True,
                'notification': notification.to_dict()
            })
        else:
            flash('通知创建成功', 'success')
            return redirect(url_for('index'))
            
    except Exception as e:
        logger.error(f"创建通知失败: {str(e)}")
        if request.is_json:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        else:
            flash(f'创建通知失败: {str(e)}', 'error')
            return redirect(url_for('index'))

@app.route('/admin/clear-notifications', methods=['POST'])
def clear_notifications():
    """清空所有通知"""
    global notifications_db
    notifications_db.clear()
    logger.info("清空所有通知")
    
    if request.is_json:
        return jsonify({'success': True, 'message': '所有通知已清空'})
    else:
        flash('所有通知已清空', 'success')
        return redirect(url_for('index'))

@app.route('/admin/generate-sample', methods=['POST'])
def generate_sample():
    """生成示例通知"""
    create_sample_notifications()
    
    if request.is_json:
        return jsonify({
            'success': True, 
            'message': f'已生成示例通知，当前共有 {len(notifications_db)} 条通知'
        })
    else:
        flash('示例通知已生成', 'success')
        return redirect(url_for('index'))

@app.route('/admin/generate-test-notification', methods=['POST'])
def generate_test_notification():
    """生成测试用的复杂通知"""
    try:
        data = request.get_json() or {}
        
        # 生成复杂的测试数据
        test_metadata = {
            "test_notification": True,
            "generation_time": get_current_timestamp(),
            "complex_data": {
                "nested_arrays": [
                    {"id": 1, "values": [1, 2, 3, 4, 5]},
                    {"id": 2, "values": ["a", "b", "c", "d", "e"]},
                    {"id": 3, "values": [True, False, None, 42, "mixed"]}
                ],
                "deep_nesting": {
                    "level1": {
                        "level2": {
                            "level3": {
                                "level4": {
                                    "level5": {
                                        "deep_value": "这是5层嵌套的值",
                                        "array_in_deep": [{"x": 1}, {"y": 2}, {"z": 3}]
                                    }
                                }
                            }
                        }
                    }
                },
                "data_types": {
                    "string": "字符串",
                    "integer": 123456,
                    "float": 3.14159,
                    "boolean_true": True,
                    "boolean_false": False,
                    "null_value": None,
                    "empty_string": "",
                    "empty_array": [],
                    "empty_object": {}
                },
                "large_text": "这是一段很长的文本，用于测试JSON显示的滚动和格式化功能。" * 10,
                "special_characters": {
                    "quotes": "单引号'和双引号\"",
                    "backslashes": "反斜杠\\和路径C:\\Windows\\System32",
                    "newlines": "第一行\n第二行\n第三行",
                    "tabs": "制表符\t分隔\t的\t内容",
                    "unicode": "Unicode字符: 你好世界 🌍 こんにちは 안녕하세요"
                },
                "api_response_simulation": {
                    "status": "success",
                    "code": 200,
                    "message": "操作成功",
                    "data": {
                        "user_id": 12345,
                        "username": "testuser",
                        "permissions": ["read", "write", "delete"],
                        "settings": {
                            "theme": "dark",
                            "language": "zh-CN",
                            "notifications": {
                                "email": True,
                                "sms": False,
                                "push": True
                            }
                        }
                    },
                    "pagination": {
                        "page": 1,
                        "limit": 20,
                        "total": 150,
                        "has_next": True,
                        "has_prev": False
                    }
                }
            },
            "performance_data": {
                "response_time": "45ms",
                "memory_usage": "256MB",
                "cpu_usage": "12%",
                "database_queries": 3,
                "cache_hits": 15,
                "cache_misses": 2
            },
            "environment_info": {
                "server": "demo-server-001",
                "version": "1.0.0",
                "environment": "development",
                "region": "asia-east",
                "timestamp": get_current_timestamp()
            }
        }
        
        # 合并用户提供的元数据
        if data.get('metadata'):
            test_metadata.update(data['metadata'])
        
        notification = Notification(
            id=data.get('id', generate_id()),  # 支持指定固定ID，如果不指定则使用随机ID
            title=data.get('title', '复杂测试通知'),
            content=data.get('content', '这是一个包含复杂JSON数据的测试通知，用于测试回声平台的完整通知显示功能。'),
            type=data.get('type', NotificationType.INFO.value),
            priority=data.get('priority', Priority.NORMAL.value),
            timestamp=get_current_timestamp(),
            source=data.get('source', '测试系统'),
            callback_url=data.get('callback_url', f"{DEMO_BASE_URL}/test-page"),
            metadata=test_metadata
        )
        
        notifications_db.append(notification)
        logger.info(f"生成测试通知: {notification.title}")
        
        return jsonify({
            'success': True,
            'message': '复杂测试通知已生成',
            'notification': notification.to_dict()
        })
        
    except Exception as e:
        logger.error(f"生成测试通知失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tokens', methods=['GET'])
def get_tokens():
    """获取所有已保存的token"""
    try:
        # 返回token列表（隐藏完整token，只显示前缀）
        tokens_info = []
        for token_data in tokens_db:
            token_info = token_data.copy()
            # 隐藏完整token，只显示前缀用于识别
            token_info['token_preview'] = token_data['token'][:20] + '...'
            token_info['token'] = token_data['token']  # 保留完整token供发送使用
            tokens_info.append(token_info)
        
        return jsonify({
            'success': True,
            'tokens': tokens_info,
            'count': len(tokens_info)
        })
    except Exception as e:
        logger.error(f"获取token列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tokens/<notify_id>', methods=['DELETE'])
def delete_token(notify_id: str):
    """删除指定的token"""
    try:
        global tokens_db
        original_count = len(tokens_db)
        tokens_db = [t for t in tokens_db if t['notify_id'] != notify_id]
        
        if len(tokens_db) < original_count:
            logger.info(f"删除token: {notify_id}")
            return jsonify({
                'success': True,
                'message': f'Token {notify_id} 已删除'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Token {notify_id} 不存在'
            }), 404
    except Exception as e:
        logger.error(f"删除token失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tokens/clear', methods=['POST'])
def clear_tokens():
    """清空所有token"""
    try:
        global tokens_db
        count = len(tokens_db)
        tokens_db.clear()
        logger.info(f"清空所有token，共删除 {count} 个")
        
        return jsonify({
            'success': True,
            'message': f'已清空所有token，共删除 {count} 个'
        })
    except Exception as e:
        logger.error(f"清空token失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ 健康检查和信息 ============

@app.route('/health')
def health():
    """健康检查端点"""
    return jsonify({
        'status': 'ok',
        'service': '第三方演示服务',
        'timestamp': get_current_timestamp(),
        'notifications_count': len(notifications_db),
        'version': '1.0.0'
    })

@app.route('/api/info')
def api_info():
    """API信息"""
    return jsonify({
        'service': '第三方演示服务',
        'description': '支持回声(Huisheen)通知平台的示例第三方服务',
        'version': '1.0.0',
        'endpoints': {
            'passive_mode': {
                'get_notifications': '/api/notifications',
                'get_notification': '/api/notifications/{id}',
                'description': '被动模式 - 供回声平台轮询'
            },
            'active_mode': {
                'send_notification': '/api/send-notification',
                'description': '主动模式 - 向回声平台推送通知'
            },
            'admin': {
                'create_notification': '/admin/create-notification',
                'clear_notifications': '/admin/clear-notifications',
                'generate_sample': '/admin/generate-sample'
            }
        },
        'huisheen_integration': {
            'huisheen_url': HUISHEEN_BASE_URL,
            'demo_url': DEMO_BASE_URL,
            'supported_modes': ['passive', 'active']
        }
    })

@app.route('/api/service-info')
def service_info():
    """
    供回声平台调用的服务信息端点
    返回第三方服务的基本信息，用于自动填充被动订阅
    """
    return jsonify({
        'name': '第三方演示服务',
        'description': '这是一个演示如何与回声平台集成的第三方服务',
        'version': '1.0.0',
        'provider': 'Demo Provider',
        'contact': 'demo@example.com',
        'polling_interval': 5,  # 建议的轮询间隔（分钟）
        'api_endpoint': f'{DEMO_BASE_URL}/api/notifications',
        'supported_features': ['notifications', 'polling', 'webhooks'],
        'notification_types': ['info', 'warning', 'error', 'success'],
        'priority_levels': ['low', 'normal', 'high', 'urgent'],
        'owner_notify_id': '8397-fb3c-154e'
    })

# ============ 示例回调页面 ============

@app.route('/maintenance-info')
def maintenance_info():
    """维护信息页面"""
    return '''
    <html>
    <head><title>系统维护信息</title></head>
    <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>🔧 系统维护信息</h1>
        <p>维护时间：今晚22:00-24:00</p>
        <p>维护内容：数据库升级、性能优化</p>
        <p>影响范围：全部服务暂停</p>
        <p>预计恢复：明日00:00</p>
        <p><a href="javascript:window.close()">关闭页面</a></p>
    </body>
    </html>
    '''

@app.route('/new-features')
def new_features():
    """新功能介绍页面"""
    return '''
    <html>
    <head><title>新功能介绍</title></head>
    <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>🎉 新功能介绍</h1>
        <h2>版本 2.1.0</h2>
        <ul>
            <li>全新的用户界面设计</li>
            <li>性能优化，响应速度提升50%</li>
            <li>新增通知回调链接功能</li>
            <li>改进的移动端体验</li>
        </ul>
        <p><a href="javascript:window.close()">关闭页面</a></p>
    </body>
    </html>
    '''

@app.route('/security-report')
def security_report():
    """安全报告页面"""
    return '''
    <html>
    <head><title>安全报告</title></head>
    <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>🔒 安全报告</h1>
        <h2>异常登录尝试详情</h2>
        <p><strong>IP地址：</strong>192.168.1.100</p>
        <p><strong>尝试次数：</strong>5次</p>
        <p><strong>时间范围：</strong>过去1小时</p>
        <p><strong>建议操作：</strong></p>
        <ul>
            <li>更改密码</li>
            <li>启用两步验证</li>
            <li>检查账户活动记录</li>
        </ul>
        <p><a href="javascript:window.close()">关闭页面</a></p>
    </body>
    </html>
    '''

@app.route('/order-details')
def order_details():
    """订单详情页面"""
    return '''
    <html>
    <head><title>订单详情</title></head>
    <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>📦 订单详情</h1>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>订单信息</h2>
            <p><strong>订单号：</strong>ORD-20240115-001</p>
            <p><strong>状态：</strong>处理中</p>
            <p><strong>总金额：</strong>¥15,298.00</p>
            <p><strong>支付方式：</strong>支付宝</p>
        </div>
        
        <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>商品列表</h2>
            <ul>
                <li>MacBook Pro 14英寸 (M2, 512GB) - ¥14,499.00</li>
                <li>Magic Mouse (白色) - ¥799.00</li>
            </ul>
        </div>
        
        <div style="background: #f0fff0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>配送信息</h2>
            <p><strong>快递公司：</strong>顺丰快递</p>
            <p><strong>运单号：</strong>SF1234567890</p>
            <p><strong>预计送达：</strong>2024-01-20</p>
            <p><strong>收货地址：</strong>北京市朝阳区建国路1号</p>
        </div>
        
        <p><a href="javascript:window.close()">关闭页面</a></p>
    </body>
    </html>
    '''

@app.route('/test-page')
def test_page():
    """测试页面"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>测试页面</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            h1 { color: #2c3e50; }
            .info { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .btn { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
            .btn:hover { background: #2980b9; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧪 测试页面</h1>
            <div class="info">
                <p><strong>这是一个测试页面!</strong></p>
                <p>您已成功访问回调链接。这个页面用于演示通知中的回调功能。</p>
                <p>在实际应用中，您可以在这里显示相关的详细信息、执行特定操作或提供相关服务。</p>
            </div>
            
            <h2>📊 测试数据</h2>
            <ul>
                <li>数字测试: 42, 3.14159, -1000</li>
                <li>布尔测试: true, false</li>
                <li>字符串测试: "Hello, 世界!", "Special chars: !@#$%^&*()"</li>
                <li>Unicode测试: 🎉🔥⭐🚀💡</li>
                <li>空值测试: null, undefined</li>
            </ul>
            
            <h2>🔧 测试操作</h2>
            <button class="btn" onclick="alert('测试按钮点击成功!')">测试按钮</button>
            <button class="btn" onclick="window.close()">关闭窗口</button>
            
            <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
                <p>页面生成时间: ''' + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '''</p>
                <p>这个页面可以用来测试回声平台的通知回调功能。</p>
            </div>
        </div>
    </body>
    </html>
    '''

# ==================== 外部API功能 ====================

@app.route('/external-api')
def external_api_page():
    """外部API管理页面"""
    return render_template('external_api.html', 
                         tokens=external_tokens_db,
                         huisheen_url=HUISHEEN_BASE_URL)

@app.route('/api/external/auth', methods=['POST'])
def external_api_auth():
    """使用通知标识码获取外部API访问Token"""
    try:
        data = request.get_json()
        notify_code = data.get('notify_code', '').strip()
        
        if not notify_code:
            return jsonify({'error': '请输入通知标识码'}), 400
            
        if not notify_code.startswith('notify:user:'):
            return jsonify({'error': '通知标识码格式不正确，应为: notify:user:xxxx-xxxx-xxxx:xxxxxx@huisheen.com'}), 400
        
        # 使用外部API客户端进行认证
        api_client = HuisheenExternalAPI()
        auth_result = api_client.authenticate(notify_code, "Demo应用")
        
        if not auth_result:
            return jsonify({'error': '认证失败，请检查通知标识码是否正确或已过期'}), 401
        
        # 保存token信息
        saved_token = SavedExternalToken(
            notify_id=auth_result['userInfo']['notifyId'],
            notify_code=notify_code,
            token=auth_result['token'],
            username=auth_result['userInfo']['username'],
            third_party_name="Demo应用",
            created_at=get_current_timestamp(),
            expires_in=auth_result['expiresIn']
        )
        
        # 检查是否已存在相同的notify_id，如果存在则更新
        existing_index = None
        for i, token_info in enumerate(external_tokens_db):
            if token_info.get('notify_id') == saved_token.notify_id:
                existing_index = i
                break
        
        if existing_index is not None:
            external_tokens_db[existing_index] = saved_token.to_dict()
        else:
            external_tokens_db.append(saved_token.to_dict())
        
        return jsonify({
            'success': True,
            'message': '认证成功！',
            'userInfo': auth_result['userInfo'],
            'expiresIn': auth_result['expiresIn']
        })
        
    except Exception as e:
        logger.error(f"外部API认证错误: {e}")
        return jsonify({'error': f'认证过程中发生错误: {str(e)}'}), 500

@app.route('/api/external/notifications/<notify_id>')
def get_external_notifications(notify_id: str):
    """获取指定用户的回声通知"""
    try:
        # 查找对应的token
        token_info = None
        for token in external_tokens_db:
            if token.get('notify_id') == notify_id:
                token_info = token
                break
        
        if not token_info:
            return jsonify({'error': '未找到认证信息，请先进行认证'}), 401
        
        # 创建API客户端并设置token
        api_client = HuisheenExternalAPI()
        api_client.session.headers.update({
            'Authorization': f'Bearer {token_info["token"]}'
        })
        
        # 获取通知
        limit = request.args.get('limit', 20, type=int)
        filters = {}
        
        # 处理筛选参数
        if request.args.get('type'):
            filters['type'] = request.args.get('type')
        if request.args.get('priority'):
            filters['priority'] = request.args.get('priority')
        if request.args.get('since'):
            filters['since'] = request.args.get('since')
        
        notifications_data = api_client.get_notifications(limit=limit, **filters)
        
        if not notifications_data:
            return jsonify({'error': '获取通知失败，Token可能已过期'}), 401
        
        # 同时获取统计信息
        stats_data = api_client.get_stats()
        
        return jsonify({
            'success': True,
            'notifications': notifications_data['data']['notifications'],
            'pagination': notifications_data['data']['pagination'],
            'stats': stats_data['data'] if stats_data else None,
            'userInfo': {
                'notifyId': notify_id,
                'username': token_info['username']
            }
        })
        
    except Exception as e:
        logger.error(f"获取外部通知错误: {e}")
        return jsonify({'error': f'获取通知时发生错误: {str(e)}'}), 500

@app.route('/api/external/notifications/<notify_id>/<notification_id>/read', methods=['POST'])
def mark_external_notification_read(notify_id: str, notification_id: str):
    """标记回声通知为已读"""
    try:
        # 查找对应的token
        token_info = None
        for token in external_tokens_db:
            if token.get('notify_id') == notify_id:
                token_info = token
                break
        
        if not token_info:
            return jsonify({'error': '未找到认证信息'}), 401
        
        # 创建API客户端并设置token
        api_client = HuisheenExternalAPI()
        api_client.session.headers.update({
            'Authorization': f'Bearer {token_info["token"]}'
        })
        
        # 标记为已读
        success = api_client.mark_as_read(notification_id)
        
        if success:
            return jsonify({'success': True, 'message': '通知已标记为已读'})
        else:
            return jsonify({'error': '标记已读失败'}), 500
        
    except Exception as e:
        logger.error(f"标记外部通知已读错误: {e}")
        return jsonify({'error': f'操作失败: {str(e)}'}), 500

@app.route('/api/external/tokens/<notify_id>', methods=['DELETE'])
def delete_external_token(notify_id: str):
    """删除保存的外部API token"""
    try:
        global external_tokens_db
        
        # 查找并删除token
        external_tokens_db = [token for token in external_tokens_db 
                            if token.get('notify_id') != notify_id]
        
        return jsonify({'success': True, 'message': 'Token已删除'})
        
    except Exception as e:
        logger.error(f"删除外部token错误: {e}")
        return jsonify({'error': f'删除失败: {str(e)}'}), 500

@app.route('/api/external/tokens/clear', methods=['POST'])
def clear_external_tokens():
    """清空所有外部API token"""
    try:
        global external_tokens_db
        external_tokens_db.clear()
        
        return jsonify({'success': True, 'message': '所有Token已清空'})
        
    except Exception as e:
        logger.error(f"清空外部tokens错误: {e}")
        return jsonify({'error': f'清空失败: {str(e)}'}), 500

if __name__ == '__main__':
    # 初始化示例数据
    create_sample_notifications()
    
    print("\n" + "="*60)
    print("🎯 第三方演示服务启动中...")
    print(f"📍 服务地址: {DEMO_BASE_URL}")
    print(f"🔗 回声平台: {HUISHEEN_BASE_URL}")
    print("="*60)
    print("\n📋 可用端点:")
    print(f"  🌐 首页: {DEMO_BASE_URL}/")
    print(f"  📊 API信息: {DEMO_BASE_URL}/api/info")
    print(f"  ✅ 健康检查: {DEMO_BASE_URL}/health")
    print("\n🔄 被动模式 (供回声轮询):")
    print(f"  📥 获取通知: {DEMO_BASE_URL}/api/notifications")
    print("\n📤 主动模式 (推送到回声):")
    print(f"  🚀 发送通知: {DEMO_BASE_URL}/api/send-notification")
    print("\n" + "="*60 + "\n")
    
    # 启动Flask应用
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False  # 避免重复初始化数据
    ) 