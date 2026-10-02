/* =========================================================
   T-CHOOB ADMIN ENGINE
   ========================================================= */

let adminOrderData = null;
let adminOrderMessages = [];
let adminOrderFiles = [];
let adminOrderHistory = [];

let selectedChatFiles = [];
let mediaRecorder = null;
let recordingChunks = [];
let isRecording = false;


/* =========================================================
   HELPERS
   ========================================================= */

function adminEsc(value) {

    if (
        value === null ||
        value === undefined
    ) {
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(
        "fa-IR",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function showToast(
    text,
    type = "success"
) {

    const container =
        document.getElementById(
            "toast-container"
        );

    if (!container) {
        return;
    }

    const item =
        document.createElement("div");

    item.className =
        `toast ${type}`;

    item.textContent = text;

    container.appendChild(item);

    setTimeout(
        () => {
            item.remove();
        },
        3200
    );

}


function modelText(value) {

    const map = {

        edit_only:
            "فقط تدوین",

        voice_ready:
            "صوت آماده است",

        visual_ready:
            "تصویر آماده است",

        script_ready:
            "سناریو آماده است",

        full_production:
            "تولید کامل"

    };

    return map[value] || value || "-";

}


function statusText(value) {

    const map = {

        new:
            "جدید",

        review:
            "در حال بررسی",

        approved:
            "تأیید شده",

        production:
            "در حال تولید",

        editing:
            "در حال تدوین",

        revision:
            "نیازمند اصلاح",

        ready:
            "آماده تحویل",

        completed:
            "تکمیل شده",

        cancelled:
            "لغو شده"

    };

    return map[value] || value || "-";

}


/* =========================================================
   THEME
   ========================================================= */

function applyAdminTheme() {

    const dark =
        localStorage.getItem(
            "tchoob-admin-theme"
        ) === "dark";

    document.documentElement
        .classList
        .toggle(
            "dark-mode",
            dark
        );

}


function toggleAdminTheme() {

    const dark =
        document.documentElement
            .classList
            .contains("dark-mode");

    localStorage.setItem(
        "tchoob-admin-theme",
        dark
            ? "light"
            : "dark"
    );

    applyAdminTheme();

}


applyAdminTheme();


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    try {

        await window.db.auth.signOut();

    } finally {

        window.location.replace(
            "login.html"
        );

    }

}


/* =========================================================
   ADMIN ORDERS
   ========================================================= */

async function adminOrders() {

    const auth =
        await requireUser(true);

    if (!auth) {
        return;
    }
    window.__tchoobCurrentUserId =
        auth.user.id;

    const body =
        document.getElementById(
            "orders-body"
        );

    if (!body) {
        return;
    }


    const {
        data,
        error
    } =
        await window.db
            .from("video_orders")
            .select(
                "*,profiles:customer_id(first_name,last_name,email,phone)"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);

        body.innerHTML =
            `<tr>
                <td colspan="7">
                    دریافت سفارش‌ها انجام نشد.
                </td>
            </tr>`;

        return;
    }


    document.getElementById("total")
        ?.replaceChildren(
            document.createTextNode(
                data.length
            )
        );


    document.getElementById("new")
        ?.replaceChildren(
            document.createTextNode(
                data.filter(
                    x =>
                        x.status === "new"
                ).length
            )
        );


    document.getElementById("progress")
        ?.replaceChildren(
            document.createTextNode(
                data.filter(
                    x =>
                        [
                            "approved",
                            "production",
                            "editing"
                        ].includes(
                            x.status
                        )
                ).length
            )
        );


    document.getElementById("ready")
        ?.replaceChildren(
            document.createTextNode(
                data.filter(
                    x =>
                        x.status === "ready"
                ).length
            )
        );


    body.innerHTML =
        data
            .map(order => {

                const profile =
                    order.profiles || {};

                const customer =
                    [
                        profile.first_name,
                        profile.last_name
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .trim()
                    ||
                    "بدون نام";


                return `
                    <tr>

                        <td>
                            ${adminEsc(order.order_number)}
                        </td>

                        <td>
                            ${adminEsc(order.title)}
                        </td>

                        <td>
                            ${adminEsc(customer)}
                        </td>

                        <td>
                            ${adminEsc(
                                modelText(
                                    order.production_model
                                )
                            )}
                        </td>

                        <td>

                            <span
                                class="status status-${adminEsc(
                                    order.status
                                )}"
                            >
                                ${adminEsc(
                                    statusText(
                                        order.status
                                    )
                                )}
                            </span>

                        </td>

                        <td>
                            ${adminDate(
                                order.created_at
                            )}
                        </td>

                        <td>

                            <a
                                class="button secondary"
                                href="admin-order.html?id=${encodeURIComponent(order.id)}"
                            >
                                مدیریت
                            </a>

                        </td>

                    </tr>
                `;

            })
            .join("")
        ||
        `<tr>
            <td colspan="7">
                سفارشی وجود ندارد.
            </td>
        </tr>`;

}


/* =========================================================
   ADMIN USERS
   ========================================================= */

async function adminUsers() {

    const auth =
        await requireUser(true);

    if (!auth) {
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
    } =
        await window.db
            .from("profiles")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        body.innerHTML =
            `<tr>
                <td colspan="6">
                    دریافت کاربران انجام نشد.
                </td>
            </tr>`;

        return;
    }


    body.innerHTML =
        data
            .map(user => {

                const name =
                    [
                        user.first_name,
                        user.last_name
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .trim()
                    ||
                    "بدون نام";


                return `
                    <tr>

                        <td>
                            ${adminEsc(name)}
                        </td>

                        <td>
                            ${adminEsc(
                                user.email || "-"
                            )}
                        </td>

                        <td>
                            ${adminEsc(
                                user.phone || "-"
                            )}
                        </td>

                        <td>
                            ${adminEsc(
                                user.role || "-"
                            )}
                        </td>

                        <td>
                            ${adminDate(
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
                `;

            })
            .join("");

}


/* =========================================================
   LOAD ORDER
   ========================================================= */

async function adminOrder() {

    const auth =
        await requireUser(true);

    if (!auth) {
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
            <section class="admin-card">

                <div class="admin-card-body">

                    <div class="empty">

                        برای مدیریت یک سفارش،
                        ابتدا یک سفارش را انتخاب کنید.

                    </div>

                </div>

            </section>
        `;

        return;
    }


    const {
        data: order,
        error: orderError
    } =
        await window.db
            .from("video_orders")
            .select(
                "*,profiles:customer_id(first_name,last_name,email,phone,avatar_url,address)"
            )
            .eq(
                "id",
                id
            )
            .single();


    if (
        orderError ||
        !order
    ) {

        root.innerHTML =
            `<div class="empty">
                سفارش پیدا نشد.
            </div>`;

        return;
    }


    adminOrderData = order;


    const [
        messagesResult,
        filesResult,
        historyResult
    ] =
        await Promise.all([

            window.db
                .from("order_messages")
                .select("*")
                .eq(
                    "order_id",
                    id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                ),

            window.db
                .from("order_files")
                .select("*")
                .eq(
                    "order_id",
                    id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                ),

            window.db
                .from("order_status_history")
                .select("*")
                .eq(
                    "order_id",
                    id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                )

        ]);


    adminOrderMessages =
        messagesResult.data || [];


    adminOrderFiles =
        filesResult.data || [];


    adminOrderHistory =
        historyResult.data || [];


    renderOrderWorkspace(
        auth.user
    );

}


/* =========================================================
   ORDER WORKSPACE
   ========================================================= */

function renderOrderWorkspace(
    currentUser
) {

    const root =
        document.getElementById(
            "root"
        );

    const order =
        adminOrderData;

    const profile =
        order.profiles || {};


    const customerName =
        [
            profile.first_name,
            profile.last_name
        ]
            .filter(Boolean)
            .join(" ")
            .trim()
        ||
        "کاربر";


    const avatar =
        profile.avatar_url
        ||
        "";


    root.innerHTML = `

        <div class="order-workspace">


            <div class="order-workspace-main">


                <section class="order-hero">

                    <div class="order-hero-content">


                        <div>

                            <span class="eyebrow">
                                ${adminEsc(
                                    order.order_number
                                )}
                            </span>

                            <h1>
                                ${adminEsc(
                                    order.title
                                )}
                            </h1>

                            <span class="order-number">
                                ${adminEsc(
                                    order.subject
                                )}
                            </span>

                        </div>


                        <div class="order-customer">

                            ${
                                avatar
                                ?
                                `
                                <img
                                    class="order-customer-avatar"
                                    src="${adminEsc(avatar)}"
                                    alt=""
                                >
                                `
                                :
                                `
                                <div class="order-customer-avatar">
                                    👤
                                </div>
                                `
                            }


                            <div>

                                <small>
                                    مشتری
                                </small>

                                <strong>
                                    ${adminEsc(
                                        customerName
                                    )}
                                </strong>

                            </div>

                        </div>


                    </div>

                </section>


                <div
                    id="order-tabs"
                    style="margin-top:16px"
                >


                    ${renderOverviewTab()}


                    ${renderChatTab()}


                    ${renderFilesTab()}


                    ${renderTimelineTab()}


                    ${renderStatusTab()}


                </div>


            </div>


            <aside class="order-workspace-sidebar">


                <nav class="order-side-nav">


                    <button
                        class="order-side-item active"
                        data-tab="overview"
                        type="button"
                    >

                        <span class="side-icon">
                            ◫
                        </span>

                        اطلاعات سفارش

                    </button>


                    <button
                        class="order-side-item"
                        data-tab="chat"
                        type="button"
                    >

                        <span class="side-icon">
                            ◌
                        </span>

                        گفتگو

                    </button>


                    <button
                        class="order-side-item"
                        data-tab="files"
                        type="button"
                    >

                        <span class="side-icon">
                            □
                        </span>

                        فایل‌ها

                    </button>


                    <button
                        class="order-side-item"
                        data-tab="timeline"
                        type="button"
                    >

                        <span class="side-icon">
                            ⋮
                        </span>

                        تاریخچه

                    </button>


                    <button
                        class="order-side-item"
                        data-tab="status"
                        type="button"
                    >

                        <span class="side-icon">
                            ✓
                        </span>

                        وضعیت سفارش

                    </button>


                </nav>


                <section class="customer-card">


                    <div class="customer-card-head">

                        ${
                            avatar
                            ?
                            `
                            <img
                                class="customer-card-avatar"
                                src="${adminEsc(avatar)}"
                                alt=""
                            >
                            `
                            :
                            `
                            <div class="customer-card-avatar">
                                👤
                            </div>
                            `
                        }


                        <div>

                            <strong>
                                ${adminEsc(
                                    customerName
                                )}
                            </strong>

                            <span>
                                مشتری
                            </span>

                        </div>

                    </div>


                    <div class="customer-card-row">

                        <span>
                            ایمیل
                        </span>

                        <strong>
                            ${adminEsc(
                                profile.email || "-"
                            )}
                        </strong>

                    </div>


                    <div class="customer-card-row">

                        <span>
                            تلفن
                        </span>

                        <strong>
                            ${adminEsc(
                                profile.phone || "-"
                            )}
                        </strong>

                    </div>


                    <div class="customer-card-row">

                        <span>
                            وضعیت
                        </span>

                        <strong>
                            ${adminEsc(
                                statusText(
                                    order.status
                                )
                            )}
                        </strong>

                    </div>


                </section>


            </aside>


        </div>

    `;


    bindOrderTabs();

    initChatEvents(
        currentUser
    );

}


/* =========================================================
   OVERVIEW
   ========================================================= */

function renderOverviewTab() {

    const order =
        adminOrderData;


    return `

        <section
            class="order-tab active"
            data-panel="overview"
        >


            <div class="admin-card">


                <div class="admin-card-head">

                    <div class="admin-card-title">

                        <strong>
                            اطلاعات سفارش
                        </strong>

                        <span>
                            مشخصات پروژه
                        </span>

                    </div>

                </div>


                <div class="admin-card-body">


                    <div class="order-info-grid">


                        <div class="info-box">

                            <span>
                                موضوع
                            </span>

                            <strong>
                                ${adminEsc(
                                    order.subject
                                )}
                            </strong>

                        </div>


                        <div class="info-box">

                            <span>
                                مدل تولید
                            </span>

                            <strong>
                                ${adminEsc(
                                    modelText(
                                        order.production_model
                                    )
                                )}
                            </strong>

                        </div>


                        <div class="info-box">

                            <span>
                                مدت
                            </span>

                            <strong>
                                ${adminEsc(
                                    order.estimated_duration
                                    || "-"
                                )}
                            </strong>

                        </div>


                        <div class="info-box">

                            <span>
                                نسبت تصویر
                            </span>

                            <strong>
                                ${adminEsc(
                                    order.aspect_ratio
                                    || "-"
                                )}
                            </strong>

                        </div>


                        <div class="info-box">

                            <span>
                                کیفیت
                            </span>

                            <strong>
                                ${adminEsc(
                                    order.output_quality
                                    || "-"
                                )}
                            </strong>

                        </div>


                        <div class="info-box">

                            <span>
                                سبک
                            </span>

                            <strong>
                                ${adminEsc(
                                    order.video_style
                                    || "-"
                                )}
                            </strong>

                        </div>


                    </div>


                    <div
                        class="info-box"
                        style="margin-top:14px"
                    >

                        <span>
                            توضیحات
                        </span>

                        <strong>
                            ${adminEsc(
                                order.description
                                || "-"
                            )}
                        </strong>

                    </div>


                    ${
                        order.reference_links
                        ?
                        `
                        <div
                            class="info-box"
                            style="margin-top:12px"
                        >

                            <span>
                                لینک‌های مرجع
                            </span>

                            <strong>
                                ${adminEsc(
                                    order.reference_links
                                )}
                            </strong>

                        </div>
                        `
                        :
                        ""
                    }


                </div>


            </div>


        </section>

    `;

}


/* =========================================================
   CHAT TAB
   ========================================================= */

function renderChatTab() {

    return `

        <section
            class="order-tab"
            data-panel="chat"
        >


            <div class="chat-shell">


                <div class="chat-head">

                    <div>

                        <strong>
                            گفتگوی پروژه
                        </strong>

                        <span>
                            ارتباط مستقیم با مشتری
                        </span>

                    </div>

                    <span>
                        ${adminOrderMessages.length}
                        پیام
                    </span>

                </div>


                <div
                    id="chat-messages"
                    class="chat-messages"
                >

                    ${renderMessages()}

                </div>


                <div class="chat-composer">


                    <div
                        id="chat-attachments-preview"
                        class="chat-attachments-preview"
                    ></div>


                    <div class="chat-input-row">


                        <textarea
                            id="chat-input"
                            class="chat-textarea"
                            rows="1"
                            placeholder="پیام خود را بنویسید..."
                        ></textarea>


                        <div class="chat-actions">


                            <button
                                id="chat-file"
                                class="chat-action"
                                type="button"
                                title="ارسال فایل"
                            >
                                +
                            </button>


                            <button
                                id="chat-image"
                                class="chat-action"
                                type="button"
                                title="ارسال عکس"
                            >
                                ▧
                            </button>


                            <button
                                id="chat-video"
                                class="chat-action"
                                type="button"
                                title="ارسال ویدئو"
                            >
                                ▶
                            </button>


                            <button
                                id="chat-voice"
                                class="chat-action"
                                type="button"
                                title="ضبط صدا"
                            >
                                ●
                            </button>


                            <button
                                id="chat-send"
                                class="chat-action chat-send"
                                type="button"
                                title="ارسال"
                            >
                                ↑
                            </button>


                        </div>


                    </div>


                    <input
                        id="chat-file-input"
                        type="file"
                        multiple
                        hidden
                    >


                    <input
                        id="chat-image-input"
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                    >


                    <input
                        id="chat-video-input"
                        type="file"
                        accept="video/*"
                        multiple
                        hidden
                    >


                </div>


            </div>


        </section>

    `;

}


/* =========================================================
   MESSAGE RENDER
   ========================================================= */

function renderMessages() {

    if (
        !adminOrderMessages.length
    ) {

        return `
            <div class="empty">
                هنوز پیامی در این سفارش وجود ندارد.
            </div>
        `;

    }


    return adminOrderMessages
        .map(message => {

            const mine =
                message.sender_id ===
                adminCurrentUserId();


            return `

                <div
                    class="chat-message ${
                        mine
                        ? "mine"
                        : "theirs"
                    }"
                >

                    <div class="chat-bubble">

                        ${renderMessageContent(
                            message.message
                        )}

                    </div>

                    <div class="chat-meta">

                        ${adminDate(
                            message.created_at
                        )}

                    </div>

                </div>

            `;

        })
        .join("");

}


function renderMessageContent(
    message
) {

    if (
        typeof message !== "string"
    ) {

        return adminEsc(message);

    }


    if (
        message.startsWith(
            "__ATTACHMENT__"
        )
    ) {

        try {

            const data =
                JSON.parse(
                    message.replace(
                        "__ATTACHMENT__",
                        ""
                    )
                );


            if (
                data.type?.startsWith(
                    "image/"
                )
            ) {

                return `

                    <div class="chat-attachment">

                        <img
                            src="${adminEsc(
                                data.url
                            )}"
                            alt="${adminEsc(
                                data.name
                            )}"
                        >

                    </div>

                `;

            }


            if (
                data.type?.startsWith(
                    "video/"
                )
            ) {

                return `

                    <div class="chat-attachment">

                        <video
                            src="${adminEsc(
                                data.url
                            )}"
                            controls
                            preload="metadata"
                        ></video>

                    </div>

                `;

            }


            if (
                data.type?.startsWith(
                    "audio/"
                )
            ) {

                return `

                    <div class="chat-attachment">

                        <audio
                            src="${adminEsc(
                                data.url
                            )}"
                            controls
                            style="width:100%"
                        ></audio>

                    </div>

                `;

            }


            return `

                <a
                    class="chat-file"
                    href="${adminEsc(
                        data.url
                    )}"
                    target="_blank"
                    rel="noopener"
                >

                    <span class="chat-file-icon">
                        □
                    </span>

                    <span class="chat-file-info">

                        <strong>
                            ${adminEsc(
                                data.name
                            )}
                        </strong>

                        <span>
                            باز کردن فایل
                        </span>

                    </span>

                </a>

            `;

        } catch(error) {

            return adminEsc(
                message
            );

        }

    }


    return adminEsc(
        message
    ).replace(
        /\n/g,
        "<br>"
    );

}


/* =========================================================
   FILES
   ========================================================= */

function renderFilesTab() {

    return `

        <section
            class="order-tab"
            data-panel="files"
        >

            <div class="admin-card">


                <div class="admin-card-head">

                    <div class="admin-card-title">

                        <strong>
                            فایل‌های سفارش
                        </strong>

                        <span>
                            ${adminOrderFiles.length}
                            فایل
                        </span>

                    </div>

                </div>


                <div class="admin-card-body">


                    <div class="file-grid">

                        ${
                            adminOrderFiles.length
                            ?
                            adminOrderFiles
                                .map(
                                    renderFileCard
                                )
                                .join("")
                            :
                            `
                            <div class="empty"
                                style="grid-column:1/-1"
                            >
                                هنوز فایلی برای این سفارش ثبت نشده است.
                            </div>
                            `
                        }

                    </div>


                </div>


            </div>

        </section>

    `;

}


function renderFileCard(file) {

    const type =
        file.mime_type || "";


    let preview = `
        <div class="file-preview">
            <div class="file-placeholder">
                □
            </div>
        </div>
    `;


    if (
        type.startsWith("image/")
    ) {

        preview = `
            <div class="file-preview">

                <img
                    src="${adminEsc(
                        file.file_url
                    )}"
                    alt=""
                >

            </div>
        `;

    } else if (
        type.startsWith("video/")
    ) {

        preview = `
            <div class="file-preview">

                <video
                    src="${adminEsc(
                        file.file_url
                    )}"
                    muted
                    preload="metadata"
                ></video>

            </div>
        `;

    }


    return `

        <a
            class="file-card"
            href="${adminEsc(
                file.file_url
            )}"
            target="_blank"
            rel="noopener"
        >

            ${preview}


            <div class="file-card-body">

                <strong>
                    ${adminEsc(
                        file.file_name
                    )}
                </strong>

                <span>
                    ${adminDate(
                        file.created_at
                    )}
                </span>

            </div>

        </a>

    `;

}


/* =========================================================
   TIMELINE
   ========================================================= */

function renderTimelineTab() {

    return `

        <section
            class="order-tab"
            data-panel="timeline"
        >


            <div class="admin-card">


                <div class="admin-card-head">

                    <div class="admin-card-title">

                        <strong>
                            تاریخچه سفارش
                        </strong>

                    </div>

                </div>


                <div class="admin-card-body">


                    <div class="timeline">


                        ${
                            adminOrderHistory.length
                            ?
                            adminOrderHistory
                                .map(
                                    history =>
                                        `
                                        <div class="timeline-item">

                                            <span class="timeline-dot"></span>

                                            <strong>
                                                ${adminEsc(
                                                    statusText(
                                                        history.status
                                                    )
                                                )}
                                            </strong>

                                            <span>
                                                ${adminDate(
                                                    history.created_at
                                                )}
                                            </span>

                                            ${
                                                history.note
                                                ?
                                                `
                                                <div
                                                    style="
                                                        margin-top:5px;
                                                        color:var(--text-soft);
                                                        font-size:11px
                                                    "
                                                >
                                                    ${adminEsc(
                                                        history.note
                                                    )}
                                                </div>
                                                `
                                                :
                                                ""
                                            }

                                        </div>
                                        `
                                )
                                .join("")
                            :
                            `
                            <div class="empty">
                                تاریخچه‌ای ثبت نشده است.
                            </div>
                            `
                        }


                    </div>


                </div>


            </div>


        </section>

    `;

}


/* =========================================================
   STATUS
   ========================================================= */

function renderStatusTab() {

    const order =
        adminOrderData;


    const statuses = [
        "new",
        "review",
        "approved",
        "production",
        "editing",
        "revision",
        "ready",
        "completed"
    ];


    const currentIndex =
        statuses.indexOf(
            order.status
        );


    return `

        <section
            class="order-tab"
            data-panel="status"
        >


            <div class="admin-card">


                <div class="admin-card-head">

                    <div class="admin-card-title">

                        <strong>
                            وضعیت سفارش
                        </strong>

                    </div>

                </div>


                <div class="admin-card-body">


                    <div class="status-progress">

                        ${statuses
                            .map(
                                (_, index) =>
                                    `
                                    <span
                                        class="status-step ${
                                            index <= currentIndex
                                            ? "done"
                                            : ""
                                        }"
                                    ></span>
                                    `
                            )
                            .join("")
                        }

                    </div>


                    <form
                        id="status-form"
                        class="form"
                        style="margin-top:24px"
                    >


                        <label>

                            وضعیت جدید

                            <select id="status">

                                ${statuses
                                    .map(
                                        status =>
                                            `
                                            <option
                                                value="${status}"
                                                ${
                                                    status ===
                                                    order.status
                                                    ?
                                                    "selected"
                                                    :
                                                    ""
                                                }
                                            >
                                                ${adminEsc(
                                                    statusText(
                                                        status
                                                    )
                                                )}
                                            </option>
                                            `
                                    )
                                    .join("")
                                }

                            </select>

                        </label>


                        <label>

                            یادداشت

                            <textarea
                                id="note"
                                placeholder="یادداشت تغییر وضعیت..."
                            ></textarea>

                        </label>


                        <button
                            class="button primary"
                            type="submit"
                        >
                            ذخیره وضعیت
                        </button>


                    </form>


                </div>


            </div>


        </section>

    `;

}


/* =========================================================
   TAB SWITCHING
   ========================================================= */

function bindOrderTabs() {

    const buttons =
        document.querySelectorAll(
            ".order-side-item"
        );


    const panels =
        document.querySelectorAll(
            ".order-tab"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const tab =
                    button.dataset.tab;


                buttons.forEach(item => {

                    item.classList.toggle(
                        "active",
                        item === button
                    );

                });


                panels.forEach(panel => {

                    panel.classList.toggle(
                        "active",
                        panel.dataset.panel === tab
                    );

                });


                if (
                    tab === "chat"
                ) {

                    setTimeout(
                        scrollChatToBottom,
                        50
                    );

                }

            }
        );

    });


    const statusForm =
        document.getElementById(
            "status-form"
        );


    if (statusForm) {

        statusForm.addEventListener(
            "submit",
            saveOrderStatus
        );

    }

}


/* =========================================================
   SAVE STATUS
   ========================================================= */

async function saveOrderStatus(
    event
) {

    event.preventDefault();


    const status =
        document.getElementById(
            "status"
        ).value;


    const note =
        document.getElementById(
            "note"
        ).value.trim();


    const currentUser =
        await getCurrentUser();


    if (!currentUser) {
        return;
    }


    const orderId =
        adminOrderData.id;


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
                orderId
            );


    if (update.error) {

        console.error(
            update.error
        );

        showToast(
            "تغییر وضعیت انجام نشد.",
            "error"
        );

        return;
    }


    const history =
        await window.db
            .from(
                "order_status_history"
            )
            .insert({

                order_id:
                    orderId,

                status,

                changed_by:
                    currentUser.id,

                note

            });


    if (history.error) {

        showToast(
            "وضعیت ذخیره شد، اما تاریخچه ثبت نشد.",
            "error"
        );

        return;
    }


    adminOrderData.status =
        status;


    adminOrderHistory.push({

        order_id:
            orderId,

        status,

        changed_by:
            currentUser.id,

        note,

        created_at:
            new Date().toISOString()

    });


    showToast(
        "وضعیت سفارش ذخیره شد."
    );


    renderOrderWorkspace(
        currentUser
    );

}


/* =========================================================
   CHAT EVENTS
   ========================================================= */

function initChatEvents(
    currentUser
) {

    const input =
        document.getElementById(
            "chat-input"
        );


    if (!input) {
        return;
    }


    document
        .getElementById(
            "chat-send"
        )
        ?.addEventListener(
            "click",
            () =>
                sendChatMessage(
                    currentUser
                )
        );


    document
        .getElementById(
            "chat-file"
        )
        ?.addEventListener(
            "click",
            () =>
                document
                    .getElementById(
                        "chat-file-input"
                    )
                    .click()
        );


    document
        .getElementById(
            "chat-image"
        )
        ?.addEventListener(
            "click",
            () =>
                document
                    .getElementById(
                        "chat-image-input"
                    )
                    .click()
        );


    document
        .getElementById(
            "chat-video"
        )
        ?.addEventListener(
            "click",
            () =>
                document
                    .getElementById(
                        "chat-video-input"
                    )
                    .click()
        );


    document
        .getElementById(
            "chat-voice"
        )
        ?.addEventListener(
            "click",
            toggleVoiceRecording
        );


    document
        .getElementById(
            "chat-file-input"
        )
        ?.addEventListener(
            "change",
            event =>
                addChatFiles(
                    event.target.files
                )
        );


    document
        .getElementById(
            "chat-image-input"
        )
        ?.addEventListener(
            "change",
            event =>
                addChatFiles(
                    event.target.files
                )
        );


    document
        .getElementById(
            "chat-video-input"
        )
        ?.addEventListener(
            "change",
            event =>
                addChatFiles(
                    event.target.files
                )
        );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendChatMessage(
                    currentUser
                );

            }

        }
    );


    input.addEventListener(
        "input",
        () => {

            input.style.height =
                "auto";

            input.style.height =
                Math.min(
                    input.scrollHeight,
                    150
                ) + "px";

        }
    );


    renderAttachmentPreview();

    scrollChatToBottom();

}


/* =========================================================
   FILE SELECTION
   ========================================================= */

function addChatFiles(
    files
) {

    if (!files) {
        return;
    }


    selectedChatFiles =
        selectedChatFiles.concat(
            Array.from(files)
        );


    renderAttachmentPreview();

}


function renderAttachmentPreview() {

    const container =
        document.getElementById(
            "chat-attachments-preview"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        selectedChatFiles
            .map(
                (file, index) => {

                    const url =
                        URL.createObjectURL(
                            file
                        );


                    let content =
                        `
                        <div class="chat-preview">
                            <span
                                style="
                                    display:grid;
                                    place-items:center;
                                    width:100%;
                                    height:100%;
                                    font-size:20px
                                "
                            >
                                □
                            </span>
                        `;


                    if (
                        file.type.startsWith(
                            "image/"
                        )
                    ) {

                        content =
                            `
                            <div class="chat-preview">

                                <img
                                    src="${url}"
                                    alt=""
                                >

                            `;

                    }


                    if (
                        file.type.startsWith(
                            "video/"
                        )
                    ) {

                        content =
                            `
                            <div class="chat-preview">

                                <video
                                    src="${url}"
                                    muted
                                ></video>

                            `;

                    }


                    content += `

                            <button
                                class="chat-preview-remove"
                                type="button"
                                data-remove-file="${index}"
                            >
                                ×
                            </button>

                        </div>

                    `;


                    return content;

                }
            )
            .join("");


    container
        .querySelectorAll(
            "[data-remove-file]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset
                                .removeFile
                        );


                    selectedChatFiles.splice(
                        index,
                        1
                    );


                    renderAttachmentPreview();

                }
            );

        });

}


/* =========================================================
   SEND CHAT
   ========================================================= */

async function sendChatMessage(
    currentUser
) {

    const input =
        document.getElementById(
            "chat-input"
        );


    const text =
        input?.value.trim() || "";


    if (
        !text &&
        !selectedChatFiles.length
    ) {

        return;
    }


    const button =
        document.getElementById(
            "chat-send"
        );


    if (button) {
        button.disabled = true;
    }


    try {


        if (
            text
        ) {

            const result =
                await window.db
                    .from(
                        "order_messages"
                    )
                    .insert({

                        order_id:
                            adminOrderData.id,

                        sender_id:
                            currentUser.id,

                        message:
                            text

                    })
                    .select()
                    .single();


            if (result.error) {
                throw result.error;
            }


            adminOrderMessages.push(
                result.data
            );

        }


        for (
            const file of
            selectedChatFiles
        ) {

            await uploadChatFile(
                file,
                currentUser
            );

        }


        input.value = "";

        selectedChatFiles = [];

        renderAttachmentPreview();

        renderChatMessagesOnly();

        showToast(
            "پیام ارسال شد."
        );


    } catch(error) {

        console.error(error);

        showToast(
            "ارسال پیام انجام نشد.",
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
        }

    }

}


/* =========================================================
   FILE UPLOAD
   ========================================================= */

async function uploadChatFile(
    file,
    currentUser
) {

    const safeName =
        file.name
            .replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );


    const path =
        `orders/${adminOrderData.id}/chat/${Date.now()}-${safeName}`;


    const upload =
        await window.db.storage
            .from("video-files")
            .upload(
                path,
                file,
                {
                    cacheControl:
                        "3600",

                    upsert:
                        false
                }
            );


    if (upload.error) {
        throw upload.error;
    }


    const {
        data: publicData
    } =
        window.db.storage
            .from("video-files")
            .getPublicUrl(
                path
            );


    const fileUrl =
        publicData.publicUrl;


    const fileRecord =
        await window.db
            .from("order_files")
            .insert({

                order_id:
                    adminOrderData.id,

                uploaded_by:
                    currentUser.id,

                file_name:
                    file.name,

                file_path:
                    path,

                file_url:
                    fileUrl,

                file_size:
                    file.size,

                mime_type:
                    file.type,

                file_role:
                    "chat"

            })
            .select()
            .single();


    if (fileRecord.error) {
        throw fileRecord.error;
    }


    adminOrderFiles.push(
        fileRecord.data
    );


    const attachmentMessage =
        "__ATTACHMENT__" +
        JSON.stringify({

            name:
                file.name,

            url:
                fileUrl,

            type:
                file.type,

            size:
                file.size

        });


    const messageResult =
        await window.db
            .from(
                "order_messages"
            )
            .insert({

                order_id:
                    adminOrderData.id,

                sender_id:
                    currentUser.id,

                message:
                    attachmentMessage

            })
            .select()
            .single();


    if (messageResult.error) {
        throw messageResult.error;
    }


    adminOrderMessages.push(
        messageResult.data
    );

}


/* =========================================================
   VOICE RECORDING
   ========================================================= */

async function toggleVoiceRecording() {

    const button =
        document.getElementById(
            "chat-voice"
        );


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showToast(
            "ضبط صدا در این مرورگر پشتیبانی نمی‌شود.",
            "error"
        );

        return;
    }


    if (
        isRecording
    ) {

        stopVoiceRecording();

        return;
    }


    try {

        const stream =
            await navigator.mediaDevices
                .getUserMedia({
                    audio: true
                });


        recordingChunks = [];


        mediaRecorder =
            new MediaRecorder(
                stream
            );


        mediaRecorder.ondataavailable =
            event => {

                if (
                    event.data.size
                ) {

                    recordingChunks.push(
                        event.data
                    );

                }

            };


        mediaRecorder.onstop =
            async () => {

                stream
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );


                const blob =
                    new Blob(
                        recordingChunks,
                        {
                            type:
                                mediaRecorder
                                    .mimeType
                                ||
                                "audio/webm"
                        }
                    );


                const file =
                    new File(
                        [
                            blob
                        ],
                        `voice-${Date.now()}.webm`,
                        {
                            type:
                                blob.type
                        }
                    );


                selectedChatFiles.push(
                    file
                );


                renderAttachmentPreview();

                showToast(
                    "ویس آماده ارسال است."
                );

            };


        mediaRecorder.start();

        isRecording = true;


        button?.classList.add(
            "recording"
        );


        showToast(
            "ضبط ویس شروع شد."
        );


    } catch(error) {

        console.error(error);

        showToast(
            "دسترسی به میکروفون داده نشد.",
            "error"
        );

    }

}


function stopVoiceRecording() {

    if (
        mediaRecorder &&
        isRecording
    ) {

        mediaRecorder.stop();

        isRecording = false;

        document
            .getElementById(
                "chat-voice"
            )
            ?.classList.remove(
                "recording"
            );

    }

}


/* =========================================================
   CHAT RENDER
   ========================================================= */

function renderChatMessagesOnly() {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        renderMessages();


    scrollChatToBottom();

}


function scrollChatToBottom() {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return;
    }


    requestAnimationFrame(
        () => {

            container.scrollTop =
                container.scrollHeight;

        }
    );

}


async function getAdminCurrentUser() {

    const {
        data
    } =
        await window.db.auth.getUser();


    return data?.user || null;

}


function adminCurrentUserId() {

    return window.__tchoobCurrentUserId || "";

}


/* =========================================================
   GLOBAL USER CACHE
   ========================================================= */

(async function cacheAdminUser() {

    try {

        const user =
            await getAdminCurrentUser();


        if (user) {

            window.__tchoobCurrentUserId =
                user.id;

        }

    } catch(error) {

        console.error(error);

    }

})();


/* =========================================================
   SIDEBAR
   ========================================================= */

function initAdminShell() {

    const shell =
        document.getElementById(
            "admin-shell"
        );


    if (!shell) {
        return;
    }


    document
        .getElementById(
            "sidebar-toggle"
        )
        ?.addEventListener(
            "click",
            () => {

                shell.classList.toggle(
                    "sidebar-collapsed"
                );

            }
        );


    document
        .getElementById(
            "mobile-sidebar"
        )
        ?.addEventListener(
            "click",
            () => {

                shell.classList.toggle(
                    "mobile-sidebar-open"
                );

            }
        );


    document
        .getElementById(
            "theme-toggle"
        )
        ?.addEventListener(
            "click",
            toggleAdminTheme
        );


    document
        .getElementById(
            "logout"
        )
        ?.addEventListener(
            "click",
            logout
        );


    initCommandPalette();

}


document.addEventListener(
    "DOMContentLoaded",
    initAdminShell
);


/* =========================================================
   COMMAND PALETTE
   ========================================================= */

function initCommandPalette() {

    const overlay =
        document.getElementById(
            "command-overlay"
        );


    const search =
        document.getElementById(
            "command-search"
        );


    const openButton =
        document.getElementById(
            "command-open"
        );


    if (
        !overlay ||
        !search
    ) {

        return;

    }


    openButton?.addEventListener(
        "click",
        () => {

            overlay.classList.add(
                "open"
            );

            search.focus();

            renderCommandResults("");

        }
    );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {

                overlay.classList.remove(
                    "open"
                );

            }

        }
    );


    search.addEventListener(
        "input",
        () => {

            renderCommandResults(
                search.value
            );

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                (event.ctrlKey ||
                event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                overlay.classList.add(
                    "open"
                );

                search.focus();

                renderCommandResults("");

            }


            if (
                event.key === "Escape"
            ) {

                overlay.classList.remove(
                    "open"
                );

            }

        }
    );

}


function renderCommandResults(
    query
) {

    const container =
        document.getElementById(
            "command-results"
        );


    if (!container) {
        return;
    }


    const items = [

        {
            title:
                "اطلاعات سفارش",

            action:
                () =>
                    switchOrderTab(
                        "overview"
                    )
        },

        {
            title:
                "گفتگو",

            action:
                () =>
                    switchOrderTab(
                        "chat"
                    )
        },

        {
            title:
                "فایل‌ها",

            action:
                () =>
                    switchOrderTab(
                        "files"
                    )
        },

        {
            title:
                "تاریخچه",

            action:
                () =>
                    switchOrderTab(
                        "timeline"
                    )
        },

        {
            title:
                "وضعیت سفارش",

            action:
                () =>
                    switchOrderTab(
                        "status"
                    )

        }

    ];


    const filtered =
        items.filter(
            item =>
                !query ||
                item.title
                    .includes(
                        query
                    )
        );


    container.innerHTML =
        filtered
            .map(
                (item, index) =>
                    `
                    <div
                        class="command-item"
                        data-command-index="${index}"
                    >

                        <span>
                            ⌕
                        </span>

                        ${adminEsc(
                            item.title
                        )}

                    </div>
                    `
            )
            .join("");


    container
        .querySelectorAll(
            "[data-command-index]"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            item.dataset
                                .commandIndex
                        );


                    filtered[index]
                        ?.action();


                    document
                        .getElementById(
                            "command-overlay"
                        )
                        ?.classList
                        .remove(
                            "open"
                        );

                }
            );

        });

}


function switchOrderTab(
    tab
) {

    document
        .querySelectorAll(
            ".order-side-item"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tab
            );

        });


    document
        .querySelectorAll(
            ".order-tab"
        )
        .forEach(panel => {

            panel.classList.toggle(
                "active",
                panel.dataset.panel === tab
            );

        });


    if (
        tab === "chat"
    ) {

        scrollChatToBottom();

    }

}
