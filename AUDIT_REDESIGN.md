# Levi & Zoe 小程序 — 代码审计与 UI 重新设计

> 生成时间：2026-08-07
> 项目路径：`D:\WeChatProjects\levi-zoe`
> 类型：微信小程序 + 微信云开发（情侣共享智能菜单系统）

---

## 1. 项目现状

### 1.1 业务定位

Levi & Zoe 是一款仅双方私用的情侣共享智能菜单小程序：

1. 微信登录获取 openid
2. 创建 / 加入情侣空间（6 位邀请码）
3. 菜品库：输入菜名 → DeepSeek AI 生成菜谱 → 人工编辑 → 保存
4. 想吃池：把菜标记为想吃
5. 今晚菜单：从想吃池生成当日菜单 + 评论
6. 购物清单：AI 汇总食材并区分“需采购”与“常备配料”，支持勾选同步
7. 智能做菜 SOP：AI 规划备菜 + 做菜流程，分阶段可勾选
8. 盲盒新菜：根据偏好 Chip + 自然语言生成候选菜，批量生成菜谱
9. 我的冰箱：记录现有食材，AI 推荐可做菜
10. 餐厅：记录想去 / 已打卡餐厅，支持地图、搜索、打卡评价

### 1.2 技术架构

- 微信小程序 + 云开发
- 环境 ID：`cloud1-d3gngjkrfd5d7df82`
- AppID：`wx0a8265b285f4bd32`
- AI：DeepSeek API（通过云函数调用，Key 存环境变量）
- 数据库集合：`users`、`couples`、`dishes`、`tonightMenus`、`shoppingLists`、`fridges`、`restaurants`、`restaurantVisits`

### 1.3 页面结构

Tab 页面：
- `pages/home/home` — 今日仪表盘
- `pages/cook/cook` — 小厨房工具入口
- `pages/restaurant/list/list` — 餐厅列表
- `pages/profile/profile` — 我的

非 Tab 页面：
- `pages/index/index` — 登录 / 创建加入情侣空间
- `pages/dish/list/list` — 菜品库
- `pages/dish/detail/detail` — 菜品详情
- `pages/dish/edit` — 菜谱预览 / 编辑 / 保存
- `pages/dish/want-list/want-list` — 想吃池
- `pages/dish/tonight/tonight` — 今晚菜单
- `pages/dish/shopping-list/shopping-list` — 购物清单
- `pages/dish/shopping-list/history/history` — 购物清单历史
- `pages/dish/cooking/cooking` — 智能做菜 SOP
- `pages/dish/blindbox/select/select` — 盲盒偏好选择
- `pages/dish/blindbox/candidates/candidates` — 盲盒候选菜
- `pages/dish/blindbox/preview/preview` — 盲盒菜谱预览保存
- `pages/fridge/fridge` — 我的冰箱
- `pages/fridge/recommend` — 冰箱推荐菜单
- `pages/restaurant/edit/edit` — 添加 / 编辑餐厅
- `pages/restaurant/detail/detail` — 餐厅详情
- `pages/restaurant/visit/visit` — 餐厅打卡
- `pages/restaurant/map/map` — 餐厅地图

### 1.4 云函数

- `login` — 获取 openid
- `createCouple` — 创建情侣空间
- `joinCouple` — 加入情侣空间（已修复幂等）
- `generateDish` — AI 生成菜谱
- `deleteDish` — 删除菜品
- `generateShoppingList` — AI 汇总购物清单
- `updateMenuField` — 更新菜单字段（如缓存 shoppingListId / sop）
- `generateCookingSOP` — AI 生成做菜流程
- `generateBlindboxCandidates` — 生成盲盒候选菜
- `generateBlindboxDishes` — 批量生成盲盒菜谱
- `parseFridgeItems` — 解析冰箱食材文本
- `recommendFromFridge` — 基于冰箱食材推荐菜单
- `searchRestaurants` — 搜索餐厅 POI

---

## 2. 代码审计发现

### 2.1 Critical（功能失效或数据安全）

| # | 问题 | 位置 | 影响 | 修复方向 |
|---|------|------|------|----------|
| C1 | 备菜步骤无法勾选 | `pages/dish/cooking/cooking.js` | `cooking.wxml` 绑定 `bindtap="togglePrepStep"`，但 JS 未定义该方法；`calcPrepProgress` 也未调用，prep 进度永远为 0 | 补 `togglePrepStep`；加载 SOP 后调用 `calcPrepProgress` |
| C2 | deleteDish 物理删除 | `cloudfunctions/deleteDish/index.js` | 与约定的软删除不一致，且未校验归属 | 改为 `update({ status:'deleted' })`；校验 coupleId/openid |
| C3 | 餐厅编辑无归属校验 | `pages/restaurant/edit/edit.js` | 任意知道 `_id` 的用户可修改他人餐厅 | 更新前校验 `coupleId` |
| C4 | 餐厅删除/打卡无归属校验 | `pages/restaurant/detail/detail.js`、`pages/restaurant/visit/visit.js` | 可删除/打卡不属于本空间的餐厅 | 操作前校验 coupleId/members |
| C5 | updateMenuField 可写任意字段 | `cloudfunctions/updateMenuField/index.js` | 可覆盖 coupleId、dishes、date 等 | 加字段白名单 + 菜单归属校验 |
| C6 | 盲盒保存可重复点击 | `pages/dish/blindbox/preview/preview.js` | 双击保存会重复入库 | 加 saving 锁 |

### 2.2 High（明显风险或体验问题）

| # | 问题 | 位置 | 修复方向 |
|---|------|------|----------|
| H1 | AI 模型名可能不存在 | `cloudfunctions/generateDish/index.js` 使用 `deepseek-v4-flash` | 统一为 `deepseek-chat` 或确认有效模型 |
| H2 | 购物清单特殊路由死代码 | `pages/cook/cook.js` 中 `url === 'shopping-list'` 判断错误 | 修正为完整路径判断 |
| H3 | 菜品详情/编辑缺少 coupleId 校验 | `pages/dish/detail/detail.js`、`pages/dish/edit.js` | 加载时校验 dish.coupleId |
| H4 | index 自动跳转依赖未验证本地 coupleId | `pages/index/index.js` | 启动时用云函数 + 数据库校验真实 coupleId |
| H5 | profile 页 `goLogin` 未定义 | `pages/profile/profile.wxml` 引用不存在方法 | 补方法或改导航 |
| H6 | 购物清单直接 id 访问无校验 | `pages/dish/shopping-list/shopping-list.js` | 加载后校验 list.coupleId |
| H7 | 今晚菜单删除是物理删除 | `pages/home/home.js` | 改为软删除或标记 isDeleted |
| H8 | SOP onShow 无条件重载 | `pages/dish/cooking/cooking.js` | 仅在刷新标志或首次加载时重载 |

### 2.3 Medium / Low / UI

- `wx:key` 大量使用 `index` 或 `name`，列表项重复时可能渲染异常。
- 添加/编辑操作普遍使用 `wx.showModal` + 输入框，体验差。
- Emoji 图标在不同设备渲染不一致。
- 缺少统一的 Loading / Empty / Error 状态。
- 今晚菜单移除菜品后旧购物清单仍 `isCurrent: true`，导致“最新清单”查询混乱。
- 餐厅地图用 `name+lat+lng` 匹配 marker，同名餐厅会匹配错。
- 多处 `Date.now()`/`Math.random()` 生成路径/缓存 key。

---

## 3. UI 重新设计方案

### 3.1 设计原则

1. **一张图看清今天吃什么**：首页直接回答“今晚做什么、缺什么、怎么做”。
2. **减少跳转层级**：核心操作尽量在当前页完成。
3. **状态可见**：每个列表/卡片都有空状态、加载态、错误态。
4. **一致的设计语言**：统一色彩、圆角、阴影、图标，不用 emoji。
5. **为双人场景优化**：显示对方头像、操作同步。

### 3.2 信息架构

建议保持 4 Tab，但内容重组：

| Tab | 定位 |
|-----|------|
| **今日** | 仪表盘：今晚菜单、购物清单进度、想吃池 Top、对方动态 |
| **菜谱** | 原“做菜”页升级：菜品库 + 盲盒 + 冰箱推荐 + 添加 |
| **餐厅** | 保留现有餐厅列表/地图/打卡 |
| **我的** | 账号、情侣空间、设置 |

如必须保留“做菜”独立入口，可把“菜谱”与“做菜”合并为“厨房”Tab，内部分段：菜谱库 / 今晚做菜 / 工具。

### 3.3 核心页面 redesign

#### 首页 `pages/home/home`

```
┌─────────────────────────────┐
│ [头像] [情侣名]          ⚙️  │
├─────────────────────────────┤
│ 🍽️ 今晚菜单（卡片）          │
│ 番茄炒蛋 · 红烧排骨 · 青菜   │
│ [购物清单 3/10] [开始做菜]   │
├─────────────────────────────┤
│ 📋 美食通缉榜              │
│ 滑动卡片：菜名 + 一键加入今晚 │
├─────────────────────────────┤
│ ✨ 快捷入口                  │
│ 加菜 | 盲盒 | 冰箱 | 餐厅    │
└─────────────────────────────┘
```

- 删除今晚菜单收到菜单详情页。
- 想吃池用横向滚动卡片，减少跳转。

#### 做菜页 `pages/cook/cook`

```
┌─────────────────────────────┐
│ 小厨房                       │
│ + AI 生成新菜品              │
├─────────────────────────────┤
│ 今晚要做（如果有菜单）        │
│ 菜品进度条 / 购物清单入口     │
├─────────────────────────────┤
│ 工具网格                      │
│ 菜品库 | 通缉榜 | 购物清单    │
│ 盲盒新菜 | 我的冰箱 | SOP    │
└─────────────────────────────┘
```

#### 智能 SOP `pages/dish/cooking/cooking`

- 一屏内展示备菜 + 做菜，或保留 tab 但把“备菜”做成可勾选 checklist。
- 进度实时同步给对方。
- 完成后生成“今日成就”卡片。

#### 购物清单 `pages/dish/shopping-list/shopping-list`

- 增加“按菜品分组”视图。
- 已采购显示操作者昵称 + 时间。
- 顶部显示总体进度。

#### 菜品库 `pages/dish/list/list`

- 增加分类筛选、搜索。
- 卡片显示“是否在想吃池”标签。
- 未来可接入菜品封面图。

#### 添加菜品流程

统一入口：浮动“+”按钮 → 底部动作面板：
- AI 生成菜谱
- 盲盒新菜
- 冰箱推荐
- 手动录入

### 3.4 视觉系统

| Token | 建议值 |
|-------|--------|
| 主色 | `#FF6B6B` |
| 成功/完成色 | `#4ECDC4` |
| 背景色 | `#FFF8F8` |
| 文字主色 | `#2D2D2D` |
| 文字次要色 | `#8A8A8A` |
| 卡片圆角 | `24rpx` |
| 阴影 | `0 8rpx 24rpx rgba(255,107,107,0.08)` |

- 用自定义 SVG/PNG 图标替换所有 emoji。
- Tab-bar 图标统一为线面结合风格。

### 3.5 组件化建议

- `<empty-state />`
- `<loading-skeleton />`
- `<dish-card />`
- `<menu-card />`
- `<action-sheet />`
- `<member-avatar />`（自动拉取昵称头像）
- `<progress-ring />`

---

## 4. 修复优先级

1. **第一优先级**：修复 Critical bug（SOP 勾选、deleteDish、餐厅权限、updateMenuField、盲盒重复保存）。
2. **第二优先级**：修复 High bug（模型名、死代码、详情编辑权限、登录校验、购物清单权限、菜单删除策略）。
3. **第三优先级**：UI 重做（首页、做菜页、SOP、购物清单、菜品库）+ 设计系统落地。

---

## 5. 后续探索问题

- 从登录到生成今晚菜单的完整数据流是怎样的？
- 哪些云函数没有校验数据归属？
- 购物清单和 SOP 的缓存/刷新策略有哪些不一致？
- 首页、做菜页、SOP 三个页面如何重新组织信息层级？
- 餐厅模块与菜品模块有哪些可复用的卡片/列表组件？
