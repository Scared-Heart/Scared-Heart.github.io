---
title: "V2ray快速搭建教程(WSS)"
date: 2020-05-24
categories:
  - 搭梯子的学问
---

## 服务端(建议debian9)

### 1.搞环境

-   首先买好境外服务器 比如vultr 搬瓦工啥的 能够ssh连上（不懂百度怎么ssh : D
    
-   默认debian可能没有curl，命令下一个
    

```plain
apt-get install curl
```

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6mzj356j21nd0tfdkr.jpg)

-   去买个域名来伪装ip 我推荐**namecheap**买，靠谱便宜，自带dns解析服务还不错（需要visa卡）
    
    -   还是推荐国外域名 好处有不用备案以及dns解析靠谱（我被阿里云解析炸过，有阴影
-   随便买个最便宜的就行了，越长越便宜（辨识度低）
    
-   把域名解析到服务器ip
    

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6mznmqej225d199gtz.jpg)

**照图配置dns解析**

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6mzyx1xj22d91bn79y.jpg)

### 2.安装233boy写的快速配置脚本，

-   输入命令，选4 WebSocket+TLS

```plain
bash <(curl -s -L https://git.io/v2ray.sh)
```

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6mzu40vj21q91bzn2k.jpg)

-   随机端口，填写自己买好的域名地址，脚本会自动进行dns解析判断，必须解析对才能继续下一步,反代安装默认的caddy就行

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6mzxrzgj20v70dzmy7.jpg)

-   记得开启伪装 分流路径随便敲个字符串就行

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6n078lpj20vx0lhq4h.jpg)

-   配置好就是这个样子奥

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6n02mdij21490r5jts.jpg)

-   输入命令

```plain
v2ray url
```

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6n0c8n8j21it0b1mxr.jpg)

-   复制好这个字符串到剪贴板,这就是服务器配置信息

### 3.安装BBRPlus加速

-   装下载工具

```plain
apt-get install wget
```

-   打脚本，按照界面走就行了 这里直接上图片

```plain
wget --no-check-certificate -O tcp.sh https://github.com/cx9208/Linux-NetSpeed/raw/master/tcp.sh && chmod +x tcp.sh && ./tcp.sh
```

-   接下来会出现菜单选择界面，如下图所示，我们需要先安装对应的内核，之后再开启加速。  
    以BBR Plus版本为例，输入对应的数字2回车，开始安装内核
    
-   原有内核卸载完毕，新内核安装成功后，会出现下图提示重启，输入Y回车：
    
-   重启后再次用Putty连接VPS服务器，运行如下命令重新打开脚本：
    
    ```plain
    ./tcp.sh
    ```
    
-   在脚本菜单选项中，输入数字7回车，开启BBR Plus加速：
    
-   ![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6xhiyzkj20gb03p0t5.jpg)
    

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6xhluzgj20c209b3z7.jpg)

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6xhs4dgj209q02mq2w.jpg)

## 客户端

### win客户端推荐v2rayN

```plain
https://github.com/2dust/v2rayN/releases
```

### Iost推荐小火箭

```plain
https://apps.apple.com/us/app/shadowrocket/id932747118
```

### Android

```plain
https://play.google.com/store/apps/details?id=com.v2ray.ang&hl=zh&gl=US
```

-   windows上配置
    -   保证剪贴板里有vmess开头那串字符串的情况下，点从剪贴板导入  
        ![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6n0h5y7j20fj0tvahs.jpg)
        

-   右下如图配置

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6n0nimzj20s506jacx-1603249010206.jpg)

-   第一次使用更新下pac
    
    ![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6n0pl1xj20br06vq45.jpg)
    

## 大功告成! 油管测试! 测个速!

![img](/image/V2ray%E5%BF%AB%E9%80%9F%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B(WSS)/ae77c931gy1ghh6n0sbqtj20df056gmr.jpg)

## 享受自由的冲浪吧！

### 鸣谢

-   233boy的坚挺脚本
-   BBRplus的作者[dog250](https://blog.csdn.net/dog250)

By Breeze
