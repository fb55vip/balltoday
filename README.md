HN FOOTBALL SCORE FINAL V15

วางทับ GitHub 4 ไฟล์:
1. index.html
2. assets/css/app.css
3. assets/js/app.js
4. service-worker.js

ผลลัพธ์:
- บทวิเคราะห์เป็น Section เต็มแถว แสดงเฉพาะ content_type=analysis
- FOOTBALL NEWS / ข่าวฟุตบอล เป็น Section เต็มแถวแยกถัดลงมา แสดงเฉพาะ content_type=news
- Popup ทีเด็ดวันนี้ดึงจาก Content API และเริ่มโหลดทันทีเมื่อเข้าเว็บ
- Popup เปิด/ปิด รูป ลิงก์ เวลา และ once-per-session ควบคุมจาก Admin
- เปลี่ยน cache version เป็น V15 เพื่อไม่ติดไฟล์ JS/CSS เก่า

Worker V14 ที่ Deploy แล้วใช้ต่อได้ ไม่ต้องแก้อีก
README.md เดิมไม่ต้องเปลี่ยน
