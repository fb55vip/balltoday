"use strict";
window.BALLTODAY_CONFIG = Object.freeze({
  apiBaseUrl: "https://balltoday-api.noppdsoma.workers.dev",
  mode: "production",
  timezone: "Asia/Bangkok",
  locale: "th-TH",
  season: 2025,
  defaultLeague: 39,
  importantLeagues: Object.freeze([39,140,135,78,61,2,3,848]),
  leagues: Object.freeze([
    {id:39,name:"พรีเมียร์ลีก",country:"อังกฤษ"},
    {id:140,name:"ลาลีกา",country:"สเปน"},
    {id:135,name:"เซเรียอา",country:"อิตาลี"},
    {id:78,name:"บุนเดสลีกา",country:"เยอรมนี"},
    {id:61,name:"ลีกเอิง",country:"ฝรั่งเศส"},
    {id:2,name:"ยูฟ่า แชมเปียนส์ลีก",country:"ยุโรป"},
    {id:3,name:"ยูฟ่า ยูโรปาลีก",country:"ยุโรป"},
    {id:848,name:"ยูฟ่า คอนเฟอเรนซ์ลีก",country:"ยุโรป"}
  ]),
  requestTimeout: 20000,
  refresh: Object.freeze({live:30000,fixtures:180000,standings:900000,matchCenter:30000,predictions:1800000}),
  limits: Object.freeze({heroLive:4,liveMatches:24,fixtures:40,standings:20,analysis:12,events:50,players:30}),
  endpoints: Object.freeze({
    health:"/api/health",live:"/api/live",fixtures:"/api/fixtures",standings:"/api/standings",
    match:"/api/match",events:"/api/events",statistics:"/api/statistics",lineups:"/api/lineups",
    players:"/api/players",predictions:"/api/predictions",topScorers:"/api/top-scorers",
    teams:"/api/teams",leagues:"/api/leagues",odds:"/api/odds"
  }),
  matchEvents: Object.freeze({showGoals:true,showVar:true,showSubstitutions:true,showCards:false}),
  statistics: Object.freeze(["Ball Possession","Total Shots","Shots on Goal","Shots off Goal","Blocked Shots","Corner Kicks","Offsides","Fouls","Goalkeeper Saves","Total passes","Passes accurate"]),
  pwa: Object.freeze({enabled:true,serviceWorkerPath:"/service-worker.js"}),
  storage: Object.freeze({prefix:"hnfootballscore_",selectedLeague:"hnfootballscore_selected_league",lastUpdate:"hnfootballscore_last_update"}),
  site: Object.freeze({name:"HN FOOTBALL SCORE",domain:"https://www.fb55vip.com",tagline:"ฟุตบอลอัปเดตอัตโนมัติ ครบจบในที่เดียว",footerName:"บอส สิทธิกร"}),
  debug:false
});
