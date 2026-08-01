[README.md](https://github.com/user-attachments/files/30614150/README.md)
# BallToday Premium Production

เว็บฟุตบอลสำหรับ GitHub Pages เชื่อม API-Football ผ่าน Cloudflare Worker

## ติดตั้งเว็บไซต์
1. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ไปยัง repository `balltoday`
2. GitHub Settings > Pages > Deploy from branch > main > /(root)
3. ตรวจ CNAME ให้เป็น `fb55vip.com`

## ติดตั้ง Worker
1. Cloudflare Workers & Pages > balltoday-api > Edit code
2. วาง `worker/index.js` แล้ว Deploy
3. Settings > Variables and Secrets > เพิ่ม Secret ชื่อ `API_FOOTBALL_KEY`
4. วาง API Key ของ API-Football

## ทดสอบ
- https://balltoday-api.noppdsoma.workers.dev/api/health
- https://balltoday-api.noppdsoma.workers.dev/api/live

## หมายเหตุ
- ข่าวในหน้าแรกสร้างจากข้อมูลโปรแกรมแข่งขันจริง ไม่ได้ปลอมบทความข่าว
- เหตุการณ์ใน Match Center ซ่อน Card ตามคำขอ แต่แสดงประตู VAR และเปลี่ยนตัว
- Coverage ของสถิติ รายชื่อ และผู้เล่นขึ้นอยู่กับลีกและแมตช์ของ API-Football
