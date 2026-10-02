/* =========================================================
   T-Choob Video
   Admin Panel
   ========================================================= */


/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */

function adminEscape(value) {

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

		return new Intl.DateTimeFormat(
			"fa-IR",
			{
				dateStyle: "medium",
				timeStyle: "short"
			}
		).format(new Date(value));

	} catch {

		return value;

	}

}


function adminCustomerName(profile) {

	if (!profile) {
		return "بدون نام";
	}

	const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

	return name || "بدون نام";

}


function adminStatusText(status) {

	const values = {

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

	return values[status] || status || "-";

}


function adminModelText(model) {

	const values = {

		edit_only: "فقط تدوین",

		voice_ready: "گویندگی آماده است",

		visual_ready: "تصویر آماده است",

		script_ready: "سناریو آماده است",

		full_production: "تولید کامل"

	};

	return values[model] || model || "-";

}


function adminPaymentText(status) {

	const values = {

		unpaid: "پرداخت نشده",

		pending: "در انتظار پرداخت",

		paid: "پرداخت شده",

		refunded: "برگشت داده شده"

	};

	return values[status] || status || "-";

}


function adminRoleText(role) {

	if (role === "admin") {
		return "ادمین";
	}

	return "مشتری";

}


function adminNeedsText(order) {

	const result = [];

	if (order.needs_script) {
		result.push("سناریو");
	}

	if (order.needs_voice) {
		result.push("صوت");
	}

	if (order.needs_visuals) {
		result.push("تصویر");
	}

	if (order.needs_editing) {
		result.push("تدوین");
	}

	return result.length
		? result.join("، ")
		: "بدون مورد مشخص";

}


/* ---------------------------------------------------------
   Admin Orders
   --------------------------------------------------------- */

let adminOrdersData = [];

let currentAdminFilter = "all";

let currentAdminSearch = "";


async function adminOrders() {

	const authData = await requireUser(true);

	if (!authData) {
		return;
	}


	const body = document.getElementById("orders-body");

	if (!body) {
		return;
	}


	body.innerHTML = `
		<tr>
			<td colspan="7" class="table-loading">
				در حال دریافت سفارش‌ها...
			</td>
		</tr>
	`;


	const { data, error } = await window.db
		.from("video_orders")
		.select(`
			*,
			profiles:customer_id(
				id,
				first_name,
				last_name,
				email,
				phone
			)
		`)
		.order("created_at", {
			ascending: false
		});


	if (error) {

		console.error("ADMIN ORDERS ERROR:", error);

		body.innerHTML = `
			<tr>
				<td colspan="7" class="table-error">
					دریافت سفارش‌ها انجام نشد.
					<br>
					<span>${adminEscape(error.message)}</span>
				</td>
			</tr>
		`;

		return;
	}


	adminOrdersData = data || [];


	updateAdminStats();


	renderAdminOrders();

}


function updateAdminStats() {

	const total = adminOrdersData.length;

	const newOrders = adminOrdersData.filter(
		order => order.status === "new"
	).length;


	const progress = adminOrdersData.filter(
		order =>
			[
				"review",
				"approved",
				"production",
				"editing",
				"revision"
			].includes(order.status)
	).length;


	const ready = adminOrdersData.filter(
		order => order.status === "ready"
	).length;


	const completed = adminOrdersData.filter(
		order => order.status === "completed"
	).length;


	const cancelled = adminOrdersData.filter(
		order => order.status === "cancelled"
	).length;


	const setText = (id, value) => {

		const element = document.getElementById(id);

		if (element) {
			element.textContent = value;
		}

	};


	setText("total", total);

	setText("new", newOrders);

	setText("progress", progress);

	setText("ready", ready);

	setText("completed", completed);

	setText("cancelled", cancelled);


	setText("filter-all-count", total);

	setText(
		"filter-active-count",
		total - completed - cancelled
	);

	setText(
		"filter-completed-count",
		completed
	);

	setText(
		"filter-cancelled-count",
		cancelled
	);

}


function getFilteredAdminOrders() {

	let result = [...adminOrdersData];


	if (currentAdminFilter === "active") {

		result = result.filter(
			order =>
				order.status !== "completed" &&
				order.status !== "cancelled"
		);

	}


	if (currentAdminFilter === "completed") {

		result = result.filter(
			order => order.status === "completed"
		);

	}


	if (currentAdminFilter === "cancelled") {

		result = result.filter(
			order => order.status === "cancelled"
		);

	}


	const search = currentAdminSearch
		.trim()
		.toLowerCase();


	if (search) {

		result = result.filter(order => {

			const profile = order.profiles || {};

			const customer = adminCustomerName(profile);

			const email = profile.email || "";

			const number = order.order_number || "";

			const title = order.title || "";

			const subject = order.subject || "";


			return [

				customer,
				email,
				number,
				title,
				subject

			]
				.join(" ")
				.toLowerCase()
				.includes(search);

		});

	}


	return result;

}


function renderAdminOrders() {

	const body = document.getElementById("orders-body");

	if (!body) {
		return;
	}


	const data = getFilteredAdminOrders();


	const caption = document.getElementById("orders-caption");

	if (caption) {

		const labels = {

			all: "همه سفارش‌ها",

			active: "سفارش‌های در حال انجام",

			completed: "سفارش‌های تکمیل شده",

			cancelled: "سفارش‌های لغو شده"

		};

		caption.textContent =
			`${labels[currentAdminFilter] || "سفارش‌ها"} — ${data.length} مورد`;

	}


	if (!data.length) {

		body.innerHTML = `
			<tr>
				<td
					colspan="7"
					class="table-empty"
				>
					سفارشی مطابق فیلتر انتخاب‌شده وجود ندارد.
				</td>
			</tr>
		`;

		return;
	}


	body.innerHTML = data.map(order => {

		const profile = order.profiles || {};

		const customer = adminCustomerName(profile);


		return `
			<tr>

				<td>
					<div class="order-number">
						${adminEscape(order.order_number)}
					</div>
				</td>


				<td>

					<a
						class="order-title-link"
						href="admin-order.html?id=${encodeURIComponent(order.id)}"
					>
						${adminEscape(order.title)}
					</a>

					${order.subject ? `
						<div class="table-subtext">
							${adminEscape(order.subject)}
						</div>
					` : ""}

				</td>


				<td>

					<div class="customer-cell">

						<div class="customer-avatar">
							${adminEscape(
								(customer.charAt(0) || "؟").toUpperCase()
							)}
						</div>

						<div>

							<div class="customer-name">
								${adminEscape(customer)}
							</div>

							<div class="table-subtext">
								${adminEscape(profile.email || "-")}
							</div>

						</div>

					</div>

				</td>


				<td>
					${adminEscape(
						adminModelText(order.production_model)
					)}
				</td>


				<td>

					<span
						class="status status-${adminEscape(order.status)}"
					>
						${adminEscape(
							adminStatusText(order.status)
						)}
					</span>

				</td>


				<td>
					${adminDate(order.created_at)}
				</td>


				<td>

					<a
						class="button secondary small-button"
						href="admin-order.html?id=${encodeURIComponent(order.id)}"
					>
						مشاهده
					</a>

				</td>

			</tr>
		`;

	}).join("");

}


window.filterAdminOrders = function(filter) {

	currentAdminFilter = filter || "all";

	renderAdminOrders();

};


window.searchAdminOrders = function(value) {

	currentAdminSearch = value || "";

	renderAdminOrders();

};


/* ---------------------------------------------------------
   Admin Users
   --------------------------------------------------------- */

let adminUsersData = [];


async function adminUsers() {

	const authData = await requireUser(true);

	if (!authData) {
		return;
	}


	const body = document.getElementById("users-body");

	if (!body) {
		return;
	}


	body.innerHTML = `
		<tr>
			<td colspan="6" class="table-loading">
				در حال دریافت کاربران...
			</td>
		</tr>
	`;


	const { data, error } = await window.db
		.from("profiles")
		.select("*")
		.order("created_at", {
			ascending: false
		});


	if (error) {

		console.error("ADMIN USERS ERROR:", error);

		body.innerHTML = `
			<tr>
				<td colspan="6" class="table-error">
					دریافت کاربران انجام نشد.
					<br>
					<span>${adminEscape(error.message)}</span>
				</td>
			</tr>
		`;

		return;
	}


	adminUsersData = data || [];


	const customers = adminUsersData.filter(
		user => user.role !== "admin"
	).length;


	const admins = adminUsersData.filter(
		user => user.role === "admin"
	).length;


	const totalElement = document.getElementById("users-total");

	const customersElement = document.getElementById("customers-total");

	const adminsElement = document.getElementById("admins-total");


	if (totalElement) {
		totalElement.textContent = adminUsersData.length;
	}


	if (customersElement) {
		customersElement.textContent = customers;
	}


	if (adminsElement) {
		adminsElement.textContent = admins;
	}


	if (!adminUsersData.length) {

		body.innerHTML = `
			<tr>
				<td colspan="6" class="table-empty">
					کاربری وجود ندارد.
				</td>
			</tr>
		`;

		return;
	}


	body.innerHTML = adminUsersData.map(user => {

		const name = adminCustomerName(user);

		return `
			<tr>

				<td>

					<div class="customer-cell">

						<div class="customer-avatar">
							${adminEscape(
								(name.charAt(0) || "؟").toUpperCase()
							)}
						</div>

						<div class="customer-name">
							${adminEscape(name)}
						</div>

					</div>

				</td>


				<td>
					${adminEscape(user.email || "-")}
				</td>


				<td>
					${adminEscape(user.phone || "-")}
				</td>


				<td>

					<span class="role-badge role-${adminEscape(user.role)}">
						${adminEscape(
							adminRoleText(user.role)
						)}
					</span>

				</td>


				<td>
					${adminDate(user.created_at)}
				</td>


				<td>

					<a
						class="button primary small-button"
						href="admin-order.html?customer=${encodeURIComponent(user.id)}"
					>
						ثبت سفارش
					</a>

				</td>

			</tr>
		`;

	}).join("");

}


/* ---------------------------------------------------------
   Admin Order Page
   --------------------------------------------------------- */

async function adminOrder() {

	const authData = await requireUser(true);

	if (!authData) {
		return;
	}


	const root = document.getElementById("root");

	if (!root) {
		return;
	}


	const params = new URLSearchParams(location.search);

	const orderId = params.get("id");

	const customerId = params.get("customer");


	if (orderId) {

		await renderAdminOrderDetails(
			root,
			orderId,
			authData
		);

		return;

	}


	await renderAdminOrderCreate(
		root,
		customerId,
		authData
	);

}


/* ---------------------------------------------------------
   Create Order
   --------------------------------------------------------- */

async function renderAdminOrderCreate(
	root,
	customerId,
	authData
) {

	let customers = [];


	const { data, error } = await window.db
		.from("profiles")
		.select(`
			id,
			email,
			first_name,
			last_name,
			phone,
			role
		`)
		.order("created_at", {
			ascending: false
		});


	if (error) {

		root.innerHTML = `
			<div class="empty">
				دریافت کاربران انجام نشد.
				<br>
				${adminEscape(error.message)}
			</div>
		`;

		return;
	}


	customers = (data || []).filter(
		user => user.role !== "admin"
	);


	const selectedCustomer =
		customers.find(
			user => user.id === customerId
		) || null;


	root.innerHTML = `

		<div class="admin-topbar">

			<div>

				<span class="eyebrow">
					سفارش جدید
				</span>

				<h1>
					ثبت سفارش برای مشتری
				</h1>

				<p class="admin-subtitle">
					یک سفارش جدید برای یکی از کاربران موجود ایجاد کنید.
				</p>

			</div>


			<a
				class="button secondary"
				href="admin-users.html"
			>
				بازگشت به کاربران
			</a>

		</div>


		<form
			id="admin-create-order-form"
			class="admin-create-layout"
		>


			<section class="panel admin-form-panel">

				<div class="panel-heading">

					<div>

						<h2>
							اطلاعات سفارش
						</h2>

						<p>
							اطلاعات اصلی پروژه را وارد کنید.
						</p>

					</div>

				</div>


				<div class="form-grid">


					<div class="form-field full">

						<label for="customer_id">
							مشتری
						</label>

						<select
							id="customer_id"
							name="customer_id"
							required
						>

							<option value="">
								انتخاب مشتری
							</option>

							${customers.map(user => `

								<option
									value="${adminEscape(user.id)}"
									${selectedCustomer &&
									selectedCustomer.id === user.id
										? "selected"
										: ""}
								>
									${adminEscape(
										adminCustomerName(user)
									)}
									 — 
									${adminEscape(
										user.email || "-"
									)}
								</option>

							`).join("")}

						</select>

					</div>


					<div class="form-field">

						<label for="title">
							نام فیلم
						</label>

						<input
							id="title"
							name="title"
							type="text"
							maxlength="180"
							required
							placeholder="مثلاً ویدیوی معرفی محصول"
						>

					</div>


					<div class="form-field">

						<label for="subject">
							موضوع
						</label>

						<input
							id="subject"
							name="subject"
							type="text"
							maxlength="250"
							required
							placeholder="موضوع یا هدف ویدیو"
						>

					</div>


					<div class="form-field full">

						<label for="description">
							توضیحات
						</label>

						<textarea
							id="description"
							name="description"
							rows="6"
							required
							placeholder="توضیحات کامل سفارش..."
						></textarea>

					</div>


					<div class="form-field">

						<label for="estimated_duration">
							مدت تقریبی
						</label>

						<select
							id="estimated_duration"
							name="estimated_duration"
						>

							<option value="">
								انتخاب مدت
							</option>

							<option value="30">
								۳۰ ثانیه
							</option>

							<option value="60">
								۱ دقیقه
							</option>

							<option value="120">
								۲ دقیقه
							</option>

							<option value="180">
								۳ دقیقه
							</option>

							<option value="300">
								۵ دقیقه
							</option>

							<option value="600">
								۱۰ دقیقه
							</option>

							<option value="custom">
								مدت سفارشی
							</option>

						</select>

					</div>


					<div class="form-field">

						<label for="production_model">
							مدل تولید
						</label>

						<select
							id="production_model"
							name="production_model"
							required
						>

							<option value="edit_only">
								فقط تدوین
							</option>

							<option value="voice_ready">
								گویندگی آماده است
							</option>

							<option value="visual_ready">
								تصاویر آماده است
							</option>

							<option value="script_ready">
								سناریو آماده است
							</option>

							<option value="full_production">
								تولید کامل
							</option>

						</select>

					</div>


					<div class="form-field">

						<label for="aspect_ratio">
							نسبت تصویر
						</label>

						<select
							id="aspect_ratio"
							name="aspect_ratio"
						>

							<option value="">
								انتخاب نسبت
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


					<div class="form-field">

						<label for="output_quality">
							کیفیت خروجی
						</label>

						<select
							id="output_quality"
							name="output_quality"
						>

							<option value="">
								انتخاب کیفیت
							</option>

							<option value="720p">
								720p
							</option>

							<option value="1080p">
								1080p
							</option>

							<option value="4K">
								4K
							</option>

						</select>

					</div>


					<div class="form-field">

						<label for="video_style">
							سبک ویدیو
						</label>

						<select
							id="video_style"
							name="video_style"
						>

							<option value="">
								انتخاب سبک
							</option>

							<option value="آزاد">
								آزاد
							</option>

							<option value="تبلیغاتی">
								تبلیغاتی
							</option>

							<option value="آموزشی">
								آموزشی
							</option>

							<option value="مستند">
								مستند
							</option>

							<option value="شبکه اجتماعی">
								شبکه اجتماعی
							</option>

							<option value="سینمایی">
								سینمایی
							</option>

						</select>

					</div>


					<div class="form-field full">

						<label for="reference_links">
							لینک‌های مرجع
						</label>

						<textarea
							id="reference_links"
							name="reference_links"
							rows="4"
							placeholder="لینک‌ها را وارد کنید..."
						></textarea>

					</div>


					<div class="form-field full">

						<label for="special_notes">
							یادداشت‌های ویژه
						</label>

						<textarea
							id="special_notes"
							name="special_notes"
							rows="4"
							placeholder="نکات مهم سفارش..."
						></textarea>

					</div>

				</div>


				<div
					id="create-message"
					class="message"
				></div>


				<div class="form-actions">

					<a
						class="button secondary"
						href="admin-users.html"
					>
						انصراف
					</a>

					<button
						type="submit"
						class="button primary"
					>
						ثبت سفارش
					</button>

				</div>

			</section>


			<aside class="panel order-side-card">

				<div class="panel-heading">

					<div>

						<h2>
							مشتری
						</h2>

					</div>

				</div>


				<div id="selected-customer-preview">

					${renderSelectedCustomerPreview(
						selectedCustomer
					)}

				</div>


				<div class="side-info-box">

					<strong>
						وضعیت اولیه
					</strong>

					<span>
						جدید
					</span>

				</div>


				<div class="side-info-box">

					<strong>
						پرداخت
					</strong>

					<span>
						پرداخت نشده
					</span>

				</div>

			</aside>


		</form>
	`;


	const customerSelect =
		document.getElementById("customer_id");


	if (customerSelect) {

		customerSelect.addEventListener(
			"change",
			() => {

				const user =
					customers.find(
						item =>
							item.id === customerSelect.value
					);


				const preview =
					document.getElementById(
						"selected-customer-preview"
					);


				if (preview) {

					preview.innerHTML =
						renderSelectedCustomerPreview(user);

				}

			}
		);

	}


	const form =
		document.getElementById(
			"admin-create-order-form"
		);


	if (form) {

		form.addEventListener(
			"submit",
			async event => {

				event.preventDefault();


				await createAdminOrder(
					form,
					authData
				);

			}
		);

	}

}


function renderSelectedCustomerPreview(user) {

	if (!user) {

		return `
			<div class="customer-preview-empty">
				ابتدا یک مشتری انتخاب کنید.
			</div>
		`;

	}


	return `

		<div class="customer-preview">

			<div class="large-avatar">
				${adminEscape(
					(
						adminCustomerName(user).charAt(0)
						|| "؟"
					).toUpperCase()
				)}
			</div>


			<strong>
				${adminEscape(
					adminCustomerName(user)
				)}
			</strong>


			<span>
				${adminEscape(
					user.email || "-"
				)}
			</span>


			<span>
				${adminEscape(
					user.phone || "-"
				)}
			</span>

		</div>

	`;

}


async function createAdminOrder(
	form,
	authData
) {

	const message =
		document.getElementById("create-message");


	const submitButton =
		form.querySelector(
			'button[type="submit"]'
		);


	const formData =
		new FormData(form);


	const customerId =
		String(
			formData.get("customer_id") || ""
		).trim();


	const title =
		String(
			formData.get("title") || ""
		).trim();


	const subject =
		String(
			formData.get("subject") || ""
		).trim();


	const description =
		String(
			formData.get("description") || ""
		).trim();


	const productionModel =
		String(
			formData.get("production_model") || ""
		).trim();


	const allowedProductionModels = [

		"edit_only",

		"voice_ready",

		"visual_ready",

		"script_ready",

		"full_production"

	];


	if (!customerId || !title || !subject || !description) {

		if (message) {

			message.className = "message error";

			message.textContent =
				"لطفاً اطلاعات الزامی را کامل کنید.";

		}

		return;

	}


	if (
		!allowedProductionModels.includes(
			productionModel
		)
	) {

		if (message) {

			message.className = "message error";

			message.textContent =
				"مدل تولید انتخاب‌شده معتبر نیست.";

		}

		return;

	}


	if (submitButton) {

		submitButton.disabled = true;

		submitButton.textContent =
			"در حال ثبت...";

	}


	const orderData = {

		customer_id: customerId,

		title,

		subject,

		description,

		estimated_duration:
			String(
				formData.get("estimated_duration") || ""
			).trim() || null,

		production_model:
			productionModel,

		aspect_ratio:
			String(
				formData.get("aspect_ratio") || ""
			).trim() || null,

		output_quality:
			String(
				formData.get("output_quality") || ""
			).trim() || null,

		video_style:
			String(
				formData.get("video_style") || ""
			).trim() || null,

		reference_links:
			String(
				formData.get("reference_links") || ""
			).trim() || null,

		special_notes:
			String(
				formData.get("special_notes") || ""
			).trim() || null,

		status: "new",

		payment_status: "unpaid",

		updated_at:
			new Date().toISOString()

	};


	const { data, error } =
		await window.db
			.from("video_orders")
			.insert(orderData)
			.select("*")
			.single();


	if (error) {

		console.error(
			"CREATE ADMIN ORDER ERROR:",
			error
		);


		if (message) {

			message.className =
				"message error";

			message.textContent =
				`ثبت سفارش انجام نشد: ${error.message}`;

		}


		if (submitButton) {

			submitButton.disabled = false;

			submitButton.textContent =
				"ثبت سفارش";

		}

		return;

	}


	if (data) {

		await window.db
			.from("order_status_history")
			.insert({

				order_id: data.id,

				status: "new",

				changed_by: authData.user.id,

				note: "سفارش توسط مدیر ایجاد شد."

			});

	}


	location.href =
		`admin-order.html?id=${encodeURIComponent(data.id)}`;

}


/* ---------------------------------------------------------
   Existing Order
   --------------------------------------------------------- */

async function renderAdminOrderDetails(
	root,
	orderId,
	authData
) {

	const [
		orderResult,
		filesResult,
		historyResult
	] = await Promise.all([

		window.db
			.from("video_orders")
			.select(`
				*,
				profiles:customer_id(
					id,
					email,
					first_name,
					last_name,
					phone,
					address,
					avatar_url,
					role,
					created_at
				)
			`)
			.eq("id", orderId)
			.single(),

		window.db
			.from("order_files")
			.select("*")
			.eq("order_id", orderId)
			.order("created_at", {
				ascending: false
			}),

		window.db
			.from("order_status_history")
			.select(`
				*,
				profiles:changed_by(
					first_name,
					last_name,
					email
				)
			`)
			.eq("order_id", orderId)
			.order("created_at", {
				ascending: false
			})

	]);


	const order = orderResult.data;


	if (orderResult.error || !order) {

		root.innerHTML = `
			<div class="empty">
				سفارش پیدا نشد.
				<br>
				${adminEscape(
					orderResult.error?.message || ""
				)}
			</div>
		`;

		return;

	}


	const profile =
		order.profiles || {};


	const files =
		filesResult.data || [];


	const history =
		historyResult.data || [];


	root.innerHTML = `

		<div class="admin-topbar">

			<div>

				<div class="order-heading-line">

					<span class="eyebrow">
						${adminEscape(
							order.order_number
						)}
					</span>

					<span class="status status-${adminEscape(order.status)}">
						${adminEscape(
							adminStatusText(order.status)
						)}
					</span>

				</div>


				<h1>
					${adminEscape(order.title)}
				</h1>


				<p class="admin-subtitle">
					${adminEscape(order.subject)}
				</p>

			</div>


			<div class="admin-actions">

				<a
					class="button secondary"
					href="admin.html"
				>
					بازگشت به سفارش‌ها
				</a>

			</div>

		</div>


		<div class="order-detail-layout">


			<div class="order-main-column">


				<section class="panel">

					<div class="panel-heading">

						<div>

							<h2>
								اطلاعات سفارش
							</h2>

							<p>
								جزئیات کامل پروژه
							</p>

						</div>

					</div>


					<div class="detail-grid">


						<div class="detail-item">

							<span>
								شماره سفارش
							</span>

							<strong>
								${adminEscape(
									order.order_number
								)}
							</strong>

						</div>


						<div class="detail-item">

							<span>
								مدل تولید
							</span>

							<strong>
								${adminEscape(
									adminModelText(
										order.production_model
									)
								)}
							</strong>

						</div>


						<div class="detail-item">

							<span>
								مدت
							</span>

							<strong>
								${adminEscape(
									order.estimated_duration || "-"
								)}
							</strong>

						</div>


						<div class="detail-item">

							<span>
								نسبت تصویر
							</span>

							<strong>
								${adminEscape(
									order.aspect_ratio || "-"
								)}
							</strong>

						</div>


						<div class="detail-item">

							<span>
								کیفیت خروجی
							</span>

							<strong>
								${adminEscape(
									order.output_quality || "-"
								)}
							</strong>

						</div>


						<div class="detail-item">

							<span>
								سبک
							</span>

							<strong>
								${adminEscape(
									order.video_style || "-"
								)}
							</strong>

						</div>


						<div class="detail-item">

							<span>
								پرداخت
							</span>

							<strong>
								${adminEscape(
									adminPaymentText(
										order.payment_status
									)
								)}
							</strong>

						</div>


						<div class="detail-item">

							<span>
								نیازهای تولید
							</span>

							<strong>
								${adminEscape(
									adminNeedsText(order)
								)}
							</strong>

						</div>


					</div>


					<div class="description-box">

						<span>
							توضیحات سفارش
						</span>

						<p>
							${adminEscape(
								order.description || "-"
							).replace(
								/\n/g,
								"<br>"
							)}
						</p>

					</div>


					${order.reference_links ? `

						<div class="description-box">

							<span>
								لینک‌های مرجع
							</span>

							<p class="pre-line">
								${adminEscape(
									order.reference_links
								)}
							</p>

						</div>

					` : ""}


					${order.special_notes ? `

						<div class="description-box">

							<span>
								یادداشت‌های ویژه
							</span>

							<p class="pre-line">
								${adminEscape(
									order.special_notes
								)}
							</p>

						</div>

					` : ""}


					<div class="order-dates">

						<span>
							ایجاد:
							${adminDate(order.created_at)}
						</span>

						<span>
							آخرین بروزرسانی:
							${adminDate(order.updated_at)}
						</span>

					</div>

				</section>


				<section class="panel">

					<div class="panel-heading">

						<div>

							<h2>
								فایل‌های سفارش
							</h2>

							<p>
								فایل‌های ارسال‌شده برای این سفارش
							</p>

						</div>

					</div>


					<div id="order-files">

						${renderOrderFiles(files)}

					</div>

				</section>


				<section class="panel">

					<div class="panel-heading">

						<div>

							<h2>
								تاریخچه وضعیت
							</h2>

							<p>
								تغییرات ثبت‌شده برای سفارش
							</p>

						</div>

					</div>


					<div id="status-history">

						${renderStatusHistory(history)}

					</div>

				</section>


				<section class="panel chat-panel">

					<div class="panel-heading">

						<div>

							<h2>
								گفتگو با مشتری
							</h2>

							<p>
								پیام‌های مربوط به این سفارش
							</p>

						</div>

					</div>


					<div
						id="admin-chat-messages"
						class="chat-messages"
					>
						<div class="chat-loading">
							در حال دریافت پیام‌ها...
						</div>
					</div>


					<form
						id="admin-chat-form"
						class="chat-form"
					>

						<textarea
							id="admin-chat-input"
							rows="3"
							maxlength="5000"
							placeholder="پیام خود را برای مشتری بنویسید..."
							required
						></textarea>


						<div class="chat-form-bottom">

							<span>
								پیام به مشتری ارسال می‌شود.
							</span>

							<button
								type="submit"
								class="button primary"
							>
								ارسال پیام
							</button>

						</div>

					</form>

				</section>


			</div>


			<aside class="order-side-column">


				<section class="panel">

					<div class="panel-heading">

						<div>

							<h2>
								مشتری
							</h2>

						</div>

					</div>


					<div class="customer-detail">

						<div class="large-avatar">

							${adminEscape(
								(
									adminCustomerName(profile)
										.charAt(0)
									|| "؟"
								).toUpperCase()
							)}

						</div>


						<strong>
							${adminEscape(
								adminCustomerName(profile)
							)}
						</strong>


						<span>
							${adminEscape(
								profile.email || "-"
							)}
						</span>


						<span>
							${adminEscape(
								profile.phone || "-"
							)}
						</span>


						${profile.address ? `

							<span>
								${adminEscape(
									profile.address
								)}
							</span>

						` : ""}

					</div>

				</section>


				<section class="panel">

					<div class="panel-heading">

						<div>

							<h2>
								تغییر وضعیت
							</h2>

							<p>
								وضعیت فعلی:
								${adminEscape(
									adminStatusText(
										order.status
									)
								)}
							</p>

						</div>

					</div>


					<form
						id="status-form"
						class="form"
					>

						<label>
							وضعیت جدید
						</label>


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
							].map(([value, label]) => `

								<option
									value="${value}"
									${order.status === value
										? "selected"
										: ""}
								>
									${label}
								</option>

							`).join("")}

						</select>


						<label>
							یادداشت
						</label>


						<textarea
							id="status-note"
							rows="4"
							placeholder="دلیل یا توضیح تغییر وضعیت..."
						></textarea>


						<div
							id="status-message"
							class="message"
						></div>


						<button
							type="submit"
							class="button primary full-button"
						>
							ذخیره وضعیت
						</button>

					</form>

				</section>


				<section class="panel">

					<div class="panel-heading">

						<div>

							<h2>
								هزینه
							</h2>

						</div>

					</div>


					<div class="cost-list">

						<div>

							<span>
								هزینه تخمینی
							</span>

							<strong>
								${order.estimated_cost !== null &&
								order.estimated_cost !== undefined
									? adminEscape(
										order.estimated_cost
									)
									: "-"
								}
							</strong>

						</div>


						<div>

							<span>
								هزینه نهایی
							</span>

							<strong>
								${order.final_cost !== null &&
								order.final_cost !== undefined
									? adminEscape(
										order.final_cost
									)
									: "-"
								}
							</strong>

						</div>

					</div>

				</section>


			</aside>


		</div>
	`;


	await loadAdminMessages(
		orderId,
		authData.user.id
	);


	setupAdminStatusForm(
		order,
		authData,
		orderId
	);


	setupAdminChat(
		orderId,
		authData.user.id
	);


	setupAdminRealtime(
		orderId,
		authData.user.id
	);

}


/* ---------------------------------------------------------
   Files
   --------------------------------------------------------- */

function renderOrderFiles(files) {

	if (!files.length) {

		return `
			<div class="empty-inline">
				هنوز فایلی برای این سفارش ثبت نشده است.
			</div>
		`;

	}


	return `

		<div class="file-list">

			${files.map(file => `

				<a
					class="file-item"
					href="${adminEscape(file.file_url || "#")}"
					target="_blank"
					rel="noopener noreferrer"
				>

					<div class="file-icon">
						فایل
					</div>


					<div class="file-info">

						<strong>
							${adminEscape(
								file.file_name
							)}
						</strong>

						<span>
							${adminEscape(
								file.file_role || "فایل سفارش"
							)}

							${file.file_size
								? ` — ${formatFileSize(file.file_size)}`
								: ""}
						</span>

					</div>

				</a>

			`).join("")}

		</div>
	`;

}


function formatFileSize(bytes) {

	const size = Number(bytes);

	if (!size) {
		return "";
	}


	if (size < 1024) {
		return `${size} B`;
	}


	if (size < 1024 * 1024) {
		return `${(size / 1024).toFixed(1)} KB`;
	}


	if (size < 1024 * 1024 * 1024) {
		return `${(size / 1024 / 1024).toFixed(1)} MB`;
	}


	return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;

}


/* ---------------------------------------------------------
   Status History
   --------------------------------------------------------- */

function renderStatusHistory(history) {

	if (!history.length) {

		return `
			<div class="empty-inline">
				هنوز تاریخچه‌ای ثبت نشده است.
			</div>
		`;

	}


	return `

		<div class="timeline">

			${history.map(item => {

				const changer =
					item.profiles
						? adminCustomerName(
							item.profiles
						)
						: "مدیر";


				return `

					<div class="timeline-item">

						<div class="timeline-dot"></div>


						<div class="timeline-content">

							<div class="timeline-top">

								<strong>
									${adminEscape(
										adminStatusText(
											item.status
										)
									)}
								</strong>

								<span>
									${adminDate(
										item.created_at
									)}
								</span>

							</div>


							<div class="timeline-user">
								تغییر توسط:
								${adminEscape(changer)}
							</div>


							${item.note ? `

								<p>
									${adminEscape(
										item.note
									)}
								</p>

							` : ""}

						</div>

					</div>

				`;

			}).join("")}

		</div>

	`;

}


/* ---------------------------------------------------------
   Status Update
   --------------------------------------------------------- */

function setupAdminStatusForm(
	order,
	authData,
	orderId
) {

	const form =
		document.getElementById(
			"status-form"
		);


	if (!form) {
		return;
	}


	form.addEventListener(
		"submit",
		async event => {

			event.preventDefault();


			const status =
				document.getElementById(
					"status"
				).value;


			const note =
				document.getElementById(
					"status-note"
				).value.trim();


			const message =
				document.getElementById(
					"status-message"
				);


			const button =
				form.querySelector(
					'button[type="submit"]'
				);


			if (button) {

				button.disabled = true;

				button.textContent =
					"در حال ذخیره...";

			}


			const update =
				await window.db
					.from("video_orders")
					.update({

						status,

						updated_at:
							new Date().toISOString()

					})
					.eq("id", orderId);


			if (update.error) {

				console.error(
					"STATUS UPDATE ERROR:",
					update.error
				);


				if (message) {

					message.className =
						"message error";

					message.textContent =
						`ذخیره انجام نشد: ${update.error.message}`;

				}


				if (button) {

					button.disabled = false;

					button.textContent =
						"ذخیره وضعیت";

				}

				return;

			}


			const history =
				await window.db
					.from("order_status_history")
					.insert({

						order_id: orderId,

						status,

						changed_by:
							authData.user.id,

						note: note || null

					});


			if (history.error) {

				console.error(
					"HISTORY INSERT ERROR:",
					history.error
				);


				if (message) {

					message.className =
						"message warning";

					message.textContent =
						"وضعیت ذخیره شد، اما تاریخچه وضعیت ثبت نشد.";

				}

			} else {

				if (message) {

					message.className =
						"message success";

					message.textContent =
						"وضعیت با موفقیت ذخیره شد.";

				}


				const statusBadge =
					document.querySelector(
						".order-heading-line .status"
					);


				if (statusBadge) {

					statusBadge.className =
						`status status-${adminEscape(status)}`;

					statusBadge.textContent =
						adminStatusText(status);

				}


				order.status = status;

			}


			if (button) {

				button.disabled = false;

				button.textContent =
					"ذخیره وضعیت";

			}

		}
	);

}


/* ---------------------------------------------------------
   Chat
   --------------------------------------------------------- */

async function loadAdminMessages(
	orderId,
	adminId
) {

	const container =
		document.getElementById(
			"admin-chat-messages"
		);


	if (!container) {
		return;
	}


	const { data, error } =
		await window.db
			.from("order_messages")
			.select(`
				id,
				order_id,
				sender_id,
				message,
				created_at,
				profiles:sender_id(
					first_name,
					last_name,
					email,
					role
				)
			`)
			.eq("order_id", orderId)
			.order("created_at", {
				ascending: true
			});


	if (error) {

		console.error(
			"CHAT LOAD ERROR:",
			error
		);


		container.innerHTML = `
			<div class="empty-inline">
				دریافت پیام‌ها انجام نشد.
				<br>
				${adminEscape(error.message)}
			</div>
		`;

		return;
	}


	if (!data || !data.length) {

		container.innerHTML = `
			<div class="chat-empty">
				هنوز گفتگویی برای این سفارش ثبت نشده است.
			</div>
		`;

		return;
	}


	container.innerHTML =
		data.map(message => {

			const mine =
				message.sender_id === adminId;


			const sender =
				message.profiles
					? adminCustomerName(
						message.profiles
					)
					: (
						mine
							? "مدیر"
							: "مشتری"
					);


			return `

				<div
					class="chat-message ${mine ? "mine" : "customer"}"
				>

					<div class="chat-bubble">

						<div class="chat-meta">

							<strong>
								${adminEscape(
									sender
								)}
							</strong>

							<span>
								${adminDate(
									message.created_at
								)}
							</span>

						</div>


						<div class="chat-text">
							${adminEscape(
								message.message
							).replace(
								/\n/g,
								"<br>"
							)}
						</div>

					</div>

				</div>

			`;

		}).join("");


	container.scrollTop =
		container.scrollHeight;

}


function setupAdminChat(
	orderId,
	adminId
) {

	const form =
		document.getElementById(
			"admin-chat-form"
		);


	const input =
		document.getElementById(
			"admin-chat-input"
		);


	if (!form || !input) {
		return;
	}


	form.addEventListener(
		"submit",
		async event => {

			event.preventDefault();


			const message =
				input.value.trim();


			if (!message) {
				return;
			}


			const button =
				form.querySelector(
					'button[type="submit"]'
				);


			if (button) {

				button.disabled = true;

				button.textContent =
					"در حال ارسال...";

			}


			const { error } =
				await window.db
					.from("order_messages")
					.insert({

						order_id: orderId,

						sender_id: adminId,

						message

					});


			if (error) {

				console.error(
					"CHAT SEND ERROR:",
					error
				);


				alert(
					`ارسال پیام انجام نشد: ${error.message}`
				);

			} else {

				input.value = "";

				await loadAdminMessages(
					orderId,
					adminId
				);

			}


			if (button) {

				button.disabled = false;

				button.textContent =
					"ارسال پیام";

			}

		}
	);

}


function setupAdminRealtime(
	orderId,
	adminId
) {

	if (!window.db || !window.db.channel) {
		return;
	}


	try {

		window.db
			.channel(
				`admin-order-messages-${orderId}`
			)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "order_messages",
					filter: `order_id=eq.${orderId}`
				},
				async () => {

					await loadAdminMessages(
						orderId,
						adminId
					);

				}
			)
			.subscribe();

	} catch (error) {

		console.warn(
			"Realtime setup failed:",
			error
		);

	}

}
