/* ==========================================================
   equb-core.js  -  Shared logic for Digital Equb (PROTOTYPE)
   localStorage is for the prototype only, not real money.
   ========================================================== */

var EQUB_KEYS = {
  adminSession: "digital_equb_admin_session",
  collectorSession: "digital_equb_collector_session",
  members: "digital_equb_members",
  groups: "digital_equb_groups",
  collectors: "digital_equb_collectors",
  memberships: "digital_equb_memberships",   // NEW key: explicit member<->group link
  transactions: "digital_equb_transactions",
  corrections: "digital_equb_correction_requests",
  pending: "digital_equb_pending_transactions",
  settlements: "digital_equb_settlements",
  payouts: "digital_equb_payouts",
  notifications: "digital_equb_notifications",
  settings: "digital_equb_settings"
};

/* ---------- Safe storage helpers ---------- */
function equbLoad(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Could not read " + key, e);
    return fallback;
  }
}

function equbSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Could not save " + key, e);
    return false;
  }
}

/* ---------- Unique IDs (never based on array length) ---------- */
function equbUid(prefix) {
  var random;
  if (window.crypto && crypto.randomUUID) {
    random = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  } else {
    random = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  return prefix + "-" + random.toUpperCase();
}

/* ---------- Business date (LOCAL date, not UTC) ---------- */
function equbToday() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

/* ---------- Money: round to 2 decimals ---------- */
function equbMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function equbFormat(n) {
  return equbMoney(n).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + " ETB";
}

/* ==========================================================
   ACCOUNTING RULES (one place, used by every page)
   - COLLECTION and CORRECTED amounts are positive.
   - REVERSAL amounts are stored NEGATIVE.
   - Only method CASH counts as physical cash.
   ========================================================== */
function equbSummarize(transactions) {
  var s = {
    grossOriginal: 0, reversals: 0, corrected: 0, net: 0,
    cash: 0, electronic: 0, count: 0
  };
  transactions.forEach(function (t) {
    var amt = Number(t.amount) || 0;
    if (t.type === "REVERSAL") {
      s.reversals += amt;               // already negative
    } else if (t.type === "CORRECTED") {
      s.corrected += amt;
    } else {
      s.grossOriginal += amt;           // COLLECTION
      s.count += 1;
    }
    s.net += amt;
    if (t.method === "CASH") s.cash += amt; else s.electronic += amt;
  });
  Object.keys(s).forEach(function (k) {
    if (k !== "count") s[k] = equbMoney(s[k]);
  });
  return s;
}

/* Cash a collector collected on one business date (for daily limit) */
function equbCashForDate(collectorId, date) {
  var all = equbLoad(EQUB_KEYS.transactions, []);
  var mine = all.filter(function (t) {
    return t.collectorId === collectorId && t.date === date && t.method === "CASH";
  });
  return equbSummarize(mine).net;
}

/* Cash still with collector = all CASH net - settled cash */
function equbCashInHand(collectorId) {
  var all = equbLoad(EQUB_KEYS.transactions, []);
  var cash = equbSummarize(
    all.filter(function (t) { return t.collectorId === collectorId; })
  ).cash;
  var settled = equbLoad(EQUB_KEYS.settlements, [])
    .filter(function (x) { return x.collectorId === collectorId && x.status !== "VOIDED"; })
    .reduce(function (sum, x) { return sum + (Number(x.amount) || 0); }, 0);
  return equbMoney(cash - settled);
}

/* ---------- Collector session with expiry ---------- */
function equbGetCollectorSession() {
  var s = equbLoad(EQUB_KEYS.collectorSession, null);
  if (!s || !s.collectorId || !s.expiresAt) return null;
  if (Date.now() > s.expiresAt) {
    localStorage.removeItem(EQUB_KEYS.collectorSession);
    return null;
  }
  return s;
}

/* ---------- Demo data: only added if the key does NOT exist ---------- */
function equbSeedDemoData() {
  var now = new Date().toISOString();

  if (localStorage.getItem(EQUB_KEYS.members) === null) {
    equbSave(EQUB_KEYS.members, [
      { id: "MEM-0001", name: "Abebe Kebede",  phone: "0911000001", status: "ACTIVE", createdAt: now },
      { id: "MEM-0002", name: "Tigist Alemu",  phone: "0911000002", status: "ACTIVE", createdAt: now },
      { id: "MEM-0003", name: "Dawit Haile",   phone: "0911000003", status: "ACTIVE", createdAt: now }
    ]);
  }
  if (localStorage.getItem(EQUB_KEYS.groups) === null) {
    equbSave(EQUB_KEYS.groups, [
      { id: "GRP-0001", name: "Daily Equb 500", contributionAmount: 500,
        frequency: "Daily", maxMembers: 30, status: "ACTIVE", startDate: equbToday(), createdAt: now }
    ]);
  }
  if (localStorage.getItem(EQUB_KEYS.collectors) === null) {
    equbSave(EQUB_KEYS.collectors, [
      { id: "COL-0001", name: "Demo Collector", phone: "0922000001",
        pin: "1234",                       // DEMO ONLY. Never store PINs like this in production.
        status: "ACTIVE", dailyCashLimit: 20000, createdAt: now }
    ]);
  }
  if (localStorage.getItem(EQUB_KEYS.memberships) === null) {
    equbSave(EQUB_KEYS.memberships, [
      { id: "MSP-0001", memberId: "MEM-0001", groupId: "GRP-0001", joinedAt: now, status: "ACTIVE", leftAt: null },
      { id: "MSP-0002", memberId: "MEM-0002", groupId: "GRP-0001", joinedAt: now, status: "ACTIVE", leftAt: null },
      { id: "MSP-0003", memberId: "MEM-0003", groupId: "GRP-0001", joinedAt: now, status: "ACTIVE", leftAt: null }
    ]);
  }
  ["transactions", "corrections", "pending", "settlements", "payouts", "notifications"].forEach(function (k) {
    if (localStorage.getItem(EQUB_KEYS[k]) === null) equbSave(EQUB_KEYS[k], []);
  });
}
/* ---------- Admin session with expiry ---------- */
function equbGetAdminSession() {
  var s = equbLoad(EQUB_KEYS.adminSession, null);
  if (!s || !s.adminId || !s.expiresAt) return null;
  if (Date.now() > s.expiresAt) {
    localStorage.removeItem(EQUB_KEYS.adminSession);
    return null;
  }
  return s;
}

/* ---------- Group capacity: derived from membership records ---------- */
function equbActiveMemberCount(groupId) {
  return equbLoad(EQUB_KEYS.memberships, []).filter(function (x) {
    return x.groupId === groupId && x.status === "ACTIVE";
  }).length;
}