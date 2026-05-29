# ViePOS — Hệ thống Quản lý F&B

> **Kiến trúc mới:** React (Vite) + Spring Boot + Supabase (PostgreSQL)

---

## Cấu trúc thư mục

```
ViePOS-F-B-Management-system/
├── frontend/          ← React + Vite (Giao diện người dùng)
├── backend/           ← Spring Boot (Xử lý nghiệp vụ & API)
├── legacy_backup/     ← Code Next.js cũ (lưu để tham khảo)
└── README.md
```

---

## Yêu cầu cài đặt

| Phần mềm | Phiên bản | Tải về |
|----------|-----------|--------|
| Node.js  | 18+       | [nodejs.org](https://nodejs.org) |
| pnpm     | 8+        | `npm install -g pnpm` |
| Java JDK | 17+       | [adoptium.net](https://adoptium.net) |
| Maven    | (có sẵn trong backend) | — |

---

## 🚀 Cách chạy dự án

### Bước 1: Cấu hình Database (Supabase)

1. Vào dự án Supabase của bạn → **Settings → Database → Connection string → JDBC** (Chọn chế độ **Pooler**, port `6543` để hỗ trợ mạng IPv4 như Render/Local).
2. Tạo file `backend/src/main/resources/application-local.yml` (không commit file này):
   ```yaml
   spring:
     datasource:
       url: YOUR_LOCAL_OR_SUPABASE_JDBC_URL
       username: YOUR_DATABASE_USERNAME
       password: YOUR_DATABASE_PASSWORD
   jwt:
     secret: YOUR_JWT_SECRET_MIN_32_CHARS
   ```

   `application-local.yml` đã được ignore. Không commit database password, JWT secret, hoặc bootstrap admin credential.

### Bước 2: Chạy Backend (Spring Boot)

Mở Terminal tại thư mục gốc, chạy lần lượt:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

> Backend sẽ chạy tại: **http://localhost:8080**

*(Lần đầu chạy sẽ tải dependencies về, mất 1-2 phút)*

### Bước 3: Chạy Frontend (React)

Mở **Terminal mới** (để backend vẫn chạy), rồi chạy:

```bash
cd frontend
pnpm dev
```

> Frontend sẽ chạy tại: **http://localhost:5173**

---

## Các lệnh thường dùng

```bash
# --- Frontend ---
cd frontend
pnpm dev          # Chạy môi trường phát triển
pnpm build        # Build để deploy (tạo thư mục dist/)
pnpm preview      # Xem trước bản build

# --- Backend ---
cd backend
./mvnw spring-boot:run   # Chạy server
./mvnw package           # Build file .jar để deploy
```

---

## 🌐 Dự án chạy chính thức (Production)

- **Frontend (Vercel)**: `https://vie-pos-f-b-management-system.vercel.app` (hoặc domain Vercel bạn đã gán)
- **Frontend cũ (Firebase, tùy chọn)**: [https://molten-gasket-434712-c8.web.app](https://molten-gasket-434712-c8.web.app)
- **Backend (Render)**: `https://viepos-f-b-management-system.onrender.com`

### Giữ production ổn định (3 việc — không đổi stack)

| Việc | Mục đích | Trạng thái trong repo |
|------|----------|------------------------|
| **Fix 1** — `GET /api/ping` mỗi **14 phút** (cron-job.org) | Render free tier không sleep → API không chậm 30–60s | `PingController` + `SecurityConfig` permit `/api/ping` |
| **Fix 2** — UptimeRobot monitor URL backend | Email/Telegram khi backend down | Cấu hình trên uptimerobot.com (ngoài code) |
| **Fix 3** — Frontend trên **Vercel** (root = `frontend/`) | Build Vite tự động khi push GitHub | `frontend/vercel.json`, CORS `*.vercel.app` |

**Cron-job.org (Fix 1):** URL = `https://viepos-f-b-management-system.onrender.com/api/ping`, schedule mỗi 14 phút, method GET.

**UptimeRobot (Fix 2):** Monitor `https://viepos-f-b-management-system.onrender.com/api/ping`, keyword `pong` hoặc `ok`.

**Vercel (Fix 3):** Import repo GitHub → Root Directory = `frontend` → Environment `VITE_API_URL` = URL Render backend → Deploy.

---

## 🚀 Quy trình cập nhật & Deploy khi thay đổi Code

### 1. Backend (Spring Boot — Render)
Push lên `main` → Render auto-deploy (Dockerfile).

```bash
git add .
git commit -m "mô tả thay đổi"
git push origin main
```

### 2. Frontend (React + Vite — Vercel)
Push lên `main` → Vercel tự build (thư mục `frontend`).

Đảm bảo trên Vercel có biến:

```bash
VITE_API_URL=https://viepos-f-b-management-system.onrender.com
```

Build local (kiểm tra trước khi push):

```bash
cd frontend
pnpm install
pnpm run build
```

### 3. Firebase (tùy chọn, nếu vẫn dùng song song)

```bash
cd frontend
pnpm run build
firebase deploy --only hosting
```

---

## 🔑 Biến môi trường trên Production

### 1. Frontend (`frontend/.env.production`)
```bash
VITE_API_URL=https://viepos-f-b-management-system.onrender.com
```

### 2. Backend (Render Environment)
Cần cấu hình các biến môi trường sau trong mục **Environment** trên Dashboard Render. Dùng giá trị thật trong dashboard, không ghi vào repo:
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`

Backend sẽ fail startup ở non-local profile nếu thiếu datasource hoặc JWT secret.

Nếu cần bootstrap root admin cho môi trường local/bootstrap, bật tạm bằng env rồi tắt sau khi tạo xong:
- `VIEPOS_BOOTSTRAP_ROOT_ENABLED=true`
- `VIEPOS_BOOTSTRAP_ROOT_EMPLOYEE_ID`
- `VIEPOS_BOOTSTRAP_ROOT_EMAIL`
- `VIEPOS_BOOTSTRAP_ROOT_PASSWORD`
- `VIEPOS_BOOTSTRAP_ROOT_FULL_NAME`
- `VIEPOS_BOOTSTRAP_ROOT_PHONE`
