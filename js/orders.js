const durationMap = {
	"30": "حدود ۳۰ ثانیه",
	"60": "حدود ۱ دقیقه",
	"120": "حدود ۲ دقیقه",
	"180": "حدود ۳ دقیقه",
	"300": "حدود ۵ دقیقه",
	"600": "حدود ۱۰ دقیقه",
	custom: "بیشتر از ۱۰ دقیقه"
};


async function uploadFile(orderId, userId, file) {
	const name = file.name.replace(
		/[^\w\u0600-\u06FF.\- ]/g,
		"_"
	);

	const path = `${userId}/${orderId}/${crypto.randomUUID()}-${name}`;

	const upload = await window.db
		.storage
		.from("video-files")
		.upload(path, file, {
			upsert: false
		});

	if (upload.error) {
		return upload.error.message;
	}

	const fileUrl = window.db
		.storage
		.from("video-files")
		.getPublicUrl(path)
		.data
		.publicUrl;

	const insert = await window.db
		.from("order_files")
		.insert({
			order_id: orderId,
			uploaded_by: userId,
			file_name: file.name,
			file_path: path,
			file_url: fileUrl,
			file_size: file.size,
			mime_type: file.type || "application/octet-stream"
		});

	if (insert.error) {
		return insert.error.message;
	}

	return null;
}


async function createOrder(x) {
	const { data: order, error } = await window.db
		.from("video_orders")
		.insert({
			customer_id: x.userId,
			title: x.title,
			subject: x.subject,
			description: x.description,
			estimated_duration:
				durationMap[x.duration] || x.duration,
			production_model: x.model,
			aspect_ratio: x.aspectRatio,
			output_quality: x.quality,
			video_style: x.style,
			reference_links: x.links,
			special_notes: x.notes,
			status: "new"
		})
		.select()
		.single();

	if (error) {
		return {
			ok: false,
			error: error.message
		};
	}

	for (const file of Array.from(x.files || [])) {
		const errorMessage = await uploadFile(
			order.id,
			x.userId,
			file
		);

		if (errorMessage) {
			return {
				ok: false,
				error:
					`سفارش ثبت شد اما فایل ${file.name} ارسال نشد: ${errorMessage}`
			};
		}
	}

	return {
		ok: true,
		order
	};
}
