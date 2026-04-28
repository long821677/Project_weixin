# 公众号专属文件下载小程序 - 配置说明

## 项目概述

本项目是一个基于微信小程序云开发的文件下载系统，支持管理员上传文件并生成带权限控制的分享链接，用户通过公众号分享的链接进入小程序下载文件。

## 完整项目结构

```
file-download-miniprogram/
├── app.js                 # 小程序入口文件，初始化云开发
├── app.json               # 小程序配置文件
├── app.wxss               # 全局样式
├── project.config.json    # 项目配置文件
├── sitemap.json           # 站点地图配置
├── utils/
│   └── index.js           # 工具函数模块
├── pages/
│   ├── upload/
│   │   ├── index.js       # 上传页面逻辑
│   │   ├── index.wxml     # 上传页面结构
│   │   └── index.wxss     # 上传页面样式
│   └── download/
│       ├── index.js       # 下载页面逻辑
│       ├── index.wxml     # 下载页面结构
│       └── index.wxss     # 下载页面样式
├── cloudfunctions/
│   ├── uploadFile/        # 上传文件云函数
│   │   ├── index.js
│   │   ├── config.json
│   │   └── package.json
│   └── downloadFile/      # 下载文件云函数
│       ├── index.js
│       ├── config.json
│       └── package.json
├── images/                # 图标资源目录
│   ├── upload.png
│   ├── upload-active.png
│   ├── download.png
│   └── download-active.png
└── CONFIGURATION.md       # 配置说明文档
```

## 云开发环境配置

### 1. 创建云开发环境

1. 打开微信开发者工具，进入云开发控制台
2. 创建新的云开发环境（按量付费或包年包月）
3. 记录环境ID，用于后续配置

### 2. 配置云数据库

在云开发控制台的"数据库"页面：

1. 创建集合 `file_tokens`，用于存储文件分享记录
2. 设置集合权限为"所有用户可读，仅管理员可写"

#### 集合结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| token | String | 唯一分享token |
| fileName | String | 原始文件名 |
| cloudPath | String | 云存储文件路径 |
| maxDownloads | Number | 最大下载次数 |
| currentDownloads | Number | 当前下载次数 |
| expireTime | Number | 过期时间戳（毫秒） |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 3. 配置云存储

在云开发控制台的"存储"页面：

1. 创建文件夹 `files/` 用于存储上传的文件
2. 创建文件夹 `temp/` 用于临时文件
3. 设置存储权限为"所有用户可读"

### 4. 配置云函数

在微信开发者工具中右键云函数目录，选择"上传并部署：云端安装依赖"

## 小程序配置

### 1. 修改 app.js

将 `env` 参数替换为你的云开发环境ID：

```javascript
wx.cloud.init({
  env: 'your-cloud-env-id',  // 替换为你的环境ID
  traceUser: true
});
```

### 2. 修改 project.config.json

将 `appid` 替换为你的小程序AppID：

```json
{
  "appid": "your-miniprogram-appid"
}
```

## 公众号关联配置

### 1. 绑定小程序到公众号

1. 登录微信公众平台（https://mp.weixin.qq.com）
2. 进入"小程序管理"页面
3. 点击"添加小程序"，绑定你的小程序

### 2. 配置公众号菜单

在公众号后台配置自定义菜单，设置跳转小程序的链接：

```json
{
  "button": [
    {
      "type": "miniprogram",
      "name": "文件下载",
      "url": "http://mp.weixin.qq.com/s/xxx",
      "appid": "your-miniprogram-appid",
      "pagepath": "pages/download/index?token=xxx"
    }
  ]
}
```

### 3. 配置自动回复

设置关键词自动回复，用户发送特定关键词时返回带token的小程序链接：

```
关键词：资料下载
回复内容：点击下载资料 -> [小程序链接]
```

### 4. 通过公众号文章推送

在公众号文章中插入小程序卡片：

1. 编辑公众号文章
2. 点击"小程序"图标
3. 选择你的小程序，填写页面路径（如 `/pages/download/index?token=xxx`）

## 安全注意事项

### 1. Token安全性

- Token采用时间戳+随机数生成，确保唯一性
- Token有效期可配置，过期后自动失效
- 下载次数限制，防止恶意刷取

### 2. 权限控制

- 云数据库设置读写权限分离
- 云存储设置为公开可读（必要时可设置签名URL）
- 云函数添加参数校验

### 3. 文件安全

- 限制上传文件大小（默认50MB）
- 可扩展文件类型白名单校验
- 建议对上传文件进行病毒扫描

## 使用流程

### 管理员上传流程

1. 进入上传页面
2. 选择本地文件
3. 设置最大下载次数和过期天数
4. 点击"上传并生成链接"
5. 复制链接并通过公众号分享

### 用户下载流程

1. 通过公众号分享链接进入小程序
2. 页面自动校验token有效性
3. 显示文件信息（文件名、剩余次数、过期时间）
4. 点击"立即下载"获取文件
5. 下载成功后次数自动减少

## 常见问题

### Q: 云函数部署失败？

A: 确保已正确配置云开发环境，检查node_modules是否正常安装，查看云函数日志。

### Q: 小程序无法连接云数据库？

A: 检查app.js中的env配置是否正确，确保云开发环境已开通。

### Q: 下载链接失效？

A: 检查链接是否过期或下载次数是否用完，可在数据库中查看文件记录状态。

### Q: 公众号无法跳转小程序？

A: 确保小程序已绑定到公众号，检查菜单配置的pagepath是否正确。

## 版本更新记录

| 版本 | 更新内容 | 日期 |
|------|----------|------|
| 1.0.0 | 初始版本，支持文件上传、分享、下载功能 | 2024-01-01 |

## 开发者信息

- 技术栈：微信小程序原生 + 云开发
- 语言：JavaScript（ES6+）
- 数据库：云数据库（MongoDB）
- 存储：云存储

---

*配置完成后即可使用完整的文件下载功能*
