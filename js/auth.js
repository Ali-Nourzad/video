"use strict";

/*
 * Authentication helpers
 * این فایل فقط مسئول احراز هویت و وضعیت حساب کاربر است.
 */

async function getCurrentUser() {
	if (!window.db) {
		throw new Error("Supabase client is not initialized.");
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


/*
 * بررسی نشست کاربر.
 * اگر کاربر وارد نشده باشد، به صفحه ورود می‌رود.
 */
async function requireUser(adminOnly = false) {
	if (!window.db) {
		console.error("Supabase client is not initialized.");
		window.location.replace("login.html");
		return null;
	}

	try {
		const {
			data: { user },
			error
		} = await window.db.auth.getUser();

		if (error || !user) {
			if (error) {
				console.error("GET USER ERROR:", error);
			}

			window.location.replace("login.html");
			return null;
		}

		const {
			data: profile,
			error: profileError
		} = await window.db
			.from("profiles")
			.select("*")
			.eq("id", user.id)
			.maybeSingle();

		if (profileError) {
			console.error("PROFILE LOAD ERROR:", profileError);

			return {
				user,
				profile: null
			};
		}

		if (!profile) {
			console.error("PROFILE NOT FOUND:", user.id);

			return {
				user,
				profile: null
			};
		}

		if (adminOnly && profile.role !== "admin") {
			alert("دسترسی به بخش مدیریت فقط برای ادمین مجاز است.");
			window.location.replace("orders.html");
			return null;
		}

		return {
			user,
			profile
		};

	} catch (error) {
		console.error("AUTH CHECK ERROR:", error);
		window.location.replace("login.html");
		return null;
	}
}

/*
 * خروج از حساب.
 * logout نام عمومی است چون صفحات فعلی پروژه همین نام را صدا می‌زنند.
 */
async function logout() {
	if (!window.db) {
		console.error("Supabase client is not initialized.");
		alert("اتصال به حساب برقرار نیست.");
		return;
	}

	try {
		const { error } = await window.db.auth.signOut();

		if (error) {
			throw error;
		}

		/*
		 * اطمینان از اینکه نشست محلی هم دیگر فعال نیست.
		 * سپس کاربر به صفحه ورود برمی‌گردد.
		 */
		window.location.replace("login.html");

	} catch (error) {
		console.error("LOGOUT ERROR:", error);
		alert("خروج از حساب انجام نشد.");
	}
}


/* نام قبلی تابع خروج برای سازگاری با کدهای موجود */
async function handleLogout() {
	return logout();
}


async function handleLogin() {
	const emailInput = document.getElementById("login-email");
	const passwordInput = document.getElementById("login-password");
	const button = document.getElementById("login-btn");

	const email = emailInput?.value.trim();
	const password = passwordInput?.value;

	if (!email || !password) {
		showAuthMessage("لطفاً ایمیل و رمز عبور را وارد کنید.", "error");
		return;
	}

	if (!window.db) {
		showAuthMessage("اتصال به سرویس ورود برقرار نشده است.", "error");
		return;
	}

	if (button) {
		button.disabled = true;
		button.textContent = "در حال ورود...";
	}

	try {
		const { error } = await window.db.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			throw error;
		}

		showAuthMessage("ورود با موفقیت انجام شد.", "success");

		setTimeout(() => {
			window.location.replace("orders.html");
		}, 400);

	} catch (error) {
		console.error("LOGIN ERROR:", error);

		let text = "ورود انجام نشد.";

		if (error?.message) {
			text = error.message;
		}

		showAuthMessage(text, "error");

	} finally {
		if (button) {
			button.disabled = false;
			button.textContent = "ورود";
		}
	}
}


/*
 * ثبت‌نام.
 * این تابع در signup.html استفاده می‌شود.
 */
async function signup(data) {
	if (!window.db) {
		return {
			ok: false,
			error: "اتصال به سرویس ثبت‌نام برقرار نشده است."
		};
	}

	try {
		/*
		 * avatar_url عمداً از سمت کاربر گرفته نمی‌شود.
		 * برای هر حساب، آواتار اولیه بر اساس نام و نام خانوادگی
		 * به‌صورت خودکار ساخته می‌شود.
		 */
		const avatarSeed = encodeURIComponent(
			`${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email
		);

		const avatarUrl =
			`https://api.dicebear.com/9.x/initials/svg?seed=${avatarSeed}`;

		const {
			data: authData,
			error
		} = await window.db.auth.signUp({
			email: data.email,
			password: data.password,
			options: {
				data: {
					first_name: data.firstName || null,
					last_name: data.lastName || null,
					phone: data.phone || null,
					address: data.address || null,
					avatar_url: avatarUrl
				}
			}
		});

		if (error) {
			throw error;
		}

		const user = authData?.user;

		if (user) {
			const { error: profileError } =
				await window.db
					.from("profiles")
					.upsert({
						id: user.id,
						email: user.email || data.email,
						first_name: data.firstName || null,
						last_name: data.lastName || null,
						phone: data.phone || null,
						address: data.address || null,
						avatar_url: avatarUrl
						/*
						 * role، created_at و updated_at عمداً اینجا
						 * ارسال نمی‌شوند؛ دیتابیس خودش مقداردهی می‌کند.
						 */
					}, {
						onConflict: "id"
					});

			if (profileError) {
				console.warn("PROFILE CREATE WARNING:", profileError);
			}
		}

		if (!authData?.session) {
			return {
				ok: true,
				session: null,
				message:
					"حساب ساخته شد. اگر تأیید ایمیل فعال باشد، ابتدا ایمیل خود را تأیید کنید."
			};
		}

		return {
			ok: true,
			session: authData.session,
			message: "حساب با موفقیت ساخته شد."
		};

	} catch (error) {
		console.error("SIGNUP ERROR:", error);

		return {
			ok: false,
			error: error?.message || "ثبت‌نام انجام نشد."
		};
	}
}


/*
 * ذخیره اطلاعات پروفایل.
 * برای profile.html.
 */
async function saveProfile(data) {
	if (!window.db) {
		return {
			ok: false,
			error: "اتصال به پایگاه داده برقرار نشده است."
		};
	}

	try {
		const user = await requireUser();

		if (!user) {
			return {
				ok: false,
				error: "لطفاً ابتدا وارد حساب شوید."
			};
		}

		const { error } = await window.db
			.from("profiles")
			.upsert({
				id: user.id,
				email: user.email,
				first_name: data.firstName || null,
				last_name: data.lastName || null,
				phone: data.phone || null,
				address: data.address || null
			}, {
				onConflict: "id"
			});

		if (error) {
			throw error;
		}

		return {
			ok: true
		};

	} catch (error) {
		console.error("SAVE PROFILE ERROR:", error);

		return {
			ok: false,
			error: error?.message || "ذخیره تغییرات انجام نشد."
		};
	}
}


function showAuthMessage(text, type = "error") {
	const box = document.getElementById("message-box");

	if (!box) {
		return;
	}

	box.textContent = text;
	box.className = "message " + type;
	box.classList.remove("hidden");
}


async function updateHeaderAuth() {
	const container = document.getElementById("user-section");

	if (!container) {
		return;
	}

	container.innerHTML = `
		<a class="header-button primary" href="login.html">
			ورود
		</a>
	`;

	try {
		const user = await getCurrentUser();

		if (!user) {
			return;
		}

		let profile = null;

		try {
			const { data } = await window.db
				.from("profiles")
				.select("*")
				.eq("id", user.id)
				.maybeSingle();

			profile = data || null;
		} catch (error) {
			console.warn("PROFILE LOAD WARNING:", error);
		}

		const fullName =
			profile?.first_name ||
			profile?.username ||
			user.email?.split("@")[0] ||
			"کاربر";

		const avatar =
			profile?.avatar_url ||
			"";

		const avatarHTML = avatar
			? `<img src="${escapeHtml(avatar)}" alt="">`
			: `<span>${escapeHtml(getInitial(fullName))}</span>`;

		container.innerHTML = `
			<div class="user-menu">
				<a href="profile.html" class="user-avatar">
					${avatarHTML}
				</a>

				<div class="user-info">
					<span class="user-name">${escapeHtml(fullName)}</span>
					<span class="user-email">${escapeHtml(user.email || "")}</span>
				</div>

				<button
					type="button"
					class="header-button"
					onclick="logout()"
				>
					خروج
				</button>
			</div>
		`;

	} catch (error) {
		console.error("AUTH HEADER ERROR:", error);
	}
}


function getInitial(value) {
	const text = String(value || "").trim();

	if (!text) {
		return "ک";
	}

	return text.charAt(0);
}


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


document.addEventListener("DOMContentLoaded", () => {
	updateHeaderAuth();
});
