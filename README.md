# BallToday Complete

เว็บไซต์ static สำหรับ GitHub Pages เชื่อม API-Football ผ่าน Cloudflare Worker

## ติดตั้ง
1. อัปโหลดทุกไฟล์และโฟลเดอร์ในโปรเจกต์นี้ไปที่ root ของ repository `balltoday`
2. เปิด GitHub Settings > Pages > Deploy from branch > main > /(root)
3. ตรวจสอบไฟล์ `CNAME` เป็น `fb55vip.com`
4. Worker URL ถูกตั้งไว้ใน `assets/js/config.js`

## แก้ข่าวและบทวิเคราะห์
เปิด `assets/js/content.js` แล้วแก้รายการ `analysis` และ `news`

## SEO
มี title, description, keywords, canonical, Open Graph, Schema, robots.txt และ sitemap.xml

## ข้อจำกัดที่ควรรู้
- API-Football Free Plan มี 100 requests/วัน เว็บไซต์ตั้งรีเฟรชทุก 15 นาที
- ข่าวบทความทั่วไปไม่ได้มาจาก API-Football ต้องแก้เองเพื่อหลีกเลี่ยงลิขสิทธิ์
- หน้า admin แบบมีรหัสผ่านไม่สามารถทำอย่างปลอดภัยด้วย GitHub Pages ล้วน ๆ หากต้องการ CMS ควรต่อ Cloudflare Access + CMS หรือระบบหลังบ้านภายหลัง
- คีย์ API ที่เคยเปิดเผยควรถูก Reset และเก็บเป็น Cloudflare Secret เท่านั้น
