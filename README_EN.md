# Levi & Zoe Kitchen

<p align="center">
  <img src="images/tab-home-active.png" alt="Levi & Zoe" width="80" />
</p>

<p align="center">
  <b>A WeChat Mini Program for couples · record recipes, plan dinners, and explore restaurants together</b>
</p>

<p align="center">
  <a href="./README.md">中文</a> | <a href="./README_EN.md">English</a>
</p>

---

## 📖 Introduction

**Levi & Zoe Kitchen** is a WeChat Mini Program designed for couples. It helps you:

- 🍳 Generate and save recipes with AI
- 📋 Build a "Wanted Dishes" list for dishes you want to try
- ️ Generate tonight's menu and assign a chef for each dish
- ️ Auto-generate shopping lists
- 🗺️ Save restaurants, filter by cuisine/distance, and view them on a map

##  Features

| Module | Description |
|--------|-------------|
|  Cooking Hub | AI dish generation, dish statistics, recent dishes and wanted preview |
| 📚 Dish Library | Category filter, sort, search, and paginated loading without limits |
| 📋 Wanted List | Mark dishes as "want to try" and generate tonight's menu from the list |
| 🍽️ Tonight's Menu | Assign chefs, generate shopping lists, view history, auto-archive old menus |
| ️ Restaurant Map | Filter by cuisine/distance and view restaurants on a map |
| 💕 Couple Space | Invite your partner to join and share data |

## 🚀 Tech Stack

- [WeChat Mini Program](https://developers.weixin.qq.com/miniprogram/dev/framework/) native development
- [WeChat Cloud Development](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
  - Cloud Database
  - Cloud Functions
  - Cloud Storage
- AI recipe generation: DeepSeek / OpenAI-compatible LLM API

## 🛠️ Local Setup

1. Clone the repository

```bash
git clone https://github.com/EachJohnnn/levi-zoe-mini.git
cd levi-zoe-mini
```

2. Open the project root in WeChat DevTools
3. Set your own Cloud Development environment ID in `app.js`:

```js
wx.cloud.init({
  env: 'your-env-id',
  traceUser: true,
})
```

4. Configure your Mini Program `appid` in `project.config.json`
5. Right-click the cloud functions under `cloudfunctions/` and choose **Create and Deploy: Install dependencies in the cloud**
6. Create the following collections in the Cloud Development Console:
   - `users`
   - `couples`
   - `dishes`
   - `tonightMenus`
   - `shoppingLists`
   - `fridges`
   - `restaurants`
   - `restaurantVisits`
7. Set the `DEEPSEEK_API_KEY` environment variable for the relevant cloud functions

## 📁 Project Structure

```
levi-zoe-mini/
├── app.js / app.json / app.wxss    # Global app config and styles
├── cloudfunctions/                 # Cloud functions
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
├── pages/                          # Pages
│   ├── home/                       # Home
│   ├── cook/                       # Cooking Hub
│   ├── dish/                       # Dish library / wanted list / tonight's menu / shopping list
│   ├── fridge/                     # My fridge
│   ├── restaurant/                 # Restaurants / map / detail
│   ├── profile/                    # Profile
│   └── index/                      # Login / couple binding
├── images/                         # Image assets
└── README.md / README_EN.md        # Documentation
```

## ⚠️ Security Notice

- The `.env` file is already in `.gitignore`. **Do not** commit any file containing API keys to GitHub.
- `DEEPSEEK_API_KEY` should be configured via the WeChat Cloud Development "Cloud Function Environment Variables", not hard-coded in the source code.

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

##  License

This project is open-sourced under the [MIT License](./LICENSE).

---

<p align="center">
  Made with ❤️ and 🍳 for every couple's little kitchen
</p>
