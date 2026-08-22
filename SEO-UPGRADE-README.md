# HN FOOTBALL SCORE — SEO Upgrade 2026-08-22

ชุดนี้คงหน้าตาเว็บเดิมและเพิ่มระบบ SEO สำหรับข่าวฟุตบอล บทวิเคราะห์ และความรู้ฟุตบอล

## สิ่งที่เพิ่ม/แก้
- Dynamic Sitemap ที่ `/sitemap.xml` ผ่าน Cloudflare Pages Functions พร้อม fallback `sitemap.xml` แบบ static
- บังคับ canonical host เป็น `https://www.fb55vip.com` และ redirect non-www 301
- redirect URL เดิม `/article.html?slug=` ไป `/article?slug=`
- Server-rendered article page ที่ `/article?slug=` พร้อม Title, Description, Canonical, Open Graph, Article/NewsArticle Schema, Breadcrumb และ related content
- หน้า hub `/analysis`, `/news`, `/knowledge`
- หมวด Evergreen ใน Admin และ Content API
- บันทึก SEO fields จาก Admin ลง D1 จริง
- บทความ Evergreen เริ่มต้น 8 หน้า
- `about.html` และข้อมูลผู้เขียน
- robots.txt ใช้ canonical domain เดียว

## สำคัญก่อน Deploy
1. สำรอง deployment เดิมไว้
2. อัปโหลด/commit ไฟล์ทั้งหมดของชุดนี้เข้า branch `main` ของ Pages project `balltoday`
3. ต้อง deploy `worker/index.js` ไปยัง Worker `balltoday-content-api` ด้วย เพราะมีการเพิ่มคอลัมน์ SEO, content_type=evergreen และ sitemap data
4. หลัง deploy เปิดตรวจ:
   - https://www.fb55vip.com/
   - https://www.fb55vip.com/sitemap.xml
   - https://www.fb55vip.com/news
   - https://www.fb55vip.com/analysis
   - https://www.fb55vip.com/knowledge
   - URL บทความเดิมแบบ `/article?slug=...`
5. ใน Google Search Console ส่ง `https://www.fb55vip.com/sitemap.xml` แล้วตรวจ URL บทความ 1 ข่าว + 1 บทวิเคราะห์

## หมายเหตุ
SEO ไม่มีระบบใดรับประกันอันดับ Google หรือทราฟฟิกได้ ชุดนี้แก้โครงสร้างให้ Google ค้นพบ เข้าใจ และรวบรวมเนื้อหาได้ดีขึ้น ส่วนอันดับจริงยังขึ้นกับคุณภาพเนื้อหา ความเกี่ยวข้อง การแข่งขัน และเวลา
