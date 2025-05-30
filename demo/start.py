#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动脚本 - 检查环境并启动第三方演示服务
"""

import sys
import subprocess
import importlib
import os

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 7):
        print("❌ 错误: 需要Python 3.7或更高版本")
        print(f"   当前版本: {sys.version}")
        return False
    else:
        print(f"✅ Python版本: {sys.version.split()[0]}")
        return True

def check_dependencies():
    """检查依赖包"""
    required_packages = [
        ('flask', 'Flask'),
        ('requests', 'requests'),
    ]
    
    missing_packages = []
    
    for package_name, import_name in required_packages:
        try:
            importlib.import_module(import_name.lower())
            print(f"✅ {import_name} 已安装")
        except ImportError:
            missing_packages.append(package_name)
            print(f"❌ {import_name} 未安装")
    
    return missing_packages

def install_dependencies(missing_packages):
    """安装缺失的依赖"""
    if not missing_packages:
        return True
    
    print(f"\n📦 安装缺失的依赖包: {', '.join(missing_packages)}")
    
    try:
        # 尝试安装requirements.txt
        if os.path.exists('requirements.txt'):
            print("📋 使用 requirements.txt 安装依赖...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        else:
            # 逐个安装
            for package in missing_packages:
                print(f"🔧 安装 {package}...")
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
        
        print("✅ 依赖安装完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 安装依赖失败: {e}")
        print("💡 请手动运行: pip install -r requirements.txt")
        return False

def check_ports():
    """检查端口占用"""
    import socket
    
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    port_5000 = is_port_in_use(5000)
    port_3000 = is_port_in_use(3000)
    
    if port_5000:
        print("⚠️  端口 5000 已被占用（演示服务端口）")
        return False
    else:
        print("✅ 端口 5000 可用")
    
    if port_3000:
        print("✅ 端口 3000 已被占用（回声平台运行中）")
    else:
        print("⚠️  端口 3000 未被占用（回声平台可能未运行）")
    
    return True

def show_startup_info():
    """显示启动信息"""
    print("\n" + "=" * 60)
    print("🎯 第三方演示服务 - 回声(Huisheen)集成")
    print("=" * 60)
    print("📍 服务地址: http://localhost:5000")
    print("🔗 回声平台: http://localhost:3000")
    print("📚 文档: 查看 README.md")
    print("=" * 60)
    
    print("\n🚀 功能说明:")
    print("  📥 被动模式: 提供API供回声平台轮询")
    print("  📤 主动模式: 向回声平台推送通知")
    print("  🛠️  管理功能: 创建和管理本地通知")
    
    print("\n💡 使用提示:")
    print("  1. 打开浏览器访问 http://localhost:5000")
    print("  2. 使用 '主动推送' 标签页测试主动模式")
    print("  3. 使用 '被动轮询' 标签页查看API信息")
    print("  4. 在回声平台创建订阅来测试集成")
    
    print("\n🧪 API测试:")
    print("  运行: python test_api.py")

def main():
    """主函数"""
    print("🔧 检查环境...")
    
    # 检查Python版本
    if not check_python_version():
        sys.exit(1)
    
    # 检查依赖
    missing_packages = check_dependencies()
    
    if missing_packages:
        print(f"\n📦 发现缺失依赖: {', '.join(missing_packages)}")
        
        # 询问是否自动安装
        try:
            choice = input("是否自动安装依赖? (y/N): ").strip().lower()
            if choice in ['y', 'yes']:
                if not install_dependencies(missing_packages):
                    sys.exit(1)
            else:
                print("💡 请手动运行: pip install -r requirements.txt")
                sys.exit(1)
        except KeyboardInterrupt:
            print("\n\n❌ 用户取消")
            sys.exit(1)
    
    # 再次检查依赖是否安装成功
    if missing_packages:
        remaining = check_dependencies()
        if remaining:
            print("❌ 依赖安装不完整，请检查网络连接或权限")
            sys.exit(1)
    
    # 检查端口
    print("\n🔍 检查端口占用...")
    if not check_ports():
        print("⚠️  端口检查发现问题，但仍将尝试启动服务")
    
    # 显示启动信息
    show_startup_info()
    
    # 询问是否启动服务
    try:
        print("\n" + "=" * 60)
        choice = input("准备启动服务，按回车继续 (Ctrl+C 取消): ")
        
        # 启动Flask应用
        print("\n🚀 启动第三方演示服务...")
        os.system(f"{sys.executable} app.py")
        
    except KeyboardInterrupt:
        print("\n\n👋 再见！")
        sys.exit(0)

if __name__ == "__main__":
    main() 