async function adminOrders() {
	const a = await requireUser(true);

	if (!a) {
		return;
	}

	const body = document.getElementById("orders-body");

	const { data, error } = await window.db
		.from("video_orders")
		.select(
			"*,profiles:customer_id(first_name,last_name,email,phone)"
		)
		.order("created_at", {
			ascending: false
		});

	if (error) {
		body.innerHTML =
			"<tr><td colspan='7'>دریافت سفارش‌ها انجام نشد.</td></tr>";

		return;
	}

	document.getElementById("total").textContent = data.length;

	document.getElementById("new").textContent =
		data.filter(x => x.status === "new").length;

	document.getElementById("progress").textContent =
		data.filter(x =>
			[
				"approved",
				"production",
				"editing"
			].includes(x.status)
		).length;

	document.getElementById("ready").textContent =
		data.filter(x => x.status === "ready").length;

	body.innerHTML =
		data.map(x => {
			const p = x.profiles || {};

			return `
				<tr>
					<td>${esc(x.order_number)}</td>
					<td>${esc(x.title)}</td>
					<td>
						${esc(
							`${p.first_name || ""} ${p.last_name || ""}`.trim() ||
							"بدون نام"
						)}
					</td>
					<td>${modelText(x.production_model)}</td>
					<td>
						<span class="status status-${esc(x.status)}">
							${statusText(x.status)}
						</span>
					</td>
					<td>${date(x.created_at)}</td>
					<td>
						<a
							class="button secondary"
							href="admin-order.html?id=${x.id}"
						>
							مدیریت
						</a>
					</td>
				</tr>
			`;
		}).join("") ||
		"<tr><td colspan='7'>سفارشی وجود ندارد.</td></tr>";
}


async function adminUsers() {
	const a = await requireUser(true);

	if (!a) {
		return;
	}

	const body = document.getElementById("users-body");

	const { data, error } = await window.db
		.from("profiles")
		.select("*")
		.order("created_at", {
			ascending: false
		});

	if (error) {
		body.innerHTML =
			"<tr><td colspan='6'>دریافت کاربران انجام نشد.</td></tr>";

		return;
	}

	body.innerHTML =
		data.map(x => `
			<tr>
				<td>
					${esc(
						`${x.first_name || ""} ${x.last_name || ""}`.trim() ||
						"بدون نام"
					)}
				</td>
				<td>${esc(x.email || "-")}</td>
				<td>${esc(x.phone || "-")}</td>
				<td>${esc(x.role)}</td>
				<td>${date(x.created_at)}</td>
				<td>
					<a
						class="button secondary"
						href="admin-order.html?customer=${x.id}"
					>
						ثبت سفارش
					</a>
				</td>
			</tr>
		`).join("");
}


async function adminOrder() {
	const a = await requireUser(true);

	if (!a) {
		return;
	}

	const root = document.getElementById("root");

	const params = new URLSearchParams(location.search);

	const id = params.get("id");

	if (!id) {
		root.innerHTML = `
			<div class="page-head">
				<div>
					<span class="eyebrow">مدیریت</span>
					<h1>ثبت سفارش برای کاربر موجود</h1>
				</div>
			</div>

			<section class="panel">
				<p class="muted">
					برای نسخه اول، ثبت سفارش از طرف ادمین
					در مرحله بعد به فرم کامل متصل می‌شود.
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

	const { data: order, error } = await window.db
		.from("video_orders")
		.select(
			"*,profiles:customer_id(first_name,last_name,email,phone)"
		)
		.eq("id", id)
		.single();

	if (error || !order) {
		root.innerHTML =
			"<div class='empty'>سفارش پیدا نشد.</div>";

		return;
	}

	root.innerHTML = `
		<div class="page-head">
			<div>
				<span class="eyebrow">
					${esc(order.order_number)}
				</span>

				<h1>
					${esc(order.title)}
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
				<h2>اطلاعات سفارش</h2>

				<div class="detail-list">
					<div>
						<span>کاربر</span>

						<strong>
							${esc(
								`${order.profiles?.first_name || ""} ${
									order.profiles?.last_name || ""
								}`.trim()
							)}
						</strong>
					</div>

					<div>
						<span>ایمیل</span>

						<strong>
							${esc(order.profiles?.email || "-")}
						</strong>
					</div>

					<div>
						<span>تلفن</span>

						<strong>
							${esc(order.profiles?.phone || "-")}
						</strong>
					</div>

					<div>
						<span>مدل</span>

						<strong>
							${modelText(order.production_model)}
						</strong>
					</div>
				</div>

				<p>
					${esc(order.description || "")}
				</p>
			</section>

			<section class="panel">
				<h2>تغییر وضعیت</h2>

				<form id="status-form" class="form">
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
								([value, label]) =>
									`<option value="${value}" ${
										order.status === value
											? "selected"
											: ""
									}>${label}</option>`
							)
							.join("")}
					</select>

					<textarea
						id="note"
						rows="4"
						placeholder="یادداشت تغییر وضعیت"
					></textarea>

					<div id="msg" class="message"></div>

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

	document.getElementById("status-form").onsubmit =
		async event => {
			event.preventDefault();

			const status =
				document.getElementById("status").value;

			const note =
				document.getElementById("note").value.trim();

			const update = await window.db
				.from("video_orders")
				.update({
					status,
					updated_at: new Date().toISOString()
				})
				.eq("id", id);

			if (update.error) {
				document.getElementById("msg").textContent =
					"ذخیره انجام نشد.";

				return;
			}

			const history = await window.db
				.from("order_status_history")
				.insert({
					order_id: id,
					status,
					changed_by: a.user.id,
					note
				});

			if (history.error) {
				document.getElementById("msg").textContent =
					"وضعیت ذخیره شد، اما تاریخچه وضعیت ثبت نشد.";

				return;
			}

			document.getElementById("msg").textContent =
				"وضعیت ذخیره شد.";
		};
}
