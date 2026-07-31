window.BALLTODAY_CONFIG = {
  // URL ของ Cloudflare Worker
  apiBaseUrl: "https://balltoday-api.noppdsoma.workers.dev",

  // โหมดใช้งาน
  mode: "pro",

  // ระยะเวลารีเฟรชข้อมูล (มิลลิวินาที)
  refresh: {
    free: 900000,   // 15 นาที
    pro: 120000     // 2 นาที
  },

  // Timeout การเรียก API
  requestTimeout: 20000,

  // ฤดูกาล
  season: 2025,

  // ลีกเริ่มต้น (Premier League)
  defaultLeague: 39,

  // ลีกสำคัญ
  importantLeagues: [
    39,   // Premier League
    140,  // La Liga
    78,   // Bundesliga
    135,  // Serie A
    61,   // Ligue 1
    2,    // Champions League
    3,    // Europa League
    848   // Thai League
  ]
};
