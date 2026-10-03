/* =========================================================
   T-CHOOB VIDEO — ADMIN.JS
   نسخه مخصوص video_orders / profiles / order_messages
   ========================================================= */

(() => {
	"use strict";

	const ACTIVE_STATUSES = [
		"new",
		"review",
		"approved",
		"production",
		"editing",
		"revision",
		"ready"
	];

	const state = {
		orders: [],
		profiles: new Map(),
		filter: "all",
		search: "",
		currentOrder: null,
		messages: [],
		files: [],
		history: []
	};

	const $ = (id) => document.getElementById(id);

	window.escapeAdminHTML = function (value) {
		return String(value ?? "").replace(/[&<>"']/g, (char) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#039;"
		}[char]));
	};

	function esc(value) {
		return window.escapeAdminHTML(value);
	}

	function formatDate(value) {
		if (!value) return "—";
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return "—";
		return new Intl.DateTimeFormat("fa-IR", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(d);
	}

	function profileName(profile) {
		if (!profile) return "کاربر ناشناس";
		const full = [profile.first_name, profile.last_name]
			.filter(Boolean)
			.join(" ")
			.trim();
		return full || profile.email || "کاربر";
	}

	function modelText(value) {
		return ({
			edit_only: "فقط تدوین",
			voice_ready: "تصویر و تدوین",
			visual_ready: "صوت و تدوین",
			script_ready: "صوت، تصویر و تدوین",
			full_production: "تولید کامل"
		}[value] || value || "—");
	}

	function statusText(value) {
		return ({
			new: "جدید",
			review: "در حال بررسی",
			approved: "تأیید شده",
			production: "در تولید",
			editing: "در حال تدوین",
			revision: "نیازمند اصلاح",
			ready: "آماده تحویل",
			completed: "تکمیل شده",
			cancelled: "لغو شده"
		}[value] || value || "—");
	}

	function roleText(value) {
		return value === "admin" ? "مدیر" : "کاربر";
	}

	function showError(target, message) {
		if (!target) return;
		target.innerHTML = `<div class="orders-error-message">${esc(message)}</div>`;
	}

	/* ---------------------------------------------------------
	   Theme
	   --------------------------------------------------------- */

	window.applyTchoobTheme = function () {
		const saved =
			localStorage.getItem("tchoob-theme") ||
			localStorage.getItem("tchoob-admin-theme");

		const dark = saved === "dark";

		document.documentElement.classList.toggle("dark-mode", dark);

		const button = $("theme");
		if (button) {
			button.textContent = dark ? "حالت روشن" : "حالت تاریک";
			button.setAttribute("aria-pressed", String(dark));
		}
	};

	window.toggleTchoobTheme = function (event) {
		if (event) event.stopPropagation();

		const dark =
			document.documentElement.classList.contains("dark-mode");

		localStorage.setItem("tchoob-theme", dark ? "light" : "dark");
		localStorage.setItem("tchoob-admin-theme", dark ? "light" : "dark");

		applyTchoobTheme();
	};

	applyTchoobTheme();

	/* ---------------------------------------------------------
	   Admin list
	   --------------------------------------------------------- */

	async function getAdmin() {
		if (!window.db) {
			window.location.href = "login.html";
			return null;
		}

		const result = await window.db.auth.getUser();

		if (result.error || !result.data?.user) {
			window.location.href = "login.html";
			return null;
		}

		const user = result.data.user;

		const profileResult = await window.db
			.from("profiles")
			.select("*")
			.eq("id", user.id)
			.maybeSingle();

		if (profileResult.error || !profileResult.data) {
			window.location.href = "login.html";
			return null;
		}

		if (profileResult.data.role !== "admin") {
			alert("دسترسی به بخش مدیریت فقط برای مدیر مجاز است.");
			window.location.href = "orders.html";
			return null;
		}

		return { user, profile: profileResult.data };
	}

	window.adminOrders = async function () {
		const body = $("orders-body");
		if (!body) return;

		const admin = await getAdmin();
		if (!admin) return;

		body.innerHTML = `
			<tr>
				<td colspan="7" class="table-loading">
					در حال دریافت سفارش‌ها...
				</td>
			</tr>`;

		// سفارش‌ها را جدا از پروفایل‌ها می‌خوانیم تا به نام constraint
		// رابطه‌ی Supabase وابسته نباشیم. این روش با schema فعلی پروژه امن‌تر است.
		const { data, error } = await window.db
			.from("video_orders")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) {
			console.error("ADMIN ORDERS ERROR:", error);
			body.innerHTML = `<tr><td colspan="7" class="table-loading">دریافت سفارش‌ها انجام نشد.<br><small>${esc(error.message || "خطای Supabase")}</small></td></tr>`;
			return;
		}

		state.orders = data || [];
		state.profiles.clear();

		const customerIds = [...new Set(state.orders.map(order => order.customer_id).filter(Boolean))];

		if (customerIds.length) {
			const { data: profiles, error: profileError } = await window.db
				.from("profiles")
				.select("id,first_name,last_name,email,phone,role")
				.in("id", customerIds);

			if (profileError) {
				console.warn("ADMIN PROFILE LOAD ERROR:", profileError);
			} else {
				(profiles || []).forEach(profile => state.profiles.set(profile.id, profile));
			}
		}

		updateStats();
		updateFilterCounts();
		renderAdminOrders();
	};

	function updateStats() {
		const orders = state.orders;

		if ($("total")) $("total").textContent = orders.length.toLocaleString("fa-IR");
		if ($("new")) $("new").textContent =
			orders.filter(x => x.status === "new").length.toLocaleString("fa-IR");
		if ($("progress")) $("progress").textContent =
			orders.filter(x => ACTIVE_STATUSES.includes(x.status) && x.status !== "new" && x.status !== "ready")
				.length.toLocaleString("fa-IR");
		if ($("ready")) $("ready").textContent =
			orders.filter(x => x.status === "ready").length.toLocaleString("fa-IR");
		if ($("completed")) $("completed").textContent =
			orders.filter(x => x.status === "completed").length.toLocaleString("fa-IR");
		if ($("cancelled")) $("cancelled").textContent =
			orders.filter(x => x.status === "cancelled").length.toLocaleString("fa-IR");
	}

	function updateFilterCounts() {
		const orders = state.orders;

		const counts = {
			all: orders.length,
			active: orders.filter(x => ACTIVE_STATUSES.includes(x.status)).length,
			completed: orders.filter(x => x.status === "completed").length,
			cancelled: orders.filter(x => x.status === "cancelled").length
		};

		Object.entries(counts).forEach(([key, value]) => {
			const el = $(`filter-${key}-count`);
			if (el) el.textContent = value.toLocaleString("fa-IR");
		});
	}

	function getFilteredOrders() {
		const query = state.search.trim().toLocaleLowerCase("fa");

		return state.orders.filter((order) => {
			const profile = state.profiles.get(order.customer_id) || order.customer || {};

			let filterOK = true;

			if (state.filter === "active") {
				filterOK = ACTIVE_STATUSES.includes(order.status);
			} else if (state.filter === "completed") {
				filterOK = order.status === "completed";
			} else if (state.filter === "cancelled") {
				filterOK = order.status === "cancelled";
			}

			if (!filterOK) return false;
			if (!query) return true;

			const haystack = [
				order.order_number,
				order.title,
				order.subject,
				order.status,
				profile.first_name,
				profile.last_name,
				profile.email,
				profile.phone
			].filter(Boolean).join(" ").toLocaleLowerCase("fa");

			return haystack.includes(query);
		});
	}

	function renderAdminOrders() {
		const body = $("orders-body");
		if (!body) return;

		const list = getFilteredOrders();

		const captions = {
			all: "همه سفارش‌ها",
			active: "سفارش‌های در حال انجام",
			completed: "سفارش‌های تکمیل شده",
			cancelled: "سفارش‌های لغو شده"
		};

		if ($("orders-caption")) {
			$("orders-caption").textContent = captions[state.filter];
		}

		if ($("visible-orders-count")) {
			$("visible-orders-count").textContent =
				`${list.length.toLocaleString("fa-IR")} سفارش`;
		}

		document.querySelectorAll(".filter-button").forEach(btn => {
			btn.classList.toggle("active", btn.dataset.filter === state.filter);
		});

		if (!list.length) {
			body.innerHTML = `
				<tr>
					<td colspan="7" class="table-loading">
						سفارشی با این فیلتر پیدا نشد.
					</td>
				</tr>`;
			return;
		}

		body.innerHTML = list.map((order, index) => {
			const profile = state.profiles.get(order.customer_id) || order.customer || {};
			const name = profileName(profile);

			return `
				<tr style="--row-index:${index}">
					<td>${esc(order.order_number)}</td>
					<td title="${esc(order.title)}">${esc(order.title)}</td>
					<td>${esc(name)}</td>
					<td>${esc(modelText(order.production_model))}</td>
					<td>
						<span class="status status-${esc(order.status)}">
							${esc(statusText(order.status))}
						</span>
					</td>
					<td>${esc(formatDate(order.created_at))}</td>
					<td>
						<a class="button secondary" href="admin-order.html?id=${encodeURIComponent(order.id)}">
							مدیریت
						</a>
					</td>
				</tr>`;
		}).join("");
	}

	window.filterAdminOrders = function (filter) {
		state.filter = filter || "all";
		renderAdminOrders();
	};

	window.searchAdminOrders = function (value) {
		state.search = value || "";
		renderAdminOrders();
	};

	/* ---------------------------------------------------------
	   Users
	   --------------------------------------------------------- */

	window.adminUsers = async function () {
		const body = $("users-body");
		if (!body) return;

		const admin = await getAdmin();
		if (!admin) return;

		body.innerHTML = `
			<tr><td colspan="6" class="table-loading">در حال دریافت کاربران...</td></tr>`;

		const { data, error } = await window.db
			.from("profiles")
			.select("id,email,first_name,last_name,phone,address,avatar_url,role,created_at,updated_at")
			.order("created_at", { ascending: false });

		if (error) {
			console.error("ADMIN USERS ERROR:", error);
			body.innerHTML = `<tr><td colspan="6" class="table-loading">دریافت کاربران انجام نشد.</td></tr>`;
			return;
		}

		state.profiles.clear();
		(data || []).forEach(profile => state.profiles.set(profile.id, profile));

		window.__adminUsers = data || [];
		renderUsers();
	};

	function renderUsers() {
		const body = $("users-body");
		if (!body) return;

		const query = ($("users-search")?.value || "").trim().toLocaleLowerCase("fa");
		const users = (window.__adminUsers || []).filter(user => {
			if (!query) return true;

			return [
				user.first_name,
				user.last_name,
				user.email,
				user.phone,
				user.role
			].filter(Boolean)
				.join(" ")
				.toLocaleLowerCase("fa")
				.includes(query);
		});

		if ($("users-count")) {
			$("users-count").textContent =
				`${users.length.toLocaleString("fa-IR")} کاربر`;
		}

		if (!users.length) {
			body.innerHTML = `<tr><td colspan="6" class="table-loading">کاربری پیدا نشد.</td></tr>`;
			return;
		}

		body.innerHTML = users.map((user, index) => {
			const name = profileName(user);

			return `
				<tr style="--row-index:${index}">
					<td>${esc(name)}</td>
					<td class="user-email-cell">${esc(user.email || "—")}</td>
					<td dir="ltr">${esc(user.phone || "—")}</td>
					<td>
						<span class="status ${user.role === "admin" ? "status-approved" : "status-new"}">
							${esc(roleText(user.role))}
						</span>
					</td>
					<td>${esc(formatDate(user.created_at))}</td>
					<td>
						<a class="button secondary" href="admin.html">سفارش‌ها</a>
					</td>
				</tr>`;
		}).join("");
	}

	/* ---------------------------------------------------------
	   Order detail
	   --------------------------------------------------------- */

	window.adminOrder = async function () {
		const root = $("order-root");
		if (!root) return;

		const admin = await getAdmin();
		if (!admin) return;

		const id = new URLSearchParams(window.location.search).get("id");

		if (!id) {
			root.innerHTML = `<section class="panel"><div class="empty-state">شناسه سفارش مشخص نیست.</div></section>`;
			return;
		}

		const { data: order, error } = await window.db
			.from("video_orders")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error || !order) {
			console.error("ADMIN ORDER ERROR:", error);
			root.innerHTML = `<section class="panel"><div class="orders-error-message">سفارش پیدا نشد.</div></section>`;
			return;
		}

		let customer = null;
		if (order.customer_id) {
			const profileResult = await window.db
				.from("profiles")
				.select("id,first_name,last_name,email,phone,address,avatar_url,role")
				.eq("id", order.customer_id)
				.maybeSingle();
			if (!profileResult.error) customer = profileResult.data;
		}

		order.customer = customer;
		state.currentOrder = order;

		if ($("sidebar-order-number")) {
			$("sidebar-order-number").textContent = order.order_number || "—";
		}

		renderOrderOverview();

		document.querySelectorAll(".order-sidebar-nav button").forEach(button => {
			button.addEventListener("click", () => {
				document.querySelectorAll(".order-sidebar-nav button").forEach(x => x.classList.remove("active"));
				button.classList.add("active");
				switchOrderSection(button.dataset.section);
			});
		});
	};

	function renderOrderOverview() {
		const order = state.currentOrder;
		const profile = order.customer || {};

		$("order-root").innerHTML = `
			<section class="panel order-detail-panel">
				<div class="panel-heading">
					<div>
						<span class="eyebrow">جزئیات سفارش</span>
						<h2>${esc(order.title || "بدون عنوان")}</h2>
						<p>${esc(order.order_number || "—")}</p>
					</div>
					<span class="status status-${esc(order.status)}">${esc(statusText(order.status))}</span>
				</div>

				<div class="order-info-grid" style="padding:20px">
					<div class="order-info-card">
						<h3>اطلاعات سفارش</h3>
						<div class="order-info-row"><span class="order-info-label">موضوع</span><strong class="order-info-value">${esc(order.subject)}</strong></div>
						<div class="order-info-row"><span class="order-info-label">مدل تولید</span><strong class="order-info-value">${esc(modelText(order.production_model))}</strong></div>
						<div class="order-info-row"><span class="order-info-label">مدت</span><strong class="order-info-value">${esc(order.estimated_duration || "—")}</strong></div>
						<div class="order-info-row"><span class="order-info-label">نسبت تصویر</span><strong class="order-info-value">${esc(order.aspect_ratio || "—")}</strong></div>
						<div class="order-info-row"><span class="order-info-label">کیفیت</span><strong class="order-info-value">${esc(order.output_quality || "—")}</strong></div>
						<div class="order-info-row"><span class="order-info-label">سبک</span><strong class="order-info-value">${esc(order.video_style || "—")}</strong></div>
					</div>

					<div class="order-info-card">
						<h3>اطلاعات مشتری</h3>
						<div class="order-info-row"><span class="order-info-label">نام</span><strong class="order-info-value">${esc(profileName(profile))}</strong></div>
						<div class="order-info-row"><span class="order-info-label">ایمیل</span><strong class="order-info-value">${esc(profile.email || "—")}</strong></div>
						<div class="order-info-row"><span class="order-info-label">تلفن</span><strong class="order-info-value">${esc(profile.phone || "—")}</strong></div>
						<div class="order-info-row"><span class="order-info-label">تاریخ ثبت</span><strong class="order-info-value">${esc(formatDate(order.created_at))}</strong></div>
						<div class="order-info-row"><span class="order-info-label">هزینه نهایی</span><strong class="order-info-value">${order.final_cost != null ? Number(order.final_cost).toLocaleString("fa-IR") + " تومان" : "تعیین نشده"}</strong></div>
					</div>

					<div class="order-info-card" style="grid-column:1/-1">
						<h3>توضیحات</h3>
						<p>${esc(order.description || "توضیحی ثبت نشده است.")}</p>
					</div>
				</div>
			</section>`;

		document.title = `${order.order_number || "سفارش"} | T-Choob Video`;
	}

	async function switchOrderSection(section) {
		if (section === "overview") {
			renderOrderOverview();
			return;
		}

		if (section === "messages") {
			await renderMessages();
			return;
		}

		if (section === "files") {
			await renderFiles();
			return;
		}

		if (section === "timeline") {
			await renderTimeline();
		}
	}

	async function renderMessages() {
		const order = state.currentOrder;
		const root = $("order-root");

		const { data, error } = await window.db
			.from("order_messages")
			.select("id,order_id,sender_id,message,created_at")
			.eq("order_id", order.id)
			.order("created_at", { ascending: true });

		if (error) {
			root.innerHTML = `<section class="panel"><div class="orders-error-message">گفتگو دریافت نشد.</div></section>`;
			return;
		}

		state.messages = data || [];

		root.innerHTML = `
			<section class="admin-chat">
				<div class="panel-heading">
					<div><span class="eyebrow">ارتباط</span><h2>گفتگو با مشتری</h2><p>${esc(order.order_number)}</p></div>
				</div>

				<div class="admin-chat-messages">
					${state.messages.length ? state.messages.map(message => `
						<div class="chat-message ${message.sender_id === order.customer_id ? "customer" : "admin"}">
							<div class="chat-message-meta">${message.sender_id === order.customer_id ? "مشتری" : "مدیریت"} · ${esc(formatDate(message.created_at))}</div>
							<div class="chat-message-text">${esc(message.message)}</div>
						</div>
					`).join("") : `<div class="empty-state">هنوز پیامی ثبت نشده است.</div>`}
				</div>

				<form class="admin-chat-composer" id="admin-chat-form">
					<textarea id="admin-chat-input" placeholder="پیام خود را بنویسید..." required></textarea>
					<div class="admin-chat-tools">
						<button class="button primary" type="submit">ارسال</button>
					</div>
				</form>
			</section>`;

		$("admin-chat-form")?.addEventListener("submit", async (event) => {
			event.preventDefault();

			const input = $("admin-chat-input");
			const message = input?.value.trim();
			if (!message) return;

			const admin = await getAdmin();
			if (!admin) return;

			const { error: insertError } = await window.db
				.from("order_messages")
				.insert({
					order_id: order.id,
					sender_id: admin.user.id,
					message
				});

			if (insertError) {
				alert("ارسال پیام انجام نشد.");
				return;
			}

			await renderMessages();
		});
	}

	async function renderFiles() {
		const order = state.currentOrder;
		const root = $("order-root");

		const { data, error } = await window.db
			.from("order_files")
			.select("*")
			.eq("order_id", order.id)
			.order("created_at", { ascending: false });

		if (error) {
			root.innerHTML = `<section class="panel"><div class="orders-error-message">فایل‌ها دریافت نشدند.</div></section>`;
			return;
		}

		state.files = data || [];

		root.innerHTML = `
			<section class="panel">
				<div class="panel-heading">
					<div><span class="eyebrow">مدیریت فایل</span><h2>فایل‌های سفارش</h2><p>${esc(order.order_number)}</p></div>
				</div>
				<div style="padding:20px">
					<div class="admin-files">
						${state.files.length ? state.files.map(file => `
							<a class="admin-file" href="${esc(file.file_url)}" target="_blank" rel="noopener">
								<span>📎</span>
								<span class="admin-file-name">${esc(file.file_name)}</span>
							</a>
						`).join("") : `<div class="empty-state">هنوز فایلی برای این سفارش ثبت نشده است.</div>`}
					</div>
				</div>
			</section>`;
	}

	async function renderTimeline() {
		const order = state.currentOrder;
		const root = $("order-root");

		const { data, error } = await window.db
			.from("order_status_history")
			.select("*")
			.eq("order_id", order.id)
			.order("created_at", { ascending: false });

		if (error) {
			root.innerHTML = `<section class="panel"><div class="orders-error-message">تاریخچه وضعیت دریافت نشد.</div></section>`;
			return;
		}

		state.history = data || [];

		root.innerHTML = `
			<section class="panel">
				<div class="panel-heading">
					<div><span class="eyebrow">Timeline</span><h2>تاریخچه وضعیت</h2><p>تغییرات ثبت‌شده برای این سفارش</p></div>
				</div>
				<div style="padding:20px">
					<div class="messages">
						${state.history.length ? state.history.map(item => `
							<div class="file-row">
								<div>
									<strong>${esc(statusText(item.status))}</strong>
									<div class="muted">${esc(item.note || "بدون توضیح")}</div>
								</div>
								<time class="muted">${esc(formatDate(item.created_at))}</time>
							</div>
						`).join("") : `<div class="empty-state">تاریخچه‌ای ثبت نشده است.</div>`}
					</div>
				</div>
			</section>`;
	}

	/* ---------------------------------------------------------
	   Page boot
	   --------------------------------------------------------- */

	document.addEventListener("DOMContentLoaded", async () => {
		applyTchoobTheme();

		const refresh = $("refresh");
		if (refresh) {
			refresh.addEventListener("click", () => {
				if ($("orders-body")) adminOrders();
				else if ($("users-body")) adminUsers();
			});
		}

		$("users-search")?.addEventListener("input", renderUsers);

		// تعیین صفحه به‌صورت خودکار؛ لازم نیست در HTML هر صفحه تابع جداگانه صدا زده شود.
		if ($("orders-body")) {
			await adminOrders();
		} else if ($("users-body")) {
			await adminUsers();
		} else if ($("order-root")) {
			await adminOrder();
		}
	});
})();
