"use strict";

const CFG = window.BALLTODAY_CONFIG;

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const esc = (value = "") =>
  String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character]
  );

let liveMatches = [];
let deferredPrompt = null;
let currentLeague = CFG.defaultLeague;
let currentDateOffset = 0;
let refreshTimer = null;
let isRefreshing = false;

/*
 * หน่วงเวลาเพื่อลดการยิง API พร้อมกัน
 */
function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );
}

/*
 * เรียก Cloudflare Worker
 */
async function getJSON(path) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    CFG.requestTimeout
  );

  try {
    const response = await fetch(
      `${CFG.apiBaseUrl}${path}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal,
        cache: "no-store"
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          `HTTP ${response.status}`
      );

      error.status = response.status;
      error.retryAfter =
        Number(
          data?.retryAfter ||
            response.headers.get("retry-after")
        ) || 0;

      throw error;
    }

    if (
      data &&
      data.success === false
    ) {
      const error = new Error(
        data.message ||
          "API request failed"
      );

      error.retryAfter =
        Number(data.retryAfter) || 0;

      throw error;
    }

    return data || {};
  } finally {
    clearTimeout(timeout);
  }
}

/*
 * อัปเดตสถานะระบบ
 */
function setStatus(text, ok = true) {
  const statusText = $("#systemStatus");
  const updatedAt = $("#updatedAt");
  const statusDot = $(".status-dot");

  if (statusText) {
    statusText.textContent = text;
  }

  if (updatedAt) {
    updatedAt.textContent =
      `• ${new Date().toLocaleTimeString(
        "th-TH",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )}`;
  }

  if (statusDot) {
    statusDot.style.background = ok
      ? "var(--green)"
      : "var(--red)";
  }
}

/*
 * แสดงข้อความเมื่อ API ติด Rate Limit
 */
function showApiError(
  element,
  error,
  normalMessage
) {
  if (!element) {
    return;
  }

  if (
    error?.status === 429 ||
    error?.retryAfter
  ) {
    const seconds =
      error.retryAfter || 60;

    element.innerHTML = `
      <div class="error">
        API มีคำขอมากเกินไป<br>
        กรุณารอประมาณ ${seconds} วินาที
      </div>
    `;

    return;
  }

  element.innerHTML = `
    <div class="error">
      ${esc(normalMessage)}
    </div>
  `;
}

/*
 * แสดงทีม
 */
function team(match, side) {
  const teamData =
    match.teams?.[side] || {};

  if (side === "away") {
    return `
      <div class="team away">
        <span>
          ${esc(teamData.name || "-")}
        </span>

        <img
          src="${esc(teamData.logo || "")}"
          alt="${esc(teamData.name || "")}"
          loading="lazy"
        >
      </div>
    `;
  }

  return `
    <div class="team">
      <img
        src="${esc(teamData.logo || "")}"
        alt="${esc(teamData.name || "")}"
        loading="lazy"
      >

      <span>
        ${esc(teamData.name || "-")}
      </span>
    </div>
  `;
}

/*
 * การ์ดบอลสด
 */
function matchCard(match) {
  const fixture = match.fixture || {};
  const goals = match.goals || {};
  const league = match.league || {};
  const elapsed =
    fixture.status?.elapsed;

  return `
    <article class="match-card">
      <div class="match-top">
        <span>
          ${esc(league.name || "ฟุตบอล")}
        </span>

        <span class="pill red">
          ${esc(
            fixture.status?.short ||
              "LIVE"
          )}

          ${
            elapsed !== null &&
            elapsed !== undefined
              ? `${elapsed}'`
              : ""
          }
        </span>
      </div>

      <div class="teams-row">
        ${team(match, "home")}

        <div class="score">
          ${goals.home ?? 0}
          -
          ${goals.away ?? 0}
        </div>

        ${team(match, "away")}
      </div>

      <div class="match-footer">
        <span>
          ${esc(
            fixture.venue?.name || ""
          )}
        </span>

        <button
          class="event-btn"
          type="button"
          data-events="${esc(
            fixture.id || ""
          )}"
        >
          รายละเอียด
        </button>
      </div>
    </article>
  `;
}

/*
 * คู่เด่นด้านบน
 */
function heroCard(match) {
  if (!match) {
    return `
      <div class="empty">
        ขณะนี้ยังไม่มีคู่ที่กำลังแข่งขัน
      </div>
    `;
  }

  const goals = match.goals || {};
  const elapsed =
    match.fixture?.status?.elapsed;

  return `
    <div class="teams-row">
      ${team(match, "home")}

      <div class="score">
        ${goals.home ?? 0}
        -
        ${goals.away ?? 0}
      </div>

      ${team(match, "away")}
    </div>

    <div class="match-footer">
      <span>
        ${esc(match.league?.name || "")}
      </span>

      <span>
        ${
          elapsed !== null &&
          elapsed !== undefined
            ? `${elapsed} นาที`
            : esc(
                match.fixture?.status
                  ?.long || ""
              )
        }
      </span>
    </div>
  `;
}

/*
 * โหลดบอลสด
 */
async function loadLive() {
  const liveGrid = $("#liveGrid");
  const heroLive = $("#heroLive");

  try {
    const data = await getJSON(
      "/api/live"
    );

    liveMatches =
      data.response || [];

    renderLive("all");

    if (heroLive) {
      heroLive.innerHTML =
        heroCard(liveMatches[0]);
    }

    setStatus(
      `ออนไลน์ • ${liveMatches.length} คู่กำลังแข่งขัน`
    );
  } catch (error) {
    console.error(
      "loadLive:",
      error
    );

    showApiError(
      liveGrid,
      error,
      "โหลดผลบอลสดไม่สำเร็จ"
    );

    if (heroLive) {
      heroLive.innerHTML = `
        <div class="error">
          ไม่สามารถโหลดบอลสดได้
        </div>
      `;
    }

    setStatus(
      "เชื่อมต่อ API ไม่สำเร็จ",
      false
    );
  }
}

/*
 * กรองบอลสด
 */
function renderLive(mode) {
  const liveGrid = $("#liveGrid");

  if (!liveGrid) {
    return;
  }

  const matches =
    mode === "important"
      ? liveMatches.filter((match) =>
          CFG.importantLeagues.includes(
            match.league?.id
          )
        )
      : liveMatches;

  liveGrid.innerHTML =
    matches.length > 0
      ? matches
          .slice(0, 18)
          .map(matchCard)
          .join("")
      : `
        <div class="empty">
          ขณะนี้ยังไม่มีการแข่งขันสด
        </div>
      `;

  $$("[data-events]").forEach(
    (button) => {
      button.onclick = () =>
        loadMatchDetails(
          button.dataset.events
        );
    }
  );
}

/*
 * วันที่ประเทศไทย
 */
function dateISO(offset = 0) {
  const date = new Date();

  date.setDate(
    date.getDate() + offset
  );

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);
}

/*
 * โหลดโปรแกรมบอล
 */
async function loadFixtures() {
  const fixturesList =
    $("#fixturesList");

  try {
    const date =
      dateISO(currentDateOffset);

    const data = await getJSON(
      `/api/fixtures?date=${date}`
    );

    const fixtures =
      data.response || [];

    fixturesList.innerHTML =
      fixtures.length > 0
        ? fixtures
            .slice(0, 40)
            .map((match) => {
              const fixture =
                match.fixture || {};

              const teams =
                match.teams || {};

              const league =
                match.league || {};

              const time = new Date(
                fixture.date
              ).toLocaleTimeString(
                "th-TH",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone:
                    "Asia/Bangkok"
                }
              );

              return `
                <div class="fixture-row">
                  <span class="fixture-time">
                    ${time}
                  </span>

                  <span>
                    ${esc(
                      teams.home?.name ||
                        "-"
                    )}
                  </span>

                  <b>VS</b>

                  <span class="fixture-team away">
                    ${esc(
                      teams.away?.name ||
                        "-"
                    )}
                  </span>

                  <span class="league-name">
                    ${esc(
                      league.name || ""
                    )}
                  </span>
                </div>
              `;
            })
            .join("")
        : `
          <div class="empty">
            ไม่พบโปรแกรมการแข่งขัน
          </div>
        `;
  } catch (error) {
    console.error(
      "loadFixtures:",
      error
    );

    showApiError(
      fixturesList,
      error,
      "โหลดโปรแกรมบอลไม่สำเร็จ"
    );
  }
}

/*
 * โหลดตารางคะแนน
 */
async function loadStandings() {
  const standingsBody =
    $("#standingsBody");

  try {
    const data = await getJSON(
      `/api/standings?league=${currentLeague}&season=${CFG.season}`
    );

    const standings =
      data.response?.[0]?.league
        ?.standings?.[0] || [];

    standingsBody.innerHTML =
      standings.length > 0
        ? standings
            .map(
              (row) => `
                <tr>
                  <td>
                    ${row.rank}
                  </td>

                  <td>
                    <span class="team-cell">
                      <img
                        src="${esc(
                          row.team
                            ?.logo || ""
                        )}"
                        alt=""
                        loading="lazy"
                      >

                      ${esc(
                        row.team
                          ?.name || ""
                      )}
                    </span>
                  </td>

                  <td>
                    ${row.all?.played ?? 0}
                  </td>

                  <td>
                    ${row.goalsDiff ?? 0}
                  </td>

                  <td>
                    <b>
                      ${row.points ?? 0}
                    </b>
                  </td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="5">
              ไม่มีข้อมูลฤดูกาลนี้
            </td>
          </tr>
        `;
  } catch (error) {
    console.error(
      "loadStandings:",
      error
    );

    standingsBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="error"
        >
          ${
            error?.status === 429
              ? "API มีคำขอมากเกินไป กรุณารอสักครู่"
              : "โหลดตารางคะแนนไม่สำเร็จ"
          }
        </td>
      </tr>
    `;
  }
}

/*
 * โหลดดาวซัลโว
 *
 * Endpoint ที่ถูกต้อง:
 * /api/top-scorers
 */
async function loadScorers() {
  const scorersList =
    $("#scorersList");

  if (!scorersList) {
    return;
  }

  try {
    const data = await getJSON(
      `/api/top-scorers?league=${currentLeague}&season=${CFG.season}`
    );

    const players =
      data.response || [];

    scorersList.innerHTML =
      players.length > 0
        ? players
            .slice(0, 10)
            .map((item, index) => {
              const player =
                item.player || {};

              const statistics =
                item.statistics?.[0] ||
                {};

              return `
                <div class="rank-row">
                  <b>
                    ${index + 1}
                  </b>

                  <img
                    src="${esc(
                      player.photo || ""
                    )}"
                    alt=""
                    loading="lazy"
                  >

                  <span>
                    ${esc(
                      player.name || ""
                    )}

                    <small>
                      ${esc(
                        statistics.team
                          ?.name || ""
                      )}
                    </small>
                  </span>

                  <b>
                    ${
                      statistics.goals
                        ?.total ?? 0
                    }
                  </b>
                </div>
              `;
            })
            .join("")
        : `
          <div class="empty">
            ไม่มีข้อมูลดาวซัลโว
          </div>
        `;
  } catch (error) {
    console.error(
      "loadScorers:",
      error
    );

    showApiError(
      scorersList,
      error,
      "ไม่สามารถโหลดดาวซัลโวได้"
    );
  }
}

/*
 * การ์ดวิเคราะห์
 */
function analysisCard(data) {
  const teams = data.teams || {};
  const league = data.league || {};

  const winner =
    data.predictions?.winner?.name ||
    "ยังไม่ระบุ";

  const percent =
    data.predictions?.percent || {};

  const confidence = Math.max(
    parseInt(percent.home, 10) || 0,
    parseInt(percent.draw, 10) || 0,
    parseInt(percent.away, 10) || 0
  );

  return `
    <article class="analysis-card">
      <span class="pill">
        ${esc(
          league.name || "ฟุตบอล"
        )}
      </span>

      <h3>
        ${esc(
          teams.home?.name || "-"
        )}

        พบ

        ${esc(
          teams.away?.name || "-"
        )}
      </h3>

      <p>
        ${esc(
          data.predictions?.advice ||
            "วิเคราะห์จากฟอร์มและสถิติของทีม"
        )}
      </p>

      <div class="confidence">
        <span>
          แนวโน้ม:
          ${esc(winner)}
        </span>

        <b>
          ${confidence || "-"}%
        </b>
      </div>
    </article>
  `;
}

/*
 * โหลดบทวิเคราะห์
 *
 * จำกัดเพียง 1 คู่ก่อน
 * เพื่อลด Rate Limit
 */
async function loadAnalysis() {
  const analysisGrid =
    $("#analysisGrid");

  if (!analysisGrid) {
    return;
  }

  try {
    const fixturesData =
      await getJSON(
        `/api/fixtures?date=${dateISO(
          0
        )}`
      );

    const fixture =
      (fixturesData.response || [])[0];

    if (!fixture?.fixture?.id) {
      analysisGrid.innerHTML = `
        <div class="empty">
          ยังไม่มีข้อมูลวิเคราะห์สำหรับวันนี้
        </div>
      `;

      return;
    }

    /*
     * หน่วงก่อนเรียก Predictions
     */
    await sleep(1200);

    const predictionData =
      await getJSON(
        `/api/predictions?fixture=${fixture.fixture.id}`
      );

    const prediction =
      predictionData.response?.[0];

    analysisGrid.innerHTML =
      prediction
        ? analysisCard(prediction)
        : `
          <div class="empty">
            ยังไม่มีบทวิเคราะห์สำหรับคู่นี้
          </div>
        `;
  } catch (error) {
    console.error(
      "loadAnalysis:",
      error
    );

    showApiError(
      analysisGrid,
      error,
      "โหลดบทวิเคราะห์ไม่สำเร็จ"
    );
  }
}

/*
 * โหลดรายละเอียดการแข่งขัน
 *
 * ใช้ /api/match
 * แทน /api/events ที่ไม่มีใน Worker
 */
async function loadMatchDetails(id) {
  const eventsList =
    $("#eventsList");

  if (!eventsList || !id) {
    return;
  }

  eventsList.innerHTML = `
    <div class="skeleton"></div>
  `;

  try {
    const data = await getJSON(
      `/api/match?id=${encodeURIComponent(
        id
      )}`
    );

    const match =
      data.response?.[0];

    const events =
      match?.events || [];

    eventsList.innerHTML =
      events.length > 0
        ? events
            .map((event) => {
              let icon = "•";

              if (
                event.type === "Card"
              ) {
                icon = event.detail
                  ?.toLowerCase()
                  .includes("red")
                  ? "🟥"
                  : "🟨";
              }

              if (
                event.type === "Goal"
              ) {
                icon = "⚽";
              }

              return `
                <div class="event-row">
                  <span>
                    ${
                      event.time
                        ?.elapsed ?? "-"
                    }'
                  </span>

                  <span>
                    <span class="event-icon">
                      ${icon}
                    </span>

                    ${esc(
                      event.player
                        ?.name ||
                        event.team
                          ?.name ||
                        ""
                    )}
                  </span>

                  <b>
                    ${esc(
                      event.detail ||
                        event.type ||
                        ""
                    )}
                  </b>
                </div>
              `;
            })
            .join("")
        : `
          <div class="empty">
            ยังไม่มีข้อมูลเหตุการณ์
          </div>
        `;

    /*
     * หน่วงก่อนโหลดราคาบอล
     */
    await sleep(1000);

    loadOdds(id);
  } catch (error) {
    console.error(
      "loadMatchDetails:",
      error
    );

    showApiError(
      eventsList,
      error,
      "โหลดรายละเอียดการแข่งขันไม่สำเร็จ"
    );
  }
}

/*
 * โหลดราคาบอล
 */
async function loadOdds(id) {
  const oddsList = $("#oddsList");

  if (!oddsList || !id) {
    return;
  }

  oddsList.innerHTML = `
    <div class="skeleton"></div>
  `;

  try {
    const data = await getJSON(
      `/api/odds?fixture=${encodeURIComponent(
        id
      )}`
    );

    const bets =
      data.response?.[0]
        ?.bookmakers?.[0]?.bets ||
      [];

    oddsList.innerHTML =
      bets.length > 0
        ? bets
            .slice(0, 5)
            .map(
              (bet) => `
                <div class="odds-row">
                  <b>
                    ${esc(
                      bet.name ||
                        "ตลาด"
                    )}
                  </b>

                  <span>
                    ${(bet.values || [])
                      .slice(0, 3)
                      .map(
                        (value) =>
                          `${esc(
                            value.value
                          )} ${esc(
                            value.odd
                          )}`
                      )
                      .join(" • ")}
                  </span>
                </div>
              `
            )
            .join("")
        : `
          <div class="empty">
            ไม่มีราคาบอลสำหรับคู่นี้
          </div>
        `;
  } catch (error) {
    console.error(
      "loadOdds:",
      error
    );

    showApiError(
      oddsList,
      error,
      "ไม่สามารถโหลดราคาบอลได้"
    );
  }
}

/*
 * ค้นหาทีมและลีก
 *
 * Endpoint ที่ถูกต้อง:
 * /api/teams?search=
 * /api/leagues?search=
 */
async function searchAll(query) {
  const section =
    $("#searchResultsSection");

  const searchResults =
    $("#searchResults");

  if (!section || !searchResults) {
    return;
  }

  section.hidden = false;

  section.scrollIntoView({
    behavior: "smooth"
  });

  searchResults.innerHTML = `
    <div class="skeleton"></div>
  `;

  try {
    const teams = await getJSON(
      `/api/teams?search=${encodeURIComponent(
        query
      )}`
    );

    /*
     * หน่วงก่อนค้นหาลีก
     */
    await sleep(800);

    const leagues = await getJSON(
      `/api/leagues?search=${encodeURIComponent(
        query
      )}`
    );

    const items = [];

    (teams.response || []).forEach(
      (item) => {
        items.push(`
          <article class="search-item">
            <img
              src="${esc(
                item.team?.logo || ""
              )}"
              alt=""
              loading="lazy"
            >

            <h3>
              ${esc(
                item.team?.name || ""
              )}
            </h3>

            <p>
              ${esc(
                item.team?.country ||
                  ""
              )}
            </p>
          </article>
        `);
      }
    );

    (leagues.response || []).forEach(
      (item) => {
        items.push(`
          <article class="search-item">
            <img
              src="${esc(
                item.league?.logo ||
                  ""
              )}"
              alt=""
              loading="lazy"
            >

            <h3>
              ${esc(
                item.league?.name ||
                  ""
              )}
            </h3>

            <p>
              ${esc(
                item.country?.name ||
                  ""
              )}
            </p>
          </article>
        `);
      }
    );

    searchResults.innerHTML =
      items.length > 0
        ? items.join("")
        : `
          <div class="empty">
            ไม่พบผลการค้นหา
          </div>
        `;
  } catch (error) {
    console.error(
      "searchAll:",
      error
    );

    showApiError(
      searchResults,
      error,
      "ค้นหาไม่สำเร็จ"
    );
  }
}

/*
 * ผูกปุ่มต่าง ๆ
 */
function bind() {
  const menuButton = $("#menuBtn");
  const navigation = $("#mainNav");

  if (menuButton && navigation) {
    menuButton.onclick = () => {
      const open =
        navigation.classList.toggle(
          "open"
        );

      menuButton.setAttribute(
        "aria-expanded",
        String(open)
      );
    };
  }

  $$("[data-live-filter]").forEach(
    (button) => {
      button.onclick = () => {
        $$(
          "[data-live-filter]"
        ).forEach((item) =>
          item.classList.remove(
            "active"
          )
        );

        button.classList.add(
          "active"
        );

        renderLive(
          button.dataset.liveFilter
        );
      };
    }
  );

  $$("[data-day]").forEach(
    (button) => {
      button.onclick = async () => {
        $$("[data-day]").forEach(
          (item) =>
            item.classList.remove(
              "active"
            )
        );

        button.classList.add(
          "active"
        );

        currentDateOffset = Number(
          button.dataset.day
        );

        await loadFixtures();
      };
    }
  );

  const leagueSelect =
    $("#leagueSelect");

  if (leagueSelect) {
    leagueSelect.onchange =
      async (event) => {
        currentLeague = Number(
          event.target.value
        );

        await loadStandings();
        await sleep(1000);
        await loadScorers();
      };
  }

  const searchForm =
    $("#searchForm");

  if (searchForm) {
    searchForm.onsubmit =
      (event) => {
        event.preventDefault();

        const query =
          $("#searchInput")
            ?.value.trim() || "";

        if (query.length >= 3) {
          searchAll(query);
        }
      };
  }

  const closeSearch =
    $("#closeSearch");

  if (closeSearch) {
    closeSearch.onclick = () => {
      const section =
        $("#searchResultsSection");

      if (section) {
        section.hidden = true;
      }
    };
  }

  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();

      deferredPrompt = event;

      const installButton =
        $("#installBtn");

      if (installButton) {
        installButton.hidden = false;
      }
    }
  );

  const installButton =
    $("#installBtn");

  if (installButton) {
    installButton.onclick =
      async () => {
        if (!deferredPrompt) {
          return;
        }

        deferredPrompt.prompt();

        await deferredPrompt.userChoice;

        deferredPrompt = null;
        installButton.hidden = true;
      };
  }
}

/*
 * โหลดข้อมูลเริ่มต้นแบบเรียงลำดับ
 * ไม่ยิง API 8–9 คำขอพร้อมกัน
 */
async function initialLoad() {
  await loadLive();

  await sleep(1000);

  await loadFixtures();

  await sleep(1000);

  await loadStandings();

  await sleep(1000);

  await loadScorers();

  /*
   * หน่วงก่อนโหลด Predictions
   */
  await sleep(1500);

  await loadAnalysis();
}

/*
 * รีเฟรชเฉพาะบอลสดและโปรแกรม
 * แบบเรียงลำดับ
 */
async function refreshMainData() {
  if (isRefreshing) {
    return;
  }

  isRefreshing = true;

  try {
    await loadLive();

    await sleep(1500);

    await loadFixtures();
  } finally {
    isRefreshing = false;
  }
}

/*
 * เริ่มระบบ
 */
async function init() {
  bind();

  /*
   * ล้าง Service Worker เก่าที่อาจ Cache app.js เดิม
   */
  if (
    "serviceWorker" in navigator
  ) {
    try {
      await navigator.serviceWorker.register(
        "/service-worker.js"
      );
    } catch (error) {
      console.warn(
        "Service Worker:",
        error
      );
    }
  }

  await initialLoad();

  const refreshMilliseconds =
    CFG.refresh?.[CFG.mode] ||
    CFG.refresh?.free ||
    120000;

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(
    refreshMainData,
    refreshMilliseconds
  );
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
