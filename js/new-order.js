"use strict";

async function createOrder(orderData) {
	if (!window.db) {
		return {
			ok: false,
			error: "اتصال به پایگاه داده برقرار نشده است."
		};
	}

	const user = await requireUser();

	if (!user) {
		return {
			ok: false,
			error: "لطفاً ابتدا وارد حساب کاربری شوید."
		};
	}

	const payload = {
		user_id: user.id,
		title: orderData.title,
		subject: orderData.subject || null,
		description: orderData.description || null,
		estimated_duration: orderData.estimated_duration || null,
		production_model: orderData.production_model || null,
		aspect_ratio: orderData.aspect_ratio || null,
		output_quality: orderData.output_quality || null,
		video_style: orderData.video_style || null,
		reference_links: orderData.reference_links || null,
		special_notes: orderData.special_notes || null,

		has_script: Boolean(orderData.has_script),
		has_voice: Boolean(orderData.has_voice),
		has_visuals: Boolean(orderData.has_visuals),

		needs_script: Boolean(orderData.needs_script),
		needs_voice: Boolean(orderData.needs_voice),
		needs_visuals: Boolean(orderData.needs_visuals),
		needs_editing: Boolean(orderData.needs_editing),

		status: "pending"
	};

	const { data, error } = await window.db
		.from("video_orders")
		.insert(payload)
		.select()
		.single();

	if (error) {
		console.error("CREATE ORDER ERROR:", error);

		return {
			ok: false,
			error: error.message || "ثبت سفارش انجام نشد."
		};
	}

	return {
		ok: true,
		data
	};
}
