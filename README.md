# BallToday Premium Final

เว็บไซต์ฟุตบอลแบบ Static + PWA เชื่อม API-Football ผ่าน Cloudflare Worker

## ฟีเจอร์
- Live Score
- โปรแกรมบอล
- ตารางคะแนนหลายลีก
- Top Scorers
- เหตุการณ์ใบเหลือง/ใบแดง
- Odds (ขึ้นอยู่กับแพ็กเกจ API)
- Predictions/วิเคราะห์จากข้อมูล API
- ค้นหาทีมและลีก
- PWA
- Responsive / Dark Premium UI
- SEO พื้นฐาน

## อัปโหลดเว็บไซต์
อัปโหลดทุกไฟล์ในโฟลเดอร์นี้ไปที่ root ของ GitHub repository แล้วเปิด GitHub Pages หรือ Cloudflare Pages

## Cloudflare Worker
แทนโค้ด Worker เดิมด้วย `worker/index.js` และคง Secret ชื่อ `API_FOOTBALL_KEY`

## โหมด API
เปิด `assets/js/config.js`
- Free plan: `mode:"free"` รีเฟรชทุก 15 นาที
- Paid plan: เปลี่ยนเป็น `mode:"pro"` รีเฟรชทุก 60 วินาที

การอัปเดตทุก 30–60 วินาทีไม่เหมาะกับ Free Plan 100 requests/วัน แม้ Worker จะมี cache ก็ตาม

## ข้อจำกัด
- Odds และ Predictions อาจไม่พร้อมในแพ็กเกจ/ลีก/ฤดูกาลบางรายการ
- "AI วิเคราะห์" ในชุดนี้ใช้ Predictions และสถิติจาก API ไม่ได้ส่งข้อมูลไปยังโมเดล AI ภายนอก
- หากต้องการ AI จริง ให้ผูก Workers AI แล้วเพิ่ม endpoint แยกภายหลัง
