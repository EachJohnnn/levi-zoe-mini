# Levi & Zoe 小厨房

<p align="center">
  <img src="images/tab-home-active.png" alt="Levi & Zoe" width="80" />
</p>

<p align="center">
  <b>一款为情侣打造的微信小程序 · 一起记录菜谱、规划晚餐、探索餐厅</b>
</p>

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README_EN.md">English</a>
</p>

---

## 📖 项目介绍

**Levi & Zoe 小厨房** 是一款面向情侣/亲密关系的微信小程序。它让两个人可以一起：

- 🍳 用 AI 生成并保存喜欢的菜谱
- 📋 建立「美食通缉榜」，收藏想吃的菜
- ️ 一键生成今晚菜单，指定谁负责哪道菜
-  自动生成购物清单
- 🗺️ 记录想去的餐厅，按距离/菜系筛选，查看地图

## ✨ 功能特性

| 模块 | 功能 |
|------|------|
| 🍳 做菜 Hub | AI 生成新菜、统计菜品数、预览最近添加和通缉榜 |
| 📚 菜品库 | 支持分类筛选、排序、搜索，无数量上限分批加载 |
| 📋 美食通缉榜 | 一键想吃，从通缉榜生成今晚菜单 |
| 🍽️ 今晚菜单 | 指定厨师、生成购物清单、历史记录、自动归档 |
| ️ 餐厅地图 | 按菜系/距离筛选，支持地图模式查看餐厅位置 |
| 💕 情侣空间 | 邀请另一半加入，共享数据 |

## 🚀 技术栈

- [微信小程序](https://developers.weixin.qq.com/miniprogram/dev/framework/) 原生开发
- [微信云开发](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
  - 云数据库
  - 云函数
  - 云存储
- AI 菜谱生成：DeepSeek / 兼容 OpenAI 格式的大模型 API

## 🛠️ 本地运行

1. 克隆仓库

```bash
git clone https://github.com/EachJohnnn/levi-zoe-mini.git
cd levi-zoe-mini
```

2. 使用微信开发者工具打开项目根目录
3. 在 `app.js` 中填入你自己的云开发环境 ID：

```js
wx.cloud.init({
  env: '你的环境ID',
  traceUser: true,
})
```

4. 在 `project.config.json` 中配置你的小程序 `appid`
5. 右键 `cloudfunctions` 下的云函数，选择「创建并部署：云端安装依赖」
6. 在云开发控制台的数据库中创建以下集合：
   - `users`
   - `couples`
   - `dishes`
   - `tonightMenus`
   - `shoppingLists`
   - `fridges`
   - `restaurants`
   - `restaurantVisits`
7. 在 `cloudfunctions/*/index.js` 中使用到的云函数环境变量里配置 `DEEPSEEK_API_KEY`

## 📁 目录结构

```
levi-zoe-mini/
├── app.js / app.json / app.wxss    # 小程序全局配置与样式
├── cloudfunctions/                 # 云函数
│   ├── generateDish/
│   ├── generateShoppingList/
│   ├── generateCookingSOP/
│   ├── generateBlindboxCandidates/
│   ├── generateBlindboxDishes/
│   ├── recommendFromFridge/
│   ├── joinCouple/
│   ├── login/
│   ├── getCoupleMembers/
│   ├── parseFridgeItems/
│   └── toggleDishWant/
├── pages/                          # 页面
│   ├── home/                       # 首页
│   ├── cook/                       # 做菜 Hub
│   ├── dish/                       # 菜品库 / 通缉榜 / 今晚菜单 / 购物清单
│   ├── fridge/                     # 我的冰箱
│   ├── restaurant/                 # 餐厅列表 / 地图 / 详情
│   ├── profile/                    # 个人中心
│   └── index/                      # 登录 / 绑定情侣空间
├── images/                         # 图片资源
└── README.md / README_EN.md        # 说明文档
```

## ⚠️ 安全提示

- `.env` 文件已加入 `.gitignore`，**不要** 将包含 API Key 的 `.env` 提交到 GitHub。
- 云函数中的 `DEEPSEEK_API_KEY` 应通过微信云开发的「云函数环境变量」进行配置，而不是硬编码在代码中。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的功能分支：`git checkout -b feature/YourFeature`
3. 提交改动：`git commit -am 'Add some feature'`
4. 推送到分支：`git push origin feature/YourFeature`
5. 提交 Pull Request

##  开源协议

本项目基于 [MIT License](./LICENSE) 开源。

---

<p align="center">
  用 ❤️ 和 🍳 为每一对情侣的小厨房而生
</p>
