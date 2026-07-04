# Biên Giới Mềm 🌏

Web app giáo dục tương tác về chủ đề **"Trong bối cảnh hội nhập kinh tế quốc tế ngày càng sâu rộng, Việt Nam nên làm gì để vừa hội nhập tốt, vừa độc lập, tự chủ?"**

Gồm: Lý thuyết, Flashcard, Quiz nhóm realtime (Đại Sứ Tri Thức), Tranh luận nhóm realtime (Nghị Trường Quốc Tế), Bảng xếp hạng. Đăng nhập Google + phân nhóm (tối đa **8 nhóm**, mỗi nhóm tối đa **7 thành viên**).

## Tech stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind v3 + Framer Motion v11 + shadcn-style Radix UI
- **Server**: Custom Express + Next.js, Socket.io v4 cho realtime
- **DB**: SQLite (better-sqlite3) — single file, persist qua Docker volume
- **Auth**: NextAuth v5 (beta) — Google Provider, JWT session
- **Container**: 1 Dockerfile, 1 service, 1 lệnh khởi chạy

## Chạy với Docker (khuyến nghị)

### 1. Tạo Google OAuth credentials
1. Vào https://console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth client ID (Web application)
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Lưu lại `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`

### 2. Tạo file `.env`
```bash
cp .env.example .env
```
Mở `.env` và điền:
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...   # tạo bằng: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

> Trên Windows không có `openssl`? Dùng PowerShell:
> ```powershell
> [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
> ```

### 3. Build & chạy
```bash
docker compose up --build
```
Sau khi build xong → mở http://localhost:3000

### Persist data
File SQLite được lưu tại `./data/db.sqlite` (mount volume từ container). Xoá file này = reset toàn bộ user/group/score.

> **Lưu ý Windows**: Nếu compose báo lỗi quyền ghi vào `./data`, mở Docker Desktop → Settings → Resources → File sharing và bảo đảm thư mục dự án được share.

## Chạy local dev

```bash
npm install
cp .env.example .env  # rồi điền giống trên
npm run dev
```
Truy cập http://localhost:3000

> `better-sqlite3` cần build native. Trên Windows cần Visual Studio Build Tools (C++) hoặc Windows-Build-Tools. Trên macOS cần Xcode CLT. Trên Linux thường có sẵn.

## Cấu trúc

```
/
├── server.js             # Express + Socket.io + Next.js
├── Dockerfile
├── docker-compose.yml
├── app/                  # Next.js App Router pages
│   ├── api/              # REST endpoints
│   ├── theory/           # Lý thuyết
│   ├── flashcards/       # Flashcard
│   ├── game/             # Sảnh + quiz + debate
│   └── leaderboard/      # BXH
├── components/           # UI components
├── lib/
│   ├── db.js             # SQLite singleton
│   ├── auth.ts           # NextAuth v5
│   ├── quiz-engine.js    # Quiz state machine
│   ├── debate-engine.js  # Debate state machine
│   └── socket-server.js  # Socket.io handlers
├── data/                 # Theory / questions / flashcards / topics
│                         # + db.sqlite (mounted volume)
└── hooks/
```

## Tính năng chính

- **Đăng nhập Google** → tự động tạo user trong SQLite → mở modal chọn nhóm (1 trong 8, hoặc tạo mới)
- **Lý thuyết**: 6 chương, sidebar scroll-spy, timeline SVG, callout boxes, hiệu ứng VR-depth khi scroll
- **Flashcard**: 30 thẻ, flip 3D, filter category/difficulty, "chỉ thẻ chưa biết", keyboard ← → Space 1 2
- **Quiz "Cờ Tỷ Phú"** (Đại Sứ Tri Thức): bàn cờ 24 ô theo lượt từng nhóm. Tới lượt → hiện 1 câu hỏi; trả lời **đúng** mới được nhập số xúc xắc thật (1–6) để di chuyển quân, trả lời **sai** mất lượt. Ô thưởng điểm, ô May Rủi (rút thẻ), ô tiến/lùi, ô bỏ lượt. Cố định **3 vòng**, qua điểm xuất phát +100. Có thể chiếu **camera bàn cờ thật** lên web (xem dưới).
- **Tranh luận**: 5 phase (Chuẩn bị 120s → Trình bày 90s/nhóm → Phản bác 60s → Phản hồi 30s → Bỏ phiếu 30s), 8 quan điểm gây tranh cãi được gán ngẫu nhiên
- **BXH**: realtime update qua Socket.io sau mỗi trận, filter `all|week|today`

## Cờ Tỷ Phú & camera bàn cờ thật

Game Quiz là một **bàn cờ tỷ phú 24 ô** chơi theo lượt. Bạn có thể chơi hoàn toàn trên web (bàn cờ ảo 7×7), hoặc **chiếu một bàn cờ vật lý thật** lên web bằng camera điện thoại:

1. **In bộ thẻ ArUco**: vào https://chev.me/arucogen/, chọn **Dictionary = `Original ArUco`**, **Marker size** tuỳ ý, lần lượt tạo các marker **ID `0` → `23`** (tương ứng 24 ô của bàn cờ). In ra và dán mỗi thẻ lên một ô của bàn cờ thật theo đúng thứ tự ô.
2. **Mở phòng** ở `/game/quiz` (nút "Tạo phòng" trong Sảnh game). Trong phòng chờ sẽ có **mã QR** + đường dẫn `/camera?room=MÃ`.
3. **Quét QR bằng điện thoại** → trang `/camera` mở → bấm **Bật camera & kết nối**, hướng camera bao quát toàn bộ bàn cờ.
4. Điện thoại tự nhận diện marker (js-aruco2, ngay trên trình duyệt, không cần cài app), gửi hình ảnh trực tiếp + vị trí từng ô về phòng. Màn hình chính sẽ **vẽ quân của các nhóm chồng lên đúng ô thật**.

> Marker **ID = số thứ tự ô** (0–23). Đặt điện thoại cố định, đủ sáng, tránh phản quang để nhận diện ổn định. Nếu không có camera, bàn cờ ảo 7×7 vẫn hoạt động bình thường.

## Hệ thống VR 3D

Toàn app dùng pattern **"camera trong không gian 3D"**:
- `.camera` wrapper: `perspective: 600px`
- `.world`: scroll cập nhật `translateZ()` theo `lerp` để có inertia
- Các section dùng `.z-far/.z-mid/.z-near/.z-front` (blur + opacity + Z-translate)
- `.depth-fog` overlay tone mint nhẹ
- Mouse move → đổi `perspective-origin`
- Tự tắt khi user bật `prefers-reduced-motion`

Flashcard flip 3D dùng scope riêng `.card-flip-scope` để không xung đột với camera world.

## Troubleshooting

- **Không đăng nhập được**: kiểm tra `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URI phải đúng `http://localhost:3000/api/auth/callback/google`
- **Trang trắng sau build**: xoá `.next/`, chạy lại
- **Socket.io không kết nối**: kiểm tra firewall, đảm bảo port 3000 mở
- **Nhóm đầy / không đổi được**: xoá `data/db.sqlite` để reset (sẽ mất hết điểm)

---

Phiên bản: 1.0 · License: MIT
