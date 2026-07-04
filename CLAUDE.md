MỤC TIÊU DỰ ÁN

Xây dựng một web app giáo dục tương tác phục vụ học sinh/sinh viên nghiên cứu chủ đề:


"Trong bối cảnh hội nhập kinh tế quốc tế ngày càng sâu rộng, các quốc gia ngày càng phụ thuộc lẫn nhau, tạo nên khái niệm 'biên giới mềm'. Việt Nam nên làm gì để vừa hội nhập tốt, vừa độc lập, tự chủ?"



Website gồm: Trang giới thiệu · Lý thuyết · Flashcard · Game Quiz nhóm · Game Tranh luận nhóm · Đăng nhập Google + phân nhóm.


TECH STACK — KHÔNG FIREBASE, SINGLE CONTAINER

Frontend:    Next.js 14 (App Router) + TypeScript
Styling:     Tailwind CSS v3 + Framer Motion v11
UI Kit:      shadcn/ui (Radix UI primitives)
Auth:        NextAuth.js v5 — Google OAuth Provider (không cần Firebase)
Backend:     Custom Node.js server (Express) chạy cùng Next.js
Realtime:    Socket.io v4 (game state, debate timer, live leaderboard)
Database:    SQLite via better-sqlite3 (single file, zero setup, trong container)
Fonts:       Be Vietnam Pro (body) + Playfair Display (headings) — Google Fonts
Icons:       Lucide React
Container:   Docker — một Dockerfile duy nhất, một container duy nhất

Tại sao SQLite? Zero config, không cần server DB riêng, phù hợp single container, file data có thể mount volume ra ngoài để persist.


CẤU TRÚC DỰ ÁN

/
├── server.js                  ← Custom server: Express + Socket.io + Next.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
│
├── /app                       ← Next.js App Router
│   ├── layout.tsx             ← Root layout (SessionProvider, Navbar, Toaster)
│   ├── page.tsx               ← Home
│   ├── /theory/page.tsx
│   ├── /flashcards/page.tsx
│   ├── /game/page.tsx         ← Sảnh chọn game
│   ├── /game/quiz/page.tsx    ← Game Quiz Đại Sứ Tri Thức
│   ├── /game/debate/page.tsx  ← Game Tranh Luận Nghị Trường
│   ├── /leaderboard/page.tsx
│   └── /api
│       ├── /auth/[...nextauth]/route.ts   ← NextAuth handler
│       ├── /groups/route.ts
│       ├── /user/route.ts
│       └── /leaderboard/route.ts
│
├── /components
│   ├── Navbar.tsx
│   ├── AuthButton.tsx
│   ├── GroupSelector.tsx
│   ├── FlashCard.tsx
│   ├── FlashCardDeck.tsx
│   ├── GameLobby.tsx
│   ├── QuizRoom.tsx
│   ├── DebateRoom.tsx
│   ├── Leaderboard.tsx
│   └── /ui/                   ← shadcn components
│
├── /lib
│   ├── db.ts                  ← SQLite init + helpers (better-sqlite3)
│   ├── schema.ts              ← DB schema definitions
│   ├── socket-server.ts       ← Socket.io event handlers (server-side)
│   ├── socket-client.ts       ← Socket.io client hook
│   └── auth.ts                ← NextAuth config
│
├── /hooks
│   ├── useSocket.ts
│   ├── useGroup.ts
│   └── useLeaderboard.ts
│
└── /data
    ├── theoryContent.ts
    ├── flashcardsData.ts
    ├── questionsData.ts       ← Quiz game questions
    └── debateTopics.ts        ← Debate positions


PALETTE & DESIGN SYSTEM

Tông màu: Sáng, dịu, lấy cảm hứng từ cánh đồng xanh buổi sáng sớm.

--bg:           #F0F7F4    ← mint trắng (nền chủ đạo)
--surface:      #FFFFFF    ← card, modal
--primary:      #2E8B6B    ← xanh lá đậm (CTA, accent chính)
--primary-soft: #E8F5F0    ← hover state, highlight nhẹ
--secondary:    #4A90D9    ← xanh dương (link, badge)
--accent:       #F4A261    ← cam ấm (điểm số, timer)
--danger:       #E05C5C    ← đỏ nhạt (sai, cảnh báo)
--text:         #1A2E25    ← văn bản chính
--muted:        #6B7D74    ← phụ đề, placeholder
--border:       #D4E8DF    ← đường viền nhẹ

Typography:
  Display:  "Playfair Display", serif — 700 weight
  Body:     "Be Vietnam Pro", sans-serif — 400/500
  Numbers:  "JetBrains Mono" — timer, score

border-radius: rounded-xl (12px) card · rounded-2xl modal · rounded-full badge
shadow: shadow-sm default · shadow-md hover · shadow-xl modal


SETUP CONTAINER

Dockerfile

dockerfileFROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner — production single container
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY server.js ./

# SQLite data directory (mount volume đây để persist data)
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server.js"]

docker-compose.yml

yamlversion: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data        # persist SQLite DB
    environment:
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - DATABASE_PATH=/app/data/db.sqlite
    restart: unless-stopped

.env.example

env# Google OAuth — tạo tại https://console.cloud.google.com
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# NextAuth — generate: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# SQLite
DATABASE_PATH=./data/db.sqlite


CUSTOM SERVER (server.js)

javascriptconst { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { initSocketHandlers } = require('./lib/socket-server');
const { initDatabase } = require('./lib/db');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Init SQLite on startup
  initDatabase();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Socket.io instance — shared across app
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // Gắn io vào global để API routes có thể emit
  global.io = io;

  // Init all socket event handlers
  initSocketHandlers(io);

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});


DATABASE SCHEMA (/lib/schema.ts + /lib/db.ts)

typescript// lib/db.ts — khởi tạo SQLite và tất cả bảng
import Database from 'better-sqlite3';

export function initDatabase() {
  const db = getDb();
  db.exec(`
    -- Người dùng
    CREATE TABLE IF NOT EXISTS users (
      uid         TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      avatar      TEXT,
      group_id    TEXT,
      total_score INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Nhóm
    CREATE TABLE IF NOT EXISTS groups (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL UNIQUE,
      total_score  INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- Lịch sử game quiz
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id           TEXT PRIMARY KEY,
      room_code    TEXT NOT NULL,
      status       TEXT DEFAULT 'waiting',
      started_at   TEXT,
      ended_at     TEXT
    );

    -- Điểm quiz từng người trong session
    CREATE TABLE IF NOT EXISTS quiz_scores (
      session_id TEXT,
      uid        TEXT,
      score      INTEGER DEFAULT 0,
      PRIMARY KEY (session_id, uid)
    );

    -- Lịch sử game debate
    CREATE TABLE IF NOT EXISTS debate_sessions (
      id         TEXT PRIMARY KEY,
      room_code  TEXT NOT NULL,
      status     TEXT DEFAULT 'waiting',
      topic_id   TEXT,
      started_at TEXT,
      ended_at   TEXT
    );

    -- Kết quả vote debate từng nhóm
    CREATE TABLE IF NOT EXISTS debate_votes (
      session_id  TEXT,
      voter_uid   TEXT,
      voted_group TEXT,
      PRIMARY KEY (session_id, voter_uid)
    );
  `);
}

let _db: Database.Database | null = null;
export function getDb() {
  if (!_db) {
    _db = new Database(process.env.DATABASE_PATH || './data/db.sqlite');
    _db.pragma('journal_mode = WAL'); // performance
  }
  return _db;
}


AUTH — NEXTAUTH.JS GOOGLE PROVIDER (/lib/auth.ts)

typescriptimport NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getDb } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const db = getDb();
      // Upsert user vào SQLite
      db.prepare(`
        INSERT INTO users (uid, email, name, avatar)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET name=excluded.name, avatar=excluded.avatar
      `).run(user.id, user.email, user.name, user.image);
      return true;
    },
    async session({ session, token }) {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(token.sub);
      session.user.uid = token.sub;
      session.user.groupId = (user as any)?.group_id ?? null;
      return session;
    },
    async jwt({ token }) {
      return token;
    }
  },
  pages: {
    signIn: '/',
  }
});


LUỒNG PHÂN NHÓM

Người dùng đăng nhập Google
  ↓
NextAuth callback → upsert vào bảng users
  ↓
Client gọi GET /api/user → trả về { groupId }
  ↓
  ├── groupId có giá trị → Toast "Chào mừng trở lại! Nhóm {tên}"
  └── groupId = null → Mở modal <GroupSelector>
        ↓
        GET /api/groups → danh sách nhóm + số thành viên
        ↓
        User chọn nhóm / tạo nhóm mới
        ↓
        POST /api/user { groupId } → cập nhật DB, đóng modal

GroupSelector Modal UI

┌──────────────────────────────────────────────────┐
│  Bạn đang ở nhóm nào?                            │
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Nhóm 1  │  │ Nhóm 2  │  │ Nhóm 3  │          │
│  │ 👤👤👤  │  │ 👤👤    │  │ 👤👤👤👤│          │
│  │  3/6    │  │  2/6    │  │  4/6 ✓  │          │
│  └─────────┘  └─────────┘  └─────────┘          │
│                                                  │
│  Tạo nhóm mới: [Tên nhóm...]  [+ Tạo nhóm]      │
└──────────────────────────────────────────────────┘


Nhóm đủ 6 người → disabled + "Nhóm đã đầy"
Click chọn → highlight + nút "Xác nhận" xuất hiện



SOCKET.IO — SERVER EVENTS (/lib/socket-server.ts)

typescriptexport function initSocketHandlers(io: Server) {

  // ——— QUIZ GAME EVENTS ———
  io.on('connection', (socket) => {

    // Tạo phòng quiz
    socket.on('quiz:create', ({ hostUid, groupId }) => { ... });

    // Join phòng
    socket.on('quiz:join', ({ roomCode, uid, name, groupId }) => {
      socket.join(roomCode);
      io.to(roomCode).emit('quiz:playerJoined', { uid, name, groupId });
    });

    // Host bắt đầu game
    socket.on('quiz:start', ({ roomCode }) => {
      // Lấy câu hỏi random từ questionsData
      // Emit câu đầu tiên
      io.to(roomCode).emit('quiz:question', { question, index: 0, total: 10 });
      startQuestionTimer(io, roomCode, 0);
    });

    // Player trả lời
    socket.on('quiz:answer', ({ roomCode, uid, questionIndex, answer, timeLeft }) => {
      const isCorrect = checkAnswer(questionIndex, answer);
      const points = isCorrect ? Math.round(50 + timeLeft * 5) : 0; // speed bonus
      // Lưu điểm vào quiz_scores
      socket.emit('quiz:answerResult', { isCorrect, points, correctAnswer });
      // Emit updated group scores
      io.to(roomCode).emit('quiz:groupScores', getGroupScores(roomCode));
    });

    // Kết thúc câu → emit câu tiếp
    // Kết thúc game → emit final results, cập nhật SQLite
    socket.on('quiz:end', ({ roomCode }) => {
      const results = calculateFinalResults(roomCode);
      updateLeaderboard(results); // cập nhật groups.total_score, users.total_score
      io.to(roomCode).emit('quiz:finished', results);
    });

    // ——— DEBATE GAME EVENTS ———

    socket.on('debate:create', ({ hostUid }) => { ... });

    socket.on('debate:join', ({ roomCode, uid, name, groupId }) => {
      socket.join('debate:' + roomCode);
      io.to('debate:' + roomCode).emit('debate:playerJoined', { uid, name, groupId });
    });

    // Host bắt đầu debate → assign topic ngẫu nhiên cho từng nhóm
    socket.on('debate:start', ({ roomCode }) => {
      const groups = getGroupsInRoom(roomCode);
      const assignments = assignDebateTopics(groups); // xáo trộn + gán
      io.to('debate:' + roomCode).emit('debate:topicsAssigned', assignments);
      startPrepTimer(io, roomCode); // 2 phút chuẩn bị
    });

    // Bắt đầu lượt phát biểu của nhóm
    socket.on('debate:startTurn', ({ roomCode, groupId }) => {
      io.to('debate:' + roomCode).emit('debate:turnStarted', { groupId });
      startSpeakTimer(io, roomCode, groupId); // 90 giây
    });

    // Nhóm khác gửi phản bác (text)
    socket.on('debate:challenge', ({ roomCode, fromGroupId, text }) => {
      io.to('debate:' + roomCode).emit('debate:challengeReceived', { fromGroupId, text });
    });

    // Phase vote — bỏ phiếu chọn nhóm tranh luận tốt nhất
    socket.on('debate:vote', ({ roomCode, voterUid, votedGroupId }) => {
      saveVote(roomCode, voterUid, votedGroupId); // không vote cho nhóm mình
      const voteCount = getCurrentVotes(roomCode);
      io.to('debate:' + roomCode).emit('debate:voteUpdate', voteCount);
    });

    // Kết thúc debate → tổng kết điểm, cập nhật leaderboard
    socket.on('debate:end', ({ roomCode }) => {
      const results = calculateDebateResults(roomCode);
      updateLeaderboard(results);
      io.to('debate:' + roomCode).emit('debate:finished', results);
    });

  });
}


TRANG 1: HOME (/)

Hero Section


Headline lớn: "Biên Giới Mềm" — gradient text #2E8B6B → #4A90D9, Playfair Display 72px
Subheadline: "Khám phá cách Việt Nam hội nhập thế giới mà vẫn giữ vững bản sắc"
Animated background: SVG paths dạng mạng lưới kết nối, các node nhấp nháy chậm
3 floating card (Framer Motion float lên xuống vô hạn):

"195 Quốc gia hội nhập"
"17+ Hiệp định FTA của VN"
"Top 20 Nền kinh tế xuất khẩu"



2 CTA: "Bắt đầu học →" (→ /theory) · "Thi đấu ngay 🎮" (→ /game)


Feature Cards (4 cột trên desktop, 2 cột tablet, 1 cột mobile)

[📖 Lý thuyết]   [🃏 Flashcard]   [⚡ Quiz nhóm]   [🎭 Tranh luận]

Hover → lift + shadow + border-bottom 3px --primary.

Statistics Bar (scroll-triggered count-up animation)

17 FTA ký kết  ·  $371B GDP 2023  ·  35+ Năm đổi mới  ·  6.8% Tăng trưởng TB


TRANG 2: LÝ THUYẾT (/theory)

Layout


Sidebar bên trái (sticky, chỉ desktop): mục lục với scroll-spy — section đang đọc tự highlight
Reading progress bar ở top page (fixed, màu --primary)
Nội dung xuất hiện khi scroll (Framer Motion whileInView)


Nội dung đầy đủ (đưa vào /data/theoryContent.ts)

typescript// SECTION 1 — KHÁI NIỆM BIÊN GIỚI MỀM
// Định nghĩa, phân biệt với biên giới cứng, 4 chiều:
//   Kinh tế · Công nghệ · Văn hóa · Pháp lý
// Callout: "Biên giới mềm không thay thế biên giới cứng — nó là lớp mới
//           chồng lên, phức tạp hơn, khó thấy hơn, và đôi khi nguy hiểm hơn."

// SECTION 2 — HỘI NHẬP KINH TẾ QUỐC TẾ
// Toàn cầu hóa 3.0: chuỗi giá trị toàn cầu (GVC)
// Lý thuyết Interdependence (Keohane & Nye)
// Các tổ chức: WTO, IMF, WB, G20, APEC
// Xu hướng khu vực hóa: ASEAN, EU, RCEP, USMCA

// SECTION 3 — VIỆT NAM TRONG BỨC TRANH HỘI NHẬP
// Timeline từ Đổi Mới 1986 → 2024 (SVG timeline animate vẽ dần)
//   1986: Đổi Mới  →  1995: ASEAN  →  2007: WTO
//   →  2015: AEC  →  2018: CPTPP  →  2020: EVFTA  →  2022: RCEP
// Thành tựu: GDP tăng 40x từ 1986, FDI 20-25 tỷ/năm
// Thực trạng: phụ thuộc supply chain TQ, công nghệ lõi nhập khẩu

// SECTION 4 — THÁCH THỨC VÀ NGHỊCH LÝ (4 sub-section)
// 4.1  "Bẫy hội nhập" — mở cửa nhanh làm yếu nội lực
// 4.2  Căng thẳng Mỹ-Trung — VN ở giữa hai đại cường
// 4.3  Chủ quyền số — dữ liệu người VN trên server nước ngoài
// 4.4  Văn hóa bị xâm thực — K-pop, TikTok, lối sống phương Tây

// SECTION 5 — GIẢI PHÁP (5 sub-section)
// 5.1  Chiến lược "Tre Việt Nam": dẻo dai, không gãy, đa phương hóa
// 5.2  Tự chủ công nghệ: chip bán dẫn, AI nội địa, hệ sinh thái số VN
// 5.3  Nâng cao nội lực: doanh nghiệp nội địa đủ mạnh, tăng giá trị gia tăng
// 5.4  Bảo vệ văn hóa: tiếng Việt online, xuất khẩu văn hóa VN ra thế giới
// 5.5  Thể chế pháp lý: luật dữ liệu, an ninh mạng, tham gia xây luật chơi QT

// SECTION 6 — KẾT LUẬN
// "Biên giới mềm không phải kẻ thù của chủ quyền — nó là thách thức mới
//  đòi hỏi tư duy mới. Hội nhập bằng bản lĩnh, không phải bằng phụ thuộc."

Visual trong trang lý thuyết:


SVG Timeline ngang (section 3), animate khi scroll tới
Infographic "Mạng FTA của Việt Nam": SVG map đơn giản VN + đường kết nối tới đối tác, vẽ dần khi scroll
Quote card: gradient nền nhạt + border trái 4px --primary
Callout "Bạn có biết?" box: background --primary-soft, icon 💡



TRANG 3: FLASHCARD (/flashcards)

UX

Filter: [Tất cả ▾]  [Độ khó: Tất cả ▾]    [🔀 Xáo trộn]  [🎯 Chỉ thẻ chưa biết]

        ┌───────────────────────────────────┐
        │                                   │
        │         BIÊN GIỚI MỀM             │  ← Mặt trước (term)
        │                                   │
        │         Click để lật              │
        │                                   │
        └───────────────────────────────────┘

Progress:  [████████░░░░░░░░░] 8 / 30

[← Trước]                              [Tiếp theo →]
[❌ Chưa biết]                          [✅ Đã biết]

Tính năng:


Flip 3D animation (rotateY 180deg, perspective: 1000px, hai backface-visibility: hidden)
Keyboard: ← → chuyển thẻ · Space lật · 1 = chưa biết · 2 = đã biết
Swipe left/right trên mobile (pointer events)
Progress persist localStorage theo uid hoặc anonymous
"Luyện thẻ chưa biết" chỉ show thẻ đã đánh dấu ❌
Filter category + difficulty


Dữ liệu (/data/flashcardsData.ts) — tạo đủ 30 flashcard

typescriptinterface FlashCard {
  id: string;
  front: string;
  back: string;
  category: 'khái_niệm' | 'tổ_chức' | 'hiệp_định' | 'sự_kiện' | 'phân_tích';
  difficulty: 1 | 2 | 3;
}

// Bao gồm: Biên giới mềm, Biên giới cứng, WTO, ASEAN, RCEP, CPTPP, EVFTA,
// APEC, IMF, GVC (chuỗi giá trị toàn cầu), Toàn cầu hóa 3.0, Interdependence,
// Đổi Mới 1986, Chủ quyền số, FDI, FTA, Bẫy hội nhập, Chiến lược tre,
// AEC, USMCA, Keohane & Nye, GDP VN 2023, EVFTA có hiệu lực năm nào,
// Số thành viên WTO, Số FTA VN đã ký, Năm VN gia nhập ASEAN...


TRANG 4: GAME LOBBY (/game)

┌────────────────────────────────────────────────────────┐
│                 Chọn loại trò chơi                     │
│                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │  ⚡ ĐẠI SỨ TRI THỨC  │  │  🎭 NGHỊ TRƯỜNG QT   │   │
│  │                      │  │                      │   │
│  │  Quiz 10 câu · Nhóm  │  │  Tranh luận · Bảo    │   │
│  │  cạnh tranh điểm     │  │  vệ quan điểm gây    │   │
│  │  theo thời gian thực │  │  tranh cãi           │   │
│  │                      │  │                      │   │
│  │  [Tạo phòng]         │  │  [Tạo phòng]         │   │
│  │  [Nhập mã vào]       │  │  [Nhập mã vào]       │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                        │
│  📊 BXH hôm nay:  🥇 Nhóm 3 · 2,840đ  🥈 Nhóm 1 ...  │
└────────────────────────────────────────────────────────┘


GAME 1: "ĐẠI SỨ TRI THỨC" (/game/quiz)

Concept

Mỗi người là "Đại sứ" đại diện nhóm. Trả lời đúng + nhanh → Điểm Ngoại Giao cho nhóm. Nhóm nhiều điểm nhất thành "Cường Quốc Tri Thức".

Cơ chế


10 câu trắc nghiệm 4 đáp án · 15 giây/câu · speed bonus
Power-up (1 lần/vòng, kiếm từ streak 3 câu đúng liên tiếp):

🤝 "Đàm phán" — loại 1 đáp án sai
⏱️ "Gia hạn Thị thực" — +10 giây
🔍 "Tình báo Kinh tế" — gợi ý ngắn





In-Game UI

[Timer: 8s ████████░░]          Câu 4/10

Nhóm bạn: 840đ    |    🥇 Nhóm 3: 1,200đ    |    Nhóm 2: 990đ

  ┌──────────────────────────────────────────────────────┐
  │  Việt Nam ký Hiệp định EVFTA với đối tác nào?        │
  └──────────────────────────────────────────────────────┘

  [A] ASEAN           [B] Liên minh Châu Âu
  [C] Hoa Kỳ          [D] Trung Quốc

  [🤝 Đàm phán]  [⏱️ Gia hạn]  [🔍 Tình báo]    ← đã dùng = mờ đi

Sau chọn đáp án:


Đúng: card xanh lá + "+120 điểm" pop scale animation + confetti burst
Sai: card đỏ nhạt + shake animation + hiện đáp án đúng
Hết giờ: flash đỏ + hiện đáp án đúng


Kết thúc game


Podium 3 nhóm top — slide lên từ dưới theo thứ tự 3→2→1
Huy hiệu cá nhân: "⚡ Nhanh nhất", "🔥 Streak dài nhất", "🎯 Chính xác nhất"
Điểm tự cộng vào SQLite groups.total_score + users.total_score


Ngân hàng câu hỏi (/data/questionsData.ts) — 40 câu+

typescriptinterface Question {
  id: string;
  category: string;
  difficulty: 1 | 2 | 3;
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
  hint?: string;       // dùng cho power-up Tình báo
}

// Bao gồm đủ các câu về: WTO, ASEAN, CPTPP, EVFTA, RCEP, biên giới mềm,
// GDP Việt Nam, năm sự kiện lịch sử hội nhập, nguyên tắc ngoại giao đa phương,
// chuỗi giá trị toàn cầu, các tổ chức quốc tế, lý thuyết interdependence...


GAME 2: "NGHỊ TRƯỜNG QUỐC TẾ" (/game/debate)

Concept — GAME MỚI, TỰ ĐỀ XUẤT

Mỗi nhóm được phân công ngẫu nhiên một quan điểm gây tranh cãi về hội nhập/biên giới mềm. Dù đồng ý hay không, nhóm PHẢI bảo vệ quan điểm đó bằng lý lẽ thuyết phục nhất có thể. Sau khi tất cả trình bày, các thành viên bỏ phiếu chọn nhóm lập luận hay nhất (không được vote cho nhóm mình).

Mục đích sư phạm

Buộc học sinh nhìn vấn đề từ nhiều góc độ, phát triển tư duy phản biện, hiểu sâu các chiều cạnh của hội nhập — kể cả chiều mà họ không đồng ý.

Các quan điểm tranh luận (/data/debateTopics.ts)

typescriptconst debateTopics: DebateTopic[] = [
  {
    id: "dt01",
    title: "Việt Nam nên từ bỏ tiền đồng, gia nhập khối tiền tệ chung ASEAN",
    side: "ủng hộ",
    context: "Đồng tiền chung loại bỏ rủi ro tỷ giá, thúc đẩy thương mại nội khối, nhưng đánh đổi chính sách tiền tệ độc lập.",
    argumentStarters: [
      "Hãy nhìn vào EU — đồng EUR đã...",
      "Chi phí giao dịch xuyên biên giới sẽ giảm khi...",
      "Dự trữ ngoại hối VN hiện tại đủ để..."
    ]
  },
  {
    id: "dt02",
    title: "TikTok, Facebook, YouTube nên bị chặn ở Việt Nam để bảo vệ văn hóa và chủ quyền số",
    side: "ủng hộ",
    context: "Các nền tảng nước ngoài thu thập dữ liệu người dùng VN, kiểm soát dòng thông tin, và lan truyền văn hóa phương Tây — nhưng cũng là nguồn thu nhập và kết nối của hàng triệu người.",
    argumentStarters: [
      "Trung Quốc với Great Firewall đã chứng minh...",
      "Dữ liệu người dùng VN đang nằm trên server tại...",
      "Doanh nghiệp nội địa như Zalo có thể..."
    ]
  },
  {
    id: "dt03",
    title: "Người nước ngoài nên được phép sở hữu đất đai vĩnh viễn ở Việt Nam như người Việt",
    side: "ủng hộ",
    context: "Thu hút FDI và chuyên gia nước ngoài, nhưng đặt ra câu hỏi về chủ quyền lãnh thổ và giá nhà tăng cao đẩy người dân ra khỏi đô thị.",
    argumentStarters: [
      "Singapore và Thái Lan đã thu hút hàng tỷ USD nhờ...",
      "Hạn chế sở hữu đang khiến VN mất cơ hội...",
      "Cần nhìn vào tỷ lệ đất do người nước ngoài nắm ở..."
    ]
  },
  {
    id: "dt04",
    title: "Tiếng Anh nên trở thành ngôn ngữ dạy học chính thức bên cạnh tiếng Việt từ lớp 1",
    side: "ủng hộ",
    context: "Nâng sức cạnh tranh toàn cầu và thu hút FDI công nghệ cao, nhưng đe dọa bản sắc văn hóa và tạo bất bình đẳng giáo dục.",
    argumentStarters: [
      "Singapore dùng song ngữ và hiện đứng top...",
      "Kỹ sư VN mất cơ hội vì rào cản ngôn ngữ khi...",
      "Phillipines với tiếng Anh đã thu hút BPO..."
    ]
  },
  {
    id: "dt05",
    title: "Việt Nam nên liên minh chiến lược công khai với Mỹ, từ bỏ chính sách 'bốn không'",
    side: "ủng hộ",
    context: "'Bốn không' (không liên minh quân sự, không căn cứ nước ngoài, không dùng vũ lực trước, không bên nào chống lại bên kia) giúp VN cân bằng — nhưng có bảo vệ được Biển Đông không?",
    argumentStarters: [
      "Biển Đông đang bị lấn chiếm trong khi...",
      "Ukraine đã trả giá đắt vì không có liên minh khi...",
      "Quan hệ VN-Mỹ hiện đã ở mức Đối tác Chiến lược Toàn diện, bước tiếp theo..."
    ]
  },
  {
    id: "dt06",
    title: "Việt Nam nên mở cửa hoàn toàn thị trường lao động cho công dân ASEAN không cần visa",
    side: "ủng hộ",
    context: "Lấp đầy thiếu hụt lao động tay nghề cao, nhưng cạnh tranh với lao động nội địa và gây áp lực hạ lương trong một số ngành.",
    argumentStarters: [
      "EU đã chứng minh tự do lao động tạo ra...",
      "Ngành công nghệ VN đang thiếu 500,000 kỹ sư...",
      "ASEAN Economic Community đã cam kết nhưng VN..."
    ]
  },
  {
    id: "dt07",
    title: "Chính phủ nên ưu tiên thu hút FDI thay vì hỗ trợ doanh nghiệp nội địa trong 10 năm tới",
    side: "ủng hộ",
    context: "FDI mang công nghệ, việc làm, xuất khẩu — nhưng lợi nhuận chảy ra nước ngoài và doanh nghiệp nội địa bị 'chèn ép' ngay trên sân nhà.",
    argumentStarters: [
      "Samsung, Intel, LG đã tạo ra hàng triệu việc làm...",
      "Hàn Quốc và Đài Loan đã dùng FDI để chuyển giao CN...",
      "Doanh nghiệp nội địa VN hiện chỉ đóng góp X% xuất khẩu..."
    ]
  },
  {
    id: "dt08",
    title: "Việt Nam nên ra khỏi ASEAN và tìm mô hình hội nhập độc lập riêng như Thụy Sĩ",
    side: "ủng hộ",
    context: "ASEAN bị chỉ trích là thiếu hiệu lực, bị chi phối bởi các nước lớn và nguyên tắc đồng thuận làm tê liệt quyết sách — trong khi Thụy Sĩ không trong EU nhưng vẫn thịnh vượng.",
    argumentStarters: [
      "ASEAN đã thất bại trong việc giải quyết tranh chấp Biển Đông khi...",
      "Thụy Sĩ với GDP/người hơn 90,000 USD không cần...",
      "VN đang bị ràng buộc bởi nguyên tắc đồng thuận ASEAN trong vụ..."
    ]
  }
];


⚠️ Lưu ý kỹ thuật: Khi assign topic cho nhóm, shuffle mảng và assign tuần tự — đảm bảo không nhóm nào bị trùng topic, và không nhóm nào được chọn topic mình thích (system tự quyết định để tạo thử thách).



Luồng game Tranh Luận (Socket.io driven)

PHASE 1 — CHUẨN BỊ (2 phút)
  Host bấm Start → system assign topic ngẫu nhiên → emit 'debate:topicsAssigned'
  Mỗi thành viên thấy quan điểm của nhóm mình + context + argument starters
  Countdown 120 giây để nhóm trao đổi nội bộ (voice/video tự arrange ngoài app)
  
PHASE 2 — TRÌNH BÀY (90 giây/nhóm, lần lượt)
  Nhóm đang trình bày: text box để type argument, gửi từng luận điểm
  Các nhóm khác: xem luận điểm realtime + có thể react (👏 🤔 ❗)
  Timer countdown 90s, flash đỏ khi < 10s
  
PHASE 3 — PHẢN BÁC (60 giây)
  Sau mỗi nhóm trình bày: các nhóm khác có thể gửi challenge (1 câu ngắn)
  Nhóm vừa trình bày có 30s để phản hồi challenge
  
PHASE 4 — BỎ PHIẾU (30 giây)
  Mỗi người chọn nhóm nào tranh luận thuyết phục nhất
  Không được vote cho nhóm mình
  Kết quả hiển thị realtime dạng bar chart animate
  
PHASE 5 — KẾT QUẢ
  Nhóm được vote nhiều nhất: +500 điểm (chia đều cho thành viên)
  Top voter accuracy (nếu vote cho winner): +50 điểm
  Cập nhật leaderboard

Debate Room UI

┌─ NGHỊ TRƯỜNG QUỐC TẾ ───────────────────── Phòng: #XK8F2 ─┐
│                                                             │
│  [PHASE: TRÌNH BÀY]  Nhóm 2 đang phát biểu  [72s ██████░] │
│                                                             │
│  Quan điểm của Nhóm 2:                                     │
│  "TikTok, Facebook nên bị chặn ở Việt Nam"                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  💬 "Dữ liệu 97 triệu người dùng VN đang nằm trên   │  │
│  │     server tại Singapore và Ireland, hoàn toàn nằm   │  │
│  │     ngoài tầm kiểm soát của pháp luật VN..."         │  │
│  │                                                      │  │
│  │  💬 "Trung Quốc với Great Firewall đã xây dựng được  │  │
│  │     Douyin, WeChat, Alibaba — hệ sinh thái số hoàn  │  │
│  │     toàn nội địa với tổng giá trị hàng nghìn tỷ..." │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Nhóm khác:  👏 12  🤔 5  ❗3                               │
│                                                             │
│  [Nhóm 1: Nhập phản bác...]  [Gửi Challenge]               │
└─────────────────────────────────────────────────────────────┘


BẢNG XẾP HẠNG (/leaderboard)


Real-time update qua Socket.io (server emit khi kết thúc game)
Top 3: Podium đặc biệt với animation rise-up
Bảng dưới: cột Hạng · Tên nhóm · Tổng điểm · Thành viên · TB/người · Số game
Filter: Tất cả / Tuần này / Hôm nay
Nhóm của user hiện tại: row highlight --primary-soft + "📍 Nhóm của bạn"
Sort animation: dùng Framer Motion layout + layoutId để row trượt lên/xuống khi thứ hạng thay đổi



NAVBAR (/components/Navbar.tsx)

Logo: 🌏 Biên Giới Mềm   |   [Trang chủ] [Lý thuyết] [Ôn tập] [Thi đấu ▾] [BXH]
                                                               [Avatar · Nhóm 3 ▾]


Sticky, backdrop-blur-md, border-bottom 1px --border
Active link: underline slide-in từ trái (::after pseudo-element animate width)
Mobile: hamburger → slide drawer từ phải (Framer Motion x: "100%" → x: 0)
"Thi đấu ▾": dropdown chọn Quiz hoặc Tranh luận
Avatar dropdown: Nhóm của tôi · Tổng điểm · Đăng xuất



ANIMATIONS (Framer Motion — toàn app)

tsx// 1. Page transition — mỗi route change
const page = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.25 } }
}

// 2. Stagger list — danh sách card, items lý thuyết
const container = { animate: { transition: { staggerChildren: 0.07 } } }
const item = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 }
}

// 3. Hero floating cards
animate={{ y: [0, -10, 0] }}
transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}

// 4. Flashcard flip 3D
// Mặt trước: rotateY 0 → 90 → (ẩn)
// Mặt sau: rotateY -90 → 0, delay = duration/2
// backfaceVisibility: "hidden" trên cả hai mặt

// 5. Button spring
whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
transition={{ type: "spring", stiffness: 400, damping: 17 }}

// 6. Score pop (quiz)
initial={{ scale: 0, opacity: 0, y: 0 }}
animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1], y: -30 }}
exit={{ opacity: 0, y: -50 }}

// 7. Timer countdown pulse (< 5s đổi màu + pulse)
animate={{ scale: timeLeft < 5 ? [1, 1.08, 1] : 1 }}
style={{ color: timeLeft < 5 ? "var(--danger)" : "var(--text)" }}

// 8. Background gradient shift (hero)
animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
transition={{ duration: 10, repeat: Infinity, ease: "linear" }}

// 9. Scroll reveal (lý thuyết)
whileInView={{ opacity: 1, y: 0 }}
initial={{ opacity: 0, y: 30 }}
viewport={{ once: true, amount: 0.15 }}

// 10. Leaderboard row reorder
<motion.tr key={group.id} layout layoutId={group.id}>

// 11. Podium rise (kết thúc game)
// 3 → 2 → 1 lần lượt animate từ dưới lên với delay stagger
// 12. Confetti burst (đáp án đúng) — CSS keyframe hoặc canvas confetti lib
// 13. Vote bar animate width realtime (debate)
// 14. Challenge text slide-in từ phải (debate)


API ROUTES

GET  /api/user              → lấy thông tin user hiện tại + groupId
POST /api/user              → { groupId } → cập nhật group

GET  /api/groups            → danh sách nhóm + member count
POST /api/groups            → { name } → tạo nhóm mới

GET  /api/leaderboard       → top nhóm, filter ?period=today|week|all

POST /api/quiz/session      → tạo session mới, trả về roomCode
POST /api/quiz/end          → { roomCode, scores } → lưu vào DB, cập nhật BXH

POST /api/debate/session    → tạo debate session, trả về roomCode
POST /api/debate/end        → { roomCode, votes } → tính điểm, lưu DB


PACKAGE.JSON DEPENDENCIES

json{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.3.0",
    "socket.io": "^4.7.0",
    "socket.io-client": "^4.7.0",
    "next-auth": "^5.0.0-beta",
    "better-sqlite3": "^9.6.0",
    "express": "^4.19.0",
    "lucide-react": "^0.400.0",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-toast": "latest",
    "@radix-ui/react-avatar": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-progress": "latest",
    "@radix-ui/react-tabs": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.0"
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MENTAL MODEL ĐÚNG: "BẠN LÀ MỘT CÁI CAMERA"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Không có "trang web". Chỉ có MỘT KHÔNG GIAN 3D.
Người dùng = camera đang bay xuyên qua không gian đó.
Scroll xuống = camera tiến về phía trước (translateZ tăng).
Không có section nào "hiện ra" — tất cả ĐÃ TỒN TẠI
trong không gian, chỉ là camera chưa bay tới đó.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 QUY TẮC PHÂN BIỆT VR DEPTH vs FAKE 3D
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[QUY TẮC 1] — VẬT GẦN PHẢI TO HƠN VIEWPORT
  ✗ SAI: Card 3D nằm gọn trong màn hình, có shadow lung linh
  ✓ ĐÚNG: Vật ở Z+200px tràn ra NGOÀI cạnh viewport,
          bị clipped — giống vật đang đứng sát mặt bạn

[QUY TẮC 2] — VẬT XA PHẢI MỜ + NHẠT MÀU
  ✗ SAI: Background layer chỉ nhỏ hơn và tối hơn
  ✓ ĐÚNG: Vật xa = blur(4-8px) + opacity 0.4 + desaturate
          + một lớp sương mỏng (atmospheric haze overlay)
          Mắt người tự nhận ra "vật đó ở XA"

[QUY TẮC 3] — VANISHING POINT PHẢI KÉOÍT MẮT VÀO TRUNG TÂM
  ✗ SAI: Nhiều hiệu ứng perspective rải đều trang
  ✓ ĐÚNG: MỘT điểm tụ duy nhất ở giữa màn hình.
          Mọi đường thẳng đều hội tụ về đó.
          perspective: 600px (nhỏ = mạnh, không phải 1200px)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CSS CỐT LÕI — KHÔNG ĐƯỢC BỎ QUA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/* TOÀN BỘ chuỗi container PHẢI có preserve-3d */
* {
  transform-style: preserve-3d; /* áp cho mọi wrapper */
}

.camera {
  perspective: 600px;           /* MẠNH, không phải 1200px */
  perspective-origin: 50% 50%;  /* đúng giữa màn hình */
}

/* Scroll = dịch chuyển camera tiến vào không gian */
.world {
  transform: translateZ(0px);   /* JS cập nhật theo scroll */
  transition: transform 0.1s linear;
}

/* Atmospheric depth layers */
.z-far    { transform: translateZ(-1200px);
            filter: blur(6px) saturate(0.3);
            opacity: 0.35; }

.z-mid    { transform: translateZ(-500px);
            filter: blur(2px) saturate(0.7);
            opacity: 0.65; }

.z-near   { transform: translateZ(0px);
            filter: none;
            opacity: 1; }

.z-front  { transform: translateZ(250px);
            /* KHÔNG có overflow:hidden ở wrapper —
               để nó tràn ra ngoài viewport */ }

/* Sương mù chiều sâu (depth fog) */
.depth-fog {
  position: fixed; inset: 0; pointer-events: none;
  background: radial-gradient(
    ellipse 60% 60% at 50% 50%,
    transparent 30%,
    rgba(5,8,26,0.7) 100%
  );
  z-index: 9999;
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCROLL LOGIC — CAMERA MOVEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let scrollZ = 0;
let targetZ = 0;

window.addEventListener('scroll', () => {
  // Mỗi 1px scroll = camera tiến 4px vào không gian Z
  targetZ = window.scrollY * 4;
});

function tick() {
  // Lerp tạo inertia — camera "trượt" chứ không dừng cứng
  scrollZ += (targetZ - scrollZ) * 0.08;
  world.style.transform = `translateZ(${scrollZ}px)`;
  requestAnimationFrame(tick);
}
tick();

// Mouse: dịch perspective-origin (không phải rotate scene)
document.addEventListener('mousemove', (e) => {
  const px = (e.clientX / window.innerWidth)  * 100;
  const py = (e.clientY / window.innerHeight) * 100;
  camera.style.perspectiveOrigin = `${px}% ${py}%`;
  // Hiệu ứng: khi nhìn sang phải, không gian "nghiêng"
  // như mắt thật nhìn vào hộp 3D
});

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BỎ NGAY CÁC PATTERN NÀY (flat UI disguise)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ Cards trong grid layout đều tăm tắp
✗ Section scroll vào bằng slideUp / fadeIn
✗ box-shadow để "giả" chiều sâu
✗ background-attachment: fixed để "giả" parallax
✗ Mọi thứ vẫn nằm trong overflow:hidden wrapper
✗ perspective đặt ở từng component riêng lẻ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KIỂM TRA: ĐÚNG NẾU...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ Nhắm một mắt nhìn vào màn hình → vẫn thấy chiều sâu
□ Object gần nhất bị clip bởi cạnh viewport
□ Vật xa nhất trông như đang trong sương mù
□ Khi move chuột → không gian "xoay" quanh điểm bạn nhìn
□ Scroll có cảm giác bay vào, KHÔNG phải kéo trang xuống
□ Tắt animation đi → layout vẫn có depth tĩnh rõ ràng

sau khi sửa xong tự động build lại docker


README.md — HƯỚNG DẪN SETUP

Tạo README.md đầy đủ với các bước:

markdown## Chạy với Docker (khuyến nghị)
1. Tạo Google OAuth credentials tại https://console.cloud.google.com
   - Authorized redirect URI: http://localhost:3000/api/auth/callback/google
2. Copy .env.example → .env và điền thông tin
3. docker compose up --build
4. Truy cập http://localhost:3000

## Chạy local (dev)
1. Bước 1-2 như trên
2. npm install
3. npm run dev

## Persist data
SQLite file lưu tại ./data/db.sqlite
Docker compose đã mount volume ./data → /app/data


YÊU CẦU KỸ THUẬT BỔ SUNG


Responsive: mobile-first, breakpoints sm/md/lg/xl
Skeleton UI: loading placeholders thay vì spinner đơn giản
Error boundary: thân thiện khi server mất kết nối
Toast (shadcn): đăng nhập, chọn nhóm, kết nối game, lỗi
404 page: quả địa cầu SVG + "Trang này không tồn tại trong bản đồ thế giới 🌍"
SEO: metadata đầy đủ mỗi trang (title, description, og:image)
Accessibility: aria-labels, keyboard nav, color contrast WCAG AA
No dark mode — giữ light theme nhất quán



THỨ TỰ THỰC HIỆN

1.  Setup Next.js 14 + TypeScript + Tailwind + shadcn/ui
2.  Custom server.js (Express + Socket.io + Next.js)
3.  SQLite init (lib/db.ts, lib/schema.ts) + tạo data/ dir
4.  NextAuth.js Google Provider (lib/auth.ts, api/auth/[...nextauth])
5.  Root layout: Navbar, SessionProvider, Toaster, page transitions
6.  Home page — hero, floating cards, feature grid, stats bar
7.  API routes: /api/user, /api/groups
8.  GroupSelector modal — fetch groups từ SQLite, assign group
9.  Theory page — nội dung đầy đủ, sidebar scroll-spy, timeline SVG
10. Flashcard page — flip 3D, keyboard nav, progress, localStorage
11. Game Lobby page — chọn Quiz hoặc Tranh Luận
12. Quiz Game — Socket.io events, room, timer, scoring, power-ups
13. Debate Game — assign topics, phases, realtime text, voting
14. Leaderboard — real-time SQLite + Socket.io update
15. Dockerfile + docker-compose.yml + README.md
16. Polish: responsive, loading states, error handling, animations


Mục tiêu: Website đủ mạnh để học sinh thực sự muốn dùng — đẹp, nhanh, không cần tài khoản nào ngoài Google, chạy được trên một máy tính bình thường bằng một lệnh docker compose up.
