"use strict";


/* ==================================================
   ADMIN STATE
================================================== */

let adminOrdersData = [];

let adminCurrentFilter = "all";

let adminMessageChannel = null;


/* ==================================================
   HELPERS
================================================== */

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

	} catch {

		return value;

	}

}


function adminModelText(value) {

	const models = {

		full: "تولید کامل",

		script: "اسکریپت",

		voice: "گویندگی",

		editing: "تدوین",

		animation: "انیمیشن",

		motion: "موشن گرافیک"

	};

	return models[value] || value || "-";

}


function adminStatusText(value) {

	const statuses = {

		new: "جدید",

		review: "در حال بررسی",

		approved: "تأیید شده",

		production: "در حال تولید",

		editing: "در حال تدوین",

		revision: "نیازمند اصلاح",

		ready: "آماده تحویل",

		completed: "تکمیل شده",

		cancelled: "لغو شده"

	};

	return statuses[value] || value || "-";

}


function adminPaymentText(value) {

	const payments = {

		pending: "در انتظار پرداخت",

		unpaid: "پرداخت نشده",

		paid: "پرداخت شده",

		partial: "پرداخت ناقص",

		refunded: "بازپرداخت شده"

	};

	return payments[value] || value || "-";

}


function adminCustomerName(profile) {

	if (!profile) {
		return "بدون نام";
	}

	const name =
		`${profile.first_name || ""} ${profile.last_name || ""}`.trim();

	return name || "بدون نام";

}


function adminIsProgress(status) {

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


/* ==================================================
   ORDER FILTER
================================================== */

function adminSetOrderFilter(filter) {

	adminCurrentFilter =
		filter || "all";

	adminRenderOrders();

}


window.adminSetOrderFilter =
	adminSetOrderFilter;


function adminFilterOrder(order) {

	switch (adminCurrentFilter) {

		case "progress":
			return adminIsProgress(order.status);

		case "completed":
			return order.status === "completed";

		case "cancelled":
			return order.status === "cancelled";

		default:
			return true;

	}

}


function adminRenderOrders() {

	const body =
		document.getElementById("orders-body");

	if (!body) {
		return;
	}


	const orders =
		adminOrdersData.filter(
			adminFilterOrder
		);


	const title =
		document.getElementById("orders-title");


	const titles = {

		all: "همه سفارشات",

		progress: "سفارشات در جریان",

		completed: "سفارشات تکمیل شده",

		cancelled: "سفارشات لغو شده"

	};


	if (title) {

		title.textContent =
			titles[adminCurrentFilter] ||
			titles.all;

	}


	if (!orders.length) {

		body.innerHTML = `
			<tr>
				<td colspan="7">
					<div class="admin-empty">
						سفارشی در این بخش وجود ندارد.
					</div>
				</td>
			</tr>
		`;

		return;

	}


	body.innerHTML =
		orders.map(order => {

			const profile =
				order.profiles || {};

			const customer =
				adminCustomerName(profile);


			return `

				<tr class="admin-order-row">

					<td>

						<span class="admin-order-number">
							${adminEsc(order.order_number)}
						</span>

					</td>


					<td>

						<div class="admin-order-title">
							${adminEsc(order.title)}
						</div>

					</td>


					<td>

						<div class="admin-customer">

							${
								profile.avatar_url
									? `
										<img
											class="admin-avatar"
											src="${adminEsc(profile.avatar_url)}"
											alt=""
										>
									`
									: `
										<div class="admin-avatar"></div>
									`
							}

							<span>
								${adminEsc(customer)}
							</span>

						</div>

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

		}).join("");

}


/* ==================================================
   ORDER COUNTS
================================================== */

function adminUpdateOrderCounts(data) {

	const progress =
		data.filter(
			order =>
				adminIsProgress(order.status)
		).length;

	const completed =
		data.filter(
			order =>
				order.status === "completed"
		).length;

	const cancelled =
		data.filter(
			order =>
				order.status === "cancelled"
		).length;

	const newOrders =
		data.filter(
			order =>
				order.status === "new"
		).length;

	const ready =
		data.filter(
			order =>
				order.status === "ready"
		).length;


	const set =
		(id, value) => {

			const element =
				document.getElementById(id);

			if (element) {
				element.textContent = value;
			}

		};


	set("total", data.length);

	set("new", newOrders);

	set("progress", progress);

	set("ready", ready);

	set("count-all", data.length);

	set("count-progress", progress);

	set("count-completed", completed);

	set("count-cancelled", cancelled);

}


/* ==================================================
   ADMIN ORDERS
================================================== */

async function adminOrders() {

	const auth =
		await requireUser(true);

	if (!auth) {
		return;
	}


	const body =
		document.getElementById(
			"orders-body"
		);

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
		data || [];


	adminUpdateOrderCounts(
		adminOrdersData
	);


	adminRenderOrders();

}


/* ==================================================
   ADMIN USERS
================================================== */

async function adminUsers() {

	const auth =
		await requireUser(true);

	if (!auth) {
		return;
	}


	const body =
		document.getElementById(
			"users-body"
		);

	if (!body) {
		return;
	}


	body.innerHTML = `
		<tr>
			<td colspan="6">
				در حال دریافت کاربران...
			</td>
		</tr>
	`;


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


		body.innerHTML = `
			<tr>
				<td colspan="6">
					دریافت کاربران انجام نشد.
				</td>
			</tr>
		`;

		return;

	}


	body.innerHTML =
		(data || []).map(user => {

			const name =
				adminCustomerName(user);


			return `

				<tr class="admin-user-row">

					<td>

						<div class="admin-user-name">

							${
								user.avatar_url
									? `
										<img
											class="admin-user-avatar"
											src="${adminEsc(user.avatar_url)}"
											alt=""
										>
									`
									: `
										<div class="admin-user-avatar"></div>
									`
							}

							<strong>
								${adminEsc(name)}
							</strong>

						</div>

					</td>


					<td>
						${adminEsc(user.email || "-")}
					</td>


					<td>
						${adminEsc(user.phone || "-")}
					</td>


					<td>

						<span class="admin-role">
							${adminEsc(user.role || "-")}
						</span>

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

		}).join("");


}


/* ==================================================
   LOAD CUSTOMER
================================================== */

async function adminLoadCustomer(customerId) {

	const {
		data,
		error
	} = await window.db
		.from("profiles")
		.select("*")
		.eq(
			"id",
			customerId
		)
		.single();


	if (error) {

		console.error(
			"LOAD CUSTOMER ERROR:",
			error
		);

		return null;

	}


	return data;

}


/* ==================================================
   CREATE ORDER PAGE
================================================== */

async function adminRenderCreateOrder(
	customer,
	root
) {

	const name =
		adminCustomerName(customer);


	root.innerHTML = `

		<div class="admin-order-page">


			<div class="admin-order-header">

				<div>

					<span class="eyebrow">
						ثبت سفارش جدید
					</span>

					<h1>
						ثبت سفارش برای مشتری
					</h1>

				</div>


				<div class="admin-order-actions">

					<a
						class="button secondary"
						href="admin-users.html"
					>
						بازگشت به کاربران
					</a>

				</div>

			</div>


			<section class="panel admin-card">


				<div class="admin-card-title">

					<h2>
						اطلاعات سفارش
					</h2>

				</div>


				<div class="admin-create-customer">

					<strong>
						${adminEsc(name)}
					</strong>

					<span>
						${adminEsc(customer.email || "-")}
					</span>

				</div>


				<form
					id="admin-create-order-form"
					class="admin-create-form"
				>


					<div class="admin-form-grid">


						<div>

							<label for="create-title">
								عنوان سفارش
							</label>

							<input
								id="create-title"
								type="text"
								required
								placeholder="مثلاً ساخت ویدئوی تبلیغاتی"
							>

						</div>


						<div>

							<label for="create-subject">
								موضوع
							</label>

							<input
								id="create-subject"
								type="text"
								required
								placeholder="موضوع ویدئو"
							>

						</div>


						<div class="full">

							<label for="create-description">
								توضیحات
							</label>

							<textarea
								id="create-description"
								rows="6"
								required
								placeholder="توضیحات کامل سفارش..."
							></textarea>

						</div>


						<div>

							<label for="create-model">
								مدل تولید
							</label>

							<select
								id="create-model"
								required
							>

								<option value="full">
									تولید کامل
								</option>

								<option value="script">
									اسکریپت
								</option>

								<option value="voice">
									گویندگی
								</option>

								<option value="editing">
									تدوین
								</option>

								<option value="animation">
									انیمیشن
								</option>

								<option value="motion">
									موشن گرافیک
								</option>

							</select>

						</div>


						<div>

							<label for="create-duration">
								مدت تقریبی
							</label>

							<input
								id="create-duration"
								type="text"
								placeholder="مثلاً 60 ثانیه"
							>

						</div>


						<div>

							<label for="create-ratio">
								نسبت تصویر
							</label>

							<select id="create-ratio">

								<option value="">
									انتخاب نشده
								</option>

								<option value="16:9">
									16:9
								</option>

								<option value="9:16">
									9:16
								</option>

								<option value="1:1">
									1:1
								</option>

								<option value="4:5">
									4:5
								</option>

							</select>

						</div>


						<div>

							<label for="create-quality">
								کیفیت خروجی
							</label>

							<input
								id="create-quality"
								type="text"
								placeholder="مثلاً Full HD"
							>

						</div>


						<div>

							<label for="create-style">
								سبک ویدئو
							</label>

							<input
								id="create-style"
								type="text"
								placeholder="سبک دلخواه"
							>

						</div>


						<div>

							<label for="create-cost">
								هزینه تخمینی
							</label>

							<input
								id="create-cost"
								type="number"
								min="0"
								step="1"
								placeholder="تومان"
							>

						</div>


						<div class="full">

							<label for="create-notes">
								یادداشت ویژه
							</label>

							<textarea
								id="create-notes"
								rows="4"
								placeholder="یادداشت یا توضیح اضافی..."
							></textarea>

						</div>


					</div>


					<div
						id="create-order-message"
						class="message"
					></div>


					<div class="admin-form-actions">

						<button
							type="submit"
							class="button primary"
							id="create-order-submit"
						>
							ثبت سفارش
						</button>


						<a
							class="button secondary"
							href="admin-users.html"
						>
							انصراف
						</a>

					</div>


				</form>


			</section>

		</div>

	`;


	document
		.getElementById(
			"admin-create-order-form"
		)
		.addEventListener(
			"submit",
			async event => {

				event.preventDefault();


				const button =
					document.getElementById(
						"create-order-submit"
					);

				const message =
					document.getElementById(
						"create-order-message"
					);


				button.disabled = true;

				button.textContent =
					"در حال ثبت...";


				const title =
					document.getElementById(
						"create-title"
					).value.trim();


				const subject =
					document.getElementById(
						"create-subject"
					).value.trim();


				const description =
					document.getElementById(
						"create-description"
					).value.trim();


				const productionModel =
					document.getElementById(
						"create-model"
					).value;


				const duration =
					document.getElementById(
						"create-duration"
					).value.trim();


				const aspectRatio =
					document.getElementById(
						"create-ratio"
					).value;


				const quality =
					document.getElementById(
						"create-quality"
					).value.trim();


				const videoStyle =
					document.getElementById(
						"create-style"
					).value.trim();


				const costValue =
					document.getElementById(
						"create-cost"
					).value;


				const notes =
					document.getElementById(
						"create-notes"
					).value.trim();


				/*
				 * شماره سفارش
				 */

				const orderNumber =
					"TC-" +
					Date.now().toString().slice(-8);


				const {
					data,
					error
				} = await window.db
					.from("video_orders")
					.insert({

						order_number:
							orderNumber,

						customer_id:
							customer.id,

						title,

						subject,

						description,

						estimated_duration:
							duration || null,

						production_model:
							productionModel,

						needs_script:
							false,

						needs_voice:
							false,

						needs_visuals:
							false,

						needs_editing:
							false,

						has_script:
							false,

						has_voice:
							false,

						has_visuals:
							false,

						aspect_ratio:
							aspectRatio || null,

						output_quality:
							quality || null,

						video_style:
							videoStyle || null,

						reference_links:
							null,

						special_notes:
							notes || null,

						status:
							"new",

						estimated_cost:
							costValue
								? Number(costValue)
								: null,

						final_cost:
							null,

						payment_status:
							"pending"

					})
					.select("id")
					.single();


				if (error) {

					console.error(
						"CREATE ORDER ERROR:",
						error
					);


					message.textContent =
						"ثبت سفارش انجام نشد: " +
						(error.message || "");


					button.disabled = false;

					button.textContent =
						"ثبت سفارش";

					return;

				}


				message.className =
					"message admin-success";

				message.textContent =
					"سفارش با موفقیت ثبت شد.";


				setTimeout(() => {

					window.location.replace(
						"admin-order.html?id=" +
						encodeURIComponent(data.id)
					);

				}, 500);

			}
		);

}


/* ==================================================
   LOAD ORDER
================================================== */

async function adminLoadOrder(orderId) {

	const {
		data,
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
			"LOAD ORDER ERROR:",
			error
		);

		return null;

	}


	return data;

}


/* ==================================================
   FILES
================================================== */

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
			"FILES ERROR:",
			error
		);

		return [];

	}


	return data || [];

}


function adminRenderFiles(files) {

	if (!files.length) {

		return `
			<div class="admin-empty">
				هنوز فایلی برای این سفارش ثبت نشده است.
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
							${adminEsc(
								file.file_role || "فایل"
							)}
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


/* ==================================================
   HISTORY
================================================== */

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
			"HISTORY ERROR:",
			error
		);

		return [];

	}


	return data || [];

}


function adminRenderHistory(history) {

	if (!history.length) {

		return `
			<div class="admin-empty">
				هنوز تغییری برای این سفارش ثبت نشده است.
			</div>
		`;

	}


	return `
		<div class="admin-history">

			${history.map(item => `

				<div class="admin-history-item">

					<div class="admin-history-status">
						${adminEsc(
							adminStatusText(
								item.status
							)
						)}
					</div>


					${
						item.note
							? `
								<div class="admin-history-note">
									${adminEsc(item.note)}
								</div>
							`
							: ""
					}


					<div class="admin-history-date">
						${adminDate(item.created_at)}
					</div>

				</div>

			`).join("")}

		</div>
	`;

}


/* ==================================================
   MESSAGES
================================================== */

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
			"MESSAGES ERROR:",
			error
		);

		return [];

	}


	return data || [];

}


function adminRenderMessages(
	messages,
	adminId
) {

	const container =
		document.getElementById(
			"chat-messages"
		);


	if (!container) {
		return;
	}


	if (!messages.length) {

		container.innerHTML = `

			<div class="admin-chat-empty">

				<div style="font-size:30px;margin-bottom:8px;">
					💬
				</div>

				<div>
					هنوز گفت‌وگویی شروع نشده است.
				</div>

			</div>

		`;

		return;

	}


	container.innerHTML =
		messages.map(message => {

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

					<div class="chat-message-meta">

						<strong>
							${
								isAdmin
									? "شما"
									: "مشتری"
							}
						</strong>

						<span>
							${adminDate(
								message.created_at
							)}
						</span>

					</div>


					${adminEsc(message.message)}

				</div>

			`;

		}).join("");


	container.scrollTop =
		container.scrollHeight;

}


/* ==================================================
   REFRESH CHAT
================================================== */

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


/* ==================================================
   SEND MESSAGE
================================================== */

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


	if (!input) {
		return;
	}


	const message =
		input.value.trim();


	if (!message) {
		return;
	}


	button.disabled = true;

	button.textContent =
		"در حال ارسال...";


	const {
		error
	} = await window.db
		.from("order_messages")
		.insert({

			order_id:
				orderId,

			sender_id:
				adminId,

			message

		});


	if (error) {

		console.error(
			"SEND MESSAGE ERROR:",
			error
		);


		alert(
			"ارسال پیام انجام نشد."
		);


		button.disabled = false;

		button.textContent =
			"ارسال";

		return;

	}


	input.value = "";


	await adminRefreshMessages(
		orderId,
		adminId
	);


	button.disabled = false;

	button.textContent =
		"ارسال";

}


/* ==================================================
   REALTIME CHAT
================================================== */

function adminSubscribeMessages(
	orderId,
	adminId
) {

	if (!window.db?.channel) {
		return;
	}


	if (adminMessageChannel) {

		window.db.removeChannel(
			adminMessageChannel
		);

	}


	adminMessageChannel =
		window.db
			.channel(
				"admin-order-" + orderId
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "order_messages",
					filter:
						"order_id=eq." + orderId
				},
				() => {

					adminRefreshMessages(
						orderId,
						adminId
					);

				}
			)
			.subscribe();

}


/* ==================================================
   ADMIN ORDER PAGE
================================================== */

async function adminOrder() {

	const auth =
		await requireUser(true);

	if (!auth) {
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


	const customerId =
		params.get("customer");


	/* ----------------------------------------------
	   CREATE ORDER
	---------------------------------------------- */

	if (!id && customerId) {

		root.innerHTML = `
			<section class="panel">
				در حال دریافت اطلاعات مشتری...
			</section>
		`;


		const customer =
			await adminLoadCustomer(
				customerId
			);


		if (!customer) {

			root.innerHTML = `
				<div class="admin-empty">
					کاربر پیدا نشد.
				</div>
			`;

			return;

		}


		await adminRenderCreateOrder(
			customer,
			root
		);


		return;

	}


	/* ----------------------------------------------
	   NO ID
	---------------------------------------------- */

	if (!id) {

		root.innerHTML = `

			<div class="admin-order-page">

				<div class="admin-order-header">

					<div>

						<span class="eyebrow">
							مدیریت
						</span>

						<h1>
							انتخاب مشتری
						</h1>

					</div>

				</div>


				<section class="panel admin-card">

					<p class="muted">
						برای ثبت سفارش جدید ابتدا
						مشتری موردنظر را انتخاب کنید.
					</p>


					<a
						class="button primary"
						href="admin-users.html"
					>
						انتخاب مشتری
					</a>

				</section>

			</div>

		`;

		return;

	}


	/* ----------------------------------------------
	   LOAD ORDER
	---------------------------------------------- */

	root.innerHTML = `
		<section class="panel">
			در حال دریافت سفارش...
		</section>
	`;


	const order =
		await adminLoadOrder(id);


	if (!order) {

		root.innerHTML = `
			<div class="admin-empty">
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


			<div class="admin-order-header">

				<div>

					<span class="eyebrow">
						سفارش ${adminEsc(order.order_number)}
					</span>

					<h1>
						${adminEsc(order.title)}
					</h1>

				</div>


				<div class="admin-order-actions">

					<a
						class="button secondary"
						href="admin.html"
					>
						سفارشات
					</a>

					<a
						class="button secondary"
						href="admin-users.html"
					>
						کاربران
					</a>

				</div>

			</div>


			<div class="admin-detail-grid">


				<section class="panel admin-card">

					<div class="admin-card-title">

						<h2>
							جزئیات سفارش
						</h2>

						<span>
							${adminEsc(
								adminStatusText(
									order.status
								)
							)}
						</span>

					</div>


					<div class="admin-info-grid">


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
								مدت تقریبی
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


						<div class="admin-info-item full">

							<span>
								سبک ویدئو
							</span>

							<strong>
								${adminEsc(
									order.video_style || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item full">

							<span>
								توضیحات
							</span>

							<strong class="admin-description">
								${adminEsc(
									order.description || "-"
								)}
							</strong>

						</div>


						<div class="admin-info-item full">

							<span>
								امکانات سفارش
							</span>


							<div class="admin-options">

								${
									order.needs_script ||
									order.has_script
										? `<span class="admin-option">اسکریپت</span>`
										: ""
								}

								${
									order.needs_voice ||
									order.has_voice
										? `<span class="admin-option">گویندگی</span>`
										: ""
								}

								${
									order.needs_visuals ||
									order.has_visuals
										? `<span class="admin-option">تصاویر</span>`
										: ""
								}

								${
									order.needs_editing ||
									order.has_editing
										? `<span class="admin-option">تدوین</span>`
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


					</div>

				</section>


				<section class="panel admin-card">

					<div class="admin-card-title">

						<h2>
							مشتری
						</h2>

					</div>


					<div class="admin-customer">


						<div class="admin-customer-main">

							${
								profile.avatar_url
									? `
										<img
											class="admin-customer-avatar"
											src="${adminEsc(profile.avatar_url)}"
											alt=""
										>
									`
									: `
										<div class="admin-customer-avatar"></div>
									`
							}


							<div>

								<div class="admin-customer-name">
									${adminEsc(customerName)}
								</div>

								<small>
									${adminEsc(
										profile.email || "-"
									)}
								</small>

							</div>

						</div>


						<div class="admin-customer-line">

							<span>
								شماره تلفن
							</span>

							<strong>
								${adminEsc(
									profile.phone || "-"
								)}
							</strong>

						</div>


						<div class="admin-customer-line">

							<span>
								آدرس
							</span>

							<strong>
								${adminEsc(
									profile.address || "-"
								)}
							</strong>

						</div>


						<div class="admin-customer-line">

							<span>
								تاریخ ثبت سفارش
							</span>

							<strong>
								${adminDate(
									order.created_at
								)}
							</strong>

						</div>

					</div>

				</section>


			</div>


			<div class="admin-detail-grid">


				<section class="panel admin-card">

					<div class="admin-card-title">

						<h2>
							وضعیت و هزینه
						</h2>

					</div>


					<form
						id="status-form"
						class="admin-status-form"
					>


						<label for="status">
							وضعیت سفارش
						</label>


						<select id="status">

							${[
								["new","جدید"],
								["review","در حال بررسی"],
								["approved","تأیید شده"],
								["production","در حال تولید"],
								["editing","در حال تدوین"],
								["revision","نیازمند اصلاح"],
								["ready","آماده تحویل"],
								["completed","تکمیل شده"],
								["cancelled","لغو شده"]
							].map(
								([value,label]) => `
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
							).join("")}

						</select>


						<div class="admin-cost-grid">

							<div class="admin-info-item">

								<span>
									هزینه تخمینی
								</span>

								<strong>
									${adminEsc(
										order.estimated_cost ?? "-"
									)}
								</strong>

							</div>


							<div class="admin-info-item">

								<span>
									هزینه نهایی
								</span>

								<strong>
									${adminEsc(
										order.final_cost ?? "-"
									)}
								</strong>

							</div>

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


						<textarea
							id="note"
							rows="4"
							placeholder="یادداشت تغییر وضعیت..."
						></textarea>


						<div
							id="status-msg"
							class="message"
						></div>


						<button
							type="submit"
							class="button primary"
							id="status-submit"
						>
							ذخیره تغییرات
						</button>


					</form>

				</section>


				<section class="panel admin-card">

					<div class="admin-card-title">

						<h2>
							تاریخچه وضعیت
						</h2>

					</div>


					<div id="status-history">

						${adminRenderHistory(history)}

					</div>

				</section>


			</div>


			<section class="panel admin-card">

				<div class="admin-card-title">

					<h2>
						فایل‌های سفارش
					</h2>

				</div>


				<div id="order-files">

					${adminRenderFiles(files)}

				</div>

			</section>


			<section class="panel admin-chat-panel">


				<div class="admin-chat-header">

					<div>

						<h2>
							گفت‌وگو با مشتری
						</h2>

						<span class="admin-chat-online">
							پیام‌های این سفارش
						</span>

					</div>

				</div>


				<div
					id="chat-messages"
					class="admin-chat-messages"
				></div>


				<form
					id="chat-form"
					class="admin-chat-form"
				>

					<div class="admin-chat-input-wrap">

						<textarea
							id="chat-input"
							rows="2"
							placeholder="پیام خود را برای مشتری بنویسید..."
						></textarea>

						<div class="admin-chat-hint">
							Enter برای ارسال · Shift + Enter برای خط جدید
						</div>

					</div>


					<button
						type="submit"
						class="button primary admin-chat-send"
						id="chat-send"
					>
						ارسال
					</button>

				</form>


			</section>


		</div>

	`;


	/* پیام‌ها */

	adminRenderMessages(
		messages,
		auth.user.id
	);


	/* Real-time */

	adminSubscribeMessages(
		id,
		auth.user.id
	);


	/* Chat submit */

	const chatForm =
		document.getElementById(
			"chat-form"
		);


	chatForm.addEventListener(
		"submit",
		async event => {

			event.preventDefault();

			await adminSendMessage(
				id,
				auth.user.id
			);

		}
	);


	/* Enter */

	const chatInput =
		document.getElementById(
			"chat-input"
		);


	chatInput.addEventListener(
		"keydown",
		event => {

			if (
				event.key === "Enter" &&
				!event.shiftKey
			) {

				event.preventDefault();

				chatForm.requestSubmit();

			}

		}
	);


	/* Status */

	const statusForm =
		document.getElementById(
			"status-form"
		);


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


			button.disabled = true;

			button.textContent =
				"در حال ذخیره...";


			const {
				error
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


			if (error) {

				console.error(
					"STATUS UPDATE ERROR:",
					error
				);


				message.textContent =
					"ذخیره وضعیت انجام نشد.";


				button.disabled = false;

				button.textContent =
					"ذخیره تغییرات";

				return;

			}


			const {
				error: historyError
			} = await window.db
				.from("order_status_history")
				.insert({

					order_id:
						id,

					status,

					changed_by:
						auth.user.id,

					note:
						note || null

				});


			if (historyError) {

				console.error(
					"HISTORY ERROR:",
					historyError
				);


				message.textContent =
					"وضعیت ذخیره شد، اما تاریخچه ثبت نشد.";

			} else {

				message.textContent =
					"تغییرات با موفقیت ذخیره شد.";

			}


			const newHistory =
				await adminLoadHistory(id);


			document.getElementById(
				"status-history"
			).innerHTML =
				adminRenderHistory(
					newHistory
				);


			button.disabled = false;

			button.textContent =
				"ذخیره تغییرات";

		}
	);

}


window.adminOrders =
	adminOrders;

window.adminUsers =
	adminUsers;

window.adminOrder =
	adminOrder;
