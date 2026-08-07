# Graph Report - D:/WeChatProjects/levi-zoe  (2026-08-07)

## Corpus Check
- Corpus is ~16,490 words - fits in a single context window. You may not need a graph.

## Summary
- 563 nodes · 643 edges · 54 communities (46 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project Audit & Architecture
- App Configuration
- Login & Couple Binding
- Restaurant Edit
- Home Dashboard
- parseFridgeItems Package
- Fridge Page
- generateCookingSOP Package
- generateDish Package
- generateShoppingList Package
- joinCouple Package
- Restaurant List
- createCouple Package
- deleteDish Package
- login Package
- updateMenuField Package
- UI Design System
- Tonight Menu
- Restaurant Detail
- Cooking SOP
- Fridge Recommend
- Shopping List
- Profile
- Dish Edit
- Shopping History
- Restaurant Visit
- Blindbox Candidates CF
- Blindbox Dishes Package
- Dish Detail
- Restaurant Map
- recommendFromFridge Package
- Blindbox Select
- Want List
- Blindbox Candidates Package
- Blindbox Dishes CF
- searchRestaurants Package
- Dish List
- generateCookingSOP CF
- generateDish CF
- generateShoppingList CF
- parseFridgeItems CF
- searchRestaurants CF
- joinCouple CF
- updateMenuField CF
- createCouple CF
- deleteDish CF
- login CF
- recommendFromFridge CF

## God Nodes (most connected - your core abstractions)
1. `Audit and Redesign Document` - 69 edges
2. `pages` - 23 edges
3. `WeChat Cloud Development` - 22 edges
4. `Component Library Proposal` - 9 edges
5. `loadHistory()` - 7 edges
6. `loadTonightMenu()` - 7 edges
7. `coupleId Authorization and Data Scoping` - 7 edges
8. `tabBar` - 6 edges
9. `loadRestaurants()` - 6 edges
10. `window` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Audit and Redesign Document` --references--> `Component Library Proposal`  [EXTRACTED]
  AUDIT_REDESIGN.md → AUDIT_REDESIGN.md  _Bridges community 0 → community 16_

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication and Couple Space Flow** — page_index, cf_login, cf_createcouple, cf_joincouple, db_users, db_couples [INFERRED 0.85]
- **Dish to Menu Flow** — page_dish_list, page_want_list, page_tonight, page_shopping_list, page_cooking, cf_generateshoppinglist, cf_generatecookingsop [INFERRED 0.85]
- **Security Findings Requiring coupleId Scoping** — bug_c2, bug_c3, bug_c4, bug_c5, bug_h3, bug_h4, bug_h6, security_coupleid_scoping [INFERRED 0.90]

## Communities (54 total, 8 thin omitted)

### Community 0 - "Project Audit & Architecture"
Cohesion: 0.05
Nodes (68): DeepSeek AI Integration, Levi & Zoe Mini Program, WeChat Cloud Development, Audit and Redesign Document, C1: Missing togglePrepStep in cooking.js, C2: deleteDish hard-deletes instead of soft-delete, C3: Restaurant edit lacks coupleId authorization, C4: Restaurant delete/visit lack authorization (+60 more)

### Community 1 - "App Configuration"
Cohesion: 0.05
Nodes (43): lazyCodeLoading, pages, permission, scope.userLocation, requiredPrivateInfos, desc, sitemapLocation, style (+35 more)

### Community 2 - "Login & Couple Binding"
Cohesion: 0.10
Nodes (3): app, checkLoginStatus(), onLoad()

### Community 3 - "Restaurant Edit"
Cohesion: 0.11
Nodes (6): app, CUISINE_OPTIONS, doSearch(), loadRestaurant(), onLoad(), onSearchInput()

### Community 4 - "Home Dashboard"
Cohesion: 0.16
Nodes (8): app, loadCoupleInfo(), loadData(), loadMenuDishes(), loadPartnerInfo(), loadTonightMenu(), loadWantDishes(), onShow()

### Community 5 - "parseFridgeItems Package"
Cohesion: 0.12
Nodes (15): author, description, engines, node, keywords, license, main, name (+7 more)

### Community 6 - "Fridge Page"
Cohesion: 0.17
Nodes (8): addItems(), app, clearAll(), confirmEdit(), deleteItem(), loadFridge(), onShow(), saveFridge()

### Community 7 - "generateCookingSOP Package"
Cohesion: 0.14
Nodes (13): author, dependencies, ws, wx-server-sdk, description, ws, wx-server-sdk, license (+5 more)

### Community 8 - "generateDish Package"
Cohesion: 0.14
Nodes (13): author, dependencies, ws, wx-server-sdk, description, ws, wx-server-sdk, license (+5 more)

### Community 9 - "generateShoppingList Package"
Cohesion: 0.14
Nodes (13): author, dependencies, ws, wx-server-sdk, description, ws, wx-server-sdk, license (+5 more)

### Community 10 - "joinCouple Package"
Cohesion: 0.14
Nodes (13): author, dependencies, ws, wx-server-sdk, description, ws, wx-server-sdk, license (+5 more)

### Community 11 - "Restaurant List"
Cohesion: 0.27
Nodes (10): app, applyFilter(), formatDistance(), getDistance(), getUserLocation(), loadRestaurants(), onPullDownRefresh(), onSearchInput() (+2 more)

### Community 12 - "createCouple Package"
Cohesion: 0.17
Nodes (11): author, dependencies, wx-server-sdk, description, wx-server-sdk, license, main, name (+3 more)

### Community 13 - "deleteDish Package"
Cohesion: 0.17
Nodes (11): author, dependencies, wx-server-sdk, description, wx-server-sdk, license, main, name (+3 more)

### Community 14 - "login Package"
Cohesion: 0.17
Nodes (11): author, dependencies, wx-server-sdk, description, wx-server-sdk, license, main, name (+3 more)

### Community 15 - "updateMenuField Package"
Cohesion: 0.17
Nodes (11): author, dependencies, wx-server-sdk, description, wx-server-sdk, license, main, name (+3 more)

### Community 16 - "UI Design System"
Cohesion: 0.17
Nodes (12): action-sheet Component, dish-card Component, empty-state Component, loading-skeleton Component, member-avatar Component, menu-card Component, progress-ring Component, Background Color #FFF8F8 (+4 more)

### Community 17 - "Tonight Menu"
Cohesion: 0.30
Nodes (9): addComment(), app, formatDate(), loadDishes(), loadLatestMenu(), loadTonightMenu(), onLoad(), onShow() (+1 more)

### Community 18 - "Restaurant Detail"
Cohesion: 0.23
Nodes (5): app, loadRestaurant(), loadVisits(), onLoad(), onShow()

### Community 19 - "Cooking SOP"
Cohesion: 0.29
Nodes (8): calcCookProgress(), generateSOP(), loadDishes(), loadMenu(), onLoad(), onShow(), retryLoad(), toggleCookStep()

### Community 20 - "Fridge Recommend"
Cohesion: 0.35
Nodes (10): addExistingToMenu(), addToMenu(), app, cacheRecommendations(), calculateMatchScores(), getAIRecommendations(), loadRecommendations(), onLoad() (+2 more)

### Community 21 - "Shopping List"
Cohesion: 0.29
Nodes (5): app, formatDate(), loadList(), onLoad(), startWatcher()

### Community 22 - "Profile"
Cohesion: 0.24
Nodes (4): app, loadCoupleInfo(), loadData(), onShow()

### Community 24 - "Shopping History"
Cohesion: 0.39
Nodes (7): deleteList(), formatDate(), formatDateKey(), formatTime(), loadHistory(), onShow(), restoreList()

### Community 26 - "Blindbox Candidates CF"
Cohesion: 0.39
Nodes (7): buildPrompt(), callDeepSeek(), FALLBACK_POOL, getFallbackCandidates(), https, main(), parseCandidates()

### Community 27 - "Blindbox Dishes Package"
Cohesion: 0.25
Nodes (7): author, dependencies, description, license, main, name, version

### Community 28 - "Dish Detail"
Cohesion: 0.32
Nodes (3): loadDish(), onLoad(), onShow()

### Community 29 - "Restaurant Map"
Cohesion: 0.29
Nodes (3): app, loadRestaurants(), onShow()

### Community 30 - "recommendFromFridge Package"
Cohesion: 0.29
Nodes (6): author, description, license, main, name, version

### Community 31 - "Blindbox Select"
Cohesion: 0.33
Nodes (3): onLoad(), PLACEHOLDERS, setRandomPlaceholder()

### Community 32 - "Want List"
Cohesion: 0.38
Nodes (4): app, loadWantPool(), onShow(), removeFromWant()

### Community 33 - "Blindbox Candidates Package"
Cohesion: 0.33
Nodes (5): dependencies, description, main, name, version

### Community 34 - "Blindbox Dishes CF"
Cohesion: 0.53
Nodes (5): buildPrompt(), callDeepSeek(), https, main(), parseDishes()

### Community 35 - "searchRestaurants Package"
Cohesion: 0.33
Nodes (5): dependencies, description, main, name, version

### Community 36 - "Dish List"
Cohesion: 0.40
Nodes (3): app, loadDishes(), onShow()

### Community 37 - "generateCookingSOP CF"
Cohesion: 0.50
Nodes (4): cloud, https, httpsRequest(), main()

### Community 38 - "generateDish CF"
Cohesion: 0.50
Nodes (4): cloud, https, httpsRequest(), main()

### Community 39 - "generateShoppingList CF"
Cohesion: 0.50
Nodes (4): cloud, https, httpsRequest(), main()

### Community 40 - "parseFridgeItems CF"
Cohesion: 0.60
Nodes (4): callDeepSeekAPI(), https, main(), parseAIResponse()

### Community 41 - "searchRestaurants CF"
Cohesion: 0.60
Nodes (4): https, main(), searchPlace(), searchSuggestion()

## Knowledge Gaps
- **187 isolated node(s):** `pages/index/index`, `pages/home/home`, `pages/cook/cook`, `pages/profile/profile`, `pages/dish/edit` (+182 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Audit and Redesign Document` connect `Project Audit & Architecture` to `UI Design System`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Component Library Proposal` connect `UI Design System` to `Project Audit & Architecture`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `WeChat Cloud Development` (e.g. with `createCouple Cloud Function` and `deleteDish Cloud Function`) actually correct?**
  _`WeChat Cloud Development` has 21 INFERRED edges - model-reasoned connections that need verification._
- **What connects `pages/index/index`, `pages/home/home`, `pages/cook/cook` to the rest of the system?**
  _187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Audit & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.0504828797190518 - nodes in this community are weakly interconnected._
- **Should `App Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `Login & Couple Binding` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._