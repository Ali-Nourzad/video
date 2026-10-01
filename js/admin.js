"use strict";


/*
 * Admin panel
 * مدیریت سفارشات، کاربران، جزئیات سفارش و چت ادمین
 */


let adminOrdersData = [];
let adminCurrentFilter = "all";


/* --------------------------------------------------
   ابزارهای کمکی
-------------------------------------------------- */

function adminEsc(value) {

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


function adminDate(value) {

	if (!value) {
		return "-";
	}

	try {

		return new Date(value).toLocaleString(
			"fa-IR",
			{
				dateStyle: "short",
				timeStyle: "short"
			}
		);

	} catch (error) {

		return value;

	}
}


function adminModelText(value) {

	const models = {

		"full": "تولید کامل",

		"script": "اسکریپت",

		"voice": "گویندگی",

		"editing": "تدوین",

		"animation": "انیمیشن",

		"motion": "موشن گرافیک"

	};

	return models[value] || value || "-";
}


function adminStatusText(value) {

	const statuses = {

		"new": "جدید",

		"review": "در حال بررسی",

		"approved": "تأیید شده",

		"production": "در حال تولید",

		"editing": "در حال تدوین",

		"revision": "نیازمند اصلاح",

		"ready": "آماده تحویل",

		"completed": "تکمیل شده",

		"cancelled": "لغو شده"

	};

	return statuses[value] || value || "-";
}


function adminPaymentText(value) {

	const payments = {

		"pending": "در انتظار پرداخت",

		"unpaid": "پرداخت نشده",

		"paid": "پرداخت شده",

		"partial": "پرداخت ناقص",

		"refunded": "بازپرداخت شده"

	};

	return payments[value] || value || "-";
}


function adminProgressStatus(status) {

	return [
		"new",
		"review",
		"approved",
		"production",
		"editing",
		"revision",
		"ready"
	].includes(status);

}


function adminCustomerName(profile) {

	if (!profile) {
		return "بدون نام";
	}

	const name =
		`${profile.first_name || ""} ${profile.last_name || ""}`.trim();

	return name || "بدون نام";
}


/* --------------------------------------------------
   فیلتر سفارشات
-------------------------------------------------- */

function adminFilterMatches(order, filter) {

	if (filter === "all") {
		return true;
	}

	if (filter === "completed") {
		return order.status === "completed";
	}

	if (filter === "cancelled") {
		return order.status === "cancelled";
	}

	if (filter === "progress") {
		return adminProgressStatus(order.status);
	}

	return true;
}


function adminSetOrderFilter(filter) {

	adminCurrentFilter = filter || "all";

	adminRenderOrders();

}


window.adminSetOrderFilter = adminSetOrderFilter;


function adminRenderOrders() {

	const body =
		document.getElementById("orders-body");

	if (!body) {
		return;
	}


	const filtered =
		adminOrdersData.filter(
			order =>
				adminFilterMatches(
					order,
					adminCurrentFilter
				)
		);


	const title =
		document.getElementById("orders-title");


	if (title) {

		const titles = {

			all: "همه سفارشات",

			progress: "سفارشات در جریان",

			completed: "سفارشات تکمیل شده",

			cancelled: "سفارشات لغو شده"

		};

		title.textContent =
			titles[adminCurrentFilter] ||
			"همه سفارشات";

	}


	if (!filtered.length) {

		body.innerHTML = `
			<tr>
				<td colspan="7">
					<div class="empty">
						سفارشی در این بخش وجود ندارد.
					</div>
				</td>
			</tr>
		`;

		return;

	}


	body.innerHTML =
		filtered
			.map(order => {

				const profile =
					order.profiles || {};

				const customer =
					adminCustomerName(profile);


				return `
					<tr class="order-row">

						<td>
							<span class="order-number">
								${adminEsc(order.order_number)}
							</span>
						</td>

						<td class="order-title-cell">
							${adminEsc(order.title)}
						</td>

						<td class="order-customer-cell">
							${adminEsc(customer)}
						</td>

						<td>
							${adminEsc(
								adminModelText(
									order.production_model
								)
							)}
						</td>

						<td>
							<span
								class="status status-${adminEsc(order.status)}"
							>
								${adminEsc(
									adminStatusText(order.status)
								)}
							</span>
						</td>

						<td>
							${adminDate(order.created_at)}
						</td>

						<td>
							<a
								class="button secondary"
								href="admin-order.html?id=${encodeURIComponent(order.id)}"
							>
								مشاهده
							</a>
						</td>

					</tr>
				`;

			})
			.join("");

}


function adminUpdateCounts(data) {

	const total =
		data.length;

	const progress =
		data.filter(
			x => adminProgressStatus(x.status)
		).length;

	const completed =
		data.filter(
			x => x.status === "completed"
		).length;

	const cancelled =
		data.filter(
			x => x.status === "cancelled"
		).length;


	const newOrders =
		data.filter(
			x => x.status === "new"
		).length;

	const ready =
		data.filter(
			x => x.status === "ready"
		).length;


	const setText = (id, value) => {

		const element =
			document.getElementById(id);

		if (element) {
			element.textContent = value;
		}

	};


	setText("total", total);
	setText("new", newOrders);
	setText("progress", progress);
	setText("ready", ready);

	setText("count-all", total);
	setText("count-progress", progress);
	setText("count-completed", completed);
	setText("count-cancelled", cancelled);

}


/* --------------------------------------------------
   لیست سفارشات
-------------------------------------------------- */

async function adminOrders() {

	const authData =
		await requireUser(true);


	if (!authData) {
		return;
	}


	const body =
		document.getElementById("orders-body");


	if (!body) {
		return;
	}


	body.innerHTML = `
		<tr>
			<td colspan="7">
				در حال دریافت سفارش‌ها...
			</td>
		</tr>
	`;


	const {
		data,
		error
	} = await window.db
		.from("video_orders")
		.select(
			"*,profiles:customer_id(first_name,last_name,email,phone,address,avatar_url)"
		)
		.order(
			"created_at",
			{
				ascending: false
			}
		);


	if (error) {

		console.error(
			"ADMIN ORDERS ERROR:",
			error
		);


		body.innerHTML = `
			<tr>
				<td colspan="7">
					دریافت سفارش‌ها انجام نشد.
				</td>
			</tr>
		`;

		return;

	}


	adminOrdersData =
		Array.isArray(data)
			? data
			: [];


	adminUpdateCounts(
		adminOrdersData
	);


	adminRenderOrders();

}


/* --------------------------------------------------
   کاربران
-------------------------------------------------- */

async function adminUsers() {

	const authData =
		await requireUser(true);


	if (!authData) {
		return;
	}


	const body =
		document.getElementById("users-body");


	if (!body) {
		return;
	}


	const {
		data,
		error
	} = await window.db
		.from("profiles")
		.select("*")
		.order(
			"created_at",
			{
				ascending: false
			}
		);


	if (error) {

		console.error(
			"ADMIN USERS ERROR:",
			error
		);


		body.innerHTML =
			"<tr><td colspan='6'>دریافت کاربران انجام نشد.</td></tr>";

		return;

	}


	body.innerHTML =
		(data || [])
			.map(user => {

				const name =
					adminCustomerName(user);


				return `
					<tr>

						<td>
							${adminEsc(name)}
						</td>

						<td>
							${adminEsc(user.email || "-")}
						</td>

						<td>
							${adminEsc(user.phone || "-")}
						</td>

						<td>
							${adminEsc(user.role || "-")}
						</td>

						<td>
							${adminDate(user.created_at)}
						</td>

						<td>
							<a
								class="button secondary"
								href="admin-order.html?customer=${encodeURIComponent(user.id)}"
							>
								ثبت سفارش
							</a>
						</td>

					</tr>
				`;

			})
			.join("");


}


/* --------------------------------------------------
   اطلاعات کامل سفارش
-------------------------------------------------- */

async function adminLoadOrder(orderId) {

	const {
		data: order,
		error
	} = await window.db
		.from("video_orders")
		.select(
			"*,profiles:customer_id(first_name,last_name,email,phone,address,avatar_url)"
		)
		.eq(
			"id",
			orderId
		)
		.single();


	if (error) {

		console.error(
			"ADMIN ORDER LOAD ERROR:",
			error
		);

		return null;

	}


	return order;

}


/* --------------------------------------------------
   فایل‌های سفارش
-------------------------------------------------- */

async function adminLoadFiles(orderId) {

	const {
		data,
		error
	} = await window.db
		.from("order_files")
		.select("*")
		.eq(
			"order_id",
			orderId
		)
		.order(
			"created_at",
			{
				ascending: true
			}
		);


	if (error) {

		console.error(
			"ADMIN FILES ERROR:",
			error
		);

		return [];

	}


	return data || [];

}


function adminRenderFiles(files) {

	if (!files.length) {

		return `
			<div class="empty-box">
				فایلی برای این سفارش ثبت نشده است.
			</div>
		`;

	}


	return `
		<div class="admin-files">

			${files.map(file => `

				<div class="admin-file">

					<div>

						<div class="admin-file-name">
							${adminEsc(file.file_name)}
						</div>

						<small>
							${adminEsc(file.file_role || "فایل")}
						</small>

					</div>

					<a
						class="button secondary"
						href="${adminEsc(file.file_url)}"
						target="_blank"
						rel="noopener noreferrer"
					>
						مشاهده
					</a>

				</div>

			`).join("")}

		</div>
	`;

}


/* --------------------------------------------------
   تاریخچه وضعیت
-------------------------------------------------- */

async function adminLoadHistory(orderId) {

	const {
		data,
		error
	} = await window.db
		.from("order_status_history")
		.select("*")
		.eq(
			"order_id",
			orderId
		)
		.order(
			"created_at",
			{
				ascending: false
			}
		);


	if (error) {

		console.error(
			"ADMIN HISTORY ERROR:",
			error
		);

		return [];

	}


	return data || [];

}


function adminRenderHistory(history) {

	if (!history.length) {

		return `
			<div class="empty-box">
				تاریخچه‌ای ثبت نشده است.
			</div>
		`;

	}


	return `
		<div class="admin-history">

			${history.map(item => `

				<div class="history-item">

					<div class="history-status">
						${adminEsc(
							adminStatusText(item.status)
						)}
					</div>

					${
						item.note
							? `
								<div>
									${adminEsc(item.note)}
								</div>
							`
							: ""
					}

					<div class="history-meta">
						${adminDate(item.created_at)}
					</div>

				</div>

			`).join("")}

		</div>
	`;

}


/* --------------------------------------------------
   پیام‌های سفارش
-------------------------------------------------- */

async function adminLoadMessages(orderId) {

	const {
		data,
		error
	} = await window.db
		.from("order_messages")
		.select("*")
		.eq(
			"order_id",
			orderId
		)
		.order(
			"created_at",
			{
				ascending: true
			}
		);


	if (error) {

		console.error(
			"ADMIN MESSAGES ERROR:",
			error
		);

		return [];

	}


	return data || [];

}


function adminRenderMessages(messages, adminId) {

	const container =
		document.getElementById(
			"chat-messages"
		);


	if (!container) {
		return;
	}


	if (!messages.length) {

		container.innerHTML = `
			<div class="empty-box">
				هنوز پیامی برای این سفارش وجود ندارد.
			</div>
		`;

		return;

	}


	container.innerHTML =
		messages
			.map(message => {

				const isAdmin =
					message.sender_id === adminId;


				return `
					<div
						class="chat-message ${
							isAdmin
								? "admin"
								: "customer"
						}"
					>

						<span class="chat-message-meta">
							${
								isAdmin
									? "ادمین"
									: "مشتری"
							}
							 •
							${adminDate(message.created_at)}
						</span>

						${adminEsc(message.message)}

					</div>
				`;

			})
			.join("");


	container.scrollTop =
		container.scrollHeight;

}


/* --------------------------------------------------
   ارسال پیام ادمین
-------------------------------------------------- */

async function adminSendMessage(
	orderId,
	adminId
) {

	const input =
		document.getElementById(
			"chat-input"
		);

	const button =
		document.getElementById(
			"chat-send"
		);

	const message =
		input?.value.trim();


	if (!message) {
		return;
	}


	if (button) {
		button.disabled = true;
		button.textContent = "در حال ارسال...";
	}


	const {
		error
	} = await window.db
		.from("order_messages")
		.insert({
			order_id: orderId,
			sender_id: adminId,
			message
		});


	if (error) {

		console.error(
			"ADMIN SEND MESSAGE ERROR:",
			error
		);


		alert(
			"ارسال پیام انجام نشد."
		);


		if (button) {

			button.disabled = false;
			button.textContent = "ارسال";

		}

		return;

	}


	input.value = "";


	await adminRefreshMessages(
		orderId,
		adminId
	);


	if (button) {

		button.disabled = false;
		button.textContent = "ارسال";

	}

}


async function adminRefreshMessages(
	orderId,
	adminId
) {

	const messages =
		await adminLoadMessages(
			orderId
		);


	adminRenderMessages(
		messages,
		adminId
	);

}


/* --------------------------------------------------
   Real-time چت
-------------------------------------------------- */

function adminSubscribeToMessages(
	orderId,
	adminId
) {

	if (!window.db?.channel) {
		return null;
	}


	const channel =
		window.db
			.channel(
				`admin-order-messages-${orderId}`
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "order_messages",
					filter: `order_id=eq.${orderId}`
				},
				() => {

					adminRefreshMessages(
						orderId,
						adminId
					);

				}
			)
			.subscribe();


	return channel;

}


/* --------------------------------------------------
   صفحه سفارش
-------------------------------------------------- */

async function adminOrder() {

	const authData =
		await requireUser(true);


	if (!authData) {
		return;
	}


	const root =
		document.getElementById("root");


	if (!root) {
		return;
	}


	const params =
		new URLSearchParams(
			location.search
		);


	const id =
		params.get("id");


	/*
	 * اگر id وجود نداشته باشد،
	 * رفتار قبلی صفحه حفظ می‌شود.
	 */

	if (!id) {

		root.innerHTML = `

			<div class="page-head">

				<div>

					<span class="eyebrow">
						مدیریت
					</span>

					<h1>
						ثبت سفارش برای کاربر موجود
					</h1>

				</div>

			</div>


			<section class="panel">

				<p class="muted">
					برای ثبت سفارش جدید،
					ابتدا کاربر موردنظر را انتخاب کنید.
				</p>

				<a
					class="button primary"
					href="admin-users.html"
				>
					انتخاب کاربر
				</a>

			</section>

		`;

		return;

	}


	root.innerHTML = `
		<section class="panel">
			در حال دریافت اطلاعات سفارش...
		</section>
	`;


	const order =
		await adminLoadOrder(id);


	if (!order) {

		root.innerHTML = `
			<div class="empty">
				سفارش پیدا نشد.
			</div>
		`;

		return;

	}


	const [
		files,
		history,
		messages
	] = await Promise.all([

		adminLoadFiles(id),

		adminLoadHistory(id),

		adminLoadMessages(id)

	]);


	const profile =
		order.profiles || {};


	const customerName =
		adminCustomerName(profile);


	root.innerHTML = `

		<div class="admin-order-page">


			<div class="page-head">

				<div>

					<span class="eyebrow">
						${adminEsc(order.order_number)}
					</span>

					<h1>
						${adminEsc(order.title)}
					</h1>

				</div>


				<a
					class="button secondary"
					href="admin.html"
				>
					بازگشت به سفارشات
				</a>

			</div>


			<div class="admin-detail-grid">


				<section class="panel">

					<h2>
						اطلاعات سفارش
					</h2>


					<div class="admin-order-info">


						<div class="admin-info-item">

							<span>
								شماره سفارش
							</span>

							<strong>
								${adminEsc(
									order.order_number
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								مدل تولید
							</span>

							<strong>
								${adminEsc(
									adminModelText(
										order.production_model
									)
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								موضوع
							</span>

							<strong>
								${adminEsc(
									order.subject || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								مدت تخمینی
							</span>

							<strong>
								${adminEsc(
									order.estimated_duration || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								نسبت تصویر
							</span>

							<strong>
								${adminEsc(
									order.aspect_ratio || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								کیفیت خروجی
							</span>

							<strong>
								${adminEsc(
									order.output_quality || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								سبک ویدئو
							</span>

							<strong>
								${adminEsc(
									order.video_style || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								وضعیت پرداخت
							</span>

							<strong>
								${adminEsc(
									adminPaymentText(
										order.payment_status
									)
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								هزینه تخمینی
							</span>

							<strong>
								${
									order.estimated_cost !== null &&
									order.estimated_cost !== undefined
										? adminEsc(
											order.estimated_cost
										)
										: "-"
								}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								هزینه نهایی
							</span>

							<strong>
								${
									order.final_cost !== null &&
									order.final_cost !== undefined
										? adminEsc(
											order.final_cost
										)
										: "-"
								}
							</strong>

						</div>


						<div class="admin-info-item full">

							<span>
								توضیحات سفارش
							</span>

							<strong class="admin-description">
								${adminEsc(
									order.description || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item full">

							<span>
								امکانات موردنیاز
							</span>

							<div class="admin-options">

								${
									order.needs_script || order.has_script
										? `<span class="admin-option">📝 اسکریپت</span>`
										: ""
								}

								${
									order.needs_voice || order.has_voice
										? `<span class="admin-option">🎙️ گویندگی</span>`
										: ""
								}

								${
									order.needs_visuals || order.has_visuals
										? `<span class="admin-option">🎨 تصاویر</span>`
										: ""
								}

								${
									order.needs_editing || order.has_editing
										? `<span class="admin-option">🎬 تدوین</span>`
										: ""
								}

							</div>

						</div>


						<div class="admin-info-item full">

							<span>
								لینک‌های مرجع
							</span>

							<strong class="admin-description">
								${adminEsc(
									order.reference_links || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item full">

							<span>
								یادداشت ویژه
							</span>

							<strong class="admin-description">
								${adminEsc(
									order.special_notes || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								تاریخ ثبت
							</span>

							<strong>
								${adminDate(
									order.created_at
								)}
							</strong>

						</div>


						<div class="admin-info-item">

							<span>
								آخرین بروزرسانی
							</span>

							<strong>
								${adminDate(
									order.updated_at
								)}
							</strong>

						</div>


					</div>

				</section>


				<section class="panel">

					<h2>
						اطلاعات مشتری
					</h2>


					<div class="admin-customer-card">

						<div class="admin-customer-name">
							${adminEsc(customerName)}
						</div>


						<div class="admin-customer-item">

							<span>
								ایمیل
							</span>

							<strong>
								${adminEsc(
									profile.email || "-"
								)}
							</strong>

						</div>


						<div class="admin-customer-item">

							<span>
								شماره تلفن
							</span>

							<strong>
								${adminEsc(
									profile.phone || "-"
								)}
							</strong>

						</div>


						<div class="admin-customer-item">

							<span>
								آدرس
							</span>

							<strong>
								${adminEsc(
									profile.address || "-"
								)}
							</strong>

						</div>

					</div>

				</section>


			</div>


			<div class="admin-detail-grid">


				<section class="panel">

					<h2>
						تغییر وضعیت سفارش
					</h2>


					<form
						id="status-form"
						class="admin-status-form"
					>

						<select id="status">

							${[
								["new", "جدید"],
								["review", "در حال بررسی"],
								["approved", "تأیید شده"],
								["production", "در حال تولید"],
								["editing", "در حال تدوین"],
								["revision", "نیازمند اصلاح"],
								["ready", "آماده تحویل"],
								["completed", "تکمیل شده"],
								["cancelled", "لغو شده"]
							]
								.map(
									([value, label]) => `
										<option
											value="${value}"
											${
												order.status === value
													? "selected"
													: ""
											}
										>
											${label}
										</option>
									`
								)
								.join("")}

						</select>


						<textarea
							id="note"
							rows="4"
							placeholder="یادداشت تغییر وضعیت"
						></textarea>


						<div
							id="status-msg"
							class="message"
						></div>


						<button
							class="button primary"
							type="submit"
							id="status-submit"
						>
							ذخیره وضعیت
						</button>

					</form>

				</section>


				<section class="panel">

					<h2>
						تاریخچه وضعیت
					</h2>


					<div id="status-history">

						${adminRenderHistory(history)}

					</div>

				</section>


			</div>


			<section class="panel">

				<h2>
					فایل‌های سفارش
				</h2>


				<div id="order-files">

					${adminRenderFiles(files)}

				</div>

			</section>


			<section class="panel admin-chat">

				<h2>
					گفت‌وگو با مشتری
				</h2>


				<div
					id="chat-messages"
					class="admin-chat-messages"
				></div>


				<form
					id="chat-form"
					class="admin-chat-form"
				>

					<textarea
						id="chat-input"
						rows="2"
						placeholder="پیام خود را برای مشتری بنویسید..."
					></textarea>


					<button
						type="submit"
						class="button primary"
						id="chat-send"
					>
						ارسال
					</button>

				</form>

			</section>


		</div>

	`;


	/* نمایش پیام‌ها */

	adminRenderMessages(
		messages,
		authData.user.id
	);


	/* ارسال پیام */

	const chatForm =
		document.getElementById(
			"chat-form"
		);


	if (chatForm) {

		chatForm.addEventListener(
			"submit",
			async event => {

				event.preventDefault();

				await adminSendMessage(
					id,
					authData.user.id
				);

			}
		);

	}


	/* تغییر وضعیت */

	const statusForm =
		document.getElementById(
			"status-form"
		);


	if (statusForm) {

		statusForm.addEventListener(
			"submit",
			async event => {

				event.preventDefault();


				const status =
					document.getElementById(
						"status"
					).value;


				const note =
					document.getElementById(
						"note"
					).value.trim();


				const button =
					document.getElementById(
						"status-submit"
					);


				const message =
					document.getElementById(
						"status-msg"
					);


				if (button) {

					button.disabled = true;
					button.textContent =
						"در حال ذخیره...";

				}


				const {
					error: updateError
				} = await window.db
					.from("video_orders")
					.update({
						status,
						updated_at:
							new Date().toISOString()
					})
					.eq(
						"id",
						id
					);


				if (updateError) {

					console.error(
						"STATUS UPDATE ERROR:",
						updateError
					);


					if (message) {
						message.textContent =
							"ذخیره وضعیت انجام نشد.";
					}


					if (button) {

						button.disabled = false;
						button.textContent =
							"ذخیره وضعیت";

					}

					return;

				}


				const {
					error: historyError
				} = await window.db
					.from("order_status_history")
					.insert({
						order_id: id,
						status,
						changed_by:
							authData.user.id,
						note: note || null
					});


				if (historyError) {

					console.error(
						"HISTORY INSERT ERROR:",
						historyError
					);


					if (message) {
						message.textContent =
							"وضعیت ذخیره شد، اما تاریخچه ثبت نشد.";
					}

				} else {

					if (message) {
						message.textContent =
							"وضعیت با موفقیت ذخیره شد.";
					}

				}


				const newHistory =
					await adminLoadHistory(id);


				const historyElement =
					document.getElementById(
						"status-history"
					);


				if (historyElement) {

					historyElement.innerHTML =
						adminRenderHistory(
							newHistory
						);

				}


				if (button) {

					button.disabled = false;
					button.textContent =
						"ذخیره وضعیت";

				}

			}
		);

	}


	/*
	 * اتصال Real-time به پیام‌های سفارش
	 */

	const messageChannel =
		adminSubscribeToMessages(
			id,
			authData.user.id
		);


	/*
	 * وقتی صفحه سفارش ترک شد،
	 * کانال Real-time بسته شود.
	 */

	window.addEventListener(
		"beforeunload",
		() => {

			if (
				messageChannel &&
				window.db?.removeChannel
			) {

				window.db.removeChannel(
					messageChannel
				);

			}

		},
		{
			once: true
		}
	);

}
