"use strict";

const STATUS_LABELS = {
	pending: "در انتظار بررسی",
	processing: "در حال انجام",
	in_progress: "در حال انجام",
	review: "در حال بررسی",
	completed: "تکمیل‌شده",
	delivered: "تحویل‌شده",
	cancelled: "لغوشده",
	canceled: "لغوشده"
};

function escapeHtml(value) {
	if (value === null || value === undefined) {
		return "";
	}

	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
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
	if (!value) {
		return "—";
	}

	return escapeHtml(value);
}

function getStatusLabel(status) {
	if (!status) {
		return "نامشخص";
	}

	return STATUS_LABELS[status] || status;
}

function getStatusClass(status) {
	switch (status) {
		case "completed":
		case "delivered":
			return "success";

		case "processing":
		case "in_progress":
		case "review":
			return "info";

		case "cancelled":
		case "canceled":
			return "danger";

		case "pending":
		default:
			return "warning";
	}
}

function updateSummary(orders) {
	const totalElement = document.getElementById("orders-count");
	const pendingElement = document.getElementById("pending-count");
	const processingElement = document.getElementById("processing-count");
	const completedElement = document.getElementById("completed-count");

	const pending = orders.filter(order =>
		order.status === "pending"
	).length;

	const processing = orders.filter(order =>
		["processing", "in_progress", "review"].includes(order.status)
	).length;

	const completed = orders.filter(order =>
		["completed", "delivered"].includes(order.status)
	).length;

	if (totalElement) {
		totalElement.textContent = orders.length.toLocaleString("fa-IR");
	}

	if (pendingElement) {
		pendingElement.textContent = pending.toLocaleString("fa-IR");
	}

	if (processingElement) {
		processingElement.textContent = processing.toLocaleString("fa-IR");
	}

	if (completedElement) {
		completedElement.textContent = completed.toLocaleString("fa-IR");
	}
}

function renderOrders(orders) {
	const loading = document.getElementById("orders-loading");
	const errorBox = document.getElementById("orders-error");
	const emptyBox = document.getElementById("orders-empty");
	const tableWrapper = document.getElementById("orders-table-wrapper");
	const tableBody = document.getElementById("orders-table-body");

	if (loading) {
		loading.hidden = true;
	}

	if (errorBox) {
		errorBox.hidden = true;
	}

	if (!orders || orders.length === 0) {
		if (emptyBox) {
			emptyBox.hidden = false;
		}

		if (tableWrapper) {
			tableWrapper.hidden = true;
		}

		updateSummary([]);

		return;
	}

	if (emptyBox) {
		emptyBox.hidden = true;
	}

	if (tableWrapper) {
		tableWrapper.hidden = false;
	}

	if (!tableBody) {
		return;
	}

	tableBody.innerHTML = orders.map(order => {
		const statusClass = getStatusClass(order.status);
		const statusLabel = getStatusLabel(order.status);

		return `
			<tr>
				<td>
					<strong>${escapeHtml(order.title || "بدون عنوان")}</strong>
				</td>

				<td>
					${escapeHtml(order.subject || "—")}
				</td>

				<td>
					${formatDuration(order.estimated_duration)}
				</td>

				<td>
					${escapeHtml(order.production_model || "—")}
				</td>

				<td>
					<span class="status ${statusClass}">
						${escapeHtml(statusLabel)}
					</span>
				</td>

				<td>
					${formatDate(order.created_at)}
				</td>

				<td>
					<a
						class="button secondary small"
						href="order.html?id=${encodeURIComponent(order.id)}"
					>
						مشاهده
					</a>
				</td>
			</tr>
		`;
	}).join("");

	updateSummary(orders);
}

async function loadOrders() {
	const loading = document.getElementById("orders-loading");
	const errorBox = document.getElementById("orders-error");
	const emptyBox = document.getElementById("orders-empty");
	const tableWrapper = document.getElementById("orders-table-wrapper");

	if (loading) {
		loading.hidden = false;
	}

	if (errorBox) {
		errorBox.hidden = true;
		errorBox.textContent = "";
	}

	if (emptyBox) {
		emptyBox.hidden = true;
	}

	if (tableWrapper) {
		tableWrapper.hidden = true;
	}

	try {
		if (!window.db) {
			throw new Error("اتصال به Supabase برقرار نشده است.");
		}

		const {
			data: { user },
			error: userError
		} = await window.db.auth.getUser();

		if (userError) {
			throw userError;
		}

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

		renderOrders(data || []);

	} catch (error) {
		console.error("LOAD ORDERS ERROR:", error);

		if (loading) {
			loading.hidden = true;
		}

		if (errorBox) {
			errorBox.hidden = false;
			errorBox.textContent =
				error?.message ||
				"دریافت سفارش‌ها با خطا مواجه شد.";
		}
	}
}

document.addEventListener("DOMContentLoaded", async () => {

	const refreshButton = document.getElementById("refresh-orders");

	if (refreshButton) {
		refreshButton.addEventListener("click", loadOrders);
	}

	await loadOrders();
});
