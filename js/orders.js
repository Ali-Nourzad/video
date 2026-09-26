"use strict";

const durationMap = {
	"30": "حدود ۳۰ ثانیه",
	"60": "حدود ۱ دقیقه",
	"120": "حدود ۲ دقیقه",
	"180": "حدود ۳ دقیقه",
	"300": "حدود ۵ دقیقه",
	"600": "حدود ۱۰ دقیقه",
	"custom": "بیشتر از ۱۰ دقیقه"
};


async function uploadFile(orderId, userId, file) {

	if (!window.db) {
		return "اتصال به Supabase برقرار نشده است.";
	}

	const safeName = file.name
		.replace(/[^\w\u0600-\u06FF.\- ]/g, "_");

	const path =
		`${userId}/${orderId}/${crypto.randomUUID()}-${safeName}`;


	const uploadResult =
		await window.db.storage
			.from("video-files")
			.upload(
				path,
				file,
				{
					upsert: false
				}
			);


	if (uploadResult.error) {
		return uploadResult.error.message;
	}


	const publicUrlResult =
		window.db.storage
			.from("video-files")
			.getPublicUrl(path);


	const fileUrl =
		publicUrlResult.data.publicUrl;


	const insertResult =
		await window.db
			.from("order_files")
			.insert({
				order_id: orderId,
				uploaded_by: userId,
				file_name: file.name,
				file_path: path,
				file_url: fileUrl,
				file_size: file.size,
				mime_type:
					file.type ||
					"application/octet-stream"
			});


	if (insertResult.error) {
		return insertResult.error.message;
	}


	return null;
}


async function createOrder(data) {

	if (!window.db) {
		return {
			ok: false,
			error: "اتصال به Supabase برقرار نشده است."
		};
	}


	const userResult =
		await window.db.auth.getUser();


	if (userResult.error) {
		return {
			ok: false,
			error: userResult.error.message
		};
	}


	const user =
		userResult.data?.user;


	if (!user) {

		window.location.href =
			"login.html";

		return {
			ok: false,
			error: "لطفاً ابتدا وارد حساب کاربری شوید."
		};
	}


	/*
		مهم:

		در schema واقعی پروژه:
		customer_id = شناسه کاربر

		status هم مقدار پیش‌فرض "new" دارد،
		پس آن را از سمت فرانت‌اند ارسال نمی‌کنیم.
	*/

	const orderPayload = {

		customer_id: user.id,

		title:
			data.title,

		subject:
			data.subject,

		description:
			data.description,

		estimated_duration:
			durationMap[data.duration] ||
			data.duration ||
			null,

		production_model:
			data.model,

		aspect_ratio:
			data.aspectRatio ||
			null,

		output_quality:
			data.quality ||
			null,

		video_style:
			data.style ||
			null,

		reference_links:
			data.links ||
			null,

		special_notes:
			data.notes ||
			null

	};


	console.log(
		"CREATE ORDER PAYLOAD:",
		orderPayload
	);


	const {
		data: order,
		error
	} = await window.db
		.from("video_orders")
		.insert(orderPayload)
		.select()
		.single();


	if (error) {

		console.error(
			"CREATE ORDER ERROR:",
			error
		);

		return {
			ok: false,
			error:
				error.message ||
				"ثبت سفارش انجام نشد."
		};
	}


	/*
		آپلود فایل‌ها بعد از ایجاد موفق سفارش
	*/

	for (
		const file of Array.from(data.files || [])
	) {

		const uploadError =
			await uploadFile(
				order.id,
				user.id,
				file
			);


		if (uploadError) {

			return {
				ok: false,
				error:
					`سفارش ثبت شد اما فایل «${file.name}» ارسال نشد: ${uploadError}`
			};
		}
	}


	return {
		ok: true,
		order
	};
}
