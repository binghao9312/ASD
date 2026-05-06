# 行李貼紙 PWA 系統實作計畫

本計畫旨在開發一個供工作人員（檢查者）使用的 PWA 網頁應用，用於將行李上的隨機 QR Code 貼紙與旅客的房床號進行綁定登記，並支援離線操作與 Firebase 即時同步。

## 1. 系統目標
- **專屬檢查者使用**：僅限工作人員透過 Google 登入後操作。
- **隨機貼紙綁定**：掃描預印 QR Code 後，輸入房床號完成建檔。
- **嚴謹格式驗證**：針對三棟建築物（毅志、弘德、慧樓）的編號格式進行前端防呆。
- **離線支援 (PWA)**：在網路不穩或無網路環境下仍可掃描登記，連線後自動同步回 Firebase。

## 2. 技術棧
- **框架**: React (Vite) + TypeScript
- **樣式**: Tailwind CSS
- **後端**: Firebase (Firestore, Auth)
- **掃描器**: `html5-qrcode` (支援手機鏡頭)
- **離線支援**: `vite-plugin-pwa` + Firestore Offline Persistence

## 3. 資料結構設計 (Firestore)
### `luggages` (Collection)
- `qrId`: string (貼紙上的唯一代碼)
- `ownerId`: string (房床號，如 20502-3)
- `building`: string (毅志 / 弘德 / 慧樓)
- `checkerEmail`: string (掃描者帳號)
- `scannedAt`: timestamp (掃描時間)
- `synced`: boolean (離線同步標記)

## 4. 房床號驗證邏輯
系統將依據輸入的首位數字自動切換驗證規則：
- **毅志 (2)**: `^2(0[1-9]|1[0-1])(0[1-9]|1[0-6])-[1-4]$` 
  - (2 + 2位樓層 01-11 + 2位房號 01-16 + 1位床號 1-4)
- **弘德 (1)**: `^1[1-8](0[1-9]|10)-[1-4]$`
  - (1 + 1位樓層 1-8 + 2位房號 01-10 + 1位床號 1-4)
- **慧樓 (5)**: `^5[1-6](0[1-9]|10)-[1-4]$`
  - (5 + 1位樓層 1-6 + 2位房號 01-10 + 1位床號 1-4)

## 5. 實作步驟

### 第一階段：環境初始化與 Firebase 設定
1. **建立工作目錄**: 在 `D:/` 下建立 `luggage-pwa` 資料夾作為專案根目錄。
2. 初始化 Vite React 專案，安裝 `firebase`, `html5-qrcode`, `react-router-dom`。
3. 配置 Firebase Project，開啟 Google Auth 與 Firestore。
4. 實作 Firestore 離線持久化設定 (`enableIndexedDbPersistence`)。

### 第二階段：核心功能開發
1. **登入頁面**: 工作人員 Google 登入機制，攔截非授權使用者。
2. **掃描介面**: 整合鏡頭掃描 QR Code，解析出隨機 ID 並帶入表單。
3. **登記表單**: 
   - 輸入房床號後自動識別建築物名稱。
   - 即時格式驗證（Regex 匹配）。
   - 點擊「登記」後存入 Firestore。
4. **歷史清單**: 顯示最近掃描的行李紀錄，方便檢查是否重複掃描。

### 第三階段：PWA 與 離線優化
1. 配置 `vite-plugin-pwa`，設定 Manifest、Icon 與 Service Worker (Offline-first)。
2. 實作連線狀態監控（顯示「在線/離線同步中」狀態）。

## 6. 驗證與測試
1. 測試三種房床號格式的邊際值（例如：毅志 1116-4, 弘德 810-4 等）。
2. 測試在斷網狀態下登記行李，恢復網路後確認 Firebase 是否成功更新。
