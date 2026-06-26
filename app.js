// ==========================================
// 📦 全域變數與固定數據
// ==========================================
const exchangeRates = {
    "2026-05-09": 0.8220, "2026-05-10": 0.8225, "2026-05-11": 0.8223, "2026-05-12": 0.8230,
    "2026-05-13": 0.8222, "2026-05-14": 0.8175, "2026-05-15": 0.8181, "2026-05-16": 0.8180,
    "2026-05-17": 0.8180, "2026-05-18": 0.8178, "2026-05-19": 0.8190, "2026-05-20": 0.8209,
    "2026-05-21": 0.8206, "2026-05-22": 0.8221, "2026-05-23": 0.8210, "2026-05-24": 0.8210,
    "2026-05-25": 0.8204, "2026-06-21": 0.8200
};

let expenses = [];
let myChart = null;
let currentTripId = null; 
let currentTripCode = "";
let currentMembers = []; 
let editingExpenseId = null; // 🌟 新增：用來記錄目前正在編輯哪一筆開支的 ID

const headers = {
    "apikey": SUPABASE_CONFIG.ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
    "Content-Type": "application/json"
};

// ==========================================
// 🚀 頁面初始化
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById('exp-date');
    if (dateInput) {
        // 自動獲取當前本地日期的 YYYY-MM-DD 格式並設為預設值
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    bindEvents();
});

// ==========================================
// 🎛️ 事件監聽綁定
// ==========================================
function bindEvents() {
    document.getElementById('btn-load-trip').addEventListener('click', loadExistingTrip);
    document.getElementById('btn-create-trip').addEventListener('click', createNewTripManual);
    document.getElementById('portal-csv-input').addEventListener('change', handlePortalCsvMagic); // 🌟 軌道 2 監聽

    document.getElementById('btn-modal-enter').addEventListener('click', () => {
        document.getElementById('success-modal').classList.add('hidden');
        enterDashboard(currentTripId, document.getElementById('trip-title-display').textContent, currentTripCode, currentMembers);
    });

    document.getElementById('btn-copy-code').addEventListener('click', () => {
        const codeText = document.getElementById('generated-code-display').textContent;
        navigator.clipboard.writeText(codeText);
        alert("Code 已成功複製！");
    });

    document.getElementById('expense-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('csv-file-input').addEventListener('change', handleCsvImport);
    document.getElementById('clear-db-data').addEventListener('click', clearCurrentTripData);
    document.getElementById('btn-exit-to-portal').addEventListener('click', exitToPortal);
    document.getElementById('btn-add-member-row').addEventListener('click', () => addMemberInputRow());

    // 網頁一開波，預設幫用家建好 3 格
    initDefaultMemberRows();
}

// 預設初始化格仔
function initDefaultMemberRows() {
    const container = document.getElementById('members-input-container');
    if (!container) return;
    container.innerHTML = ''; // 先清空
    addMemberInputRow(""); // 留空一格俾佢哋自己填
}

// 核心：每撳一次加號，就生一格帶有減號嘅 Input Row
function addMemberInputRow(value = "") {
    const container = document.getElementById('members-input-container');
    const row = document.createElement('div');
    row.className = "flex items-center gap-2 member-input-row";
    
    row.innerHTML = `
        <input type="text" placeholder="輸入旅伴名字" value="${value}" class="flex-grow text-xs bg-slate-950 border border-slate-700 rounded p-1.5 text-white focus:border-sky-500 focus:outline-none">
        <button type="button" class="btn-remove-member-row bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/50 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer">➖</button>
    `;
    
    // 💡 綁定減號按鈕：撳一撳就將自己呢行長眠
    row.querySelector('.btn-remove-member-row').addEventListener('click', () => {
        // 保留機制：唔好俾用家刪到一格都冇
        if (container.querySelectorAll('.member-input-row').length > 1) {
            row.remove();
        } else {
            alert("❌ 記帳系統至少需要保留一位旅伴！");
        }
    });
    
    container.appendChild(row);
}

function generateSecureTripCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let code = "";
    for (let i = 0; i < 6; i++) { code += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return code;
}

// 讀取已有旅程
async function loadExistingTrip() {
    const inputCode = document.getElementById('input-load-code').value.trim().toUpperCase();
    if (!inputCode) return;
    try {
        const res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/trips?passcode=eq.${encodeURIComponent(inputCode)}&select=*`, { method: "GET", headers: headers });
        const data = await res.json();
        if (data && data.length > 0) {
            enterDashboard(data[0].id, data[0].trip_name, data[0].passcode, data[0].members);
        } else { showError('load-error'); }
    } catch (err) { alert("無法連線資料庫"); }
}

// 軌道 1：手動建立旅程
async function createNewTripManual() {
    const name = document.getElementById('input-new-trip-name').value.trim() || "未命名新旅程";
    
    // 🌟 核心修改：撈取全部一格格嘅 input 內容
    const inputs = document.querySelectorAll('#members-input-container input');
    const membersArray = Array.from(inputs)
                              .map(i => i.value.trim())
                              .filter(m => m.length > 0); // 過濾走空嘅格仔

    if (membersArray.length === 0) { 
        alert("手動起帳模式必須輸入至少一位旅伴名字！"); 
        return; 
    }

    const newCode = generateSecureTripCode();

    try {
        const res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/trips`, {
            method: "POST", headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify({ trip_name: name, passcode: newCode, members: membersArray })
        });
        const data = await res.json();
        if (data && data.length > 0) {
            showSuccessModal(data[0].id, data[0].trip_name, data[0].passcode, data[0].members);
        }
    } catch (err) { alert("建立旅程失敗！"); }
}

// 🌟 軌道 2：CSV 魔法全自動解析建 Trip 核心算法
function handlePortalCsvMagic(e) {
    const file = e.target.files[0]; if (!file) return;
    
    const userTripName = document.getElementById('input-new-trip-name').value.trim();
    const tripName = userTripName || file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = async function(evt) {
        // 💡 修正 1：讀取時先過濾走所有空白行，確保 lines 陣列最後一個就是真正的「總計/最後一行」
        const lines = evt.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) { alert("CSV 數據量不足"); return; }

        const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        let extractedMembers = new Set();
        const startIndex = csvHeaders.indexOf("分攤");
        const endIndex = csvHeaders.indexOf("代墊");
        
        if (startIndex !== -1 && endIndex !== -1) {
            // 💡 修正 2：既然你刪除了旅程欄位，將原先的 endIndex - 1 改回 endIndex！
            // 咁樣就可以一路讀到「代墊」前一格，將 5 個人（Caff, Fanny, Simba, Eva, Leo）全數抓回！
            for (let i = startIndex + 1; i < endIndex; i++) {
                if (csvHeaders[i]) extractedMembers.add(csvHeaders[i]);
            }
        }

        const payerColIdx = csvHeaders.indexOf('支出的人');
        if (payerColIdx !== -1) {
            // 💡 修正 3：改成 lines.length - 1，確保巡查人名時自動略過最後一行的總計
            for (let i = 1; i < lines.length - 1; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols[payerColIdx]) extractedMembers.add(cols[payerColIdx]);
            }
        }

        const finalMembers = Array.from(extractedMembers).filter(m => m !== "未知" && m !== "");
        if (finalMembers.length === 0) {
            alert("❌ 無法從 CSV 欄位中辨識出任何旅伴人名，請改用軌道 1 手動輸入。");
            return;
        }

        // 1. 同步向 Supabase 建立 Trip
        const newCode = generateSecureTripCode();
        try {
            let resTrip = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/trips`, {
                method: "POST", headers: { ...headers, "Prefer": "return=representation" },
                body: JSON.stringify({ trip_name: tripName, passcode: newCode, members: finalMembers })
            });
            let tripData = await resTrip.json();
            if (!tripData || tripData.length === 0) throw new Error("建程失敗");

            const newTripId = tripData[0].id;

            // 2. 轉化 CSV 數據並打包成 Payload
            let bulkPayload = parseCsvLinesToPayload(lines, csvHeaders, finalMembers, newTripId);

            // 3. 批量寫入雲端開支表
            if (bulkPayload.length > 0) {
                await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses`, {
                    method: "POST", headers: { ...headers, "Prefer": "return=minimal" }, body: JSON.stringify(bulkPayload)
                });
            }

            alert(`🎉 魔法解鎖成功！自動偵測旅伴：[${finalMembers.join(', ')}]，並已上載 ${bulkPayload.length} 筆帳目！`);
            showSuccessModal(newTripId, tripData[0].trip_name, tripData[0].passcode, finalMembers);

        } catch (err) {
            alert("CSV 智能建帳發生錯誤，請檢查資料庫連線。");
        }
    };
    reader.readAsText(file, 'UTF-8');
}

// 提取共用的 CSV 行數轉換器
function parseCsvLinesToPayload(lines, csvHeaders, membersList, tripId) {
    let payload = [];
    
    const splitStartIdx = csvHeaders.indexOf('分攤');
    const advanceStartIdx = csvHeaders.indexOf('代墊');
    
    // 💡 修正 4：將 i < lines.length 改成 i < lines.length - 1
    // 咁樣在打包帳目數據上載時，程式就會在最後一行的前一行自動停低，完全唔會讀埋總計行！
    for (let i = 1; i < lines.length - 1; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < csvHeaders.length) continue;
        let row = {}; csvHeaders.forEach((h, idx) => { row[h] = cols[idx]; });

        const date = row['登錄日期'] || row['建立日期'] || "2026-05-14";
        const name = row['備註'] || "未命名項目";
        const amount = parseFloat(row['金額']) || 0;
        
        let rawCategory = row['支出分類'] || "其他";
        let category = "其他";
        if (rawCategory.includes("餐飲")) category = "餐飲";
        else if (rawCategory.includes("超市")) category = "超市";
        else if (rawCategory.includes("住房") || rawCategory.includes("住宿")) category = "住房";
        else if (rawCategory.includes("汽車") || rawCategory.includes("交通")) category = "汽車";
        else if (rawCategory.includes("休閒") || rawCategory.includes("育樂")) category = "休閒育樂";
        else if (rawCategory.includes("手信")) category = "手信";
        else if (rawCategory.includes("通訊")) category = "通訊";
        else if (rawCategory.includes("醫療")) category = "醫療保健";

        let split_detail = {};
        let has_custom_split = false;
        if (splitStartIdx !== -1 && advanceStartIdx !== -1) {
            for (let idx = splitStartIdx + 1; idx < advanceStartIdx; idx++) {
                const memberName = csvHeaders[idx];
                if (!membersList.includes(memberName)) continue; 
                const val = parseFloat(cols[idx]);
                if (!isNaN(val) && val > 0) {
                    split_detail[memberName] = val;
                    has_custom_split = true;
                }
            }
        }
        
        let paid_detail = {};
        let primaryPayer = "未知";
        let maxPaid = -1;
        if (advanceStartIdx !== -1) {
            for (let idx = advanceStartIdx + 1; idx < csvHeaders.length; idx++) {
                const memberName = csvHeaders[idx];
                if (!membersList.includes(memberName)) continue;
                const val = parseFloat(cols[idx]);
                if (!isNaN(val) && val > 0) {
                    paid_detail[memberName] = val;
                    if (val > maxPaid) {
                        maxPaid = val;
                        primaryPayer = memberName;
                    }
                }
            }
        }
        
        if (Object.keys(paid_detail).length === 0) {
            primaryPayer = row['支出的人'] || membersList[0] || "未知";
            paid_detail[primaryPayer] = amount;
        }

        let rate = exchangeRates[date] || 0.8200;
        let amount_in_aud = amount * rate;

        payload.push({
            trip_id: tripId, date, name, amount, currency: 'NZD', category, payer: primaryPayer,
            shopback_pct: 0, rate, shopback_saved_aud: 0, net_amount_aud: amount_in_aud, amount_in_aud, is_overridden: false,
            split_detail, paid_detail, has_custom_split
        });
    }
    return payload;
}

function showSuccessModal(id, name, code, members) {
    document.getElementById('generated-code-display').textContent = code;
    document.getElementById('success-modal').classList.remove('hidden');
    currentTripId = id;
    currentTripCode = code;
    currentMembers = members || [];
    document.getElementById('trip-title-display').textContent = name;
}

// 進入計帳主界面與動態 DOM 建構
function enterDashboard(id, name, code, members) {
    currentTripId = id;
    currentTripCode = code;
    currentMembers = members || [];
    
    document.getElementById('trip-title-display').textContent = name.startsWith('✈️') ? name : `✈️ ${name}`;
    document.getElementById('trip-code-badge').textContent = `CODE: ${code}`;
    document.getElementById('trip-members-display').textContent = `旅伴成員: ${currentMembers.join(', ')} (${currentMembers.length} 人)`;
    document.getElementById('settlement-title').textContent = `最終 ${currentMembers.length} 人分帳對帳單 (AUD)`;

    // 動態更新「付款人」下拉選單
    const payerSelect = document.getElementById('exp-payer');
    payerSelect.innerHTML = '';
    currentMembers.forEach(m => {
        let opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        payerSelect.appendChild(opt);
    });
    
    // 🌟 核心修改：生成手動記帳的進階分帳旅伴輸入格
    renderManualMemberFields();

    document.getElementById('portal-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.body.className = "p-4 md:p-8"; 
    
    fetchDataFromSupabase();
}

// 🌟 全新新增：統一還原表單與按鈕狀態的防呆工具
function resetFormState() {
    editingExpenseId = null;
    
    // 清空基本表單
    const form = document.getElementById('expense-form');
    if (form) form.reset();
    
    // 還原提交按鈕的字眼
    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "➕ 新增此筆開支";
    
    // 🌟 移除動態產生的「刪除」按鈕
    const dynamicDeleteBtn = document.getElementById('form-dynamic-delete-btn');
    if (dynamicDeleteBtn) dynamicDeleteBtn.remove();
    
    // 重新初始化多人的自訂拆帳格仔
    renderManualMemberFields();
}

function exitToPortal() {
    currentTripId = null; 
    currentTripCode = ""; 
    currentMembers = [];
    
    // 🌟 新增：退出旅程回到大廳時，也順便把表單編輯狀態與動態按鈕重置洗淨
    resetFormState();
    
    // 💡 加入安全防呆檢查：確保元素存在才清空，避免因為找不到舊 ID 而令整個功能癱瘓
    if (document.getElementById('input-load-code')) document.getElementById('input-load-code').value = "";
    if (document.getElementById('input-new-trip-name')) document.getElementById('input-new-trip-name').value = "";
    if (document.getElementById('portal-csv-input')) document.getElementById('portal-csv-input').value = "";
    
    // 如果你 HTML 還留著舊欄位就清空，冇咗亦唔會報錯
    const oldMembersInput = document.getElementById('input-new-trip-members');
    if (oldMembersInput) oldMembersInput.value = "";

    // 順利切換隱藏狀態
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('portal-screen').classList.remove('hidden');
    document.body.className = "p-4 md:p-8 flex items-center justify-center min-h-screen";
    
    // 重新初始化首頁一格格的旅伴輸入框
    initDefaultMemberRows();
}

function showError(id) {
    const el = document.getElementById(id); el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

// ==========================================
// 📊 Supabase 資料庫數據增刪查改
// ==========================================
async function fetchDataFromSupabase() {
    try {
        // 🌟 重點：在 URL 中加入了 &is_deleted=eq.false，只撈出未被刪除的帳目
        const res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses?trip_id=eq.${currentTripId}&is_deleted=eq.false&select=*&order=date.asc,id.asc`, { method: "GET", headers: headers });
        expenses = await res.json();
        renderAll();
    } catch (err) { console.error(err); }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('exp-date').value;
    const name = document.getElementById('exp-name').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const currency = document.getElementById('exp-currency').value;
    const category = document.getElementById('exp-category').value;
    const payer = document.getElementById('exp-payer').value;
    const shopback_pct = parseFloat(document.getElementById('exp-shopback').value) || 0;
    const overrideVal = parseFloat(document.getElementById('exp-override').value);

    let amount_in_aud = 0, is_overridden = false;
    let rate = currency === 'NZD' ? (exchangeRates[date] || 0.82) : 1;

    if (!isNaN(overrideVal) && overrideVal > 0) {
        amount_in_aud = overrideVal; is_overridden = true;
    } else { amount_in_aud = amount * rate; }
    
    const shopback_saved_aud = amount_in_aud * (shopback_pct / 100);
    const net_amount_aud = amount_in_aud - shopback_saved_aud;

    // 🌟 核心修改：動態撈取前端輸入的進階分帳細節
    let paid_detail = {};
    let split_detail = {};
    let totalCustomPaid = 0;
    let totalCustomSplit = 0;
    let has_custom_split = false;
    let primaryPayer = payer;

    const splitRows = document.querySelectorAll('.member-split-row');
    splitRows.forEach(row => {
        const m = row.dataset.member;
        const paidVal = parseFloat(row.querySelector('.member-paid-input').value) || 0;
        const splitVal = parseFloat(row.querySelector('.member-split-input').value) || 0;

        if (paidVal > 0) {
            paid_detail[m] = paidVal;
            totalCustomPaid += paidVal;
        }
        if (splitVal > 0) {
            split_detail[m] = splitVal;
            totalCustomSplit += splitVal;
        }
    });

    // 防呆防空機制
    if (totalCustomPaid > 0) {
        // 如果有填寫自訂代墊，找出出資最多的人當作主要付款人（以兼容明細表顯示）
        let maxPaid = -1;
        for (let m in paid_detail) {
            if (paid_detail[m] > maxPaid) {
                maxPaid = paid_detail[m];
                primaryPayer = m;
            }
        }
    } else {
        // 如果完全留空，走預設：由上方選取的單一付款人全額支付
        paid_detail[payer] = amount;
    }

    if (totalCustomSplit > 0) {
        // 如果有填寫自訂分攤金額，將其標記為自訂拆帳
        has_custom_split = true;
    }

    const payload = { 
        trip_id: currentTripId, date, name, amount, currency, category, payer: primaryPayer, 
        shopback_pct, rate, shopback_saved_aud, net_amount_aud, amount_in_aud, is_overridden,
        split_detail, paid_detail, has_custom_split
    };
    
    if (editingExpenseId) {
        // 如果有 ID，用 PATCH 修改該筆資料
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses?id=eq.${editingExpenseId}`, { 
            method: "PATCH", 
            headers: headers, 
            body: JSON.stringify(payload) 
        });
    } else {
        // 如果沒有 ID，照原樣用 POST 新增一筆
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses`, { 
            method: "POST", 
            headers: headers, 
            body: JSON.stringify(payload) 
        });
    }
    
    resetFormState();
    fetchDataFromSupabase();
}

async function deleteItem(id) {
    if(confirm("確定要刪除此筆雲端開支嗎？")) {
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses?id=eq.${id}`, { 
            method: "PATCH", 
            headers: headers,
            body: JSON.stringify({ is_deleted: true }) 
        });
        // 🌟 新增：刪除完後呼叫狀態重置，讓表單回復為「新增模式」並隱藏刪除掣
        resetFormState();
        fetchDataFromSupabase();
    }
}

// 內頁追加匯入 CSV
function handleCsvImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(evt) {
        // 💡 修正 5：這裡同樣加上 .filter(l => l.length > 0) 清走結尾空白行
        const lines = evt.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return;
        const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        let bulkPayload = parseCsvLinesToPayload(lines, csvHeaders, currentMembers, currentTripId);

        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses`, {
            method: "POST", headers: { ...headers, "Prefer": "return=minimal" }, body: JSON.stringify(bulkPayload)
        });
        alert(`已追加匯入 ${bulkPayload.length} 筆項目數據！`);
        fetchDataFromSupabase();
    };
    e.target.value = ""; 
    reader.readAsText(file, 'UTF-8');
}

async function clearCurrentTripData() {
    if(confirm('⚠️ 警告：這將會直接清空「當前旅程」在雲端的所有明細！確定嗎？')) {
        // 🌟 批次更新：把該旅程所有 expenses 的 is_deleted 全改成 true
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses?trip_id=eq.${currentTripId}`, { 
            method: "PATCH", 
            headers: headers,
            body: JSON.stringify({ is_deleted: true })
        });
        fetchDataFromSupabase();
    }
}

// ==========================================
// 🎨 前端介面渲染與分帳算法 (新增邊個畀邊個功能)
// ==========================================
function renderAll() {
    const tbody = document.getElementById('expense-tbody'); tbody.innerHTML = '';
    let totalNet = 0, totalSaved = 0;
    
    let catTotals = { "餐飲": 0, "超市": 0, "住房": 0, "汽車": 0, "休閒育樂": 0, "手信": 0, "通訊": 0, "醫療保健": 0, "其他": 0 };
    
    // 初始化每個人「實際代墊的錢」與「個人應分攤的錢」帳目矩陣
    let userPaid = {};
    let userOwed = {};
    currentMembers.forEach(m => { 
        userPaid[m] = 0; 
        userOwed[m] = 0; 
    });

    expenses.forEach(exp => {
        totalNet += exp.net_amount_aud; totalSaved += exp.shopback_saved_aud;
        if (catTotals[exp.category] !== undefined) catTotals[exp.category] += exp.net_amount_aud; else catTotals["其他"] += exp.net_amount_aud;
        
        // 1. 處理代墊付出
        if (exp.paid_detail && Object.keys(exp.paid_detail).length > 0) {
            for (let member in exp.paid_detail) {
                let memberPaidNzd = exp.paid_detail[member];
                let ratio = memberPaidNzd / exp.amount; 
                let memberPaidAud = exp.net_amount_aud * ratio;
                if (userPaid[member] !== undefined) {
                    userPaid[member] += memberPaidAud;
                }
            }
        } else {
            if (userPaid[exp.payer] !== undefined) userPaid[exp.payer] += exp.net_amount_aud;
        }

        // 2. 處理應分攤扣款
        if (exp.has_custom_split && exp.split_detail && Object.keys(exp.split_detail).length > 0) {
            for (let member in exp.split_detail) {
                let memberSplitNzd = exp.split_detail[member];
                let ratio = memberSplitNzd / exp.amount;
                let memberOwedAud = exp.net_amount_aud * ratio;
                if (userOwed[member] !== undefined) {
                    userOwed[member] += memberOwedAud;
                }
            }
        } else {
            const activeMembers = currentMembers.length || 1;
            const avgOwedAud = exp.net_amount_aud / activeMembers;
            currentMembers.forEach(member => {
                if (userOwed[member] !== undefined) {
                    userOwed[member] += avgOwedAud;
                }
            });
        }

        let calcBasisText = exp.is_overridden ? `<span class="text-amber-400 font-semibold">✍️ 覆寫: $${exp.amount_in_aud.toFixed(2)}</span>` : (exp.currency === 'NZD' ? `匯率: ${parseFloat(exp.rate).toFixed(4)}` : '直結 AUD');

        let catBadgeColor = "bg-slate-900 text-slate-300";
        if(exp.category === "餐飲") catBadgeColor = "bg-orange-950/50 text-orange-400 border border-orange-800/50";
        else if(exp.category === "超市") catBadgeColor = "bg-emerald-950/50 text-emerald-400 border border-emerald-800/50";
        else if(exp.category === "住房") catBadgeColor = "bg-sky-950/50 text-sky-400 border border-sky-800/50";
        else if(exp.category === "汽車") catBadgeColor = "bg-blue-950/50 text-blue-400 border border-blue-800/50";
        else if(exp.category === "休閒育樂") catBadgeColor = "bg-purple-950/50 text-purple-400 border border-purple-800/50";
        else if(exp.category === "手信") catBadgeColor = "bg-pink-950/50 text-pink-400 border border-pink-800/50";
        else if(exp.category === "通訊") catBadgeColor = "bg-indigo-950/50 text-indigo-400 border border-indigo-800/50";
        else if(exp.category === "醫療保健") catBadgeColor = "bg-red-950/50 text-red-400 border border-red-800/50";

        let payerDisplay = exp.payer;
        if (exp.paid_detail && Object.keys(exp.paid_detail).length > 1) {
            payerDisplay += ` (等 ${Object.keys(exp.paid_detail).length} 人)`;
        }

        let row = document.createElement('tr'); row.className = "hover:bg-slate-700/50 text-xs";
        row.innerHTML = `
            <td class="p-3 whitespace-nowrap">${exp.date}</td>
            <td class="p-3 font-medium text-white max-w-[150px] truncate" title="${exp.name}">${exp.name}</td>
            <td class="p-3"><span class="px-1.5 py-0.5 rounded text-[11px] font-medium ${catBadgeColor}">${exp.category}</span></td>
            <td class="p-3">${parseFloat(exp.amount).toFixed(2)} ${exp.currency}</td>
            <td class="p-3 text-slate-400 whitespace-nowrap">${calcBasisText}</td>
            <td class="p-3 text-sky-400">${exp.shopback_pct}%</td>
            <td class="p-3 font-semibold text-emerald-400">$${parseFloat(exp.net_amount_aud).toFixed(2)}</td>
            <td class="p-3 text-slate-300 font-medium">${payerDisplay}</td>
            <td class="p-3">
                <button onclick="editItem(${exp.id})" class="text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer">編輯</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('total-net-aud').textContent = `$${totalNet.toFixed(2)} AUD`;
    document.getElementById('total-shopback-aud').textContent = `$${totalSaved.toFixed(2)} AUD`;
    document.getElementById('total-count').textContent = `${expenses.length} 筆`;

    // ==========================================
    // 💡 核心升級：3. 渲染對帳清單與精準過數方案
    // ==========================================
    const settlementList = document.getElementById('settlement-list'); settlementList.innerHTML = '';
    if (expenses.length > 0) {
        let sHtml = `<p class="mb-2 text-slate-400 text-xs">📊 已成功啟用 Supabase JSONB 多人分帳引擎技術</p><ul class="space-y-1.5 border-t border-slate-700 pt-2 mb-4">`;
        
        let debtors = [];   // 需要補交錢的人
        let creditors = []; // 可以收回錢的人

        for (let user in userPaid) {
            let paid = userPaid[user];
            let owed = userOwed[user] || 0;
            let diff = paid - owed;
            
            // 將所有人分類至債務陣列
            if (diff < -0.01) {
                debtors.push({ name: user, amount: Math.abs(diff) });
            } else if (diff > 0.01) {
                creditors.push({ name: user, amount: diff });
            }

            sHtml += `<li class="flex justify-between items-center text-xs">
                <span>
                    ${diff >= 0 ? '🟢' : '🔴'} 
                    <span class="font-bold text-white">${user}</span> 
                    <span class="text-slate-400 ml-1 text-[11px]">(代墊: $${paid.toFixed(1)} / 分攤: $${owed.toFixed(1)})</span>
                </span>
                <span class="${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold">
                    ${diff >= 0 ? '收回' : '補交'} $${Math.abs(diff).toFixed(2)} AUD
                </span>
            </li>`;
        }
        sHtml += `</ul>`;

        // 🧠 貪婪算法配對：最佳化計算邊個畀邊個幾多錢
        let transfers = [];
        let dIdx = 0, cIdx = 0;
        
        while (dIdx < debtors.length && cIdx < creditors.length) {
            let debtor = debtors[dIdx];
            let creditor = creditors[cIdx];
            let amount = Math.min(debtor.amount, creditor.amount);
            
            if (amount > 0.01) {
                transfers.push({ from: debtor.name, to: creditor.name, amount: amount });
            }
            
            debtor.amount -= amount;
            creditor.amount -= amount;
            
            if (debtor.amount <= 0.01) dIdx++;
            if (creditor.amount <= 0.01) cIdx++;
        }

        // 渲染到畫面上
        sHtml += `<p class="mb-2 text-slate-400 text-xs border-t border-slate-700 pt-3 font-semibold">💸 最終過數方案 (直接跟住執即可)：</p>`;
        if (transfers.length > 0) {
            sHtml += `<ul class="space-y-1.5 bg-slate-950/60 p-2.5 rounded border border-slate-800">`;
            transfers.forEach(t => {
                sHtml += `<li class="text-xs text-slate-300 flex justify-between items-center">
                    <span>💵 <span class="font-bold text-rose-400">${t.from}</span> 需要支付畀 <span class="font-bold text-emerald-400">${t.to}</span></span>
                    <span class="font-extrabold text-sky-400">$${t.amount.toFixed(2)} AUD</span>
                </li>`;
            });
            sHtml += `</ul>`;
        } else {
            sHtml += `<p class="text-xs text-emerald-400 italic bg-slate-950/60 p-2 rounded text-center">🎉 帳目完全平衡，所有人互不相欠！</p>`;
        }

        settlementList.innerHTML = sHtml;
    } else { settlementList.innerHTML = '<p class="text-slate-400 italic">暫無數據。</p>'; }

    renderChart(catTotals);
}

function renderChart(catData) {
    const ctx = document.getElementById('categoryChart').getContext('2d'); if (myChart) { myChart.destroy(); }
    if (Object.values(catData).every(v => v === 0)) return;
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catData),
            datasets: [{ data: Object.values(catData), backgroundColor: ['#f97316', '#10b981', '#0ea5e9', '#3b82f6', '#a855f7', '#ec4899', '#6366f1', '#ef4444', '#64748b'], borderWidth: 1, borderColor: '#1e293b' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 10 }, boxWidth: 12 } } } }
    });
}

// 🌟 新增：手動記帳面板中，動態生成各成員的進階自訂拆帳及出資輸入格
function renderManualMemberFields() {
    const container = document.getElementById('manual-member-details-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (!currentMembers || currentMembers.length === 0) return;

    // 生成精簡標題欄
    const headerRow = document.createElement('div');
    headerRow.className = "grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1 text-center";
    headerRow.innerHTML = `<div class="text-left">旅伴名字</div><div>出資 (代墊)</div><div>分攤 (應付)</div>`;
    container.appendChild(headerRow);

    // 為每位成員生成對應的一列輸入格
    currentMembers.forEach(m => {
        const row = document.createElement('div');
        row.className = "grid grid-cols-3 gap-2 items-center member-split-row py-0.5";
        row.dataset.member = m;
        row.innerHTML = `
            <span class="text-xs text-slate-300 truncate font-medium">${m}</span>
            <input type="number" step="0.01" placeholder="全付則留空" class="member-paid-input bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white text-center focus:border-sky-500 focus:outline-none">
            <input type="number" step="0.01" placeholder="平分則留空" class="member-split-input bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white text-center focus:border-sky-500 focus:outline-none">
        `;
        container.appendChild(row);
    });
}

// 🌟 全新新增：點擊明細表「編輯」時觸發的動作
function editItem(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    editingExpenseId = id; // 鎖定目前修改中的 ID

    // 1. 將基本欄位塞回表單
    document.getElementById('exp-date').value = exp.date;
    document.getElementById('exp-name').value = exp.name;
    document.getElementById('exp-amount').value = exp.amount;
    document.getElementById('exp-currency').value = exp.currency;
    document.getElementById('exp-category').value = exp.category;
    document.getElementById('exp-payer').value = exp.payer;
    document.getElementById('exp-shopback').value = exp.shopback_pct;
    document.getElementById('exp-override').value = exp.is_overridden ? exp.amount_in_aud : "";

    // 2. 塞回旅伴細項數據
    renderManualMemberFields();
    const splitRows = document.querySelectorAll('.member-split-row');
    splitRows.forEach(row => {
        const m = row.dataset.member;
        const paidInput = row.querySelector('.member-paid-input');
        const splitInput = row.querySelector('.member-split-input');
        if (exp.paid_detail && exp.paid_detail[m] !== undefined) paidInput.value = exp.paid_detail[m];
        if (exp.split_detail && exp.split_detail[m] !== undefined) splitInput.value = exp.split_detail[m];
    });

    // 3. 改變表單 Submit 按鈕字眼
    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = "💾 儲存修改項目";

        // 🌟 如果畫面上還沒有刪除掣，就動態在儲存按鈕旁加上一個紅色的「刪除此筆」按鈕
        if (!document.getElementById('form-dynamic-delete-btn')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.id = 'form-dynamic-delete-btn';
            deleteBtn.type = 'button'; // 🌟 必須設定為 button，防止誤觸 form submit
            deleteBtn.className = 'ml-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 py-2 px-4 rounded text-xs font-medium transition-colors cursor-pointer';
            deleteBtn.textContent = '🗑️ 刪除此筆項目';
            
            // 點擊時直接觸發原有的刪除功能
            deleteBtn.onclick = async function() {
                await deleteItem(id);
            };
            
            // 緊貼插在儲存修改按鈕後面
            submitBtn.parentNode.appendChild(deleteBtn);
        }
    }

    // 4. 自動流暢捲動回網頁上方的表單位置
    document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
}
