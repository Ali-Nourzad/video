/* =========================================================
   T-CHOOB ADMIN
   ========================================================= */


/* ---------------------------------------------------------
   GLOBAL STATE
   --------------------------------------------------------- */

let adminOrdersData = [];

let currentAdminFilter = "all";

let currentAdminSearch = "";


/* ---------------------------------------------------------
   ADMIN ORDERS
   --------------------------------------------------------- */

async function adminOrders() {

	const authData = await requireUser(true);

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
			<td colspan="7" class="table-loading">
				<span class="loading-spinner"></span>
				در حال دریافت سفارش‌ها...
			</td>
		</tr>
	`;


	const {
		data,
		error
	} = await window.db

		.from("video_orders")

		.select(`
			*,
			profiles:customer_id(
				first_name,
				last_name,
				email,
				phone
			)
		`)

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
				<td
					colspan="7"
					class="admin-empty-row"
				>
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


	updateAdminStats(
		adminOrdersData
	);


	updateAdminFilterCounts(
		adminOrdersData
	);


	renderAdminOrders();


}


/* ---------------------------------------------------------
   STATS
   --------------------------------------------------------- */

function updateAdminStats(data) {

	const total =
		data.length;


	const newOrders =
		data.filter(
			order =>
				order.status === "new"
		).length;


	const progress =
		data.filter(
			order =>
				[
					"review",
					"approved",
					"production",
					"editing",
					"revision"
				].includes(order.status)
		).length;


	const ready =
		data.filter(
			order =>
				order.status === "ready"
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


	setText(
		"total",
		total
	);


	setText(
		"new",
		newOrders
	);


	setText(
		"progress",
		progress
	);


	setText(
		"ready",
		ready
	);


	setText(
		"completed",
		completed
	);


	setText(
		"cancelled",
		cancelled
	);

}


/* ---------------------------------------------------------
   FILTER COUNTS
   --------------------------------------------------------- */

function updateAdminFilterCounts(data) {


	const active =
		data.filter(
			order =>
				[
					"review",
					"approved",
					"production",
					"editing",
					"revision"
				].includes(order.status)
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


	setText(
		"filter-all-count",
		data.length
	);


	setText(
		"filter-active-count",
		active
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


/* ---------------------------------------------------------
   FILTER
   --------------------------------------------------------- */

function filterAdminOrders(filter) {

	currentAdminFilter =
		filter || "all";


	renderAdminOrders();

}


/* ---------------------------------------------------------
   SEARCH
   --------------------------------------------------------- */

function searchAdminOrders(value) {

	currentAdminSearch =
		String(value || "")
			.trim()
			.toLowerCase();


	renderAdminOrders();

}


/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */

function renderAdminOrders() {


	const body =
		document.getElementById(
			"orders-body"
		);


	if (!body) {
		return;
	}


	let filtered =
		adminOrdersData.slice();


	/* FILTER */

	if (
		currentAdminFilter === "active"
	) {

		filtered =
			filtered.filter(
				order =>
					[
						"review",
						"approved",
						"production",
						"editing",
						"revision"
					].includes(order.status)
			);

	}


	if (
		currentAdminFilter === "completed"
	) {

		filtered =
			filtered.filter(
				order =>
					order.status === "completed"
			);

	}


	if (
		currentAdminFilter === "cancelled"
	) {

		filtered =
			filtered.filter(
				order =>
					order.status === "cancelled"
			);

	}


	/* SEARCH */

	if (currentAdminSearch) {

		filtered =
			filtered.filter(order => {


				const profile =
					order.profiles || {};


				const customerName =
					`${profile.first_name || ""} ${profile.last_name || ""}`
						.trim();


				const searchText =
					[
						order.order_number,
						order.title,
						order.subject,
						customerName,
						profile.email,
						profile.phone
					]
						.filter(Boolean)
						.join(" ")
						.toLowerCase();


				return searchText.includes(
					currentAdminSearch
				);

			});

	}


	/* CAPTION */

	updateOrdersCaption(
		filtered.length
	);


	/* EMPTY */

	if (!filtered.length) {

		body.innerHTML = `
			<tr>
				<td
					colspan="7"
					class="admin-empty-row"
				>
					هیچ سفارشی با این فیلتر پیدا نشد.
				</td>
			</tr>
		`;

		return;
	}


	/* TABLE */

	body.innerHTML =
		filtered
			.map(
				(order, index) =>
					renderAdminOrderRow(
						order,
						index
					)
			)
			.join("");

}


/* ---------------------------------------------------------
   ROW
   --------------------------------------------------------- */

function renderAdminOrderRow(
	order,
	index
) {


	const profile =
		order.profiles || {};


	const customerName =
		`${profile.first_name || ""} ${profile.last_name || ""}`
			.trim()
		||
		"بدون نام";


	const delay =
		Math.min(
			index * 35,
			350
		);


	return `
		<tr
			style="animation-delay:${delay}ms"
		>

			<td>
				${esc(order.order_number || "-")}
			</td>


			<td>

				<div class="admin-order-title">

					<strong>
						${esc(order.title || "بدون عنوان")}
					</strong>

					${
						order.subject
							?
							`<small>${esc(order.subject)}</small>`
							:
							""
					}

				</div>

			</td>


			<td>

				<div class="admin-customer">

					<span class="admin-avatar">

						${esc(
							getInitials(
								profile.first_name,
								profile.last_name
							)
						)}

					</span>


					<span>
						${esc(customerName)}
					</span>

				</div>

			</td>


			<td>
				${modelText(
					order.production_model
				)}
			</td>


			<td>

				<span
					class="status status-${esc(
						order.status
					)}"
				>
					${statusText(
						order.status
					)}
				</span>

			</td>


			<td>
				${date(
					order.created_at
				)}
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

}


/* ---------------------------------------------------------
   CAPTION
   --------------------------------------------------------- */

function updateOrdersCaption(
	count
) {


	const caption =
		document.getElementById(
			"orders-caption"
		);


	const visibleCount =
		document.getElementById(
			"visible-orders-count"
		);


	if (!caption) {
		return;
	}


	const filterNames = {

		all:
			"همه سفارش‌ها",

		active:
			"سفارش‌های در حال انجام",

		completed:
			"سفارش‌های تکمیل شده",

		cancelled:
			"سفارش‌های لغو شده"

	};


	caption.textContent =
		filterNames[
			currentAdminFilter
		] ||
		"همه سفارش‌ها";


	if (
		currentAdminSearch
	) {

		caption.textContent +=
			" · نتیجه جستجو";

	}


	if (visibleCount) {

		visibleCount.textContent =
			`${count} سفارش`;

	}

}


/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */

function setText(
	id,
	value
) {

	const element =
		document.getElementById(id);


	if (element) {

		element.textContent =
			String(value);

	}

}


function getInitials(
	firstName,
	lastName
) {

	const first =
		String(firstName || "")
			.trim()
			.charAt(0);


	const last =
		String(lastName || "")
			.trim()
			.charAt(0);


	return (
		first +
		last
	) ||
	"TC";

}


/* ---------------------------------------------------------
   ADMIN USERS
   --------------------------------------------------------- */

async function adminUsers() {

	const authData =
		await requireUser(true);


	if (!authData) {
		return;
	}


	const body =
		document.getElementById(
			"users-body"
		);


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
		(data || [])
			.map(
				user =>
					`
					<tr>

						<td>

							<div class="admin-customer">

								<span class="admin-avatar">

									${esc(
										getInitials(
											user.first_name,
											user.last_name
										)
									)}

								</span>

								<span>

									${esc(
										`${user.first_name || ""} ${user.last_name || ""}`
											.trim()
										||
										"بدون نام"
									)}

								</span>

							</div>

						</td>


						<td>
							${esc(
								user.email || "-"
							)}
						</td>


						<td>
							${esc(
								user.phone || "-"
							)}
						</td>


						<td>
							${esc(
								user.role || "-"
							)}
						</td>


						<td>
							${date(
								user.created_at
							)}
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
					`
			)
			.join("");

}


/* ---------------------------------------------------------
   ADMIN ORDER
   --------------------------------------------------------- */

async function adminOrder() {

	const authData =
		await requireUser(true);


	if (!authData) {
		return;
	}


	const root =
		document.getElementById(
			"root"
		);


	if (!root) {
		return;
	}


	const params =
		new URLSearchParams(
			location.search
		);


	const id =
		params.get("id");


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
					برای ثبت سفارش، ابتدا یک کاربر را انتخاب کنید.
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


	const {
		data: order,
		error
	} = await window.db

		.from("video_orders")

		.select(`
			*,
			profiles:customer_id(
				first_name,
				last_name,
				email,
				phone
			)
		`)

		.eq(
			"id",
			id
		)

		.single();


	if (
		error ||
		!order
	) {

		root.innerHTML = `
			<div class="empty">
				سفارش پیدا نشد.
			</div>
		`;

		return;
	}


	root.innerHTML = `

		<div class="page-head">

			<div>

				<span class="eyebrow">
					${esc(
						order.order_number
					)}
				</span>

				<h1>
					${esc(
						order.title
					)}
				</h1>

			</div>


			<a
				class="button secondary"
				href="admin.html"
			>
				بازگشت
			</a>

		</div>


		<div class="detail-grid">

			<section class="panel">

				<h2>
					اطلاعات سفارش
				</h2>


				<div class="detail-list">

					<div>

						<span>
							کاربر
						</span>

						<strong>
							${esc(
								`${order.profiles?.first_name || ""} ${order.profiles?.last_name || ""}`
									.trim()
								||
								"بدون نام"
							)}
						</strong>

					</div>


					<div>

						<span>
							ایمیل
						</span>

						<strong>
							${esc(
								order.profiles?.email ||
								"-"
							)}
						</strong>

					</div>


					<div>

						<span>
							تلفن
						</span>

						<strong>
							${esc(
								order.profiles?.phone ||
								"-"
							)}
						</strong>

					</div>


					<div>

						<span>
							مدل
						</span>

						<strong>
							${modelText(
								order.production_model
							)}
						</strong>

					</div>

				</div>


				<p>
					${esc(
						order.description ||
						""
					)}
				</p>

			</section>


			<section class="panel">

				<h2>
					تغییر وضعیت
				</h2>


				<form
					id="status-form"
					class="form"
				>

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
						]
							.map(
								([value,label]) =>
									`
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
						id="msg"
						class="message"
					></div>


					<button
						class="button primary"
						type="submit"
					>
						ذخیره وضعیت
					</button>

				</form>

			</section>

		</div>
	`;


	const statusForm =
		document.getElementById(
			"status-form"
		);


	if (!statusForm) {
		return;
	}


	statusForm.onsubmit =
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


			const update =
				await window.db

					.from("video_orders")

					.update({
						status,
						updated_at:
							new Date()
								.toISOString()
					})

					.eq(
						"id",
						id
					);


			const message =
				document.getElementById(
					"msg"
				);


			if (update.error) {

				console.error(
					"STATUS UPDATE ERROR:",
					update.error
				);


				message.textContent =
					"ذخیره انجام نشد.";

				return;
			}


			const history =
				await window.db

					.from(
						"order_status_history"
					)

					.insert({

						order_id:
							id,

						status:
							status,

						changed_by:
							authData.user.id,

						note:
							note

					});


			if (history.error) {

				console.error(
					"HISTORY ERROR:",
					history.error
				);


				message.textContent =
					"وضعیت ذخیره شد، اما تاریخچه ثبت نشد.";

				return;
			}


			message.textContent =
				"وضعیت با موفقیت ذخیره شد.";

		};

}
