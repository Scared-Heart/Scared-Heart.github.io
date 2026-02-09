---
title: "修复服务器ssl证书过期"
date: 2021-10-12
---

## 现象

梯子不能上外网

## debug过程

首先怀疑是不是域名被墙，443端口被封，这两点通过站长之家的端口扫描和ping可以确定

-   端口扫描  
    [https://tool.chinaz.com/port/](https://tool.chinaz.com/port/)
    
-   ping ip  
    [https://ping.chinaz.com/](https://ping.chinaz.com/)
    

测试结果都是好的  
这就很奇怪了，发生什么事了？ 看日志  
ssh上到搬瓦工，

```plain
service trojan status
```

查看服务状态，显示

```plain
trojan SSL handshake failed: sslv3 alert bad certificate
```

看起来像是ssl证书出了问题，用浏览器访问伪装的域名也显示不安全，而不是小绿锁  
奇怪，我的证书是acme.sh脚本申请的，应该没问题吧。  
那查查证书啥问题吧，到证书文件路径下，

```plain
ls -al
```

发现证书的创建时间是6月，现在是9月，会不会是证书过期了？

```plain
cat domain.cert | openssl x509 -noout -enddate
```
```plain
// 输出
notAfter=Dec 24 23:59:59 2021 GMT
```

靠，刚好就是昨天过期的，看来原因找到了，ssl证书过期导致ssl握手失败。  
这时候咋办？  
1.客户端不对证书进行校验，直接连接，梯子正常工作，就是可能不太安全。（配置文件里  
2.更新证书，让ssl正常握手  
我选择后者。

到服务器目录下，

```plain
acme.sh --renew www.example.com --debug
```

尝试更新证书，发现失败了，原因是80端口被占用。

我靠，破案了，我这台服务器上有运行nginx在80端口，而当初acme申请证书的时候选择是standalone模式，

```plain
acme.sh  --issue -d mydomain.com   --standalone
```

即本地在80端口开启一个http服务进行验证申请证书。  
而每次ctron脚本要去更新证书时，都会在80端口开启服务，结果因为80被nginx占了，所以自然开启失败，导致更新证书失败。

咋办？ trojan的伪装要，还要自动更新证书。  
哎，把nginx的端口改成了8080，trojan的fallback方案改为监听8080，那么80端口不久不被占用了？ 这样申请证书脚本顺利跑，脚本能正常更新，trojan还能伪装，两全其美。
