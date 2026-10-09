# LIFE & WORK TRACKER v6.0 — Architecture

## 🏗 Tab Structure (Bottom Nav — 4 tabs)

| Tab | Icon | Содержимое |
|-----|------|-----------|
| ДАШБОРД | 🏠 | Daily overview, mood widget, crypto ticker, quick stats, streaks |
| РАБОТА | 💼 | Shifts, earnings, work quests, active timer (existing) |
| ЖИЗНЬ | 🎯 | Habits, health (water/sleep/mood), social diary, learning, life quests |
| АНАЛИТИКА | 📊 | Charts, heatmap, finance/budget, insights, records |

## 🎨 Design System
- Font: Inter (keep)
- Primary: #1B3A5C (deep blue)
- Accent: #3182CE (bright blue)  
- Success: #38A169 (green)
- Warning: #D69E2E (gold)
- Danger: #E53E3E (red)
- Background: #F7F8FA
- Cards: white with subtle shadows
- Crypto ticker: dark header strip

## 📱 Dashboard Tab (NEW)
1. **Greeting header** — "Доброе утро, NEO" with date
2. **Mood quick-pick** — 5 emoji, one tap
3. **Crypto ticker** — BTC/ETH/USDT real-time (Binance WebSocket)
4. **Today's stats card** — streak, habits done, earnings
5. **Water tracker mini** — glass fill animation
6. **Daily spending pulse** — "Сегодня можно потратить: X ₽"
7. **Quick actions** — Start shift, Log expense, Random motivation

## 💼 Work Tab (EXISTING, enhanced)
- Active shift timer + focus mode
- Work quests (6/day)
- Earnings display
- Shift history
- Weekly challenge

## 🎯 Life Tab (NEW + existing life quests)
1. **Habits section** — customizable habits with streaks
2. **Health dashboard** — water, sleep, mood mini-cards
3. **Life quests** (existing, keep)
4. **Social diary** (existing, keep)
5. **Learning tracker** — skill tree / books
6. **Savings goal / kopilka** (existing)

## 📊 Analytics Tab (NEW + existing stats)
1. **Finance overview** — income vs expenses, budget envelopes
2. **Earnings chart** (existing, enhanced)
3. **Heatmap** (existing, enhanced — habits + work)
4. **Week comparison** (existing)
5. **Records & streaks** (existing)
6. **Insights** (existing, enhanced with health correlations)
7. **Crypto portfolio** — watchlist with sparklines

## 🔗 APIs
- Binance WebSocket: wss://stream.binance.com:9443/ws
- CoinGecko REST: https://api.coingecko.com/api/v3

## 📦 New Data Models (localStorage via uKey)
```js
// Habits
habits: [{ id, name, icon, streak, lastDone, history: [dates], mini: bool }]

// Mood log  
mood_log: [{ date, mood: 1-5, note?, tags?: [] }]

// Water
water_log: { [date]: { ml: number, entries: [{time, amount}] } }

// Sleep
sleep_log: [{ date, bedtime, wakeup, quality: 1-5, score: 0-100 }]

// Finance
expenses: [{ id, date, amount, category, note }]
budgets: { [category]: { limit: number, icon } }
income_sources: [{ id, name, monthly_amount }]

// Crypto watchlist
crypto_watchlist: ['BTC', 'ETH', 'SOL', ...]

// Learning
skills: [{ id, name, level: 1-10, xp, sessions: [{date, minutes}] }]
books: [{ id, title, pages_total, pages_read, started, finished? }]
```

## 🚀 Build Phases
1. CSS + HTML skeleton (new tabs, dashboard, life tab)
2. JS: Dashboard logic, mood, habits engine  
3. JS: Crypto API integration, finance module
4. JS: Analytics charts, health trackers
5. Integration testing, deploy
