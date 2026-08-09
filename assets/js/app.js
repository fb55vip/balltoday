"use strict";

const CFG = window.BALLTODAY_CONFIG;

if (!CFG) {
  throw new Error("BALLTODAY_CONFIG is not loaded");
}

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const state = {
  liveMatches: [],
  currentDateOffset: 0,
  currentLeague: CFG.defaultLeague,
  installPrompt: null,
  liveFilter: "all",
  matchFixtureId: null,
  matchRefreshTimer: null,
  timers: [],
  loading: {
    live: false,
    fixtures: false,
    standings: false,
    match: false
  }
};

/* =========================================================
   UTILITIES
========================================================= */

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
  );
}

function sleep(milliseconds) {
  return new Promise(resolve =>
    setTimeout(resolve, milliseconds)
  );
}

function formatNumber(value, fallback = "0") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

function getBangkokDate(offset = 0) {
  const date = new Date();

  date.setDate(
    date.getDate() + offset
  );

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: CFG.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);
}

function formatBangkokTime(value) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString(
    CFG.locale,
    {
      timeZone: CFG.timezone,
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function formatBangkokDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    CFG.locale,
    {
      timeZone: CFG.timezone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(min, number)
  );
}

function parseStatNumber(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const cleanValue = String(value)
    .replace("%", "")
    .replace(",", "")
    .trim();

  const number = Number(cleanValue);

  return Number.isFinite(number)
    ? number
    : 0;
}

function buildUrl(path, params = {}) {
  const url = new URL(
    `${CFG.apiBaseUrl}${path}`
  );

  for (
    const [key, value]
    of Object.entries(params)
  ) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(
        key,
        String(value)
      );
    }
  }

  return url.toString();
}

async function getJSON(
  path,
  params = {},
  options = {}
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    options.timeout ||
      CFG.requestTimeout
  );

  try {
    const response = await fetch(
      buildUrl(path, params),
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal,
        cache: "default"
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          `HTTP ${response.status}`
      );

      error.status =
        response.status;

      error.detail =
        data?.detail || "";

      error.retryAfter =
        Number(
          data?.retryAfter ||
            response.headers.get(
              "retry-after"
            ) ||
            0
        );

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

      error.status =
        response.status;

      error.detail =
        data.detail || "";

      error.retryAfter =
        Number(
          data.retryAfter || 0
        );

      throw error;
    }

    return data || {};
  } catch (error) {
    if (
      error.name ===
      "AbortError"
    ) {
      const timeoutError =
        new Error(
          "API request timeout"
        );

      timeoutError.status = 408;

      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function createErrorMarkup(
  error,
  fallback
) {
  if (
    error?.status === 429 ||
    error?.retryAfter
  ) {
    return `
      <div class="error-state">
        <p>
          API มีคำขอมากเกินไป
        </p>

        <small>
          กรุณารอประมาณ
          ${escapeHtml(
            error.retryAfter || 60
          )}
          วินาที
        </small>
      </div>
    `;
  }

  if (error?.status === 408) {
    return `
      <div class="error-state">
        <p>การเชื่อมต่อใช้เวลานานเกินไป</p>
        <small>กรุณาลองใหม่อีกครั้ง</small>
      </div>
    `;
  }

  return `
    <div class="error-state">
      <p>${escapeHtml(fallback)}</p>
    </div>
  `;
}

function log(...values) {
  if (CFG.debug) {
    console.log(
      "[HN FOOTBALL SCORE]",
      ...values
    );
  }
}

function clearAllTimers() {
  state.timers.forEach(timer =>
    clearInterval(timer)
  );

  state.timers = [];

  if (
    state.matchRefreshTimer
  ) {
    clearInterval(
      state.matchRefreshTimer
    );

    state.matchRefreshTimer =
      null;
  }
}

/* =========================================================
   SYSTEM STATUS
========================================================= */

function setSystemStatus(
  message,
  success = true
) {
  const statusText =
    $("#systemStatus");

  const updateText =
    $("#updatedAt");

  const statusDot =
    $("#statusDot");

  if (statusText) {
    statusText.textContent =
      message;
  }

  if (updateText) {
    updateText.textContent =
      `• ${new Date()
        .toLocaleTimeString(
          CFG.locale,
          {
            hour: "2-digit",
            minute: "2-digit",
            timeZone:
              CFG.timezone
          }
        )}`;
  }

  if (statusDot) {
    statusDot.classList.toggle(
      "error",
      !success
    );
  }

  try {
    localStorage.setItem(
      CFG.storage.lastUpdate,
      new Date().toISOString()
    );
  } catch {
    /* Local storage unavailable */
  }
}

/* =========================================================
   TEAM AND MATCH COMPONENTS
========================================================= */

function teamLogo(
  logo,
  teamName = ""
) {
  if (!logo) {
    return `
      <span
        class="team-logo-placeholder"
        aria-hidden="true"
      >
        ⚽
      </span>
    `;
  }

  return `
    <img
      src="${escapeHtml(logo)}"
      alt="${escapeHtml(teamName)}"
      loading="lazy"
      decoding="async"
      onerror="
        this.style.display='none';
      "
    >
  `;
}

function getMatchStatus(
  fixture
) {
  const status =
    fixture?.status || {};

  const shortStatus =
    status.short || "";

  const elapsed =
    status.elapsed;

  if (
    elapsed !== null &&
    elapsed !== undefined &&
    [
      "1H",
      "2H",
      "ET",
      "P",
      "LIVE"
    ].includes(shortStatus)
  ) {
    return `${elapsed}'`;
  }

  const labels = {
    NS: "ยังไม่เริ่ม",
    HT: "พักครึ่ง",
    FT: "จบการแข่งขัน",
    AET: "จบต่อเวลา",
    PEN: "จบยิงจุดโทษ",
    PST: "เลื่อนการแข่งขัน",
    CANC: "ยกเลิก",
    ABD: "ยุติการแข่งขัน",
    INT: "หยุดชั่วคราว"
  };

  return (
    labels[shortStatus] ||
    status.long ||
    shortStatus ||
    "-"
  );
}

function isLiveFixture(fixture) {
  return [
    "1H",
    "2H",
    "HT",
    "ET",
    "P",
    "LIVE",
    "INT"
  ].includes(
    fixture?.status?.short
  );
}

function renderHeroMatch(match) {
  const fixture =
    match.fixture || {};

  const teams =
    match.teams || {};

  const goals =
    match.goals || {};

  const league =
    match.league || {};

  return `
    <article class="hero-match-row">
      <div class="match-league-line">
        <span class="live-pill">
          ${
            isLiveFixture(fixture)
              ? "LIVE"
              : escapeHtml(
                  fixture.status
                    ?.short || "MATCH"
                )
          }
        </span>

        <span>
          ${escapeHtml(
            league.name ||
              "ฟุตบอล"
          )}
        </span>
      </div>

      <div class="match-main-row">
        <div class="match-team">
          ${teamLogo(
            teams.home?.logo,
            teams.home?.name
          )}

          <span>
            ${escapeHtml(
              teams.home?.name ||
                "-"
            )}
          </span>
        </div>

        <div class="match-score">
          ${formatNumber(
            goals.home,
            "-"
          )}
          -
          ${formatNumber(
            goals.away,
            "-"
          )}
        </div>

        <div class="match-team away">
          ${teamLogo(
            teams.away?.logo,
            teams.away?.name
          )}

          <span>
            ${escapeHtml(
              teams.away?.name ||
                "-"
            )}
          </span>
        </div>

        <div class="match-minute">
          ${escapeHtml(
            getMatchStatus(
              fixture
            )
          )}
        </div>
      </div>

      <div class="match-card-footer">
        <span>
          ${escapeHtml(
            fixture.venue
              ?.name || ""
          )}
        </span>

        <button
          class="match-detail-button"
          type="button"
          data-match-id="${escapeHtml(
            fixture.id || ""
          )}"
        >
          Match Center →
        </button>
      </div>
    </article>
  `;
}

function renderLiveMatchCard(
  match
) {
  const fixture =
    match.fixture || {};

  const teams =
    match.teams || {};

  const goals =
    match.goals || {};

  const league =
    match.league || {};

  return `
    <article class="live-match-card">
      <div class="match-league-line">
        <span class="live-pill">
          ${
            isLiveFixture(fixture)
              ? "LIVE"
              : escapeHtml(
                  fixture.status
                    ?.short || "MATCH"
                )
          }
        </span>

        <span>
          ${escapeHtml(
            league.name ||
              "ฟุตบอล"
          )}
        </span>
      </div>

      <div class="match-main-row">
        <div class="match-team">
          ${teamLogo(
            teams.home?.logo,
            teams.home?.name
          )}

          <span>
            ${escapeHtml(
              teams.home?.name ||
                "-"
            )}
          </span>
        </div>

        <div class="match-score">
          ${formatNumber(
            goals.home,
            "-"
          )}
          -
          ${formatNumber(
            goals.away,
            "-"
          )}
        </div>

        <div class="match-team away">
          ${teamLogo(
            teams.away?.logo,
            teams.away?.name
          )}

          <span>
            ${escapeHtml(
              teams.away?.name ||
                "-"
            )}
          </span>
        </div>

        <div class="match-minute">
          ${escapeHtml(
            getMatchStatus(
              fixture
            )
          )}
        </div>
      </div>

      <div class="match-card-footer">
        <span>
          ${escapeHtml(
            fixture.venue
              ?.name ||
              formatBangkokTime(
                fixture.date
              )
          )}
        </span>

        <button
          class="match-detail-button"
          type="button"
          data-match-id="${escapeHtml(
            fixture.id || ""
          )}"
        >
          ดูรายละเอียด
        </button>
      </div>
    </article>
  `;
}

function bindMatchButtons() {
  $$("[data-match-id]")
    .forEach(button => {
      button.onclick = () =>
        openMatchCenter(
          button.dataset.matchId
        );
    });
}

/* =========================================================
   LIVE SCORE
========================================================= */

async function loadLive({
  silent = false
} = {}) {
  if (state.loading.live) {
    return;
  }

  state.loading.live =
    true;

  const heroBox =
    $("#heroLiveList");

  const liveGrid =
    $("#liveGrid");

  try {
    const data = await getJSON(
      CFG.endpoints.live
    );

    state.liveMatches =
      data.response || [];

    renderLive();

    setSystemStatus(
      `ออนไลน์ • ${state.liveMatches.length} คู่กำลังแข่งขัน`
    );
  } catch (error) {
    log(
      "Live error:",
      error
    );

    if (!silent) {
      if (heroBox) {
        heroBox.innerHTML =
          createErrorMarkup(
            error,
            "โหลดผลบอลสดไม่สำเร็จ"
          );
      }

      if (liveGrid) {
        liveGrid.innerHTML =
          createErrorMarkup(
            error,
            "โหลดผลบอลสดไม่สำเร็จ"
          );
      }
    }

    setSystemStatus(
      "เชื่อมต่อข้อมูลบอลสดไม่สำเร็จ",
      false
    );
  } finally {
    state.loading.live =
      false;
  }
}

function renderLive() {
  const heroBox =
    $("#heroLiveList");

  const liveGrid =
    $("#liveGrid");

  const filteredMatches =
    state.liveFilter ===
    "important"
      ? state.liveMatches.filter(
          match =>
            CFG.importantLeagues
              .includes(
                match.league?.id
              )
        )
      : state.liveMatches;

  const heroMatches =
    filteredMatches.slice(
      0,
      CFG.limits.heroLive
    );

  const mainMatches =
    filteredMatches.slice(
      0,
      CFG.limits.liveMatches
    );

  if (heroBox) {
    heroBox.innerHTML =
      heroMatches.length
        ? heroMatches
            .map(renderHeroMatch)
            .join("")
        : `
          <div class="empty-state">
            <p>
              ขณะนี้ยังไม่มีการแข่งขันสด
            </p>
          </div>
        `;
  }

  if (liveGrid) {
    liveGrid.innerHTML =
      mainMatches.length
        ? mainMatches
            .map(
              renderLiveMatchCard
            )
            .join("")
        : `
          <div
            class="empty-state"
            style="grid-column:1/-1"
          >
            <p>
              ขณะนี้ยังไม่มีการแข่งขันสด
            </p>
          </div>
        `;
  }

  bindMatchButtons();
}

/* =========================================================
   FIXTURES
========================================================= */

function renderFixtureItem(
  match
) {
  const fixture =
    match.fixture || {};

  const teams =
    match.teams || {};

  const league =
    match.league || {};

  const goals =
    match.goals || {};

  const started =
    fixture.status?.short !==
    "NS";

  return `
    <article
      class="fixture-item"
      data-match-id="${escapeHtml(
        fixture.id || ""
      )}"
      tabindex="0"
      role="button"
    >
      <span class="fixture-time">
        ${
          started
            ? `${formatNumber(
                goals.home,
                "-"
              )}-${formatNumber(
                goals.away,
                "-"
              )}`
            : formatBangkokTime(
                fixture.date
              )
        }
      </span>

      <div class="fixture-team">
        ${teamLogo(
          teams.home?.logo,
          teams.home?.name
        )}

        <span>
          ${escapeHtml(
            teams.home?.name ||
              "-"
          )}
        </span>
      </div>

      <span class="fixture-vs">
        ${
          started
            ? escapeHtml(
                fixture.status
                  ?.short || "-"
              )
            : "VS"
        }
      </span>

      <div class="fixture-team away">
        ${teamLogo(
          teams.away?.logo,
          teams.away?.name
        )}

        <span>
          ${escapeHtml(
            teams.away?.name ||
              "-"
          )}
        </span>
      </div>

      <span class="fixture-league">
        ${escapeHtml(
          league.name || ""
        )}
      </span>
    </article>
  `;
}

async function loadFixtures({
  silent = false
} = {}) {
  if (
    state.loading.fixtures
  ) {
    return;
  }

  state.loading.fixtures =
    true;

  const container =
    $("#fixturesList");

  try {
    const date =
      getBangkokDate(
        state.currentDateOffset
      );

    const data = await getJSON(
      CFG.endpoints.fixtures,
      {
        date
      }
    );

    const fixtures =
      data.response || [];

    if (container) {
      container.innerHTML =
        fixtures.length
          ? fixtures
              .slice(
                0,
                CFG.limits
                  .fixtures
              )
              .map(
                renderFixtureItem
              )
              .join("")
          : `
            <div class="empty-state">
              <p>
                ไม่พบโปรแกรมการแข่งขัน
              </p>
            </div>
          `;
    }

    bindFixtureItems();

  } catch (error) {
    log(
      "Fixtures error:",
      error
    );

    if (
      container &&
      !silent
    ) {
      container.innerHTML =
        createErrorMarkup(
          error,
          "โหลดโปรแกรมบอลไม่สำเร็จ"
        );
    }
  } finally {
    state.loading.fixtures =
      false;
  }
}

function bindFixtureItems() {
  $$(".fixture-item")
    .forEach(item => {
      const fixtureId =
        item.dataset.matchId;

      item.onclick = () =>
        openMatchCenter(
          fixtureId
        );

      item.onkeydown =
        event => {
          if (
            event.key ===
              "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();

            openMatchCenter(
              fixtureId
            );
          }
        };
    });
}

/* =========================================================
   STANDINGS
========================================================= */

async function loadStandings({
  silent = false
} = {}) {
  if (
    state.loading.standings
  ) {
    return;
  }

  state.loading.standings =
    true;

  const body =
    $("#standingsBody");

  try {
    const data = await getJSON(
      CFG.endpoints.standings,
      {
        league:
          state.currentLeague,
        season: CFG.season
      }
    );

    const standings =
      data.response?.[0]
        ?.league
        ?.standings?.[0] ||
      [];

    if (!body) {
      return;
    }

    body.innerHTML =
      standings.length
        ? standings
            .slice(
              0,
              CFG.limits
                .standings
            )
            .map(row => `
              <tr>
                <td>
                  ${escapeHtml(
                    row.rank || "-"
                  )}
                </td>

                <td>
                  <span class="standings-team">
                    ${teamLogo(
                      row.team?.logo,
                      row.team?.name
                    )}

                    <span>
                      ${escapeHtml(
                        row.team
                          ?.name ||
                          ""
                      )}
                    </span>
                  </span>
                </td>

                <td>
                  ${formatNumber(
                    row.all?.played
                  )}
                </td>

                <td>
                  ${formatNumber(
                    row.goalsDiff
                  )}
                </td>

                <td>
                  <strong>
                    ${formatNumber(
                      row.points
                    )}
                  </strong>
                </td>
              </tr>
            `)
            .join("")
        : `
          <tr>
            <td colspan="5">
              ไม่มีข้อมูลตารางคะแนน
            </td>
          </tr>
        `;
  } catch (error) {
    log(
      "Standings error:",
      error
    );

    if (
      body &&
      !silent
    ) {
      body.innerHTML = `
        <tr>
          <td colspan="5">
            ${createErrorMarkup(
              error,
              "โหลดตารางคะแนนไม่สำเร็จ"
            )}
          </td>
        </tr>
      `;
    }
  } finally {
    state.loading.standings =
      false;
  }
}

/* =========================================================
   ANALYSIS AND PREDICTIONS
========================================================= */

function renderAnalysisList(
  fixtures
) {
  const container =
    $("#analysisList");

  if (!container) {
    return;
  }

  const upcoming =
    fixtures
      .filter(match =>
        [
          "NS",
          "TBD"
        ].includes(
          match.fixture
            ?.status?.short
        )
      )
      .slice(
        0,
        CFG.limits.analysis
      );

  if (!upcoming.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>
          ยังไม่มีคู่สำหรับวิเคราะห์
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    upcoming
      .map(match => {
        const fixture =
          match.fixture || {};

        const teams =
          match.teams || {};

        const league =
          match.league || {};

        return `
          <article class="analysis-item">
            <div class="analysis-thumb">
              ${
                league.logo
                  ? `
                    <img
                      src="${escapeHtml(
                        league.logo
                      )}"
                      alt="${escapeHtml(
                        league.name ||
                          ""
                      )}"
                      loading="lazy"
                    >
                  `
                  : teamLogo(
                      teams.home
                        ?.logo,
                      teams.home
                        ?.name
                    )
              }
            </div>

            <div class="analysis-content">
              <h3>
                ${escapeHtml(
                  teams.home
                    ?.name || "-"
                )}
                พบ
                ${escapeHtml(
                  teams.away
                    ?.name || "-"
                )}
              </h3>

              <p>
                ${escapeHtml(
                  league.name ||
                    "ฟุตบอล"
                )}
                •
                ${escapeHtml(
                  formatBangkokTime(
                    fixture.date
                  )
                )}
              </p>

              <button
                class="analysis-button"
                type="button"
                data-prediction-id="${escapeHtml(
                  fixture.id || ""
                )}"
              >
                ดูบทวิเคราะห์ →
              </button>
            </div>
          </article>
        `;
      })
      .join("");

  $$(
    "[data-prediction-id]"
  ).forEach(button => {
    button.onclick = () =>
      openPrediction(
        button.dataset
          .predictionId
      );
  });
}

async function openPrediction(
  fixtureId
) {
  if (!fixtureId) {
    return;
  }

  const modal =
    $("#analysisModal");

  const content =
    $("#analysisModalContent");

  if (
    !modal ||
    !content
  ) {
    return;
  }

  openModal(modal);

  content.innerHTML = `
    <div class="loading-state">
      <span class="loading-spinner"></span>
      <p>
        กำลังโหลดบทวิเคราะห์...
      </p>
    </div>
  `;

  try {
    const data = await getJSON(
      CFG.endpoints.predictions,
      {
        fixture: fixtureId
      }
    );

    const item =
      data.response?.[0];

    if (!item) {
      content.innerHTML = `
        <div class="empty-state">
          <p>
            ยังไม่มีบทวิเคราะห์สำหรับคู่นี้
          </p>
        </div>
      `;

      return;
    }

    const teams =
      item.teams || {};

    const prediction =
      item.predictions || {};

    const percent =
      prediction.percent ||
      {};

    content.innerHTML = `
      <div class="prediction-match">
        <div class="prediction-team">
          ${teamLogo(
            teams.home?.logo,
            teams.home?.name
          )}

          <strong>
            ${escapeHtml(
              teams.home?.name ||
                "-"
            )}
          </strong>
        </div>

        <div class="prediction-vs">
          VS
        </div>

        <div class="prediction-team">
          ${teamLogo(
            teams.away?.logo,
            teams.away?.name
          )}

          <strong>
            ${escapeHtml(
              teams.away?.name ||
                "-"
            )}
          </strong>
        </div>
      </div>

      <div class="prediction-percent-grid">
        <div class="prediction-percent-card">
          <span>เจ้าบ้าน</span>
          <strong>
            ${escapeHtml(
              percent.home ||
                "-"
            )}
          </strong>
        </div>

        <div class="prediction-percent-card">
          <span>เสมอ</span>
          <strong>
            ${escapeHtml(
              percent.draw ||
                "-"
            )}
          </strong>
        </div>

        <div class="prediction-percent-card">
          <span>ทีมเยือน</span>
          <strong>
            ${escapeHtml(
              percent.away ||
                "-"
            )}
          </strong>
        </div>
      </div>

      <div class="prediction-advice">
        <strong>
          แนวทางวิเคราะห์
        </strong>

        <p>
          ${escapeHtml(
            prediction.advice ||
              "วิเคราะห์จากสถิติและผลงานล่าสุดของทั้งสองทีม"
          )}
        </p>

        <p>
          ทีมที่มีแนวโน้ม:
          <strong>
            ${escapeHtml(
              prediction
                .winner?.name ||
                "ยังไม่ระบุ"
            )}
          </strong>
        </p>

        ${
          prediction
            .under_over
            ? `
              <p>
                สูง/ต่ำ:
                <strong>
                  ${escapeHtml(
                    prediction
                      .under_over
                  )}
                </strong>
              </p>
            `
            : ""
        }
      </div>
    `;
  } catch (error) {
    content.innerHTML =
      createErrorMarkup(
        error,
        "โหลดบทวิเคราะห์ไม่สำเร็จ"
      );
  }
}

/* =========================================================
   MATCH CENTER
========================================================= */

async function openMatchCenter(
  fixtureId
) {
  if (!fixtureId) {
    return;
  }

  state.matchFixtureId =
    fixtureId;

  const modal =
    $("#matchModal");

  if (!modal) {
    return;
  }

  openModal(modal);

  await loadMatchCenter(
    fixtureId
  );

  if (
    state.matchRefreshTimer
  ) {
    clearInterval(
      state.matchRefreshTimer
    );
  }

  state.matchRefreshTimer =
    setInterval(
      () =>
        loadMatchCenter(
          fixtureId,
          {
            silent: true
          }
        ),
      CFG.refresh.matchCenter
    );
}

async function loadMatchCenter(
  fixtureId,
  {
    silent = false
  } = {}
) {
  if (
    state.loading.match
  ) {
    return;
  }

  state.loading.match =
    true;

  const content =
    $("#matchModalContent");

  if (
    content &&
    !silent
  ) {
    content.innerHTML = `
      <div class="loading-state">
        <span class="loading-spinner"></span>
        <p>
          กำลังโหลด Match Center...
        </p>
      </div>
    `;
  }

  try {
    const matchData =
      await getJSON(
        CFG.endpoints.match,
        {
          id: fixtureId
        }
      );

    const match =
      matchData.response?.[0];

    if (!match) {
      throw new Error(
        "Match not found"
      );
    }

    const [
      eventsResult,
      statisticsResult,
      lineupsResult,
      playersResult
    ] = await Promise.allSettled([
      getJSON(
        CFG.endpoints.events,
        {
          fixture:
            fixtureId
        }
      ),
      getJSON(
        CFG.endpoints.statistics,
        {
          fixture:
            fixtureId
        }
      ),
      getJSON(
        CFG.endpoints.lineups,
        {
          fixture:
            fixtureId
        }
      ),
      getJSON(
        CFG.endpoints.players,
        {
          fixture:
            fixtureId
        }
      )
    ]);

    const events =
      eventsResult.status ===
      "fulfilled"
        ? eventsResult.value
            .response || []
        : [];

    const statistics =
      statisticsResult.status ===
      "fulfilled"
        ? statisticsResult.value
            .response || []
        : [];

    const lineups =
      lineupsResult.status ===
      "fulfilled"
        ? lineupsResult.value
            .response || []
        : [];

    const players =
      playersResult.status ===
      "fulfilled"
        ? playersResult.value
            .response || []
        : [];

    if (content) {
      content.innerHTML =
        renderMatchCenter({
          match,
          events,
          statistics,
          lineups,
          players
        });
    }
  } catch (error) {
    log(
      "Match center error:",
      error
    );

    if (
      content &&
      !silent
    ) {
      content.innerHTML =
        createErrorMarkup(
          error,
          "โหลดข้อมูลการแข่งขันไม่สำเร็จ"
        );
    }
  } finally {
    state.loading.match =
      false;
  }
}

function renderMatchCenter({
  match,
  events,
  statistics,
  lineups,
  players
}) {
  const fixture =
    match.fixture || {};

  const league =
    match.league || {};

  const teams =
    match.teams || {};

  const goals =
    match.goals || {};

  return `
    <section class="match-center-head">
      <div class="match-center-team">
        ${teamLogo(
          teams.home?.logo,
          teams.home?.name
        )}

        <strong>
          ${escapeHtml(
            teams.home?.name ||
              "-"
          )}
        </strong>
      </div>

      <div>
        <div class="match-center-score">
          ${formatNumber(
            goals.home,
            "-"
          )}
          -
          ${formatNumber(
            goals.away,
            "-"
          )}
        </div>

        <div class="match-center-status">
          ${escapeHtml(
            getMatchStatus(
              fixture
            )
          )}
        </div>
      </div>

      <div class="match-center-team">
        ${teamLogo(
          teams.away?.logo,
          teams.away?.name
        )}

        <strong>
          ${escapeHtml(
            teams.away?.name ||
              "-"
          )}
        </strong>
      </div>
    </section>

    <div class="error-box">
      ${escapeHtml(
        league.name ||
          "ฟุตบอล"
      )}
      •
      ${escapeHtml(
        formatBangkokDateTime(
          fixture.date
        )
      )}
      ${
        fixture.venue?.name
          ? ` • ${escapeHtml(
              fixture.venue.name
            )}`
          : ""
      }
    </div>

    <div
      class="match-center-grid"
      style="margin-top:14px"
    >
      <section class="match-center-panel">
        <h3>
          เหตุการณ์สำคัญ
        </h3>

        <div class="match-center-panel-body">
          ${renderEvents(events)}
        </div>
      </section>

      <section class="match-center-panel">
        <h3>
          สถิติการแข่งขัน
        </h3>

        <div class="match-center-panel-body">
          ${renderStatistics(
            statistics,
            teams
          )}
        </div>
      </section>
    </div>

    <section
      class="match-center-panel"
      style="margin-top:14px"
    >
      <h3>
        รายชื่อผู้เล่น
      </h3>

      <div class="match-center-panel-body">
        ${renderLineups(
          lineups,
          players
        )}
      </div>
    </section>
  `;
}

/* =========================================================
   MATCH EVENTS
========================================================= */

function shouldShowEvent(
  event
) {
  const type =
    event.type || "";

  if (
    type === "Card" &&
    !CFG.matchEvents
      .showCards
  ) {
    return false;
  }

  if (
    type === "Goal" &&
    !CFG.matchEvents
      .showGoals
  ) {
    return false;
  }

  if (
    type ===
      "subst" &&
    !CFG.matchEvents
      .showSubstitutions
  ) {
    return false;
  }

  if (
    type === "Var" &&
    !CFG.matchEvents
      .showVar
  ) {
    return false;
  }

  return true;
}

function getEventIcon(event) {
  const type =
    event.type || "";

  const detail =
    String(
      event.detail || ""
    ).toLowerCase();

  if (type === "Goal") {
    if (
      detail.includes(
        "missed penalty"
      )
    ) {
      return "❌";
    }

    if (
      detail.includes(
        "penalty"
      )
    ) {
      return "⚽";
    }

    if (
      detail.includes(
        "own goal"
      )
    ) {
      return "⚽";
    }

    return "⚽";
  }

  if (
    type === "subst"
  ) {
    return "🔄";
  }

  if (
    type === "Var"
  ) {
    return "📺";
  }

  if (
    type === "Card"
  ) {
    return detail.includes(
      "red"
    )
      ? "🟥"
      : "🟨";
  }

  return "•";
}

function renderEvents(events) {
  const filtered =
    events
      .filter(
        shouldShowEvent
      )
      .slice(
        0,
        CFG.limits.events
      );

  if (!filtered.length) {
    return `
      <div class="empty-state">
        <p>
          ยังไม่มีเหตุการณ์สำคัญ
        </p>
      </div>
    `;
  }

  return `
    <div class="event-list">
      ${filtered
        .map(event => {
          const elapsed =
            event.time
              ?.elapsed ?? "-";

          const extra =
            event.time?.extra
              ? `+${event.time.extra}`
              : "";

          return `
            <div class="event-item">
              <span class="event-time">
                ${escapeHtml(
                  elapsed
                )}${escapeHtml(
                  extra
                )}'
              </span>

              <span class="event-description">
                <strong>
                  ${escapeHtml(
                    event.player
                      ?.name ||
                      event.team
                        ?.name ||
                      "เหตุการณ์"
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    event.detail ||
                      event.type ||
                      ""
                  )}

                  ${
                    event.assist
                      ?.name
                      ? ` • ${escapeHtml(
                          event.assist
                            .name
                        )}`
                      : ""
                  }
                </small>
              </span>

              <span class="event-icon">
                ${getEventIcon(
                  event
                )}
              </span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

/* =========================================================
   STATISTICS
========================================================= */

function findTeamStatistics(
  statistics,
  teamId
) {
  return (
    statistics.find(
      item =>
        item.team?.id ===
        teamId
    )?.statistics || []
  );
}

function findStatisticValue(
  statistics,
  type
) {
  return (
    statistics.find(
      item =>
        item.type === type
    )?.value ?? null
  );
}

function renderStatistics(
  statistics,
  teams
) {
  if (
    !Array.isArray(
      statistics
    ) ||
    statistics.length < 2
  ) {
    return `
      <div class="empty-state">
        <p>
          คู่นี้ยังไม่มีข้อมูลสถิติ
        </p>
      </div>
    `;
  }

  const homeStats =
    findTeamStatistics(
      statistics,
      teams.home?.id
    );

  const awayStats =
    findTeamStatistics(
      statistics,
      teams.away?.id
    );

  const availableTypes =
    CFG.statistics.filter(
      type =>
        findStatisticValue(
          homeStats,
          type
        ) !== null ||
        findStatisticValue(
          awayStats,
          type
        ) !== null
    );

  if (
    !availableTypes.length
  ) {
    return `
      <div class="empty-state">
        <p>
          คู่นี้ยังไม่มีข้อมูลสถิติ
        </p>
      </div>
    `;
  }

  return `
    <div class="stats-list">
      ${availableTypes
        .map(type => {
          const homeValue =
            findStatisticValue(
              homeStats,
              type
            );

          const awayValue =
            findStatisticValue(
              awayStats,
              type
            );

          const homeNumber =
            parseStatNumber(
              homeValue
            );

          const awayNumber =
            parseStatNumber(
              awayValue
            );

          const total =
            homeNumber +
            awayNumber;

          const homePercent =
            total > 0
              ? clamp(
                  homeNumber /
                    total *
                    100
                )
              : 50;

          const awayPercent =
            100 -
            homePercent;

          return `
            <div class="stat-row">
              <span class="stat-value">
                ${escapeHtml(
                  homeValue ??
                    "-"
                )}
              </span>

              <div class="stat-center">
                <span class="stat-title">
                  ${escapeHtml(
                    translateStatType(
                      type
                    )
                  )}
                </span>

                <div class="stat-bar">
                  <span
                    class="stat-bar-home"
                    style="width:${homePercent}%"
                  ></span>

                  <span
                    class="stat-bar-away"
                    style="width:${awayPercent}%"
                  ></span>
                </div>
              </div>

              <span class="stat-value">
                ${escapeHtml(
                  awayValue ??
                    "-"
                )}
              </span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function translateStatType(type) {
  const translations = {
    "Ball Possession":
      "ครองบอล",
    "Total Shots":
      "ยิงทั้งหมด",
    "Shots on Goal":
      "ยิงเข้ากรอบ",
    "Shots off Goal":
      "ยิงไม่เข้ากรอบ",
    "Blocked Shots":
      "ยิงติดบล็อก",
    "Corner Kicks":
      "เตะมุม",
    Offsides:
      "ล้ำหน้า",
    Fouls:
      "ฟาวล์",
    "Goalkeeper Saves":
      "ผู้รักษาประตูเซฟ",
    "Total passes":
      "ส่งบอลทั้งหมด",
    "Passes accurate":
      "ส่งบอลสำเร็จ"
  };

  return (
    translations[type] ||
    type
  );
}

/* =========================================================
   LINEUPS AND PLAYERS
========================================================= */

function findPlayerRating(
  playerData,
  playerId
) {
  for (
    const team
    of playerData
  ) {
    const playerItem =
      team.players?.find(
        item =>
          item.player?.id ===
          playerId
      );

    const rating =
      playerItem
        ?.statistics?.[0]
        ?.games?.rating;

    if (rating) {
      return Number(
        rating
      ).toFixed(1);
    }
  }

  return "";
}

function renderLineupPlayers(
  players,
  playerStats
) {
  if (
    !Array.isArray(
      players
    ) ||
    !players.length
  ) {
    return `
      <div class="empty-state">
        <p>
          ไม่มีรายชื่อผู้เล่น
        </p>
      </div>
    `;
  }

  return players
    .slice(
      0,
      CFG.limits.players
    )
    .map(item => {
      const player =
        item.player || item;

      const rating =
        findPlayerRating(
          playerStats,
          player.id
        );

      return `
        <div class="player-row">
          <span class="player-number">
            ${escapeHtml(
              player.number ??
                "-"
            )}
          </span>

          <span>
            ${escapeHtml(
              player.name ||
                "-"
            )}
          </span>

          ${
            rating
              ? `
                <span class="player-rating">
                  ${rating}
                </span>
              `
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function renderLineups(
  lineups,
  playerStats
) {
  if (
    !Array.isArray(
      lineups
    ) ||
    !lineups.length
  ) {
    return `
      <div class="empty-state">
        <p>
          คู่นี้ยังไม่มีรายชื่อผู้เล่น
        </p>
      </div>
    `;
  }

  const home =
    lineups[0] || {};

  const away =
    lineups[1] || {};

  const homePlayers = [
    ...(home.startXI || []),
    ...(home.substitutes || [])
  ];

  const awayPlayers = [
    ...(away.startXI || []),
    ...(away.substitutes || [])
  ];

  return `
    <div class="lineup-grid">
      <div class="lineup-column">
        <h4>
          ${escapeHtml(
            home.team?.name ||
              "เจ้าบ้าน"
          )}
          ${
            home.formation
              ? `(${escapeHtml(
                  home.formation
                )})`
              : ""
          }
        </h4>

        ${renderLineupPlayers(
          homePlayers,
          playerStats
        )}
      </div>

      <div class="lineup-column">
        <h4>
          ${escapeHtml(
            away.team?.name ||
              "ทีมเยือน"
          )}
          ${
            away.formation
              ? `(${escapeHtml(
                  away.formation
                )})`
              : ""
          }
        </h4>

        ${renderLineupPlayers(
          awayPlayers,
          playerStats
        )}
      </div>
    </div>
  `;
}

/* =========================================================
   MODALS
========================================================= */

function openModal(modal) {
  if (!modal) {
    return;
  }

  modal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );
}

function closeModal(modal) {
  if (!modal) {
    return;
  }

  modal.hidden = true;

  if (
    !$$(".modal")
      .some(item =>
        !item.hidden
      )
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }

  if (
    modal.id ===
    "matchModal"
  ) {
    state.matchFixtureId =
      null;

    if (
      state.matchRefreshTimer
    ) {
      clearInterval(
        state.matchRefreshTimer
      );

      state.matchRefreshTimer =
        null;
    }
  }
}

/* =========================================================
   PWA
========================================================= */

async function registerServiceWorker() {
  if (
    !CFG.pwa.enabled ||
    !(
      "serviceWorker"
      in navigator
    )
  ) {
    return;
  }

  try {
    await navigator
      .serviceWorker
      .register(
        CFG.pwa
          .serviceWorkerPath
      );
  } catch (error) {
    log(
      "Service worker error:",
      error
    );
  }
}

function bindInstallPrompt() {
  const installButton = $("#installButton");
  const heroInstallButtons = $$('[data-install-app]');

  const setReady = () => {
    if (installButton) installButton.hidden = false;
  };

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.installPrompt = event;
    setReady();
  });

  async function requestInstall() {
    if (state.installPrompt) {
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      return;
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const message = isIOS
      ? "บน iPhone: แตะปุ่มแชร์ แล้วเลือก ‘เพิ่มไปยังหน้าจอโฮม’"
      : "เปิดเมนูเบราว์เซอร์ แล้วเลือก ‘ติดตั้งแอป’ หรือ ‘เพิ่มไปยังหน้าจอหลัก’";

    window.alert(message);
  }

  if (installButton) {
    installButton.hidden = false;
    installButton.onclick = requestInstall;
  }

  heroInstallButtons.forEach(button => {
    button.onclick = requestInstall;
  });
}

/* =========================================================
   EVENTS
========================================================= */

function bindNavigation() {
  const menuButton =
    $("#menuButton");

  const navigation =
    $("#mainNavigation");

  if (
    menuButton &&
    navigation
  ) {
    menuButton.onclick =
      () => {
        const opened =
          navigation
            .classList
            .toggle(
              "open"
            );

        menuButton.setAttribute(
          "aria-expanded",
          String(opened)
        );
      };

    $$(
      "a",
      navigation
    ).forEach(link => {
      link.onclick = () => {
        navigation
          .classList
          .remove("open");

        menuButton.setAttribute(
          "aria-expanded",
          "false"
        );
      };
    });
  }
}

function bindDateTabs() {
  $$("[data-day]")
    .forEach(button => {
      button.onclick =
        async () => {
          $$("[data-day]")
            .forEach(item =>
              item.classList
                .remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          state.currentDateOffset =
            Number(
              button.dataset.day
            );

          const container =
            $("#fixturesList");

          if (container) {
            container.innerHTML = `
              <div class="loading-state">
                <span class="loading-spinner"></span>
                <p>
                  กำลังโหลดโปรแกรมบอล...
                </p>
              </div>
            `;
          }

          await loadFixtures();
        };
    });
}

function bindLeagueSelect() {
  const select =
    $("#leagueSelect");

  if (!select) {
    return;
  }

  try {
    const stored =
      localStorage.getItem(
        CFG.storage
          .selectedLeague
      );

    if (
      stored &&
      /^\d+$/.test(stored)
    ) {
      state.currentLeague =
        Number(stored);

      select.value =
        stored;
    }
  } catch {
    /* Ignore */
  }

  select.onchange =
    async event => {
      state.currentLeague =
        Number(
          event.target.value
        );

      try {
        localStorage.setItem(
          CFG.storage
            .selectedLeague,
          String(
            state.currentLeague
          )
        );
      } catch {
        /* Ignore */
      }

      const body =
        $("#standingsBody");

      if (body) {
        body.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="loading-state compact">
                กำลังโหลดตารางคะแนน...
              </div>
            </td>
          </tr>
        `;
      }

      await loadStandings();
    };
}

function bindLiveFilters() {
  $$("[data-live-filter]")
    .forEach(button => {
      button.onclick = () => {
        $$(
          "[data-live-filter]"
        ).forEach(item =>
          item.classList
            .remove(
              "active"
            )
        );

        button.classList.add(
          "active"
        );

        state.liveFilter =
          button.dataset
            .liveFilter ||
          "all";

        renderLive();
      };
    });
}

function bindRefreshButton() {
  const button = $("#refreshButton");

  if (!button) {
    return;
  }

  button.onclick = async () => {
    button.disabled = true;
    button.textContent = "⟳";

    try {
      const scoreIframe = $("#scoreIframe");

      if (scoreIframe) {
        const currentUrl = new URL(
          scoreIframe.src,
          window.location.href
        );

        currentUrl.searchParams.set(
          "_refresh",
          String(Date.now())
        );

        scoreIframe.src = currentUrl.toString();
      }

      await loadFixtures();

      await sleep(1200);

      await loadStandings();

      setSystemStatus("ระบบออนไลน์");
    } finally {
      button.disabled = false;
      button.textContent = "↻";
    }
  };
}

function bindModals() {
  $$(
    "[data-close-modal]"
  ).forEach(button => {
    button.onclick = () =>
      closeModal(
        $("#analysisModal")
      );
  });

  $$(
    "[data-close-match]"
  ).forEach(button => {
    button.onclick = () =>
      closeModal(
        $("#matchModal")
      );
  });

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      closeModal(
        $("#analysisModal")
      );

      closeModal(
        $("#matchModal")
      );
    }
  );
}


/* =========================================================
   BALLSTEP CALCULATOR
========================================================= */

function getBallstepFactor(odd, result) {
  const decimalOdd = Number(odd);
  if (!Number.isFinite(decimalOdd) || decimalOdd < 1) return null;

  switch (result) {
    case "win":
      return decimalOdd;
    case "half-win":
      return (decimalOdd + 1) / 2;
    case "void":
      return 1;
    case "half-loss":
      return 0.5;
    case "loss":
      return 0;
    default:
      return decimalOdd;
  }
}

function bindBallstepCalculator() {
  const rows = $("#ballstepRows");
  const addButton = $("#addBallstepRow");
  const calculateButton = $("#calculateBallstep");
  const stakeInput = $("#ballstepStake");
  const resultBox = $("#ballstepResult");

  if (!rows || !addButton || !calculateButton || !stakeInput || !resultBox) return;

  function renumberRows() {
    $$(".ballstep-row", rows).forEach((row, index) => {
      const odd = $(".ballstep-odd", row);
      const result = $(".ballstep-result", row);
      if (odd) odd.setAttribute("aria-label", `อัตราต่อรองคู่ที่ ${index + 1}`);
      if (result) result.setAttribute("aria-label", `ผลคู่ที่ ${index + 1}`);
    });
  }

  function addRow() {
    const row = document.createElement("div");
    row.className = "ballstep-row";
    row.innerHTML = `
      <input class="ballstep-odd" type="number" inputmode="decimal" min="1" step="0.01" placeholder="กรอกอัตราต่อรอง">
      <select class="ballstep-result">
        <option value="win">ชนะ</option>
        <option value="half-win">ได้ครึ่ง</option>
        <option value="void">คืนทุน</option>
        <option value="half-loss">เสียครึ่ง</option>
        <option value="loss">แพ้</option>
      </select>
      <button class="ballstep-remove" type="button" aria-label="ลบคู่นี้">×</button>
    `;
    rows.appendChild(row);
    renumberRows();
  }

  rows.addEventListener("click", event => {
    const button = event.target.closest(".ballstep-remove");
    if (!button) return;
    const allRows = $$(".ballstep-row", rows);
    if (allRows.length <= 1) return;
    button.closest(".ballstep-row")?.remove();
    renumberRows();
  });

  addButton.onclick = addRow;

  calculateButton.onclick = () => {
    const stake = Number(stakeInput.value);
    const rowItems = $$(".ballstep-row", rows);
    let combined = 1;
    let validCount = 0;

    for (const row of rowItems) {
      const odd = $(".ballstep-odd", row)?.value;
      const result = $(".ballstep-result", row)?.value;
      const factor = getBallstepFactor(odd, result);

      if (factor === null) continue;
      combined *= factor;
      validCount += 1;
    }

    if (!validCount || !Number.isFinite(stake) || stake <= 0) {
      resultBox.hidden = false;
      resultBox.innerHTML = '<strong>กรุณากรอกอัตราต่อรองอย่างน้อย 1 คู่ และจำนวนเงินเดิมพัน</strong>';
      return;
    }

    const payout = stake * combined;
    const profit = payout - stake;
    const money = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    resultBox.hidden = false;
    resultBox.innerHTML = `
      <div class="ballstep-result-grid">
        <div class="ballstep-result-item"><span>จำนวนคู่ที่คำนวณ</span><strong>${validCount}</strong></div>
        <div class="ballstep-result-item"><span>ตัวคูณรวม</span><strong>${combined.toFixed(4)}</strong></div>
        <div class="ballstep-result-item"><span>ยอดรับโดยประมาณ</span><strong>${money.format(payout)} บาท</strong></div>
      </div>
      <p style="margin:12px 0 0;color:var(--muted)">กำไร/ขาดทุนโดยประมาณ: <strong>${money.format(profit)} บาท</strong></p>
    `;
  };

  renumberRows();
}


/* =========================================================
   ADMIN PUBLISHED ARTICLES
========================================================= */

const CONTENT_API =
  "https://balltoday-content-api.noppdsoma.workers.dev";

async function loadPublishedArticles() {
  const container =
    $("#analysisList");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      <span class="loading-spinner"></span>
      <p>กำลังโหลดบทความ...</p>
    </div>
  `;

  try {
    const response = await fetch(
      `${CONTENT_API}/api/articles?type=analysis&limit=12`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          `HTTP ${response.status}`
      );
    }

    const articles =
      Array.isArray(data.articles)
        ? data.articles
        : [];

    if (!articles.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>ยังไม่มีบทความที่เผยแพร่</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      articles
        .map(article => `
          <article class="analysis-item">
            <div class="analysis-thumb">
              ${
                article.image_url
                  ? `
                    <img
                      src="${escapeHtml(
                        article.image_url
                      )}"
                      alt="${escapeHtml(
                        article.title
                      )}"
                      loading="lazy"
                      decoding="async"
                      onerror="
                        this.style.display='none';
                      "
                    >
                  `
                  : `
                    <span
                      class="team-logo-placeholder"
                      aria-hidden="true"
                    >
                      ⚽
                    </span>
                  `
              }
            </div>

            <div class="analysis-content">
              <span class="section-kicker">
                ${escapeHtml(
                  article.league ||
                    "บทวิเคราะห์"
                )}
              </span>

              <h3>
                ${escapeHtml(
                  article.title ||
                    "บทวิเคราะห์ฟุตบอล"
                )}
              </h3>

              ${
                article.match_name
                  ? `
                    <p>
                      ${escapeHtml(
                        article.match_name
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                article.match_time
                  ? `
                    <p>
                      ${escapeHtml(
                        formatBangkokDateTime(
                          article.match_time
                        )
                      )}
                    </p>
                  `
                  : ""
              }

              <p>
                ${escapeHtml(
                  article.excerpt ||
                    "อ่านบทวิเคราะห์และแนวทางฟุตบอลล่าสุด"
                )}
              </p>

              <button
                class="analysis-button"
                type="button"
                data-content-article="${escapeHtml(
                  article.slug || ""
                )}"
              >
                อ่านบทความ →
              </button>
            </div>
          </article>
        `)
        .join("");

    $$(
      "[data-content-article]"
    ).forEach(button => {
      button.onclick = () =>
        openPublishedArticle(
          button.dataset
            .contentArticle
        );
    });
  } catch (error) {
    log(
      "Content articles error:",
      error
    );

    container.innerHTML = `
      <div class="error-state">
        <p>โหลดบทความไม่สำเร็จ</p>
        <small>
          ${escapeHtml(
            error.message ||
              "กรุณาลองใหม่อีกครั้ง"
          )}
        </small>
      </div>
    `;
  }
}

async function openPublishedArticle(
  slug
) {
  const modal =
    $("#analysisModal");

  const content =
    $("#analysisModalContent");

  if (
    !modal ||
    !content ||
    !slug
  ) {
    return;
  }

  openModal(modal);

  content.innerHTML = `
    <div class="loading-state">
      <span class="loading-spinner"></span>
      <p>กำลังโหลดบทความ...</p>
    </div>
  `;

  try {
    const response = await fetch(
      `${CONTENT_API}/api/articles/${encodeURIComponent(
        slug
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          `HTTP ${response.status}`
      );
    }

    const article =
      data.article || {};

    content.innerHTML = `
      <article class="published-article">
        ${
          article.image_url
            ? `
              <img
                src="${escapeHtml(
                  article.image_url
                )}"
                alt="${escapeHtml(
                  article.title || ""
                )}"
                loading="lazy"
                decoding="async"
                style="
                  width:100%;
                  max-height:420px;
                  object-fit:cover;
                  border-radius:14px;
                  margin-bottom:18px;
                "
              >
            `
            : ""
        }

        <span class="section-kicker">
          ${escapeHtml(
            article.league ||
              "บทวิเคราะห์"
          )}
        </span>

        <h2>
          ${escapeHtml(
            article.title ||
              "บทวิเคราะห์ฟุตบอล"
          )}
        </h2>

        ${
          article.match_name
            ? `
              <p>
                <strong>คู่แข่งขัน:</strong>
                ${escapeHtml(
                  article.match_name
                )}
              </p>
            `
            : ""
        }

        ${
          article.match_time
            ? `
              <p>
                <strong>เวลาแข่งขัน:</strong>
                ${escapeHtml(
                  formatBangkokDateTime(
                    article.match_time
                  )
                )}
              </p>
            `
            : ""
        }

        ${
          article.excerpt
            ? `
              <p>
                ${escapeHtml(
                  article.excerpt
                )}
              </p>
            `
            : ""
        }

        <div
          style="
            white-space:pre-wrap;
            line-height:1.8;
          "
        >
          ${escapeHtml(
            article.content || ""
          )}
        </div>

        <p style="margin-top:20px">
          โดย
          ${escapeHtml(
            article.author ||
              "บอส สิทธิกร"
          )}
        </p>
      </article>
    `;
  } catch (error) {
    log(
      "Open content article error:",
      error
    );

    content.innerHTML = `
      <div class="error-state">
        <p>เปิดบทความไม่สำเร็จ</p>
        <small>
          ${escapeHtml(
            error.message ||
              "กรุณาลองใหม่อีกครั้ง"
          )}
        </small>
      </div>
    `;
  }
}


/* =========================================================
   HN FOOTBALL SCORE - HOMEPAGE POPUP
========================================================= */
async function loadHomepagePopup(){
  try{
    const response=await fetch(`${CONTENT_API}/api/popup`,{headers:{Accept:"application/json"},cache:"no-store"});
    const data=await response.json().catch(()=>({}));
    const p=data.popup;
    if(!response.ok||!p||!p.image_url)return;
    const key=`hn_popup_${p.updated_at||p.image_url}`;
    if(p.once_per_session&&sessionStorage.getItem(key))return;

    const overlay=document.createElement("div");
    overlay.id="hnHomepagePopup";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.style.cssText="position:fixed;inset:0;z-index:999999;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)";

    const box=document.createElement("div");
    box.style.cssText="position:relative;width:min(720px,94vw);max-height:92vh";

    const close=document.createElement("button");
    close.type="button";close.textContent="×";close.setAttribute("aria-label","ปิด Popup");
    close.style.cssText="position:absolute;top:-13px;right:-13px;z-index:3;width:44px;height:44px;border:1px solid #fff;border-radius:50%;background:#0b0b0d;color:#fff;font-size:30px;cursor:pointer";

    const img=document.createElement("img");
    img.src=p.image_url;img.alt=p.title||"ทีเด็ดวันนี้";img.decoding="async";
    img.style.cssText="display:block;width:100%;max-height:88vh;object-fit:contain;border-radius:18px;background:#070707;box-shadow:0 24px 70px rgba(0,0,0,.65)";
    img.onerror=()=>overlay.remove();

    const content=p.link_url?document.createElement("a"):document.createElement("div");
    if(p.link_url){content.href=p.link_url;content.target="_blank";content.rel="noopener noreferrer"}
    content.appendChild(img);box.append(close,content);overlay.appendChild(box);document.body.appendChild(overlay);

    const dismiss=()=>{if(p.once_per_session){try{sessionStorage.setItem(key,"1")}catch{}}overlay.remove()};
    close.onclick=dismiss;
    overlay.onclick=e=>{if(e.target===overlay)dismiss()};
  }catch(error){log("Homepage popup error:",error)}
}


/* =========================================================
   ADMIN PUBLISHED NEWS
========================================================= */

async function loadPublishedNews() {
  const container = $("#newsList");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <span class="loading-spinner"></span>
      <p>กำลังโหลดข่าวฟุตบอล...</p>
    </div>
  `;

  try {
    const response = await fetch(
      `${CONTENT_API}/api/articles?type=news&limit=8`,
      { headers:{Accept:"application/json"}, cache:"no-store" }
    );
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    const items = Array.isArray(data.articles) ? data.articles : [];

    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><p>ยังไม่มีข่าวฟุตบอลที่เผยแพร่</p></div>`;
      return;
    }

    container.innerHTML = items.map(article => `
      <article class="news-item">
        <div class="news-image">
          ${article.image_url ? `<img src="${escapeHtml(article.image_url)}" alt="${escapeHtml(article.title||"ข่าวฟุตบอล")}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : ""}
        </div>
        <div class="news-content">
          <span class="news-category">${escapeHtml(article.league || "ข่าวฟุตบอล")}</span>
          <h3>${escapeHtml(article.title || "ข่าวฟุตบอลล่าสุด")}</h3>
          <p>${escapeHtml(article.excerpt || "ติดตามข่าวฟุตบอลล่าสุดจาก HN FOOTBALL SCORE")}</p>
          <button class="analysis-button" type="button" data-news-article="${escapeHtml(article.slug||"")}">อ่านข่าว →</button>
        </div>
      </article>
    `).join("");

    $$("[data-news-article]").forEach(button=>{
      button.onclick=()=>openPublishedArticle(button.dataset.newsArticle);
    });
  } catch(error) {
    log("News error:", error);
    container.innerHTML = `<div class="error-state"><p>โหลดข่าวฟุตบอลไม่สำเร็จ</p></div>`;
  }
}

/* =========================================================
   INITIAL LOAD AND TIMERS
========================================================= */

async function checkHealth() {
  try {
    await getJSON(
      CFG.endpoints.health
    );

    setSystemStatus(
      "ระบบออนไลน์"
    );

    return true;
  } catch (error) {
    setSystemStatus(
      "ระบบ API ไม่พร้อมใช้งาน",
      false
    );

    return false;
  }
}

async function initialLoad() {
  await Promise.all([
    loadFixtures(),
    loadPublishedArticles(),
    loadPublishedNews()
  ]);

  await sleep(1500);

  await loadStandings();

  setSystemStatus("ระบบออนไลน์");
}

function startAutomaticRefresh() {
  clearAllTimers();

  state.timers.push(
    setInterval(
      () =>
        loadFixtures({
          silent: true
        }),
      CFG.refresh.fixtures
    )
  );

  state.timers.push(
    setInterval(
      () =>
        loadStandings({
          silent: true
        }),
      CFG.refresh.standings
    )
  );
}

async function initialize() {
  loadHomepagePopup();

  bindNavigation();
  bindDateTabs();
  bindLeagueSelect();
  bindRefreshButton();
  bindModals();
  bindInstallPrompt();
  bindBallstepCalculator();

  registerServiceWorker();

  await checkHealth();

  await initialLoad();

  startAutomaticRefresh();
}

document.addEventListener(
  "DOMContentLoaded",
  initialize
);

window.addEventListener(
  "beforeunload",
  clearAllTimers
);
