HN FOOTBALL SCORE Final

แบรนด์หน้าเว็บเปลี่ยนจาก BallToday เป็น HN FOOTBALL SCORE แล้ว โดยคง BY บอส สิทธิกร และระบบเดิมทั้งหมด

อัปโหลดทับ GitHub repository เดิม:
- index.html
- admin.html
- assets/css/admin.css
- assets/js/admin.js
- assets/js/app.js

Cloudflare Worker:
- นำ worker/index.js ไปแทนโค้ดของ balltoday-content-api แล้ว Deploy
- Binding D1 ต้องชื่อ DB และชี้ไป balltoday-content
- Secrets เดิม ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET ใช้ต่อได้

หมายเหตุ:
- ชื่อภายในทางเทคนิค เช่น BALLTODAY_CONFIG, balltoday-content-api และ session key เดิม ถูกเก็บไว้เพื่อไม่ให้ระบบเสีย
- หน้าเว็บและหน้า CMS แสดงชื่อ HN FOOTBALL SCORE พร้อม BY บอส สิทธิกร
