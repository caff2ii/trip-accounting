// ==========================================
// 📦 全域變數與全球貨幣數據庫 (做法 A 完美實作)
// ==========================================
const exchangeRates = {
    "2026-05-09": 0.8220, "2026-05-10": 0.8225, "2026-05-11": 0.8223, "2026-05-12": 0.8230,
    "2026-05-13": 0.8222, "2026-05-14": 0.8175, "2026-05-15": 0.8181, "2026-05-16": 0.8180,
    "2026-05-17": 0.8180, "2026-05-18": 0.8178, "2026-05-19": 0.8190, "2026-05-20": 0.8209,
    "2026-05-21": 0.8206, "2026-05-22": 0.8221, "2026-05-23": 0.8210, "2026-05-24": 0.8210,
    "2026-05-25": 0.8204, "2026-06-21": 0.8200
};

// 🌍 做法 A：全球熱門與主流旅遊貨幣全收錄清單
const currencyList = [
    // 🔥 超級熱門置頂
    { code: "AUD", name: "澳洲元", flag: "🇦🇺", popular: true },
    { code: "HKD", name: "港幣", flag: "🇭🇰", popular: true },
    { code: "NZD", name: "紐西蘭元", flag: "🇳🇿", popular: true },
    { code: "JPY", name: "日圓", flag: "🇯🇵", popular: true },
    { code: "TWD", name: "新台幣", flag: "🇹🇼", popular: true },
    { code: "KRW", name: "韓圓", flag: "🇰🇷", popular: true },
    { code: "THB", name: "泰銖", flag: "🇹🇭", popular: true },
    
    // 亞洲及東南亞鄰近地區
    { code: "SGD", name: "新加坡元", flag: "🇸🇬" },
    { code: "MYR", name: "馬來西亞林吉特", flag: "🇲🇾" },
    { code: "IDR", name: "印尼盾", flag: "🇮🇩" },
    { code: "PHP", name: "菲律賓比索", flag: "🇵🇭" },
    { code: "VND", name: "越南盾", flag: "🇻🇳" },
    { code: "CNY", name: "人民幣", flag: "🇨🇳" },
    { code: "MOP", name: "澳門幣", flag: "🇲🇴" },
    
    // 歐美及其他熱門旅遊區
    { code: "USD", name: "美金", flag: "🇺🇸" },
    { code: "EUR", name: "歐羅", flag: "🇪🇺" },
    { code: "GBP", name: "英鎊", flag: "🇬🇧" },
    { code: "CAD", name: "加拿大元", flag: "🇨🇦" },
    { code: "CHF", name: "瑞士法郎", flag: "🇨🇭" },
    { code: "SEK", name: "瑞典克朗", flag: "🇸🇪" },
    { code: "NOK", name: "挪威克朗", flag: "🇳🇴" },
    { code: "DKK", name: "丹麥克朗", flag: "🇩🇰" },
    { code: "ISK", name: "冰島克朗", flag: "🇮🇸" },
    { code: "AED", name: "阿聯酋迪拉姆", flag: "🇦🇪" },
    { code: "ZAR", name: "南非蘭特", flag: "🇿🇦" },
    { code: "TRY", name: "土耳其里拉", flag: "🇹🇷" }
];

let expenses = [];
let myChart = null;
let currentTripId = null; 
let currentTripCode = "";
let currentMembers = []; 
let currentTripBaseCurrency = "AUD"; 
let editingExpenseId = null; 

const headers = {
    "apikey": SUPABASE_CONFIG.ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
    "Content-Type": "application/json"
};

// ==========================================
// 🚀 頁面初始化
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    populateCurrencyDropdowns(); // 動態注入做法 A 清單
    setDefaultDate(); 
    bindEvents();
});

// ==========================================
// 🌍 完美對接自訂浮動下拉選單 (取代原本的 option 注入)
// ==========================================
function populateCurrencyDropdowns() {
    // 1. 設定第一個選單：門戶建立旅程本位幣
    setupCustomCurrencyPicker('input-new-trip-base', 'trip-base-dropdown', 'trip-base-picker-wrapper', 'AUD');
    
    // 2. 設定第二個選單：記帳內頁表單消費幣
    setupCustomCurrencyPicker('exp-currency', 'exp-currency-dropdown', 'exp-currency-picker-wrapper', 'NZD');
}

// 📦 萬用封裝：處理「打字即時搜尋 + 浮動 Div 渲染 + 點擊選取數值」
function setupCustomCurrencyPicker(inputId, dropdownId, wrapperId, defaultVal) {
    const inputEl = document.getElementById(inputId);
    const dropdownEl = document.getElementById(dropdownId);
    const wrapperEl = document.getElementById(wrapperId);

    if (!inputEl || !dropdownEl) return;

    // 預設填入初始貨幣代碼
    inputEl.value = defaultVal;

    // 核心渲染與過濾函式
    const renderDropdown = (keyword) => {
        const cleanKeyword = keyword.toUpperCase().trim();
        
        // 🔥 同時支援模糊比對代碼（如打 H / HKD）與中文名稱（如打 港幣）
        const filtered = currencyList.filter(c => 
            c.code.toUpperCase().includes(cleanKeyword) || 
            c.name.includes(cleanKeyword)
        );

        if (filtered.length === 0) {
            dropdownEl.innerHTML = `<div class="p-3 text-xs text-slate-500 text-center">找不到此貨幣</div>`;
            dropdownEl.classList.remove('hidden');
            return;
        }

        // 動態生成美化 HTML 填入你 HTML 預留的浮動 Div 內
        dropdownEl.innerHTML = filtered.map(c => `
            <div class="currency-item p-2.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors" data-code="${c.code}">
                <span class="font-bold">${c.flag} ${c.code}</span>
                <span class="text-slate-400 text-[11px]">${c.name}</span>
            </div>
        `).join('');

        dropdownEl.classList.remove('hidden');

        // 監聽選項點擊事件
        dropdownEl.querySelectorAll('.currency-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation(); // 防止事件冒泡
                inputEl.value = item.getAttribute('data-code'); // 正確把 "HKD" 填入 input
                dropdownEl.classList.add('hidden');            // 隱藏選單
                inputEl.dispatchEvent(new Event('change'));    // 觸發連動更新
            };
        });
    };

    // 點擊或聚焦輸入框時顯示選單
    inputEl.addEventListener('focus', () => renderDropdown(inputEl.value));
    
    // 監聽打字（如打 H）即時模糊過濾
    inputEl.addEventListener('input', (e) => renderDropdown(e.target.value));

    // 點擊選單外部空白處時自動收起
    document.addEventListener('click', (e) => {
        if (wrapperEl && !wrapperEl.contains(e.target)) {
            dropdownEl.classList.add('hidden');
        }
    });
}

// 統一設定當前本地日期的預設值
function setDefaultDate() {
    const dateInput = document.getElementById('exp-date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// ==========================================
// 🎛️ 事件監聽綁定
// ==========================================
function bindEvents() {
    document.getElementById('btn-load-trip').addEventListener('click', loadExistingTrip);
    document.getElementById('btn-create-trip').addEventListener('click', createNewTripManual);
    document.getElementById('portal-csv-input').addEventListener('change', handlePortalCsvMagic); 

    document.getElementById('btn-modal-enter').addEventListener('click', () => {
        document.getElementById('success-modal').classList.add('hidden');
        enterDashboard(currentTripId, document.getElementById('trip-title-display').textContent, currentTripCode, currentMembers, currentTripBaseCurrency);
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

    initDefaultMemberRows();
}

function initDefaultMemberRows() {
    const container = document.getElementById('members-input-container');
    if (!container) return;
    container.innerHTML = ''; 
    addMemberInputRow(""); 
}

function addMemberInputRow(value = "") {
    const container = document.getElementById('members-input-container');
    const row = document.createElement('div');
    row.className = "flex items-center gap-2 member-input-row";
    
    row.innerHTML = `
        <input type="text" placeholder="輸入旅伴名字" value="${value}" class="flex-grow text-xs bg-slate-950 border border-slate-700 rounded p-1.5 text-white focus:border-sky-500 focus:outline-none">
        <button type="button" class="btn-remove-member-row bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/50 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer">➖</button>
    `;
    
    row.querySelector('.btn-remove-member-row').addEventListener('click', () => {
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
            const baseCurr = data[0].base_currency || "AUD";
            enterDashboard(data[0].id, data[0].trip_name, data[0].passcode, data[0].members, baseCurr);
        } else { showError('load-error'); }
    } catch (err) { alert("無法連線資料庫"); }
}

// 建立新旅程（手動）
async function createNewTripManual() {
    const name = document.getElementById('input-new-trip-name').value.trim() || "未命名新旅程";
    const inputs = document.querySelectorAll('#members-input-container input');
    const membersArray = Array.from(inputs).map(i => i.value.trim()).filter(m => m.length > 0);

    if (membersArray.length === 0) { 
        alert("手動起帳模式必須輸入至少一位旅伴名字！"); 
        return; 
    }

    const newCode = generateSecureTripCode();
    const baseCurrencyInput = document.getElementById('input-new-trip-base');
    const baseCurrency = baseCurrencyInput ? baseCurrencyInput.value : "AUD";

    try {
        const res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/trips`, {
            method: "POST", headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify({ trip_name: name, passcode: newCode, members: membersArray, base_currency: baseCurrency })
        });
        const data = await res.json();
        if (data && data.length > 0) {
            showSuccessModal(data[0].id, data[0].trip_name, data[0].passcode, data[0].members, data[0].base_currency);
        }
    } catch (err) { alert("建立旅程失敗！"); }
}

// CSV 全自動智能建立 Trip 
function handlePortalCsvMagic(e) {
    const file = e.target.files[0]; if (!file) return;
    const userTripName = document.getElementById('input-new-trip-name').value.trim();
    const tripName = userTripName || file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = async function(evt) {
        const lines = evt.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) { alert("CSV 數據量不足"); return; }

        const csvHeaders = splitCsvLine(lines[0]);
        let extractedMembers = new Set();
        const startIndex = csvHeaders.indexOf("分攤");
        const endIndex = csvHeaders.indexOf("代墊");
        
        if (startIndex !== -1 && endIndex !== -1) {
            for (let i = startIndex + 1; i < endIndex; i++) {
                if (csvHeaders[i]) extractedMembers.add(csvHeaders[i]);
            }
        }

        const payerColIdx = csvHeaders.indexOf('支出的人');
        if (payerColIdx !== -1) {
            for (let i = 1; i < lines.length; i++) {
                const cols = splitCsvLine(lines[i]);
                if (cols[payerColIdx]) extractedMembers.add(cols[payerColIdx]);
            }
        }

        const finalMembers = Array.from(extractedMembers).filter(m => m !== "未知" && m !== "");
        if (finalMembers.length === 0) {
            alert("❌ 無法從 CSV 欄位中辨識出任何旅伴人名，請改用軌道 1 手動輸入。");
            return;
        }

        const newCode = generateSecureTripCode();
        try {
            let resTrip = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/trips`, {
                method: "POST", headers: { ...headers, "Prefer": "return=representation" },
                body: JSON.stringify({ trip_name: tripName, passcode: newCode, members: finalMembers, base_currency: "AUD" })
            });
            let tripData = await resTrip.json();
            if (!tripData || tripData.length === 0) throw new Error("建程失敗");

            const newTripId = tripData[0].id;
            const tripBase = tripData[0].base_currency || "AUD";

            let bulkPayload = parseCsvLinesToPayload(lines, csvHeaders, finalMembers, newTripId, tripBase);

            if (bulkPayload.length > 0) {
                const resExp = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses`, {
                    method: "POST", 
                    headers: { ...headers, "Prefer": "return=minimal" }, 
                    body: JSON.stringify(bulkPayload)
                });
                
                if (!resExp.ok) {
                    const errorText = await resExp.text();
                    throw new Error(`資料庫寫入失敗: ${errorText}`);
                }
            }

            alert(`🎉 魔法解鎖成功！自動偵測旅伴：[${finalMembers.join(', ')}]，並已上載 ${bulkPayload.length} 筆帳目！`);
            showSuccessModal(newTripId, tripData[0].trip_name, tripData[0].passcode, finalMembers, tripBase);

        } catch (err) {
            alert("CSV 智能建帳發生錯誤，請檢查資料庫連線。");
        }
    };
    reader.readAsText(file, 'UTF-8');
}

// CSV 解析核心
function parseCsvLinesToPayload(lines, csvHeaders, membersList, tripId, tripBase = "AUD") {
    let payload = [];
    const splitStartIdx = csvHeaders.indexOf('分攤');
    const advanceStartIdx = csvHeaders.indexOf('代墊');
    
    for (let i = 1; i < lines.length; i++) { 
        if (!lines[i].trim()) continue;
        const cols = splitCsvLine(lines[i]);
        if (cols.length < csvHeaders.length) continue;
        let row = {}; csvHeaders.forEach((h, idx) => { row[h] = cols[idx]; });

        const rawDate = row['登錄日期'] || row['建立日期'] || "";
        const date = formatToIsoDate(rawDate);
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

        let rate = (tripBase === "AUD") ? (exchangeRates[date] || 0.8200) : 1.0;
        let amount_in_base = amount * rate;

        payload.push({
            trip_id: tripId, date, name, amount, currency: 'NZD', category, payer: primaryPayer,
            shopback_pct: 0, rate, shopback_saved_base: 0, net_amount_base: amount_in_base, amount_in_base, is_overridden: false,
            split_detail, paid_detail, has_custom_split
        });
    }
    return payload;
}

function showSuccessModal(id, name, code, members, baseCurrency = "AUD") {
    document.getElementById('generated-code-display').textContent = code;
    document.getElementById('success-modal').classList.remove('hidden');
    currentTripId = id;
    currentTripCode = code;
    currentMembers = members || [];
    currentTripBaseCurrency = baseCurrency; 
    document.getElementById('trip-title-display').textContent = name;
}

// 進入計帳主界面
function enterDashboard(id, name, code, members, baseCurrency = "AUD") {
    currentTripId = id;
    currentTripCode = code;
    currentMembers = members || [];
    currentTripBaseCurrency = baseCurrency; 
    
    document.getElementById('trip-title-display').textContent = name.startsWith('✈️') ? name : `✈️ ${name}`;
    document.getElementById('trip-code-badge').textContent = `CODE: ${code} (${currentTripBaseCurrency})`;
    document.getElementById('trip-members-display').textContent = `旅伴成員: ${currentMembers.join(', ')} (${currentMembers.length} 人)`;
    document.getElementById('settlement-title').textContent = `最終 ${currentMembers.length} 人分帳對帳單 (${currentTripBaseCurrency})`;

    // 🌟 實作同步：自動切換開支表單的幣別預設值為「該旅程自訂本位幣」
    const expCurrencySelect = document.getElementById('exp-currency');
    if (expCurrencySelect) {
        expCurrencySelect.value = currentTripBaseCurrency;
    }

    const payerSelect = document.getElementById('exp-payer');
    payerSelect.innerHTML = '';
    currentMembers.forEach(m => {
        let opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        payerSelect.appendChild(opt);
    });
    
    renderManualMemberFields();

    document.getElementById('portal-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.body.className = "p-4 md:p-8"; 
    
    fetchDataFromSupabase();
}

// ⚖️ 完美對接：重置表單狀態
function resetFormState() {
    editingExpenseId = null;
    const form = document.getElementById('expense-form');
    if (form) form.reset();
    
    setDefaultDate(); 

    // 🌟 同步：重置表單時確保幣別切回當前旅程的本位幣
    const expCurrencySelect = document.getElementById('exp-currency');
    if (expCurrencySelect) {
        expCurrencySelect.value = currentTripBaseCurrency;
    }

    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "➕ 新增此筆開支";
    
    const dynamicDeleteBtn = document.getElementById('form-dynamic-delete-btn');
    if (dynamicDeleteBtn) dynamicDeleteBtn.remove();
    
    renderManualMemberFields();
}

function exitToPortal() {
    currentTripId = null; 
    currentTripCode = ""; 
    currentMembers = [];
    currentTripBaseCurrency = "AUD"; 
    
    resetFormState();
    
    if (document.getElementById('input-load-code')) document.getElementById('input-load-code').value = "";
    if (document.getElementById('input-new-trip-name')) document.getElementById('input-new-trip-name').value = "";
    if (document.getElementById('portal-csv-input')) document.getElementById('portal-csv-input').value = "";
    
    const oldMembersInput = document.getElementById('input-new-trip-members');
    if (oldMembersInput) oldMembersInput.value = "";

    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('portal-screen').classList.remove('hidden');
    document.body.className = "p-4 md:p-8 flex items-center justify-center min-h-screen";
    
    initDefaultMemberRows();
}

function showError(id) {
    const el = document.getElementById(id); el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

// ==========================================
// 📊 Supabase 數據查改與跨幣別高精度處理
// ==========================================
async function fetchDataFromSupabase() {
    try {
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

    let amount_in_base = 0, is_overridden = false;
    let rate = 1.0;
    const tripBase = currentTripBaseCurrency || "AUD";

    // 全球貨幣高防禦性動態匯率解析
    if (currency !== tripBase) {
        if (tripBase === "AUD" && currency === "NZD" && exchangeRates && exchangeRates[date]) {
            rate = exchangeRates[date];
        } else {
            try {
                const res = await fetch(`https://api.frankfurter.app/${date}?from=${tripBase}&to=${currency}`);
                if (!res.ok) throw new Error('API 響應錯誤');
                const data = await res.json();
                if (data && data.rates && data.rates[currency]) {
                    rate = 1 / data.rates[currency];
                }
            } catch (err) {
                console.warn(`🌐 網路匯率獲取失敗，啟用安全保底：`, err);
                if (tripBase === "AUD" && currency === "NZD") rate = 0.82;
                else if (tripBase === "HKD" && currency === "JPY") rate = 0.05;
                else rate = 1.0;
            }
        }
    } else {
        rate = 1.0;
    }

    if (!isNaN(overrideVal) && overrideVal > 0) {
        amount_in_base = overrideVal; is_overridden = true;
    } else { 
        amount_in_base = amount * rate; 
    }
    
    const shopback_saved_base = amount_in_base * (shopback_pct / 100);
    const net_amount_base = amount_in_base - shopback_saved_base;

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

    if (totalCustomPaid > 0) {
        let maxPaid = -1;
        for (let m in paid_detail) {
            if (paid_detail[m] > maxPaid) {
                maxPaid = paid_detail[m];
                primaryPayer = m;
            }
        }
    } else {
        paid_detail[payer] = amount;
    }

    if (totalCustomSplit > 0) {
        has_custom_split = true;
    }

    const payload = { 
        trip_id: currentTripId, date, name, amount, currency, category, payer: primaryPayer, 
        shopback_pct, rate, shopback_saved_base, net_amount_base, amount_in_base, is_overridden,
        split_detail, paid_detail, has_custom_split
    };
    
    try { 
        let resExp;
        if (editingExpenseId) {
            resExp = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses?id=eq.${editingExpenseId}`, { 
                method: "PATCH", headers: headers, body: JSON.stringify(payload) 
            });
        } else {
            resExp = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses`, { 
                method: "POST", headers: headers, body: JSON.stringify(payload) 
            });
        }
        
        if (!resExp.ok) {
            const errorText = await resExp.text();
            throw new Error(`資料庫寫入失敗: ${errorText}`);
        }
        
        resetFormState();
        fetchDataFromSupabase();
    } catch (err) {
        console.error("Form Submit Error:", err);
        alert("❌ 儲存開支失敗！請確認網路連線或資料庫狀態正常。");
    }
}

async function deleteItem(id) {
    if(confirm("確定要刪除此筆雲端開支嗎？")) {
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses?id=eq.${id}`, { 
            method: "PATCH", headers: headers, body: JSON.stringify({ is_deleted: true }) 
        });
        resetFormState();
        fetchDataFromSupabase();
    }
}

function handleCsvImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(evt) {
        try { 
            const lines = evt.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length < 2) {
                alert("❌ CSV 數據量不足，無法解析。");
                return;
            }
            const csvHeaders = splitCsvLine(lines[0]);
            
            let bulkPayload = parseCsvLinesToPayload(lines, csvHeaders, currentMembers, currentTripId, currentTripBaseCurrency);

            const res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses`, {
                method: "POST", headers: { ...headers, "Prefer": "return=minimal" }, body: JSON.stringify(bulkPayload)
            });

            if (!res.ok) throw new Error("Supabase 寫入失敗");

            alert(`🎉 已成功追加匯入 ${bulkPayload.length} 筆項目數據！`);
            fetchDataFromSupabase();
        } catch (err) {
            console.error("CSV Import Error:", err);
            alert("❌ CSV 追加匯入失敗！請確保上傳的檔案欄位架構正確，且網路連線正常。");
        }
    };
    e.target.value = ""; 
    reader.readAsText(file, 'UTF-8');
}

async function clearCurrentTripData() {
    if(confirm('⚠️ 警告：這將會直接清空「當前旅程」在雲端的所有明細！確定嗎？')) {
        await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/expenses?trip_id=eq.${currentTripId}`, { 
            method: "PATCH", headers: headers, body: JSON.stringify({ is_deleted: true })
        });
        fetchDataFromSupabase();
    }
}

// ==========================================
// 🎨 前端介面渲染與分帳算法
// ==========================================
function renderAll() {
    const tbody = document.getElementById('expense-tbody'); tbody.innerHTML = '';
    let totalNet = 0, totalSaved = 0;
    const tripBase = currentTripBaseCurrency || "AUD"; 
    
    let catTotals = { "餐飲": 0, "超市": 0, "住房": 0, "汽車": 0, "休閒育樂": 0, "手信": 0, "通訊": 0, "醫療保健": 0, "其他": 0 };
    
    let userPaid = {};
    let userOwed = {};
    currentMembers.forEach(m => { 
        userPaid[m] = 0; 
        userOwed[m] = 0; 
    });

    expenses.forEach(exp => {
        const netAmt = exp.net_amount_base !== undefined ? exp.net_amount_base : (exp.net_amount_aud || 0);
        const savedAmt = exp.shopback_saved_base !== undefined ? exp.shopback_saved_base : (exp.shopback_saved_aud || 0);
        const baseAmt = exp.amount_in_base !== undefined ? exp.amount_in_base : (exp.amount_in_aud || 0);

        totalNet += netAmt; 
        totalSaved += savedAmt;
        if (catTotals[exp.category] !== undefined) catTotals[exp.category] += netAmt; else catTotals["其他"] += netAmt;
        
        if (exp.paid_detail && Object.keys(exp.paid_detail).length > 0) {
            for (let member in exp.paid_detail) {
                let memberPaidNzd = exp.paid_detail[member];
                let ratio = memberPaidNzd / exp.amount; 
                let memberPaidBase = netAmt * ratio;
                if (userPaid[member] !== undefined) {
                    userPaid[member] += memberPaidBase;
                }
            }
        } else {
            if (userPaid[exp.payer] !== undefined) userPaid[exp.payer] += netAmt;
        }

        if (exp.has_custom_split && exp.split_detail && Object.keys(exp.split_detail).length > 0) {
            for (let member in exp.split_detail) {
                let memberSplitNzd = exp.split_detail[member];
                let ratio = memberSplitNzd / exp.amount;
                let memberOwedBase = netAmt * ratio;
                if (userOwed[member] !== undefined) {
                    userOwed[member] += memberOwedBase;
                }
            }
        } else {
            const activeMembers = currentMembers.length || 1;
            const avgOwedBase = netAmt / activeMembers;
            currentMembers.forEach(member => {
                if (userOwed[member] !== undefined) {
                    userOwed[member] += avgOwedBase;
                }
            });
        }

        let calcBasisText = exp.is_overridden ? 
            `<span class="text-amber-400 font-semibold">✍️ 覆寫: $${baseAmt.toFixed(2)}</span>` : 
            (exp.currency !== tripBase ? `匯率: ${parseFloat(exp.rate).toFixed(4)}` : `直結 ${tripBase}`);

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
            <td class="p-3 font-semibold text-emerald-400">$${parseFloat(netAmt).toFixed(2)}</td>
            <td class="p-3 text-slate-300 font-medium">${payerDisplay}</td>
            <td class="p-3">
                <button onclick="editItem(${exp.id})" class="text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer">編輯</button>
            </td>
        `; 
        tbody.appendChild(row);
    });
    
    document.getElementById('total-net-base').textContent = `$${totalNet.toFixed(2)} ${tripBase}`;
    document.getElementById('total-shopback-base').textContent = `$${totalSaved.toFixed(2)} ${tripBase}`;
    document.getElementById('total-count').textContent = `${expenses.length} 筆`;

    const settlementList = document.getElementById('settlement-list'); settlementList.innerHTML = '';
    if (expenses.length > 0) {
        let sHtml = `<p class="mb-2 text-slate-400 text-xs">📊 已成功啟用 Supabase JSONB 多人分帳引擎技術</p><ul class="space-y-1.5 border-t border-slate-700 pt-2 mb-4">`;
        
        let debtors = [];   
        let creditors = []; 

        for (let user in userPaid) {
            let paid = userPaid[user];
            let owed = userOwed[user] || 0;
            let diff = paid - owed;
            
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
                    ${diff >= 0 ? '收回' : '補交'} $${Math.abs(diff).toFixed(2)} ${tripBase}
                </span>
            </li>`;
        }
        sHtml += `</ul>`;

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

        sHtml += `<p class="mb-2 text-slate-400 text-xs border-t border-slate-700 pt-3 font-semibold">💸 最終過數方案 (直接跟住執即可)：</p>`;
        if (transfers.length > 0) {
            sHtml += `<ul class="space-y-1.5 bg-slate-950/60 p-2.5 rounded border border-slate-800">`;
            transfers.forEach(t => {
                sHtml += `<li class="text-xs text-slate-300 flex justify-between items-center">
                    <span>💵 <span class="font-bold text-rose-400">${t.from}</span> 需要支付畀 <span class="font-bold text-emerald-400">${t.to}</span></span>
                    <span class="font-extrabold text-sky-400">$${t.amount.toFixed(2)} ${tripBase}</span>
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

function renderManualMemberFields() {
    const container = document.getElementById('manual-member-details-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (!currentMembers || currentMembers.length === 0) return;

    const headerRow = document.createElement('div');
    headerRow.className = "grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1 text-center";
    headerRow.innerHTML = `<div class="text-left">旅伴名字</div><div>出資 (代墊)</div><div>分攤 (應付)</div>`;
    container.appendChild(headerRow);

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

function editItem(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    editingExpenseId = id; 
    const baseAmt = exp.amount_in_base !== undefined ? exp.amount_in_base : (exp.amount_in_aud || 0);

    document.getElementById('exp-date').value = exp.date;
    document.getElementById('exp-name').value = exp.name;
    document.getElementById('exp-amount').value = exp.amount;
    document.getElementById('exp-currency').value = exp.currency;
    document.getElementById('exp-category').value = exp.category;
    document.getElementById('exp-payer').value = exp.payer;
    document.getElementById('exp-shopback').value = exp.shopback_pct;
    document.getElementById('exp-override').value = exp.is_overridden ? baseAmt : "";

    renderManualMemberFields();
    const splitRows = document.querySelectorAll('.member-split-row');
    splitRows.forEach(row => {
        const m = row.dataset.member;
        const paidInput = row.querySelector('.member-paid-input');
        const splitInput = row.querySelector('.member-split-input');
        if (exp.paid_detail && exp.paid_detail[m] !== undefined) paidInput.value = exp.paid_detail[m];
        if (exp.split_detail && exp.split_detail[m] !== undefined) splitInput.value = exp.split_detail[m];
    });

    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = "💾 儲存修改項目";

        if (!document.getElementById('form-dynamic-delete-btn')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.id = 'form-dynamic-delete-btn';
            deleteBtn.type = 'button'; 
            deleteBtn.className = 'ml-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 py-2 px-4 rounded text-xs font-medium transition-colors cursor-pointer';
            deleteBtn.textContent = '🗑️ 刪除此筆項目';
            
            deleteBtn.onclick = async function() {
                await deleteItem(id);
            };
            submitBtn.parentNode.appendChild(deleteBtn);
        }
    }

    document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
}

function formatToIsoDate(dateStr) {
    if (!dateStr) return "2026-05-14"; 
    dateStr = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) { 
            year = parts[0]; month = parts[1]; day = parts[2];
        } else if (parts[2].length === 4) { 
            day = parts[0]; month = parts[1]; year = parts[2];
        } else {
            return "2026-05-14";
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return "2026-05-14";
}

function splitCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}
