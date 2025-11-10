// views/scripts/weekly-business.js (V5.2 - Side Panel Editor & Final Polish - 已優化效能)

let currentWeekData = null;
let allWeeksSummary = []; // 現在只儲存摘要資訊

/**
 * 【優化】載入並渲染週間業務的主頁面 (列表頁)
 */
async function loadWeeklyBusinessPage() {
    // 檢查是否有從儀表板跳轉的 weekId
    const targetWeekId = sessionStorage.getItem('navigateToWeekId');
    if (targetWeekId) {
        sessionStorage.removeItem('navigateToWeekId'); // 用完後清除
        // *** 關鍵修正：將這裡的導航也改為 CRM_APP.navigateTo ***
        await CRM_APP.navigateTo('weekly-detail', { weekId: targetWeekId });
        return;
    }

    const container = document.getElementById('page-weekly-business');
    if (!container) return;
    container.innerHTML = `<div class="loading show"><div class="spinner"></div><p>載入週次列表中...</p></div>`;

    try {
        // 【修改】呼叫優化後的 /summary API，只獲取摘要列表
        const result = await authedFetch(`/api/business/weekly/summary`);
        if (!result.success) throw Error(result.error);

        allWeeksSummary = result.data || []; // data 現在是摘要陣列 [{id, title, dateRange, summaryCount}, ...]
        renderWeekListPage(); // 使用摘要資料渲染列表
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            container.innerHTML = `<div class="alert alert-error">載入週次列表失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 【優化】使用摘要資料渲染週次列表的畫面
 */
function renderWeekListPage() {
    const container = document.getElementById('page-weekly-business');

    const today = new Date();
    const currentMonth = today.toLocaleString('zh-TW', { month: 'long' });
    const weekOfMonth = Math.ceil(today.getDate() / 7);
    const todayInfo = `<p class="current-date-info">今天是：${today.toLocaleDateString('zh-TW')}，${currentMonth}第 ${weekOfMonth} 週</p>`;

    let html = `
        <div class="dashboard-widget">
            <div class="widget-header">
                <div>
                    <h2 class="widget-title">週間業務總覽</h2>
                    ${todayInfo}
                </div>
                <button class="action-btn primary" onclick="showAddWeekModal()">＋ 編輯/新增週次紀錄</button>
            </div>
            <div class="widget-content">
    `;

    const currentWeekId = getWeekIdForDate(new Date());

    if (allWeeksSummary.length === 0) {
        html += '<div class="alert alert-info" style="text-align:center;">尚無任何業務週報，請點擊右上角新增</div>';
    } else {
        html += '<div class="week-list">';
        // 【關鍵修正】列表點擊：使用 CRM_APP.navigateTo 導航至帶參數的詳情頁
        allWeeksSummary.forEach(week => {
            const isCurrent = week.id === currentWeekId;
            const currentWeekLabel = isCurrent ? '<span class="current-week-label">(本週)</span>' : '';

            html += `
                <div class="week-list-item ${isCurrent ? 'current-week' : ''}" onclick="CRM_APP.navigateTo('weekly-detail', { weekId: '${week.id}' })">
                    <div class="week-info">
                        <div class="week-title">${week.title} ${currentWeekLabel}</div>
                        <div class="week-daterange">${week.dateRange}</div>
                    </div>
                    <div class="week-entry-count">${week.summaryCount} 筆摘要</div>
                    <div class="week-arrow">›</div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div></div>';
    container.innerHTML = html;

    // --- 樣式注入部分保持不變 ---
    if (!document.getElementById('weekly-business-styles')) {
        const style = document.createElement('style');
        style.id = 'weekly-business-styles';
        style.innerHTML = `
            .current-date-info { color: var(--text-primary); margin-top: 5px; font-size: 1.1rem; font-weight: 600; }
            .week-list-item { display: flex; align-items: center; padding: 1.25rem 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background-color 0.2s ease; border-left: 4px solid transparent; }
            .week-list-item:hover { background-color: var(--glass-bg); }
            .week-list-item.current-week { border-left-color: var(--accent-green); background-color: rgba(34, 197, 94, 0.05); }
            .week-info { flex: 1; }
            .week-title { font-weight: 600; }
            .current-week-label { color: var(--accent-green); font-size: 0.85em; font-weight: 700; margin-left: 8px; }
            .week-daterange { color: var(--text-muted); font-size: 0.9rem; margin-top: 4px; }
            .week-entry-count { font-size: 0.9rem; background: var(--primary-bg); padding: 4px 10px; border-radius: 1rem; }
            .week-arrow { font-size: 1.5rem; color: var(--text-muted); margin-left: 1rem; }
        `;
        document.head.appendChild(style);
    }
}

/**
 * 【優化】導航到指定週次的詳細頁面 (呼叫優化後的 API)
 *
 * 【修正重點】此函式由 CRM_APP.navigateTo 呼叫，專注於資料獲取和渲染，不能再呼叫 CRM_APP.navigateTo。
 */
async function navigateToWeeklyDetail(weekId) {
    // *** 這裡不應再呼叫 CRM_APP.navigateTo，否則會造成循環 (已修正) ***
    
    const container = document.getElementById('page-weekly-business');
    container.innerHTML = `<div class="loading show"><div class="spinner"></div><p>正在載入 ${weekId} 的週報詳情中...</p></div>`;

    try {
        const result = await authedFetch(`/api/business/weekly/details/${weekId}`);
        if (!result.success) throw new Error(result.error || `無法載入 ${weekId} 的資料`);

        currentWeekData = result.data; // data 現在包含 entries 和帶有 holidayName 的 days
        
        // 2. 更新標題 (必須在這裡手動更新，因為這是頁面載入函式)
        const weekTitle = `${currentWeekData.title} ${currentWeekData.dateRange}`;
        document.getElementById('page-title').textContent = '週間業務詳情';
        document.getElementById('page-subtitle').textContent = weekTitle;

        renderWeeklyDetailView(); // 使用獲取的詳細資料渲染畫面
    } catch (error) {
       if (error.message !== 'Unauthorized') {
            container.innerHTML = `<div class="alert alert-error">載入週報詳情失敗: ${error.message}</div>`;
        }
    }
}

/**
 * 渲染週間業務的詳細/編輯模式畫面 (格子視圖)
 */
function renderWeeklyDetailView() {
    const container = document.getElementById('page-weekly-business');

    const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
    const pageTitle = (systemConfig['頁面標題']?.find(item => item.value === '週間業務標題')?.note) || '週間業務重點摘要';
    const themes = systemConfig['週間業務主題'] || [{value: 'IoT', note: 'IoT'}, {value: 'DT', note: 'DT'}];

    const daysData = {};
    // currentWeekData.days 現在已包含 holidayName
    currentWeekData.days.forEach(day => {
        daysData[day.dayIndex] = {};
        themes.forEach(theme => {
            // currentWeekData.entries 是該週的詳細紀錄
            daysData[day.dayIndex][theme.value] = currentWeekData.entries.filter(e => e.day == day.dayIndex && e.category === theme.value);
        });
    });

    let newWeekNotice = currentWeekData.entries.length === 0 ? `<div class="alert alert-info">這是新的空白週報，請點擊下方的「+ 新增紀錄」按鈕來建立第一筆內容。</div>` : '';

    const prevWeekId = getAdjacentWeekId(currentWeekData.id, -1);
    const nextWeekId = getAdjacentWeekId(currentWeekData.id, 1);

    const todayString = new Date().toISOString().split('T')[0];

    let html = `
        <div class="dashboard-widget">
            <div class="widget-header">
                <div>
                    <h2 class="widget-title">${pageTitle}</h2>
                    <p style="color: var(--text-secondary); margin-top: 5px; font-size: 1.2rem; font-weight: 600;">${currentWeekData.title} ${currentWeekData.dateRange}</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="action-btn secondary" onclick="CRM_APP.navigateTo('weekly-detail', { weekId: '${prevWeekId}' })">< 上一週</button>
                    <button class="action-btn secondary" onclick="CRM_APP.navigateTo('weekly-business')">返回總覽</button>
                    <button class="action-btn secondary" onclick="CRM_APP.navigateTo('weekly-detail', { weekId: '${nextWeekId}' })">下一週 ></button>
                </div>
            </div>
            <div class="widget-content">
                ${newWeekNotice}
                <div class="weekly-detail-grid">
                    <div class="grid-header"></div>
                    ${themes.map(theme => `<div class="grid-header">${theme.note}</div>`).join('')}

                    ${currentWeekData.days.map(dayInfo => {
                        const isHoliday = !!dayInfo.holidayName;
                        const holidayClass = isHoliday ? 'is-holiday' : '';
                        const holidayNameHtml = isHoliday ? `<span class="holiday-name">${dayInfo.holidayName}</span>` : '';

                        const isToday = dayInfo.date === todayString;
                        const todayClass = isToday ? 'is-today' : '';
                        const todayIndicator = isToday ? '<span class="today-indicator">今天</span>' : '';

                        return `
                            <div class="grid-day-label ${holidayClass} ${todayClass}">
                                ${['週一', '週二', '週三', '週四', '週五'][dayInfo.dayIndex - 1]}<br>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">(${dayInfo.displayDate})</span>
                                ${holidayNameHtml}
                                ${todayIndicator}
                            </div>
                            ${themes.map(theme => `
                                <div class="grid-cell ${holidayClass} ${todayClass}" id="cell-${dayInfo.dayIndex}-${theme.value}">
                                    ${renderCellContent(daysData[dayInfo.dayIndex][theme.value], dayInfo, theme)}
                                </div>
                            `).join('')}
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;

    // --- 樣式注入部分保持不變 ---
    if (!document.getElementById('weekly-detail-styles')) {
        const style = document.createElement('style');
        style.id = 'weekly-detail-styles';
        style.innerHTML = `
            .weekly-detail-grid { display: grid; grid-template-columns: 100px repeat(${themes.length}, 1fr); gap: 8px; }
            .grid-header, .grid-day-label { padding: 10px; font-weight: 600; text-align: center; background-color: var(--primary-bg); border-radius: 8px; line-height: 1.4; position: relative; } /* Added position relative */
            .grid-cell { background-color: var(--primary-bg); border-radius: 8px; padding: 10px; min-height: 120px; display: flex; flex-direction: column; gap: 8px; }
            /* Style adjustments for holiday/today indicators */
            .grid-day-label.is-holiday { background: color-mix(in srgb, var(--accent-red) 10%, var(--primary-bg)); }
            .holiday-name { display: block; font-size: 0.75rem; font-weight: 700; color: var(--accent-red); margin-top: 4px; }
            .grid-day-label.is-today { background: color-mix(in srgb, var(--accent-blue) 10%, var(--primary-bg)); border: 1px solid var(--accent-blue); }
            .today-indicator { display: block; font-size: 0.8rem; font-weight: 700; color: var(--accent-blue); margin-top: 4px; }
            .grid-cell.is-holiday { background: color-mix(in srgb, var(--accent-red) 10%, var(--primary-bg)); }
            .grid-cell.is-today { background: color-mix(in srgb, var(--accent-blue) 10%, var(--primary-bg)); border: 1px solid var(--accent-blue); }
            /* Entry card styles */
            .entry-card-read { position: relative; background: var(--secondary-bg); padding: 8px; border-radius: 4px; border-left: 3px solid var(--accent-blue); margin-bottom: 8px; /* Add margin between cards */ }
            .entry-card-read.category-iot { border-left-color: var(--accent-blue); }
            .entry-card-read.category-dt { border-left-color: var(--accent-purple); }
            .entry-card-read .edit-btn { position: absolute; top: 5px; right: 5px; display: none; padding: 2px 6px; }
            .entry-card-read:hover .edit-btn { display: block; }
            .entry-card-topic { font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; /* Reduce margin */ }
            .entry-card-participants { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; /* Add margin */ }
            .entry-card-summary { font-size: 0.85rem; white-space: pre-wrap; margin-top: 5px; color: var(--text-secondary); }
            .add-entry-btn { background: transparent; border: 1px dashed var(--border-color); color: var(--text-muted); width: 100%; padding: 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; margin-top: auto; }
            .add-entry-btn:hover { background: var(--glass-bg); color: var(--text-primary); }
            .participants-checkbox-group { display: flex; flex-direction: column; gap: 5px; max-height: 120px; overflow-y: auto; background: var(--primary-bg); padding: 8px; border-radius: 4px; }
        `;
        document.head.appendChild(style);
    }
}


// --- renderCellContent 保持不變 ---
function renderCellContent(entries, dayInfo, theme) {
    let contentHtml = entries.map(entry => {
        // 確保 entry 存在且有 recordId
        if (!entry || !entry.recordId) {
            console.warn("Skipping invalid entry in renderCellContent:", entry);
            return '';
        }
        const entryJsonString = JSON.stringify(entry).replace(/'/g, "&apos;");
        // category 可能不存在，給予預設值
        const categoryClass = entry.category ? `category-${entry.category.toLowerCase()}` : '';
        return `
            <div class="entry-card-read ${categoryClass}" id="entry-${entry.recordId}">
                <button class="action-btn small warn edit-btn" onclick='openWeeklyBusinessEditorPanel(${JSON.stringify(dayInfo)}, ${JSON.stringify(theme)}, ${entryJsonString})'>✏️</button>
                <div class="entry-card-topic">${entry['主題'] || '無主題'}</div>
                <div class="entry-card-participants">👤 ${entry['參與人員'] || '無'}</div>
                ${entry['重點摘要'] ? `<div class="entry-card-summary">${entry['重點摘要']}</div>` : ''}
            </div>
        `;
    }).join('');
    contentHtml += `<button class="add-entry-btn" onclick='openWeeklyBusinessEditorPanel(${JSON.stringify(dayInfo)}, ${JSON.stringify(theme)}, null)'>+ 新增紀錄</button>`;
    return contentHtml;
}

// --- openWeeklyBusinessEditorPanel 保持不變 ---
function openWeeklyBusinessEditorPanel(dayInfo, theme, entry) {
    const isNew = !entry;
    const panelContainer = document.getElementById('slide-out-panel-container');
    const backdrop = document.getElementById('panel-backdrop');

    let participantsCheckboxes = '';
    const selectedParticipants = isNew ? new Set() : new Set((entry?.['參與人員'] || '').split(',').map(p => p.trim()).filter(Boolean)); // 安全取值

    const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
    if (systemConfig['團隊成員']) {
        systemConfig['團隊成員'].forEach(member => {
            const checked = selectedParticipants.has(member.note) ? 'checked' : '';
            participantsCheckboxes += `
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <input type="checkbox" name="participants" value="${member.note}" ${checked}>
                    ${member.note}
                </label>
            `;
        });
    }

    const panelHTML = `
        <div class="slide-out-panel" id="weekly-business-editor-panel">
            <div class="panel-header">
                <h2 class="panel-title">${isNew ? '新增' : '編輯'}紀錄</h2>
                <button class="close-btn" onclick="closeWeeklyBusinessEditorPanel()">&times;</button>
            </div>
            <div class="panel-content">
                <form id="wb-panel-form">
                    <p style="background:var(--primary-bg); padding: 8px; border-radius: 4px; margin-bottom: 1rem;">
                        <strong>日期:</strong> ${dayInfo.date} (${theme.note})
                    </p>
                    <input type="hidden" name="recordId" value="${isNew ? '' : entry?.recordId}">
                    <input type="hidden" name="rowIndex" value="${isNew ? '' : entry?.rowIndex}">
                    <input type="hidden" name="date" value="${dayInfo.date}">
                    <input type="hidden" name="category" value="${theme.value}">
                    <div class="form-group">
                        <label class="form-label">主題 *</label>
                        <input type="text" name="topic" class="form-input" required value="${isNew ? '' : (entry?.['主題'] || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">參與人員</label>
                        <div class="participants-checkbox-group">${participantsCheckboxes}</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">重點摘要</label>
                        <textarea name="summary" class="form-textarea" rows="5">${isNew ? '' : (entry?.['重點摘要'] || '')}</textarea>
                    </div>
                     <div class="form-group">
                        <label class="form-label">待辦事項</label>
                        <textarea name="actionItems" class="form-textarea" rows="3">${isNew ? '' : (entry?.['待辦事項'] || '')}</textarea>
                    </div>
                    <div class="btn-group">
                         ${!isNew && entry ? `<button type="button" class="action-btn danger" style="margin-right: auto;" onclick="confirmDeleteWeeklyBusinessEntry('${entry.recordId}', '${entry.rowIndex}', '${(entry['主題'] || '').replace(/'/g, "\\'")}')">刪除</button>` : ''}
                        <button type="button" class="action-btn secondary" onclick="closeWeeklyBusinessEditorPanel()">取消</button>
                        <button type="submit" class="submit-btn">儲存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    panelContainer.innerHTML = panelHTML;

    document.getElementById('wb-panel-form').addEventListener('submit', handleSaveWeeklyEntry);

    requestAnimationFrame(() => {
        if(backdrop) backdrop.classList.add('is-open');
        const editorPanel = document.getElementById('weekly-business-editor-panel');
        if(editorPanel) editorPanel.classList.add('is-open');
    });
     if(backdrop) backdrop.onclick = closeWeeklyBusinessEditorPanel;
}

// --- closeWeeklyBusinessEditorPanel 保持不變 ---
function closeWeeklyBusinessEditorPanel() {
    const panel = document.getElementById('weekly-business-editor-panel');
    const backdrop = document.getElementById('panel-backdrop');
    if (panel) panel.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    // Optional: Add a delay before clearing content if needed for animation
    // setTimeout(() => {
    //     const panelContainer = document.getElementById('slide-out-panel-container');
    //     if(panelContainer) panelContainer.innerHTML = '';
    // }, 400); // Match transition duration
}

// --- handleSaveWeeklyEntry (移除本地渲染呼叫) ---
async function handleSaveWeeklyEntry(event) {
    event.preventDefault();
    const form = event.target;

    const recordId = form.querySelector('[name="recordId"]').value;
    const isNew = !recordId;

    const selectedParticipants = Array.from(form.querySelectorAll('[name="participants"]:checked')).map(cb => cb.value);

    const entryData = {
        date: form.querySelector('[name="date"]').value,
        category: form.querySelector('[name="category"]').value,
        topic: form.querySelector('[name="topic"]').value,
        participants: selectedParticipants.join(','),
        summary: form.querySelector('[name="summary"]').value,
        actionItems: form.querySelector('[name="actionItems"]').value,
        rowIndex: form.querySelector('[name="rowIndex"]').value
    };

    if (!entryData.topic) {
        showNotification('主題為必填項目', 'warning');
        return;
    }

    showLoading('正在儲存...');
    try {
        const url = isNew ? '/api/business/weekly' : `/api/business/weekly/${recordId}`;
        const method = isNew ? 'POST' : 'PUT';
        const result = await authedFetch(url, { method, body: JSON.stringify(entryData) });
        if (!result.success) throw new Error(result.error || '儲存失敗');

        // *** 關鍵修改：刪除所有本地狀態更新和本地渲染呼叫 ***

        closeWeeklyBusinessEditorPanel();
        // 刷新邏輯將由 authedFetch (utils.js) 處理

        // 【*** 移除衝突 ***】
        // 移除下方的 authedFetch 呼叫，因為 authedFetch 已經會觸發 location.reload()，
        // 頁面重載後自然會抓取最新的摘要。
        // authedFetch(`/api/business/weekly/summary`)
        //     .then(res => { if (res.success) { allWeeksSummary = res.data || []; }})
        //     .catch(err => console.warn("Failed to refresh summary cache after save:", err));
        // 【*** 移除結束 ***】


    } catch (error) {
        if (error.message !== 'Unauthorized') showNotification(`儲存失敗: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}


// ==================== 輔助函式 (保持不變) ====================
function getWeekIdForDate(d) {
    // 確保傳入的是 Date 物件
     if (!(d instanceof Date)) {
        try {
            d = new Date(d);
            if (isNaN(d.getTime())) throw new Error();
        } catch {
            d = new Date(); // Fallback to current date if input is invalid
            console.warn("Invalid date passed to getWeekIdForDate, using current date.");
        }
    }
    // 使用 UTC 日期計算，避免時區問題
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // 將日期移至週四 (ISO 8601 週定義)
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // 當年的第一天
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // 計算週數
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

function getAdjacentWeekId(currentWeekId, direction) {
    const [year, week] = currentWeekId.split('-W').map(Number);
    // 計算該週第一天的近似 UTC 日期
    const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    // 根據方向調整日期 (加/減 7 天)
    d.setUTCDate(d.getUTCDate() + (7 * direction));
    // 使用 getWeekIdForDate 重新計算調整後日期的週次 ID
    return getWeekIdForDate(d);
}

function confirmDeleteWeeklyBusinessEntry(recordId, rowIndex, topic) {
    const message = `您確定要永久刪除這筆業務紀錄嗎？\n\n主題：${topic}`;
    showConfirmDialog(message, async () => {
        showLoading('正在刪除...');
        try {
            const result = await authedFetch(`/api/business/weekly/${recordId}`, {
                method: 'DELETE',
                body: JSON.stringify({ rowIndex: rowIndex }) // 傳遞 rowIndex 給後端
            });

            if (result.success) {
                // *** 關鍵修改：刪除所有本地狀態更新和本地渲染呼叫 ***
                closeWeeklyBusinessEditorPanel();
                // 刷新邏輯將由 authedFetch (utils.js) 處理

                // 【*** 移除衝突 ***】
                // 移除下方的 authedFetch 呼叫，因為 authedFetch 已經會觸發 location.reload()。
                // authedFetch(`/api/business/weekly/summary`)
                //     .then(res => { if (res.success) { allWeeksSummary = res.data || []; }})
                //     .catch(err => console.warn("Failed to refresh summary cache after delete:", err));
                // 【*** 移除結束 ***】
            } else {
                throw new Error(result.details || '刪除失敗');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') showNotification(`刪除失敗: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    });
}

// --- showAddWeekModal 保持不變 ---
async function showAddWeekModal() {
    const today = new Date();
    const prevWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const currentWeekId = getWeekIdForDate(today);

    // 【修改】從全域變數 allWeeksSummary (現在是摘要) 獲取已存在的週次 ID
    const existingWeekIds = new Set(allWeeksSummary.map(w => w.id));

    const weekOptions = [
        { id: getWeekIdForDate(prevWeek), label: '上一週' },
        { id: currentWeekId, label: '本週' },
        { id: getWeekIdForDate(nextWeek), label: '下一週' }
    ];

    let optionsHtml = '';
    weekOptions.forEach(opt => {
        const disabled = existingWeekIds.has(opt.id);
        const selected = opt.id === currentWeekId ? 'selected' : '';
        optionsHtml += `<option value="${opt.id}" ${disabled ? 'disabled' : ''} ${selected}>${opt.label} ${disabled ? '(已有紀錄)' : ''}</option>`;
    });

    const modalContainer = document.getElementById('modal-container');
    const existingModal = document.getElementById('add-week-modal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="add-week-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">選擇週次</h2>
                    <button class="close-btn" onclick="document.getElementById('add-week-modal')?.remove()">&times;</button>
                </div>
                <div class="form-group">
                    <label class="form-label">請選擇要編輯或新增紀錄的週次：</label>
                    <div class="select-wrapper">
                        <select id="add-week-select" class="form-select">${optionsHtml}</select>
                    </div>
                </div>
                <button class="submit-btn" onclick="confirmAddWeek()">前往</button>
            </div>
        </div>
    `;
    modalContainer.insertAdjacentHTML('beforeend', modalHtml);
}

// --- confirmAddWeek (修正導航頁面) ---
function confirmAddWeek() {
    const select = document.getElementById('add-week-select');
    if (!select) return;
    const selectedWeekId = select.value;
    if (selectedWeekId) {
        closeModal('add-week-modal'); // Use closeModal
        // *** 關鍵修正：使用 CRM_APP.navigateTo 導航到 'weekly-detail' 頁面 ***
        CRM_APP.navigateTo('weekly-detail', { weekId: selectedWeekId }); // 導航到詳細頁面
    }
}


// --- 向主應用程式註冊此模組的載入函式 (保持不變) ---
if (window.CRM_APP) {
    window.CRM_APP.pageModules['weekly-business'] = loadWeeklyBusinessPage;
    window.CRM_APP.pageModules['weekly-detail'] = navigateToWeeklyDetail;
}