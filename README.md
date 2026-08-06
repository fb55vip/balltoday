HN FOOTBALL SCORE V10 Final

อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ทับ GitHub repository balltoday ที่ branch main /(root)

ไฟล์ Cloudflare Worker:
- worker/index.js ให้วางทับ Worker balltoday-content-api แล้ว Deploy
- worker/schema.sql ใช้เฉพาะกรณียังไม่มีตาราง articles; ถ้ามีตารางแล้วไม่ต้องรันซ้ำ

Worker bindings/secrets ที่ต้องมี:
- D1 Binding: DB -> balltoday-content
- ADMIN_USERNAME (Secret)
- ADMIN_PASSWORD (Secret)
- SESSION_SECRET (Secret)

URL:
- หน้าเว็บ: https://fb55vip.com/
- แอดมิน: https://fb55vip.com/admin.html
- Content API: https://balltoday-content-api.noppdsoma.workers.dev/

หลังอัปโหลด:
1. รอ GitHub Pages Deploy เป็นสีเขียว
2. ล้าง cache เว็บไซต์หรือเปิด ?v=20260806-v10
3. ตรวจหน้าแอดมินและสร้างบทความโดยเลือกเผยแพร่
4. บทความจะแสดงในส่วนบทวิเคราะห์หน้าแรก
