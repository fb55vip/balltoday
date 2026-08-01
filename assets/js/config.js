"use strict";

window.BALLTODAY_CONFIG = Object.freeze({
  /*
   * Cloudflare Worker URL
   * ห้ามใส่ API Key ในไฟล์นี้
   */
  apiBaseUrl: "https://balltoday-api.noppdsoma.workers.dev",

  /*
   * โหมดระบบ
   */
  mode: "production",

  /*
   * เขตเวลา
   */
  timezone: "Asia/Bangkok",
  locale: "th-TH",

  /*
   * ฤดูกาลเริ่มต้น
   * พรีเมียร์ลีกฤดูกาล 2025/26 ใช้ค่า 2025
   */
  season: 2025,

  /*
   * ลีกเริ่มต้น
   * 39 = Premier League
   */
  defaultLeague: 39,

  /*
   * ลีกสำคัญสำหรับตัวกรอง
   */
  importantLeagues: Object.freeze([
    39,   // Premier League
    140,  // La Liga
    135,  // Serie A
    78,   // Bundesliga
    61,   // Ligue 1
    2,    // UEFA Champions League
    3,    // UEFA Europa League
    848   // UEFA Conference League
  ]),

  /*
   * รายการลีกในตัวเลือกตารางคะแนน
   */
  leagues: Object.freeze([
    {
      id: 39,
      name: "พรีเมียร์ลีก",
      country: "อังกฤษ"
    },
    {
      id: 140,
      name: "ลาลีกา",
      country: "สเปน"
    },
    {
      id: 135,
      name: "เซเรียอา",
      country: "อิตาลี"
    },
    {
      id: 78,
      name: "บุนเดสลีกา",
      country: "เยอรมนี"
    },
    {
      id: 61,
      name: "ลีกเอิง",
      country: "ฝรั่งเศส"
    },
    {
      id: 2,
      name: "ยูฟ่า แชมเปียนส์ลีก",
      country: "ยุโรป"
    },
    {
      id: 3,
      name: "ยูฟ่า ยูโรปาลีก",
      country: "ยุโรป"
    },
    {
      id: 848,
      name: "ยูฟ่า คอนเฟอเรนซ์ลีก",
      country: "ยุโรป"
    }
  ]),

  /*
   * ระยะเวลารอ API ก่อนยกเลิกคำขอ
   */
  requestTimeout: 20000,

  /*
   * ระยะเวลาอัปเดตหน้าเว็บ
   * หน่วยเป็นมิลลิวินาที
   */
  refresh: Object.freeze({
    live: 30000,          // ผลบอลสดทุก 30 วินาที
    fixtures: 180000,     // โปรแกรมบอลทุก 3 นาที
    standings: 900000,    // ตารางคะแนนทุก 15 นาที
    matchCenter: 30000,   // รายละเอียดคู่แข่งขันทุก 30 วินาที
    predictions: 1800000  // บทวิเคราะห์ Cache 30 นาที
  }),

  /*
   * จำนวนข้อมูลสูงสุดที่แสดง
   */
  limits: Object.freeze({
    heroLive: 4,
    liveMatches: 24,
    fixtures: 40,
    standings: 20,
    analysis: 6,
    events: 50,
    players: 30
  }),

  /*
   * Endpoint ของ Cloudflare Worker
   */
  endpoints: Object.freeze({
    health: "/api/health",
    live: "/api/live",
    fixtures: "/api/fixtures",
    standings: "/api/standings",
    match: "/api/match",
    events: "/api/events",
    statistics: "/api/statistics",
    lineups: "/api/lineups",
    players: "/api/players",
    predictions: "/api/predictions",
    topScorers: "/api/top-scorers",
    teams: "/api/teams",
    leagues: "/api/leagues",
    odds: "/api/odds"
  }),

  /*
   * การแสดงเหตุการณ์ใน Match Center
   * ซ่อนใบเหลืองและใบแดงตามที่กำหนด
   */
  matchEvents: Object.freeze({
    showGoals: true,
    showVar: true,
    showSubstitutions: true,
    showCards: false
  }),

  /*
   * สถิติที่ต้องการแสดง
   */
  statistics: Object.freeze([
    "Ball Possession",
    "Total Shots",
    "Shots on Goal",
    "Shots off Goal",
    "Blocked Shots",
    "Corner Kicks",
    "Offsides",
    "Fouls",
    "Goalkeeper Saves",
    "Total passes",
    "Passes accurate"
  ]),

  /*
   * PWA
   */
  pwa: Object.freeze({
    enabled: true,
    serviceWorkerPath: "/service-worker.js"
  }),

  /*
   * Cache ชื่อสำหรับ Local Storage
   */
  storage: Object.freeze({
    prefix: "balltoday_",
    selectedLeague: "balltoday_selected_league",
    lastUpdate: "balltoday_last_update"
  }),

  /*
   * ข้อมูลเว็บไซต์
   */
  site: Object.freeze({
    name: "BallToday",
    domain: "https://fb55vip.com",
    tagline: "ฟุตบอลอัปเดตอัตโนมัติ ครบจบในที่เดียว",
    footerName: "บอส สิทธิกร"
  }),

  /*
   * เปิด Console log เฉพาะตอนพัฒนา
   */
  debug: false
});
