"use strict";

let currentOrders = [];

const STATUS_LABELS = {
	new: "جدید",
	pending: "در انتظار بررسی",
	processing: "در حال انجام",
	in_progress: "در حال انجام",
	review: "در حال بررسی",
	completed: "تکمیل شده",
	cancelled: "لغو شده",
	canceled: "لغو شده"
};

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/[&<>"']/g, char => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#039;"
		}[char]));
}

function formatDate(value) {
	if (!value) {
		return "—";
	}

	try {
		return new Intl.DateTimeFormat("fa-IR", {
			dateStyle: "medium",
			timeStyle: "short"
		}).format(new Date(value));
	} catch {
		return "—";
	}
}

function formatDuration(value) {
	if (value === null || value === undefined || value === "") {
		return "—";
	}

	return String(value);
}

function getOrderTitle(order) {
	return (
		order.title ||
		order.name ||
		order.subject ||
		"سفارش ویدئویی"
	);
}

function getOrderModel(order) {
	return (
		order.production_model ||
		order.model ||
		"—"
	);
}

function getOrderStatus(order) {
	return String(order.status || "new").toLowerCase();
}

function getStatusLabel(status) {
	return STATUS_LABELS[status] || status || "نامشخص";
}

function getStatusClass(status) {
	switch (status) {
		case "completed":
			return "status-completed";

		case "cancelled":
		case "canceled":
			return "status-cancelled";

		case "pending":
			return "status-pending";

		case "processing":
		case "in_progress":
		case "review":
			return "status-processing";

		default:
			return "status-new";
	}
}

function getShortId(id) {
	if (!id) {
		return "—";
	}

	return String(id).slice(0, 8).toUpperCase();
}

async function getUser() {
	if (!window.db) {
		throw new Error("اتصال به Supabase برقرار نشده است.");
	}

	const {
		data: { user },
		error
	} = await window.db.auth.getUser();

	if (error) {
		throw error;
	}

	return user;
}

async function loadOrders() {
	const loading = document.getElementById("orders-loading");
	const errorBox = document.getElementById("orders-error");
	const errorText = document.getElementById("orders-error-text");
	const emptyBox = document.getElementById("orders-empty");
	const tableWrapper = document.getElementById("orders-table-wrapper");
	const tableBody = document.getElementById("orders-table-body");
	const refreshButton = document.getElementById("refresh-orders");

	loading.classList.remove("hidden");
	errorBox.classList.add("hidden");
	emptyBox.classList.add("hidden");
	tableWrapper.classList.add("hidden");

	tableBody.innerHTML = "";

	refreshButton.disabled = true;

	try {
		const user = await getUser();

		if (!user) {
			window.location.href = "login.html";
			return;
		}

		const {
			data,
			error
		} = await window.db
			.from("video_orders")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", {
				ascending: false
			});

		if (error) {
			throw error;
		}

		currentOrders = data || [];

		updateSummary(currentOrders);

		loading.classList.add("hidden");

		if (!currentOrders.length) {
			emptyBox.classList.remove("hidden");
			return;
		}

		renderOrders(currentOrders);

		tableWrapper.classList.remove("hidden");

	} catch (error) {
		console.error("LOAD ORDERS ERROR:", error);

		loading.classList.add("hidden");
		errorBox.classList.remove("hidden");

		errorText.textContent =
			error?.message ||
			"خطایی هنگام دریافت سفارش‌ها رخ داد.";

	} finally {
		refreshButton.disabled = false;
	}
}

function updateSummary(orders) {
	const total = orders.length;

	const completed = orders.filter(order => {
		return getOrderStatus(order) === "completed";
	}).length;

	const active = orders.filter(order => {
		const status = getOrderStatus(order);

		return ![
			"completed",
			"cancelled",
			"canceled"
		].includes(status);
	}).length;

	document.getElementById("total-orders").textContent =
		total.toLocaleString("fa-IR");

	document.getElementById("active-orders").textContent =
		active.toLocaleString("fa-IR");

	document.getElementById("completed-orders").textContent =
		completed.toLocaleString("fa-IR");
}

function renderOrders(orders) {
	const body = document.getElementById("orders-table-body");

	body.innerHTML = orders.map(order => {
		const status = getOrderStatus(order);

		return `
			<tr>

				<td>
					<div class="order-title">
						${escapeHtml(getOrderTitle(order))}
					</div>

					<div class="order-meta">
						شناسه #${escapeHtml(getShortId(order.id))}
					</div>
				</td>

				<td>
					${escapeHtml(getOrderModel(order))}
				</td>

				<td>
					${escapeHtml(formatDuration(order.estimated_duration))}
				</td>

				<td>
					<span class="status-badge ${getStatusClass(status)}">
						${escapeHtml(getStatusLabel(status))}
					</span>
				</td>

				<td>
					${escapeHtml(formatDate(order.created_at))}
				</td>

				<td>
					<a
						class="order-action"
						href="order.html?id=${encodeURIComponent(order.id)}"
					>
						مشاهده جزئیات
					</a>
				</td>

			</tr>
		`;
	}).join("");
}

document.addEventListener("DOMContentLoaded", () => {
	document
		.getElementById("refresh-orders")
		.addEventListener("click", loadOrders);

	document
		.getElementById("retry-orders")
		.addEventListener("click", loadOrders);

	loadOrders();
});
