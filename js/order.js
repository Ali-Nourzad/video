"use strict";

const CUSTOMER_ORDER_STATUS = {
	new: "جدید", review: "در حال بررسی", approved: "تأیید شده",
	production: "در حال تولید", editing: "در حال تدوین", revision: "نیازمند اصلاح",
	ready: "آماده تحویل", completed: "تکمیل شده", cancelled: "لغو شده"
};

let customerOrderState = {
	user: null,
	order: null,
	files: [],
	messages: [],
	history: [],
	mediaRecorder: null,
	recordedChunks: [],
	recordingStream: null,
	activeSection: "overview"
};

const q = (id) => document.getElementById(id);
const escOrder = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const orderDate = (v) => v ? new Intl.DateTimeFormat("fa-IR", {dateStyle:"medium", timeStyle:"short"}).format(new Date(v)) : "—";
const orderBytes = (n) => { if (!n) return "0 B"; const u=["B","KB","MB","GB"]; const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3); return `${(n/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; };
const statusLabel = (s) => CUSTOMER_ORDER_STATUS[s] || s || "نامشخص";
const modelLabel = (s) => ({edit_only:"صوت و تصویر آماده؛ فقط تدوین",voice_ready:"صوت آماده؛ تصویر و تدوین",visual_ready:"تصویر آماده؛ صوت و تدوین",script_ready:"سناریو آماده؛ صوت، تصویر و تدوین",full_production:"سناریو، صوت، تصویر و تدوین"}[s] || s || "—");

function statusClass(status){
	if(status === "completed" || status === "ready") return "status-completed";
	if(status === "cancelled") return "status-cancelled";
	if(["review","approved","production","editing"].includes(status)) return "status-processing";
	if(status === "revision") return "status-pending";
	return "status-new";
}

function getOrderId(){ return new URLSearchParams(location.search).get("id"); }

async function loadCustomerOrder(){
	try {
		const user = await requireUser();
		if(!user) return;
		customerOrderState.user = user;

		const id = getOrderId();
		if(!id) throw new Error("شناسه سفارش مشخص نشده است.");

		const {data: order, error} = await window.db.from("video_orders").select("*").eq("id", id).eq("customer_id", user.id).maybeSingle();
		if(error) throw error;
		if(!order) throw new Error("این سفارش پیدا نشد یا دسترسی به آن ندارید.");

		customerOrderState.order = order;
		q("sidebar-order-number").textContent = order.order_number || "—";
		q("order-loading").classList.add("hidden");
		q("order-content").classList.remove("hidden");
		q("order-section-nav").querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => switchCustomerSection(btn.dataset.section)));
		await switchCustomerSection("overview");
	} catch(error){
		console.error("CUSTOMER ORDER ERROR:", error);
		q("order-loading")?.classList.add("hidden");
		q("order-error")?.classList.remove("hidden");
		if(q("order-error-text")) q("order-error-text").textContent = error?.message || "خطایی هنگام دریافت سفارش رخ داد.";
	}
}

function setActiveCustomerSection(section){
	customerOrderState.activeSection = section;
	q("order-section-nav")?.querySelectorAll("button").forEach(btn => btn.classList.toggle("active", btn.dataset.section === section));
}

async function switchCustomerSection(section){
	setActiveCustomerSection(section);
	if(section === "overview") return renderCustomerOverview();
	if(section === "messages") return renderCustomerMessages();
	if(section === "files") return renderCustomerFiles();
	if(section === "timeline") return renderCustomerTimeline();
	if(section === "edit") return renderCustomerEdit();
}

function renderCustomerOverview(){
	const o = customerOrderState.order;
	q("customer-order-view").innerHTML = `
		<section class="customer-order-panel order-overview-panel">
			<div class="customer-order-head">
				<div><span class="eyebrow">${escOrder(o.order_number)}</span><h1>${escOrder(o.title)}</h1><p>${escOrder(o.subject)}</p></div>
				<span class="status-badge ${statusClass(o.status)}">${escOrder(statusLabel(o.status))}</span>
			</div>
			<div class="customer-info-grid">
				<div class="customer-info-card"><span>مدل تولید</span><strong>${escOrder(modelLabel(o.production_model))}</strong></div>
				<div class="customer-info-card"><span>مدت</span><strong>${escOrder(o.estimated_duration || "—")}</strong></div>
				<div class="customer-info-card"><span>نسبت تصویر</span><strong>${escOrder(o.aspect_ratio || "—")}</strong></div>
				<div class="customer-info-card"><span>کیفیت خروجی</span><strong>${escOrder(o.output_quality || "—")}</strong></div>
				<div class="customer-info-card"><span>سبک</span><strong>${escOrder(o.video_style || "—")}</strong></div>
				<div class="customer-info-card"><span>آخرین بروزرسانی</span><strong>${escOrder(orderDate(o.updated_at || o.created_at))}</strong></div>
			</div>
			<div class="customer-description-grid">
				<div><h3>توضیحات</h3><p>${escOrder(o.description || "توضیحی ثبت نشده است.")}</p></div>
				<div><h3>توضیحات ویژه</h3><p>${escOrder(o.special_notes || "موردی ثبت نشده است.")}</p></div>
			</div>
			<div class="customer-order-footer-actions"><button class="button primary" type="button" onclick="switchCustomerSection('messages')">رفتن به گفتگو</button><button class="button secondary" type="button" onclick="switchCustomerSection('edit')">ویرایش سفارش</button></div>
		</section>`;
}

async function loadCustomerMessages(){
	const {data,error}=await window.db.from("order_messages").select("id,order_id,sender_id,message,file_id,created_at,file:order_files(*)").eq("order_id",customerOrderState.order.id).order("created_at",{ascending:true});
	if(error) throw error;
	customerOrderState.messages=data||[];
}

function attachmentMarkup(file){
	if(!file?.file_url) return "";
	const url=escOrder(file.file_url), name=escOrder(file.file_name||"فایل پیوست"), mime=file.mime_type||"";
	if(mime.startsWith("image/")) return `<a class="chat-attachment image" href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${name}" loading="lazy"><span>${name}</span></a>`;
	if(mime.startsWith("video/")) return `<div class="chat-attachment video"><video controls preload="metadata" src="${url}"></video><span>${name}</span></div>`;
	if(mime.startsWith("audio/")) return `<div class="chat-attachment audio"><audio controls src="${url}"></audio><span>${name}</span></div>`;
	return `<a class="chat-file-link" href="${url}" target="_blank" rel="noopener">📎 ${name}</a>`;
}

async function renderCustomerMessages(){
	try{ await loadCustomerMessages(); }catch(error){ q("customer-order-view").innerHTML=`<section class="customer-order-panel"><div class="orders-error-message">گفتگو دریافت نشد.<br><small>${escOrder(error.message)}</small></div></section>`; return; }
	const o=customerOrderState.order;
	q("customer-order-view").innerHTML=`
		<section class="customer-chat">
			<div class="customer-chat-head"><div><span class="eyebrow">ارتباط</span><h2>گفتگو درباره سفارش</h2><p>${escOrder(o.order_number)}</p></div><span class="chat-online-dot">گفتگو</span></div>
			<div id="customer-chat-messages" class="customer-chat-messages">${customerOrderState.messages.length ? customerOrderState.messages.map(renderCustomerMessage).join("") : `<div class="chat-empty"><strong>هنوز پیامی وجود ندارد</strong><span>اولین پیام را از همین‌جا ارسال کنید.</span></div>`}</div>
			<form id="customer-chat-form" class="customer-chat-composer">
				<div id="customer-attachment-preview" class="chat-attachment-preview"></div>
				<textarea id="customer-chat-input" rows="2" placeholder="پیام خود را بنویسید...\nEnter برای ارسال · Shift + Enter برای خط بعد" autocomplete="off"></textarea>
				<div class="chat-composer-bar">
					<div class="chat-composer-actions">
						<label class="chat-tool" title="ضمیمه کردن عکس، فیلم یا فایل">📎<input id="customer-file-input" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt" hidden></label>
						<button class="chat-tool" id="customer-voice-button" type="button" title="ضبط ویس">🎙️</button>
						<button class="chat-tool recording hidden" id="customer-stop-voice" type="button" title="توقف ضبط">⏹</button>
						<span id="customer-recording-label" class="recording-label"></span>
					</div>
					<button class="button primary chat-send" type="submit">ارسال ↵</button>
				</div>
			</form>
		</section>`;
	bindCustomerChat();
	scrollChatToBottom();
}

function renderCustomerMessage(message){
	const mine=message.sender_id===customerOrderState.user.id;
	return `<article class="chat-message ${mine?"mine":"theirs"}"><div class="chat-message-meta">${mine?"شما":"مدیریت"} · ${escOrder(orderDate(message.created_at))}</div>${message.message?`<div class="chat-message-text">${escOrder(message.message)}</div>`:""}${message.file?attachmentMarkup(message.file):""}</article>`;
}

let selectedCustomerFile=null;
function bindCustomerChat(){
	const form=q("customer-chat-form"), input=q("customer-chat-input"), fileInput=q("customer-file-input"), preview=q("customer-attachment-preview");
	fileInput?.addEventListener("change",()=>{selectedCustomerFile=fileInput.files?.[0]||null; preview.innerHTML=selectedCustomerFile?`<div class="selected-attachment">📎 ${escOrder(selectedCustomerFile.name)} <button type="button" onclick="clearCustomerAttachment()">×</button></div>`:"";});
	input?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
	form?.addEventListener("submit",async e=>{e.preventDefault(); await sendCustomerMessage();});
	q("customer-voice-button")?.addEventListener("click",startCustomerVoice);
	q("customer-stop-voice")?.addEventListener("click",stopCustomerVoice);
}
function clearCustomerAttachment(){selectedCustomerFile=null;if(q("customer-file-input"))q("customer-file-input").value="";if(q("customer-attachment-preview"))q("customer-attachment-preview").innerHTML="";}

async function uploadOrderFile(file){
	const o=customerOrderState.order,u=customerOrderState.user;
	const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
	const path=`${u.id}/orders/${o.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
	const {error:uploadError}=await window.db.storage.from("video-files").upload(path,file,{upsert:false,contentType:file.type||undefined});
	if(uploadError) throw uploadError;
	const {data:urlData}=window.db.storage.from("video-files").getPublicUrl(path);
	const {data:record,error:recordError}=await window.db.from("order_files").insert({order_id:o.id,uploaded_by:u.id,file_name:file.name,file_path:path,file_url:urlData.publicUrl,file_size:file.size,mime_type:file.type||"application/octet-stream",file_role:"message"}).select("*").single();
	if(recordError) throw recordError;
	return record;
}

async function sendCustomerMessage(fileOverride=null, messageOverride=null){
	const input=q("customer-chat-input"), text=(messageOverride??input?.value??"").trim(), file=fileOverride||selectedCustomerFile;
	if(!text&&!file) return;
	const sendButton=document.querySelector("#customer-chat-form .chat-send"); if(sendButton) sendButton.disabled=true;
	try{
		let fileRecord=null;
		if(file) fileRecord=await uploadOrderFile(file);
		const {error}=await window.db.from("order_messages").insert({order_id:customerOrderState.order.id,sender_id:customerOrderState.user.id,message:text||"فایل پیوست شد.",file_id:fileRecord?.id||null});
		if(error) throw error;
		if(input) input.value="";
		clearCustomerAttachment();
		await renderCustomerMessages();
	}catch(error){console.error("SEND CUSTOMER MESSAGE ERROR",error);alert(error?.message||"ارسال پیام انجام نشد.");}
	finally{if(sendButton)sendButton.disabled=false;}
}

async function startCustomerVoice(){
	if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){alert("مرورگر شما ضبط ویس را پشتیبانی نمی‌کند.");return;}
	try{
		customerOrderState.recordingStream=await navigator.mediaDevices.getUserMedia({audio:true});
		customerOrderState.recordedChunks=[];
		customerOrderState.mediaRecorder=new MediaRecorder(customerOrderState.recordingStream);
		customerOrderState.mediaRecorder.ondataavailable=e=>{if(e.data.size)customerOrderState.recordedChunks.push(e.data);};
		customerOrderState.mediaRecorder.onstop=async()=>{
			const blob=new Blob(customerOrderState.recordedChunks,{type:customerOrderState.mediaRecorder.mimeType||"audio/webm"});
			const file=new File([blob],`voice-${Date.now()}.webm`,{type:blob.type||"audio/webm"});
			customerOrderState.recordingStream?.getTracks().forEach(t=>t.stop());
			q("customer-voice-button")?.classList.remove("hidden");q("customer-stop-voice")?.classList.add("hidden");q("customer-recording-label")?.replaceChildren();
			await sendCustomerMessage(file,"پیام صوتی");
		};
		customerOrderState.mediaRecorder.start();
		q("customer-voice-button")?.classList.add("hidden");q("customer-stop-voice")?.classList.remove("hidden");q("customer-recording-label")?.replaceChildren(document.createTextNode("در حال ضبط..."));
	}catch(error){console.error(error);alert("دسترسی به میکروفون داده نشد.");}
}
function stopCustomerVoice(){if(customerOrderState.mediaRecorder?.state!=="inactive")customerOrderState.mediaRecorder.stop();}
function scrollChatToBottom(){const box=q("customer-chat-messages");if(box)requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);}

async function renderCustomerFiles(){
	const {data,error}=await window.db.from("order_files").select("*").eq("order_id",customerOrderState.order.id).order("created_at",{ascending:false});
	if(error){q("customer-order-view").innerHTML=`<section class="customer-order-panel"><div class="orders-error-message">فایل‌ها دریافت نشدند.</div></section>`;return;}
	customerOrderState.files=data||[];
	q("customer-order-view").innerHTML=`<section class="customer-order-panel"><div class="customer-order-head"><div><span class="eyebrow">فایل‌ها</span><h2>فایل‌های سفارش</h2><p>فایل‌های ارسال‌شده در این سفارش</p></div></div><div class="customer-files-grid">${customerOrderState.files.length?customerOrderState.files.map(f=>`<a class="customer-file-card" href="${escOrder(f.file_url)}" target="_blank" rel="noopener"><span class="customer-file-icon">${(f.mime_type||"").startsWith("image/")?"▧":(f.mime_type||"").startsWith("video/")?"▶":(f.mime_type||"").startsWith("audio/")?"♪":"📎"}</span><strong>${escOrder(f.file_name)}</strong><small>${escOrder(orderBytes(f.file_size))} · ${escOrder(orderDate(f.created_at))}</small></a>`).join(""):`<div class="chat-empty"><strong>فایلی وجود ندارد</strong><span>فایل‌های ارسالی در گفتگو هم قابل مشاهده‌اند.</span></div>`}</div></section>`;
}

async function renderCustomerTimeline(){
	const {data,error}=await window.db.from("order_status_history").select("*").eq("order_id",customerOrderState.order.id).order("created_at",{ascending:false});
	if(error){q("customer-order-view").innerHTML=`<section class="customer-order-panel"><div class="orders-error-message">تاریخچه دریافت نشد.</div></section>`;return;}
	customerOrderState.history=data||[];
	q("customer-order-view").innerHTML=`<section class="customer-order-panel"><div class="customer-order-head"><div><span class="eyebrow">Timeline</span><h2>تاریخچه وضعیت</h2><p>روند تغییرات سفارش</p></div></div><div class="customer-timeline">${customerOrderState.history.length?customerOrderState.history.map(item=>`<article class="customer-timeline-item"><span class="timeline-dot"></span><div><strong>${escOrder(statusLabel(item.status))}</strong><time>${escOrder(orderDate(item.created_at))}</time><p>${escOrder(item.note||"وضعیت سفارش به‌روزرسانی شد.")}</p></div></article>`).join(""):`<div class="chat-empty"><strong>تاریخچه‌ای ثبت نشده است.</strong></div>`}</div></section>`;
}

function renderCustomerEdit(){
	const o=customerOrderState.order;
	q("customer-order-view").innerHTML=`<section class="customer-order-panel"><div class="customer-order-head"><div><span class="eyebrow">ویرایش</span><h2>ویرایش سفارش</h2><p>اطلاعات محتوایی سفارش خود را اصلاح کنید.</p></div></div><form id="customer-edit-form" class="order-edit-form"><div class="edit-form-grid">${orderEditFields(o,false)}</div><div class="edit-form-actions"><button class="button secondary" type="button" onclick="switchCustomerSection('overview')">انصراف</button><button class="button primary" type="submit">ذخیره تغییرات</button></div></form></section>`;
	q("customer-edit-form")?.addEventListener("submit",saveCustomerOrder);
}

function orderEditFields(o,admin){
	return `<label>عنوان سفارش<input name="title" maxlength="180" value="${escOrder(o.title)}" required></label><label>موضوع<input name="subject" maxlength="250" value="${escOrder(o.subject)}" required></label><label class="full">توضیحات<textarea name="description" rows="5" required>${escOrder(o.description)}</textarea></label><label>مدل تولید<select name="production_model"><option value="edit_only" ${o.production_model==="edit_only"?"selected":""}>فقط تدوین</option><option value="voice_ready" ${o.production_model==="voice_ready"?"selected":""}>تصویر و تدوین</option><option value="visual_ready" ${o.production_model==="visual_ready"?"selected":""}>صوت و تدوین</option><option value="script_ready" ${o.production_model==="script_ready"?"selected":""}>صوت، تصویر و تدوین</option><option value="full_production" ${o.production_model==="full_production"?"selected":""}>تولید کامل</option></select></label><label>مدت<input name="estimated_duration" value="${escOrder(o.estimated_duration||"")}" placeholder="مثلاً 60 ثانیه"></label><label>نسبت تصویر<select name="aspect_ratio"><option value="16:9" ${o.aspect_ratio==="16:9"?"selected":""}>16:9</option><option value="9:16" ${o.aspect_ratio==="9:16"?"selected":""}>9:16</option><option value="1:1" ${o.aspect_ratio==="1:1"?"selected":""}>1:1</option><option value="4:5" ${o.aspect_ratio==="4:5"?"selected":""}>4:5</option></select></label><label>کیفیت<select name="output_quality"><option value="1080p" ${o.output_quality==="1080p"?"selected":""}>1080p</option><option value="720p" ${o.output_quality==="720p"?"selected":""}>720p</option><option value="4K" ${o.output_quality==="4K"?"selected":""}>4K</option></select></label><label>سبک<input name="video_style" value="${escOrder(o.video_style||"")}"></label><label class="full">لینک‌های مرجع<textarea name="reference_links" rows="3">${escOrder(o.reference_links||"")}</textarea></label><label class="full">توضیحات ویژه<textarea name="special_notes" rows="3">${escOrder(o.special_notes||"")}</textarea></label>${admin?`<label>وضعیت<select name="status">${Object.entries(CUSTOMER_ORDER_STATUS).map(([k,v])=>`<option value="${k}" ${o.status===k?"selected":""}>${v}</option>`).join("")}</select></label><label>هزینه نهایی<input name="final_cost" type="number" min="0" step="0.01" value="${o.final_cost??""}"></label><label>وضعیت پرداخت<select name="payment_status"><option value="unpaid" ${o.payment_status==="unpaid"?"selected":""}>پرداخت نشده</option><option value="pending" ${o.payment_status==="pending"?"selected":""}>در انتظار</option><option value="paid" ${o.payment_status==="paid"?"selected":""}>پرداخت شده</option><option value="refunded" ${o.payment_status==="refunded"?"selected":""}>برگشت وجه</option></select></label>`:""}`;
}

async function saveCustomerOrder(e){
	e.preventDefault();
	const form=e.currentTarget; const data=new FormData(form);
	const payload={title:data.get("title").trim(),subject:data.get("subject").trim(),description:data.get("description").trim(),estimated_duration:data.get("estimated_duration")?.trim()||null,production_model:data.get("production_model"),aspect_ratio:data.get("aspect_ratio")||null,output_quality:data.get("output_quality")||null,video_style:data.get("video_style")?.trim()||null,reference_links:data.get("reference_links")?.trim()||null,special_notes:data.get("special_notes")?.trim()||null};
	const {data:updated,error}=await window.db.from("video_orders").update(payload).eq("id",customerOrderState.order.id).eq("customer_id",customerOrderState.user.id).select("*").single();
	if(error){alert(error.message||"ذخیره تغییرات انجام نشد.");return;}
	customerOrderState.order=updated; alert("تغییرات سفارش ذخیره شد."); await switchCustomerSection("overview");
}

document.addEventListener("DOMContentLoaded",()=>{ q("logout")?.addEventListener("click",handleLogout); loadCustomerOrder(); });
