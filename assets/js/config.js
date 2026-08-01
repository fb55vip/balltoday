<!-- เพิ่มโค้นี้ในส่วน HTML ของ Blogger Template -->

<!-- เริ่มต้น CSS -->
<style>
  /* Reset และ Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
  }

  /* Header */
  .site-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .site-title {
    font-size: 1.8rem;
    font-weight: bold;
  }

  .site-title a {
    color: white;
    text-decoration: none;
  }

  /* Navigation */
  .main-nav ul {
    list-style: none;
    display: flex;
    gap: 2rem;
  }

  .main-nav a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    transition: opacity 0.3s;
  }

  .main-nav a:hover {
    opacity: 0.8;
  }

  /* Main Content */
  .content-wrapper {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 20px;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
  }

  /* Blog Posts */
  .blog-posts {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  }

  .post {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #eee;
  }

  .post:last-child {
    border-bottom: none;
  }

  .post-title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .post-title a {
    color: #333;
    text-decoration: none;
  }

  .post-title a:hover {
    color: #667eea;
  }

  .post-meta {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .post-excerpt {
    color: #555;
  }

  /* Sidebar */
  .sidebar {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  }

  .widget {
    margin-bottom: 2rem;
  }

  .widget-title {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: #333;
    border-bottom: 2px solid #667eea;
    padding-bottom: 0.5rem;
  }

  /* Footer */
  .site-footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 2rem 0;
    margin-top: 2rem;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .content-wrapper {
      grid-template-columns: 1fr;
    }

    .header-container {
      flex-direction: column;
      gap: 1rem;
    }

    .main-nav ul {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>
<!-- จบ CSS -->

<!-- เริ่มต้น HTML Structure -->
<header class="site-header">
  <div class="header-container">
    <h1 class="site-title">
      <a href="/">ชื่อบล็อกของคุณ</a>
    </h1>
    <nav class="main-nav">
      <ul>
        <li><a href="/">หน้าแรก</a></li>
        <li><a href="/p/about.html">เกี่ยวกับ</a></li>
        <li><a href="/p/contact.html">ติดต่อ</a></li>
      </ul>
    </nav>
  </div>
</header>

<div class="content-wrapper">
  <main class="blog-posts">
    <!-- โพสต์บล็อกจะถูกแทรกที่นี่โดย Blogger -->
    <article class="post">
      <h2 class="post-title">
        <a href="#">หัวข้อโพสต์</a>
      </h2>
      <div class="post-meta">
        <span>โพสต์เมื่อ: วันที่</span> | 
        <span>โดย: ผู้เขียน</span>
      </div>
      <div class="post-excerpt">
        <p>เนื้อหาย่อของโพสต์จะปรากฏที่นี่...</p>
      </div>
    </article>
  </main>

  <aside class="sidebar">
    <div class="widget">
      <h3 class="widget-title">เกี่ยวกับ</h3>
      <p>ข้อมูลเกี่ยวกับบล็อกของคุณ</p>
    </div>
    
    <div class="widget">
      <h3 class="widget-title">โพสต์ล่าสุด</h3>
      <ul>
        <li><a href="#">โพสต์ที่ 1</a></li>
        <li><a href="#">โพสต์ที่ 2</a></li>
        <li><a href="#">โพสต์ที่ 3</a></li>
      </ul>
    </div>
  </aside>
</div>

<footer class="site-footer">
  <p>© 2024 ชื่อบล็อกของคุณ. สงวนลิขสิทธิ์.</p>
</footer>
<!-- จบ HTML Structure -->
