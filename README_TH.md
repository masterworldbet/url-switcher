# URL Switcher Starter (GitHub Pages + Supabase + Cloudflare Worker)

ระบบนี้เป็น URL switcher แบบโปร่งใส: แต่ละ slug ชี้ไปยังปลายทางที่ผู้ดูแลเลือกไว้ ผู้เข้าชมทุกคนที่ใช้ slug เดียวกันจะถูกส่งไปยังปลายทางเดียวกัน

## ส่วนประกอบ
- GitHub Pages: หน้าแอดมินแบบ static
- Supabase Auth + Postgres: ล็อกอินและเก็บการตั้งค่าลิงก์
- Cloudflare Worker: redirect endpoint ฝั่ง server

## 1) สร้าง Supabase project
1. สร้าง project ที่ https://supabase.com/
2. ไปที่ SQL Editor แล้วรัน `supabase/schema.sql`
3. ใน Project Settings > API คัดลอก Project URL และ `anon/public` key
4. ใน Authentication > Providers ตรวจว่า Email เปิดอยู่
5. ปิด public sign-ups หลังสร้างบัญชีผู้ดูแล หรือใช้ invite-only workflow
6. สร้างบัญชีผู้ดูแลจาก Supabase Dashboard > Authentication > Users (Add user)

ห้ามใส่ `service_role` key ลงในไฟล์หน้าเว็บหรือ GitHub

## 2) ตั้งค่าหน้าแอดมิน
แก้ `admin.js`:
- `SUPABASE_URL` = Project URL
- `SUPABASE_ANON_KEY` = anon/public key

หน้าเว็บใช้ Supabase Auth; ตารางมี RLS และอนุญาตเฉพาะผู้ใช้ที่ล็อกอินอ่าน/เขียนได้ ควรจำกัดบัญชีผู้ดูแลที่สร้างไว้ให้เฉพาะคนที่ได้รับอนุญาต

## 3) ตั้งค่า Cloudflare Worker
1. สร้าง Worker ใน Cloudflare
2. วางโค้ดจาก `worker/src/index.js`
3. ตั้งค่า Worker secrets/variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Secret เท่านั้น)
4. Deploy Worker และจด URL เช่น `https://your-worker.your-subdomain.workers.dev`
5. ตั้งค่า `WORKER_BASE_URL` ใน `admin.js` ให้เป็น URL ของ Worker

Worker รองรับ URL รูปแบบ:
`https://your-worker.../go/slug-name`

หากใช้โดเมนของตัวเอง สามารถตั้ง route เช่น `https://go.example.com/go/*` ให้ชี้ Worker

## 4) GitHub Pages
1. อัปโหลด `index.html`, `admin.html`, `styles.css`, `admin.js` ไปยัง repository
2. Settings > Pages > Deploy from a branch > เลือก branch และ root folder
3. เปิดหน้า `/admin.html` เพื่อเข้าสู่ระบบ

## 5) ใช้งาน
- ล็อกอินหน้าแอดมิน
- เพิ่ม slug เช่น `campaign-a`
- ใส่ URL A และ URL B
- เลือกปลายทางปัจจุบัน แล้วกด Save
- ลิงก์กลางคือ Worker URL `/go/campaign-a`

## ข้อควรระวัง
- GitHub Pages เองไม่สามารถทำ redirect แบบ dynamic จากข้อมูลที่บันทึกในแอดมินได้ ต้องใช้ Worker/backend
- ใช้เฉพาะปลายทางที่คุณควบคุมหรือได้รับอนุญาต
- อย่าใช้ระบบนี้เพื่อแสดงปลายทางต่างกันแก่ผู้ตรวจโฆษณากับผู้ใช้จริง
- URL ที่บันทึกต้องเป็น HTTPS และโดเมนปลายทางที่เชื่อถือได้
