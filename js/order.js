"use strict";

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

function getStatusLabel(status) {
	return STATUS_LABELS[status] || status || "نامشخص";
}

function setText(id, value) {
	const element = document.getElementById(id);

	if (element) {
		element.textContent =
			value === null ||
			value === undefined ||
			value === ""
				? "—"
				: String(value);
	}
}

function getOrderId() {
	const params = new URLSearchParams(window.location.search);

	return params.get("id");
}

async function getCurrentUser() {
	const {
		data: { user },
		error
	} = await window.db.auth.getUser();

	if (error) {
		throw error;
	}

	return user;
}

async function loadOrder() {
	const loading = document.getElementById("order-loading");
	const errorBox = document.getElementById("order-error");
	const errorText = document.getElementById("order-error-text");
	const content = document.getElementById("order-content");

	const orderId = getOrderId();

	if (!orderId) {
		loading.classList.add("hidden");
		errorBox.classList.remove("hidden");
		errorText.textContent = "شناسه سفارش مشخص نشده است.";
		return;
	}

	try {
		const user = await getCurrentUser();

		if (!user) {
			window.location.href = "login.html";
			return;
		}

		const {
			data: order,
			error
		} = await window.db
			.from("video_orders")
			.select("*")
			.eq("id", orderId)
			.eq("user_id", user.id)
			.maybeSingle();

		if (error) {
			throw error;
		}

		if (!order) {
			throw new Error("این سفارش پیدا نشد یا دسترسی به آن ندارید.");
		}

		renderOrder(order);

		await loadOrderFiles(order.id);

		loading.classList.add("hidden");
		content.classList.remove("hidden");

	} catch (error) {
		console.error("LOAD ORDER ERROR:", error);

		loading.classList.add("hidden");
		errorBox.classList.remove("hidden");

		errorText.textContent =
			error?.message ||
			"خطایی هنگام دریافت سفارش رخ داد.";
	}
}

function renderOrder(order) {
	const status = String(order.status || "new").toLowerCase();

	document.title =
		`${order.title || "سفارش"} | T-Choob Video`;

	setText(
		"page-title",
		order.title || "جزئیات سفارش"
	);

	setText(
		"page-subtitle",
		`شناسه سفارش: ${order.id}`
	);

	setText(
		"order-title",
		order.title || order.name
	);

	setText(
		"order-subject",
		order.subject
	);

	setText(
		"order-description",
		order.description
	);

	setText(
		"order-model",
		order.production_model || order.model
	);

	setText(
		"order-duration",
		order.estimated_duration
	);

	setText(
		"order-aspect",
		order.aspect_ratio
	);

	setText(
		"order-quality",
		order.output_quality
	);

	setText(
		"order-style",
		order.video_style
	);

	setText(
		"order-notes",
		order.special_notes
	);

	setText(
		"order-id",
		order.id
	);

	setText(
		"order-created",
		`ثبت شده در ${formatDate(order.created_at)}`
	);

	setText(
		"order-updated",
		formatDate(order.updated_at || order.created_at)
	);

	const statusElement = document.getElementById("order-status");

	statusElement.textContent = getStatusLabel(status);
	statusElement.className =
		"status-badge " + getStatusClass(status);
}

async function loadOrderFiles(orderId) {
	const filesCard = document.getElementById("files-card");
	const filesContainer = document.getElementById("order-files");

	try {
		const {
			data: files,
			error
		} = await window.db
			.from("order_files")
			.select("*")
			.eq("order_id", orderId)
			.order("created_at", {
				ascending: true
			});

		if (error) {
			console.warn("FILES LOAD WARNING:", error);
			return;
		}

		if (!files || !files.length) {
			return;
		}

		filesCard.classList.remove("hidden");

		filesContainer.innerHTML = files.map(file => {
			const url =
				file.file_url ||
				file.url ||
				"";

			const name =
				file.file_name ||
				file.name ||
				file.file_path ||
				"فایل سفارش";

			if (!url) {
				return `
					<div class="file-item">
						<div>
							<div class="file-name">
								${escapeHtml(name)}
							</div>

							<div class="file-type">
								فایل ثبت شده
							</div>
						</div>
					</div>
				`;
			}

			return `
				<a
					class="file-item"
					href="${escapeHtml(url)}"
					target="_blank"
					rel="noopener noreferrer"
				>

					<div>
						<div class="file-name">
							${escapeHtml(name)}
						</div>

						<div class="file-type">
							مشاهده فایل
						</div>
					</div>

					<span class="order-action">
						مشاهده
					</span>

				</a>
			`;
		}).join("");

	} catch (error) {
		console.warn("ORDER FILES WARNING:", error);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	if (!window.db) {
		console.error("window.db is not initialized.");
		return;
	}

	loadOrder();
});
