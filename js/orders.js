const MAX_FILE_SIZE = 500 * 1024 * 1024;


function getDurationText(value) {
	const map = {
		"30": "حدود ۳۰ ثانیه",
		"60": "حدود ۱ دقیقه",
		"120": "حدود ۲ دقیقه",
		"180": "حدود ۳ دقیقه",
		"300": "حدود ۵ دقیقه",
		"600": "حدود ۱۰ دقیقه",
		custom: "بیشتر از ۱۰ دقیقه"
	};

	return map[value] || value || "-";
}


async function uploadOrderFile(orderId, userId, file, role = "source") {
	if (!file) {
		return {
			ok: false,
			error: "فایل معتبر نیست."
		};
	}

	if (file.size > MAX_FILE_SIZE) {
		return {
			ok: false,
			error: `حجم فایل ${file.name} بیشتر از ۵۰۰ مگابایت است.`
		};
	}

	const safeName = file.name.replace(
		/[^\w\u0600-\u06FF.\- ]/g,
		"_"
	);

	const path =
		`${userId}/${orderId}/` +
		`${crypto.randomUUID()}-${safeName}`;

	const upload = await window.db
		.storage
		.from("video-files")
		.upload(path, file, {
			upsert: false
		});

	if (upload.error) {
		return {
			ok: false,
			error: upload.error.message
		};
	}

	const insert = await window.db
		.from("order_files")
		.insert({
			order_id: orderId,
			uploaded_by: userId,
			file_name: file.name,
			file_path: path,
			file_url: null,
			file_size: file.size,
			mime_type: file.type || "application/octet-stream",
			file_role: role
		});

	if (insert.error) {
		await window.db
			.storage
			.from("video-files")
			.remove([path]);

		return {
			ok: false,
			error: insert.error.message
		};
	}

	return {
		ok: true
	};
}


async function createOrder(x) {
	const { data: order, error } = await window.db
		.from("video_orders")
		.insert({
			customer_id: x.userId,
			title: x.title,
			subject: x.subject,
			description: x.description,
			estimated_duration: getDurationText(x.duration),
			production_model: x.model,

			has_script: !!x.hasScript,
			has_voice: !!x.hasVoice,
			has_visuals: !!x.hasVisuals,

			aspect_ratio: x.aspectRatio || null,
			output_quality: x.quality || null,
			video_style: x.style || null,
			reference_links: x.links || null,
			special_notes: x.notes || null,

			status: "new"
		})
		.select()
		.single();

	if (error) {
		console.error("CREATE ORDER ERROR:", {
			code: error.code,
			message: error.message,
			details: error.details,
			hint: error.hint
		});
	
		return {
			ok: false,
			error: error.message
		};
	}

	const files = Array.from(x.files || []);

	for (const file of files) {
		const result = await uploadOrderFile(
			order.id,
			x.userId,
			file,
			"source"
		);

		if (!result.ok) {
			return {
				ok: false,
				error:
					`سفارش ثبت شد اما فایل «${file.name}» آپلود نشد: ${result.error}`
			};
		}
	}

	return {
		ok: true,
		order
	};
}
