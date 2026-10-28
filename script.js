(function () {
  "use strict";

  const STORAGE_KEY = "dssc-academic-requests-v1";
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  const seedRequests = [
    { id: "REQ-001", serviceType: "Document Requisition", dateFiled: "2026-10-20", status: "Pending", urgency: "Normal" },
    { id: "REQ-002", serviceType: "Subject Overload Permit", dateFiled: "2026-10-15", status: "Approved", urgency: "Normal" },
    { id: "REQ-003", serviceType: "Document Requisition", dateFiled: "2026-10-08", status: "Pending", urgency: "Low" },
    { id: "REQ-004", serviceType: "Enrollment Appeal", dateFiled: "2026-09-28", status: "Rejected", urgency: "High" },
    { id: "REQ-005", serviceType: "Grade Correction", dateFiled: "2026-09-14", status: "Approved", urgency: "Normal" },
    { id: "REQ-006", serviceType: "Document Requisition", dateFiled: "2026-09-02", status: "Approved", urgency: "Low" }
  ];
  const activeUnits = [{ course: "IT 301", units: 3 }, { course: "IT 302", units: 3 }, { course: "IT 303", units: 3 }, { course: "IT 304", units: 3 }, { course: "IT 305", units: 3 }, { course: "GE 201", units: 3 }, { course: "PE 4", units: 3 }];
  const clearanceItems = [{ name: "Library book due", cleared: false }];
  const allowedStatuses = ["Pending", "Approved", "Rejected"];
  const elements = {
    pageShell: document.querySelector(".page-shell"),
    content: document.querySelector(".content"),
    sidebar: document.getElementById("sidebar"),
    primaryNav: document.getElementById("primary-nav"),
    topbarPageTitle: document.getElementById("topbar-page-title"),
    menuToggle: document.getElementById("menu-toggle"),
    closeButton: document.getElementById("sidebar-close"),
    backdrop: document.getElementById("sidebar-backdrop"),
    tbody: document.getElementById("requests-body"),
    dashboardTbody: document.getElementById("dashboard-requests-body"),
    requestCount: document.getElementById("request-count"),
    metricPending: document.getElementById("pending-count"),
    metricUnits: document.getElementById("active-units"),
    metricDeficiencies: document.getElementById("deficiency-count"),
    clearanceNote: document.getElementById("clearance-note"),
    filterButtons: Array.from(document.querySelectorAll(".filter-chip")),
    navLinks: Array.from(document.querySelectorAll(".nav-link[data-page]")),
    pages: Array.from(document.querySelectorAll(".page[data-page]")),
    form: document.getElementById("request-form"),
    category: document.getElementById("service-category"),
    details: document.getElementById("request-details"),
    urgencyInputs: Array.from(document.querySelectorAll('input[name="urgency"]')),
    submitButton: document.getElementById("submit-button"),
    success: document.getElementById("form-success"),
    resetDemo: document.getElementById("reset-demo")
  };
  let requests = loadRequests();
  let activeFilter = "All";
  let successTimer;
  let drawerOpen = false;
  let currentPageName = "";

  function cloneSeed() {
    return seedRequests.map(function (request) { return Object.assign({}, request); });
  }

  function isValidRequest(request) {
    return request && typeof request.id === "string" &&
      typeof request.serviceType === "string" &&
      typeof request.dateFiled === "string" &&
      allowedStatuses.includes(request.status);
  }

  function loadRequests() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return cloneSeed();
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.every(isValidRequest) ? parsed : cloneSeed();
    } catch (error) {
      console.warn("Unable to load saved demo requests; using the sample data.", error);
      return cloneSeed();
    }
  }

  function saveRequests() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error("Unable to save requests to local storage.", error);
    }
  }

  function visibleRequests() {
    return activeFilter === "All"
      ? requests
      : requests.filter(function (request) { return request.status === activeFilter; });
  }

  function formatDate(dateString) {
    const date = new Date(dateString + "T12:00:00");
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function makeCell(label, value) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    if (value instanceof Node) cell.appendChild(value);
    else cell.textContent = value;
    return cell;
  }

  function renderRows(tbody, shown) {
    tbody.replaceChildren();
    if (shown.length === 0) {
      const row = document.createElement("tr");
      row.className = "empty-row";
      const cell = document.createElement("td");
      cell.className = "empty-cell";
      cell.colSpan = 4;
      cell.textContent = "No requests with this status.";
      row.appendChild(cell);
      tbody.appendChild(row);
    }
    shown.forEach(function (request) {
      const row = document.createElement("tr");
      const badge = document.createElement("span");
      badge.className = "status-badge status-" + request.status.toLowerCase();
      badge.textContent = request.status;
      row.append(
        makeCell("Request ID", request.id),
        makeCell("Service Type", request.serviceType),
        makeCell("Date Filed", formatDate(request.dateFiled)),
        makeCell("Status", badge)
      );
      tbody.appendChild(row);
    });
  }

  function renderTable() {
    const shown = visibleRequests();
    renderRows(elements.dashboardTbody, requests.slice(0, 5));
    renderRows(elements.tbody, shown);
    elements.requestCount.textContent = "Showing " + shown.length + " of " + requests.length;
  }

  function renderMetrics() {
    elements.metricUnits.textContent = String(activeUnits.reduce(function (total, course) { return total + course.units; }, 0));
    elements.metricPending.textContent = String(visibleRequests().filter(function (request) { return request.status === "Pending"; }).length);
    const deficiencies = clearanceItems.filter(function (item) { return !item.cleared; });
    elements.metricDeficiencies.textContent = String(deficiencies.length);
    elements.clearanceNote.textContent = deficiencies.length ? deficiencies[0].name + " needs attention" : "No outstanding items";
  }

  function showFieldError(input, errorElement, message) {
    input.setAttribute("aria-invalid", "true");
    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  function clearFieldError(input, errorElement) {
    input.removeAttribute("aria-invalid");
    errorElement.textContent = "";
    errorElement.hidden = true;
  }

  function validateCategory() {
    const error = document.getElementById("category-error");
    if (!elements.category.value) {
      showFieldError(elements.category, error, "Choose a service category.");
      return false;
    }
    clearFieldError(elements.category, error);
    return true;
  }

  function validateDetails() {
    const error = document.getElementById("details-error");
    if (elements.details.value.trim().length < 10) {
      showFieldError(elements.details, error, "Enter at least 10 characters.");
      return false;
    }
    clearFieldError(elements.details, error);
    return true;
  }

  function validateUrgency() {
    const error = document.getElementById("urgency-error");
    if (!elements.urgencyInputs.some(function (input) { return input.checked; })) {
      elements.urgencyInputs.forEach(function (input) { input.setAttribute("aria-invalid", "true"); });
      error.textContent = "Choose an urgency level.";
      error.hidden = false;
      return false;
    }
    elements.urgencyInputs.forEach(function (input) { input.removeAttribute("aria-invalid"); });
    error.textContent = "";
    error.hidden = true;
    return true;
  }

  function nextRequestId() {
    const highestId = requests.reduce(function (highest, request) {
      const match = /^REQ-(\d+)$/.exec(request.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    return "REQ-" + String(highestId + 1).padStart(3, "0");
  }

  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    elements.sidebar.classList.remove("is-open");
    elements.sidebar.setAttribute("aria-hidden", "true");
    elements.sidebar.inert = true;
    elements.pageShell.inert = false;
    elements.backdrop.hidden = true;
    elements.menuToggle.setAttribute("aria-expanded", "false");
    elements.menuToggle.setAttribute("aria-label", "Open navigation");
    document.body.classList.remove("sidebar-open");
    elements.menuToggle.focus();
  }

  function openDrawer() {
    drawerOpen = true;
    elements.sidebar.classList.add("is-open");
    elements.sidebar.setAttribute("aria-hidden", "false");
    elements.sidebar.inert = false;
    elements.pageShell.inert = true;
    elements.backdrop.hidden = false;
    elements.menuToggle.setAttribute("aria-expanded", "true");
    elements.menuToggle.setAttribute("aria-label", "Close navigation");
    document.body.classList.add("sidebar-open");
    elements.closeButton.focus();
  }

  function showPage(name, focusHeading) {
    const page = elements.pages.find(function (item) { return item.dataset.page === name; });
    if (!page) return false;

    elements.pages.forEach(function (item) {
      const active = item === page;
      item.classList.toggle("active", active);
      item.hidden = !active;
    });
    elements.navLinks.forEach(function (link) {
      const active = link.dataset.page === name;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const heading = page.querySelector("h1");
    elements.topbarPageTitle.textContent = heading.textContent;
    elements.content.scrollTo({ top: 0, behavior: "auto" });

    if (typeof renderMetrics === "function") renderMetrics();
    if (typeof renderTable === "function") renderTable();
    if (window.matchMedia("(max-width: 767px)").matches) closeDrawer();
    currentPageName = name;
    if (heading && focusHeading !== false) heading.focus({ preventScroll: true });
    return true;
  }

  function showLocationPage(shouldFocus) {
    const requestedPage = window.location.hash.slice(1);
    const pageName = elements.pages.some(function (page) { return page.dataset.page === requestedPage; })
      ? requestedPage
      : "dashboard";

    if (window.location.hash !== "#" + pageName) {
      window.history.replaceState(null, "", "#" + pageName);
    }
    if (pageName === currentPageName) return;
    showPage(pageName, shouldFocus);
  }

  elements.category.disabled = false;
  elements.submitButton.disabled = false;
  elements.menuToggle.addEventListener("click", function () {
    if (window.matchMedia("(min-width: 768px)").matches) {
      const collapsed = document.body.classList.toggle("sidebar-collapsed");
      elements.menuToggle.setAttribute("aria-expanded", String(!collapsed));
      elements.menuToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    } else if (drawerOpen) closeDrawer();
    else openDrawer();
  });
  elements.closeButton.addEventListener("click", closeDrawer);
  elements.backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && drawerOpen) {
      closeDrawer();
      elements.menuToggle.focus();
    }
  });
  elements.primaryNav.addEventListener("click", function (event) {
    const link = event.target.closest("a[data-page]");
    if (!link || !elements.primaryNav.contains(link)) return;
    event.preventDefault();
    const pageName = link.dataset.page;
    if (!elements.pages.some(function (page) { return page.dataset.page === pageName; })) return;
    if (window.location.hash !== "#" + pageName) {
      window.history.pushState(null, "", "#" + pageName);
    }
    showPage(pageName);
  });
  window.addEventListener("popstate", showLocationPage);
  window.addEventListener("hashchange", showLocationPage);

  elements.filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter;
      elements.filterButtons.forEach(function (chip) { chip.setAttribute("aria-pressed", String(chip === button)); });
      renderTable();
      renderMetrics();
    });
  });

  elements.category.addEventListener("blur", validateCategory);
  elements.category.addEventListener("change", validateCategory);
  elements.details.addEventListener("blur", validateDetails);
  elements.details.addEventListener("input", function () {
    if (elements.details.hasAttribute("aria-invalid")) validateDetails();
  });
  elements.urgencyInputs.forEach(function (input) {
    input.addEventListener("blur", validateUrgency);
    input.addEventListener("change", validateUrgency);
  });

  elements.form.addEventListener("submit", function (event) {
    event.preventDefault();
    const validCategory = validateCategory();
    const validDetails = validateDetails();
    const validUrgency = validateUrgency();
    if (!validCategory || !validDetails || !validUrgency) {
      if (!validCategory) elements.category.focus();
      else if (!validDetails) elements.details.focus();
      else elements.urgencyInputs[0].focus();
      return;
    }
    elements.submitButton.disabled = true;
    elements.submitButton.textContent = "Submitting…";
    const requestId = nextRequestId();
    requests.unshift({
      id: requestId,
      serviceType: elements.category.value,
      dateFiled: new Date().toISOString().slice(0, 10),
      status: "Pending",
      urgency: elements.urgencyInputs.find(function (input) { return input.checked; }).value
    });
    saveRequests();
    activeFilter = "All";
    elements.filterButtons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.filter === "All")); });
    renderTable();
    renderMetrics();
    elements.form.reset();
    [elements.category, elements.details].forEach(function (input) {
      clearFieldError(input, document.getElementById(input === elements.category ? "category-error" : "details-error"));
    });
    elements.success.textContent = "Request " + requestId + " submitted successfully.";
    elements.success.hidden = false;
    clearTimeout(successTimer);
    successTimer = setTimeout(function () { elements.success.hidden = true; }, 4000);
    elements.submitButton.disabled = false;
    elements.submitButton.textContent = "Submit request";
  });

  elements.form.addEventListener("reset", function () {
    window.setTimeout(function () {
      clearFieldError(elements.category, document.getElementById("category-error"));
      clearFieldError(elements.details, document.getElementById("details-error"));
      elements.urgencyInputs.forEach(function (input) { input.removeAttribute("aria-invalid"); });
      const urgencyError = document.getElementById("urgency-error");
      urgencyError.textContent = "";
      urgencyError.hidden = true;
    }, 0);
  });

  elements.resetDemo.addEventListener("click", function () {
    requests = cloneSeed();
    activeFilter = "All";
    saveRequests();
    elements.filterButtons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.filter === "All")); });
    renderTable();
    renderMetrics();
    elements.success.textContent = "Demo data has been reset.";
    elements.success.hidden = false;
    clearTimeout(successTimer);
    successTimer = setTimeout(function () { elements.success.hidden = true; }, 4000);
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 768px)").matches && drawerOpen) closeDrawer();
    if (window.matchMedia("(min-width: 768px)").matches) {
      elements.sidebar.setAttribute("aria-hidden", "false");
      elements.sidebar.inert = false;
      elements.menuToggle.setAttribute("aria-expanded", String(!document.body.classList.contains("sidebar-collapsed")));
      elements.menuToggle.setAttribute("aria-label", document.body.classList.contains("sidebar-collapsed") ? "Expand sidebar" : "Collapse sidebar");
    } else if (!drawerOpen) {
      elements.sidebar.setAttribute("aria-hidden", "true");
      elements.sidebar.inert = true;
      elements.menuToggle.setAttribute("aria-expanded", "false");
      elements.menuToggle.setAttribute("aria-label", "Open navigation");
    }
  });

  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  elements.sidebar.setAttribute("aria-hidden", isDesktop ? "false" : "true");
  elements.sidebar.inert = !isDesktop;
  elements.pageShell.inert = false;
  elements.menuToggle.setAttribute("aria-expanded", String(isDesktop));
  elements.menuToggle.setAttribute("aria-label", isDesktop ? "Collapse sidebar" : "Open navigation");
  showLocationPage(false);
}());
