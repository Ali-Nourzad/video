"use strict";

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

async function handleLogin() {
	const emailInput = document.getElementById("login-email");
	const passwordInput = document.getElementById("login-password");
	const button = document.getElementById("login-btn");
	const message = document.getElementById("message-box");

	const email = emailInput?.value.trim();
	const password = passwordInput?.value;

	if (!email || !password) {
		showAuthMessage("لطفاً ایمیل و رمز عبور را وارد کنید.", "error");
		return;
	}

	button.disabled = true;
	button.textContent = "در حال ورود...";

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
			window.location.href = "orders.html";
		}, 500);

	} catch (error) {
		console.error("LOGIN ERROR:", error);

		let text = "ورود انجام نشد.";

		if (error?.message) {
			text = error.message;
		}

		showAuthMessage(text, "error");

	} finally {
		button.disabled = false;
		button.textContent = "ورود";
	}
}

async function handleLogout() {
	try {
		if (!window.db) {
			throw new Error("Supabase client is not initialized.");
		}

		const { error } = await window.db.auth.signOut();

		if (error) {
			throw error;
		}

		window.location.href = "index.html";

	} catch (error) {
		console.error("LOGOUT ERROR:", error);
		alert("خروج از حساب انجام نشد.");
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
					onclick="handleLogout()"
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

async function requireUser() {
	if (!window.db) {
		console.error("Supabase client is not initialized.");
		return null;
	}

	const {
		data: { user },
		error
	} = await window.db.auth.getUser();

	if (error || !user) {
		window.location.href = "login.html";
		return null;
	}

	return user;
}

document.addEventListener("DOMContentLoaded", () => {
	updateHeaderAuth();
});
