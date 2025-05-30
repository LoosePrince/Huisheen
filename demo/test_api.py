#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API测试脚本 - 测试第三方演示服务的各种功能
"""

import requests
import json
import time
from datetime import datetime

# 配置
DEMO_BASE_URL = "http://localhost:5000"
HUISHEEN_BASE_URL = "http://localhost:3000"

def test_health_check():
    """测试健康检查"""
    print("🔍 测试健康检查...")
    try:
        response = requests.get(f"{DEMO_BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 服务健康 - 状态: {data['status']}, 通知数量: {data['notifications_count']}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False

def test_api_info():
    """测试API信息"""
    print("\n📋 获取API信息...")
    try:
        response = requests.get(f"{DEMO_BASE_URL}/api/info")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 服务: {data['service']}")
            print(f"   版本: {data['version']}")
            print(f"   描述: {data['description']}")
            return True
        else:
            print(f"❌ 获取API信息失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def test_create_notification():
    """测试创建本地通知"""
    print("\n📝 创建测试通知...")
    test_notification = {
        "title": "API测试通知",
        "content": "这是通过API创建的测试通知",
        "type": "info",
        "priority": "normal",
        "source": "API测试脚本"
    }
    
    try:
        response = requests.post(
            f"{DEMO_BASE_URL}/admin/create-notification",
            json=test_notification
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 通知创建成功: {data['notification']['id']}")
            return data['notification']['id']
        else:
            print(f"❌ 创建通知失败: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return None

def test_get_notifications():
    """测试获取通知列表（被动模式）"""
    print("\n📥 测试被动模式API...")
    try:
        response = requests.get(f"{DEMO_BASE_URL}/api/notifications?limit=5")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 获取通知成功: {data['total']} 条通知")
            for notification in data['notifications']:
                print(f"   - {notification['title']} ({notification['type']})")
            return True
        else:
            print(f"❌ 获取通知失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def test_send_active_notification(notify_code):
    """测试主动推送通知"""
    print(f"\n🚀 测试主动推送模式...")
    if not notify_code:
        print("⚠️  跳过主动推送测试 - 需要提供notify_code")
        return False
    
    test_notification = {
        "notify_code": notify_code,
        "title": "主动推送测试",
        "content": f"这是来自第三方演示服务的主动推送测试通知 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "type": "success",
        "priority": "normal",
        "source": "第三方演示服务",
        "metadata": {
            "test_id": "api_test_001",
            "timestamp": datetime.now().isoformat()
        }
    }
    
    try:
        response = requests.post(
            f"{DEMO_BASE_URL}/api/send-notification",
            json=test_notification
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 主动推送成功: {data['message']}")
            return True
        else:
            try:
                error_data = response.json()
                print(f"❌ 主动推送失败: {error_data.get('error', response.text)}")
            except:
                print(f"❌ 主动推送失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def test_generate_sample_data():
    """测试生成示例数据"""
    print("\n🎲 生成示例数据...")
    try:
        response = requests.post(f"{DEMO_BASE_URL}/admin/generate-sample")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 示例数据生成成功: {data['message']}")
            return True
        else:
            print(f"❌ 生成示例数据失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def main():
    """主测试函数"""
    print("=" * 60)
    print("🧪 第三方演示服务 API 测试")
    print("=" * 60)
    
    # 获取用户输入的notify_code（可选）
    notify_code = input("\n请输入回声通知标识码（可选，直接回车跳过主动推送测试）: ").strip()
    if not notify_code:
        notify_code = None
    
    print(f"\n🎯 目标服务: {DEMO_BASE_URL}")
    print(f"🔗 回声平台: {HUISHEEN_BASE_URL}")
    
    # 运行测试
    tests = [
        ("健康检查", test_health_check),
        ("API信息", test_api_info),
        ("生成示例数据", test_generate_sample_data),
        ("创建通知", test_create_notification),
        ("被动模式API", test_get_notifications),
    ]
    
    results = []
    for test_name, test_func in tests:
        if test_func == test_create_notification:
            result = test_func()
            results.append((test_name, result is not None))
        else:
            result = test_func()
            results.append((test_name, result))
    
    # 主动推送测试（如果提供了notify_code）
    if notify_code:
        active_result = test_send_active_notification(notify_code)
        results.append(("主动推送", active_result))
    
    # 最终被动模式测试
    final_passive_result = test_get_notifications()
    results.append(("最终被动模式", final_passive_result))
    
    # 测试结果汇总
    print("\n" + "=" * 60)
    print("📊 测试结果汇总")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name:<20} {status}")
        if result:
            passed += 1
    
    print("-" * 60)
    print(f"总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！第三方演示服务运行正常。")
    else:
        print(f"\n⚠️  有 {total - passed} 个测试失败，请检查服务状态。")
    
    print("\n💡 提示:")
    print("1. 确保演示服务运行在 http://localhost:5000")
    print("2. 如需测试主动推送，请先在回声平台生成通知标识码")
    print("3. 打开浏览器访问 http://localhost:5000 查看Web界面")

if __name__ == "__main__":
    main() 