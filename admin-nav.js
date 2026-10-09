/* admin-nav.js - one menu for all admin pages. Load it AFTER equb-core.js */
(function () {
  var nav = document.querySelector(".nav");
  if (!nav || typeof equbLoad !== "function") return;

  var items = [
    ["index.html", "Dashboard"], ["members.html", "Members"], ["equb.html", "Equb Groups"],
    ["collectors.html", "Collectors"], ["transactions.html", "Transactions"],
    ["correction-requests.html", "Correction Requests"], ["settlements.html", "Settlements"],
    ["payout.html", "Payout Schedule"], ["reports.html", "Reports"],
    ["notifications.html", "Notifications"], ["settings.html", "Settings"]
  ];
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  var unread = 0;
  try {
    unread = equbLoad(EQUB_KEYS.notifications, []).filter(function (n) {
      return !n.read && n.recipientRole === "ADMIN";
    }).length;
  } catch (e) {}

  nav.innerHTML = "";
  items.forEach(function (it) {
    var a = document.createElement("a");
    a.href = it[0];
    a.textContent = it[1] + (it[0] === "notifications.html" && unread ? " (" + unread + ")" : "");
    if (it[0] === page) { a.style.fontWeight = "bold"; a.style.textDecoration = "underline"; }
    nav.appendChild(a);
  });
})();