// views/scripts/opportunity-details/opportunity-details-components.js
// 職責：整合機會詳細頁面中所有「純顯示」與「可編輯資訊卡」的組件

/**
 * 【修改】為新的機會資訊卡片注入「雙欄佈局」專屬樣式
 */
function _injectStylesForOppInfoCard() {
    const styleId = 'opportunity-info-card-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .opportunity-info-card {
            background-color: var(--secondary-bg);
            padding: var(--spacing-6);
            border-radius: var(--rounded-xl);
            border: 1px solid var(--border-color);
            margin-bottom: var(--spacing-6);
        }
        .info-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: var(--spacing-4);
            margin-bottom: var(--spacing-4);
            border-bottom: 1px solid var(--border-color);
        }
        
        /* --- 【新增】卡片主體雙欄佈局 --- */
        .info-card-body-grid {
            display: grid;
            grid-template-columns: 1fr 1fr; /* 左右 1:1 雙欄 */
            gap: var(--spacing-6) var(--spacing-8);
        }
        .info-col-left, .info-col-right {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-5); /* 欄位內的垂直間距 */
        }
        @media (max-width: 900px) {
            .info-card-body-grid {
                grid-template-columns: 1fr; /* 在小螢幕上變回單欄 */
            }
        }
        /* --- 【新增結束】 --- */

        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-item .info-label {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--spacing-2);
            font-weight: 500;
        }
        .info-item .info-value {
            font-size: var(--font-size-base);
            font-weight: 600;
            color: var(--text-secondary);
            white-space: pre-wrap;
            word-break: break-word;
        }
        .info-item .info-value a {
            color: var(--accent-blue);
            text-decoration: none;
        }
        .info-item .info-value a:hover {
            text-decoration: underline;
        }

        /* 【新增】價值高亮樣式 */
        .info-item.value-highlight .info-value {
            font-size: var(--font-size-xl);
            font-weight: 700;
            color: var(--accent-green);
        }
        
        /* 【新增】用於種類/來源的標籤樣式 */
        .info-tag-value {
            display: inline-block;
            padding: 6px 14px;
            border-radius: var(--rounded-full);
            font-size: var(--font-size-sm);
            font-weight: 600;
            background-color: var(--primary-bg);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            width: fit-content;
        }
        /* 帶有顏色的標籤 */
        .info-tag-value[data-color] {
            /* 使用 CSS 變數 --brand-color (在 render 時傳入) */
            background-color: color-mix(in srgb, var(--brand-color, var(--text-muted)) 20%, transparent);
            color: var(--brand-color, var(--text-muted));
            border-color: var(--brand-color, var(--text-muted));
        }


        .notes-section {
            grid-column: 1 / -1; /* 橫跨兩欄 */
            margin-top: var(--spacing-5);
            padding-top: var(--spacing-5);
            border-top: 1px solid var(--border-color);
        }

        /* 藥丸式選項樣式 (銷售情報) */
        .info-options-item {
            display: flex;
            flex-direction: column; /* 【修改】改為垂直，標籤在上方 */
            gap: var(--spacing-3); /* 標籤和選項組的間距 */
        }
        .info-options-label {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            font-weight: 500;
            flex-shrink: 0;
            /* 移除固定寬度 */
        }
        .info-options-group {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-2);
        }
        .info-option {
            padding: 6px 14px;
            border-radius: var(--rounded-full);
            font-size: var(--font-size-sm);
            font-weight: 500;
            background-color: var(--primary-bg);
            color: var(--text-muted);
            border: 1px solid var(--border-color);
            transition: all 0.2s ease;
        }
        .info-option.selected {
            background-color: color-mix(in srgb, var(--accent-green) 20%, transparent);
            color: var(--accent-green);
            border-color: var(--accent-green);
            font-weight: 600;
            box-shadow: 0 0 10px color-mix(in srgb, var(--accent-green) 20%, transparent);
        }
        
        /* 編輯模式下的 Checkbox 群組樣式 */
        .checkbox-option-group {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: var(--spacing-3);
            background: var(--primary-bg);
            padding: var(--spacing-4);
            border-radius: var(--rounded-lg);
        }
        .checkbox-option-group label {
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
            cursor: pointer;
        }
        .checkbox-option-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: var(--accent-blue);
        }
    `;
    document.head.appendChild(style);
}


// 1. 頂部資訊卡片模組 (已升級為包含檢視與編輯模式)
const OpportunityInfoCard = (() => {

    // 渲染主函式，會根據模式呼叫對應的渲染函式
    function render(opp) {
        _injectStylesForOppInfoCard();
        const container = document.getElementById('opportunity-info-card-container');
        if (!container) return;

        container.innerHTML = `
            <div id="opportunity-info-display-mode">
                ${_renderDisplayMode(opp)}
            </div>
            <div id="opportunity-info-edit-mode" style="display: none;">
                ${_renderEditMode(opp)}
            </div>
        `;
    }

    // 【修改】輔助函式：渲染藥丸式選項組，使其支援複選
    function _renderOptionsGroup(configKey, selectedValue, label) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const options = systemConfig[configKey] || [];

        // 將 selectedValue (可能是字串) 轉為 Set 以方便查找
        const selectedSet = new Set(
            (selectedValue || '').split(',').map(s => s.trim()).filter(Boolean)
        );

        if (options.length === 0) {
             // 如果沒有設定選項，且有值，則直接顯示原始值
             if (selectedValue) {
                 return `
                    <div class="info-options-item">
                        <div class="info-options-label">${label}</div>
                        <div class="info-value">${selectedValue}</div>
                    </div>
                `;
             } else {
                 // 如果沒有設定選項且沒有值，顯示 '-'
                 return `
                    <div class="info-options-item">
                        <div class="info-options-label">${label}</div>
                        <div class="info-value">-</div>
                    </div>
                 `;
             }
        }

        const optionsHtml = options.map(opt => `
            <span class="info-option ${selectedSet.has(opt.value) ? 'selected' : ''}">
                ${opt.note}
            </span>
        `).join('');

        // 如果選項都有對應到，但是選項組是空的（代表所有選項都沒被選中），則顯示 '-'
        // 【修改】如果沒有任何選中的，就顯示 '-'
        const renderedContent = optionsHtml.includes('selected') ? optionsHtml : '-';


        return `
            <div class="info-options-item">
                <div class="info-options-label">${label}</div>
                <div class="info-options-group">${renderedContent}</div>
            </div>
        `;
    }


    // 渲染「檢視模式」的 HTML
    function _renderDisplayMode(opp) {
        const systemConfig = window.CRM_APP ? window.CRM_APP.systemConfig : {};
        const getNote = (configKey, value) => (systemConfig[configKey] || []).find(i => i.value === value)?.note || value || '-';
        
        // 【新增】獲取種類的顏色和備註
        const typeConfig = (systemConfig['機會種類'] || []).find(i => i.value === opp.opportunityType);
        const typeColor = typeConfig?.color || 'var(--text-muted)';
        const typeNote = typeConfig?.note || opp.opportunityType || '-';

        const sourceNote = getNote('機會來源', opp.opportunitySource);

        const encodedCompanyName = encodeURIComponent(opp.customerCompany);
        // Helper function to format currency or return '-'
        const formatCurrency = (value) => {
            if (!value) return '-';
            const num = parseFloat(String(value).replace(/,/g, ''));
            if (isNaN(num)) return '-';
            return num.toLocaleString('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 });
        };
        // Helper function to format date or return '-'
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                // Check if the date is valid and not the Unix epoch start which might indicate an empty or default date
                if (isNaN(date.getTime()) || date.getTime() === 0) return '-';
                // Format as YYYY-MM-DD
                return date.toISOString().split('T')[0];
            } catch (e) {
                return '-'; // Return '-' if date parsing fails
            }
        };

        // 【修改】使用新的雙欄佈局
        return `
            <div class="info-card-header">
                <h2 class="widget-title" style="margin: 0;">機會核心資訊</h2>
                <button class="action-btn small warn" onclick="OpportunityInfoCardEvents.toggleEditMode(true)">✏️ 編輯</button>
            </div>

            <div class="info-card-body-grid">
                
                <div class="info-col-left">
                    <div class="info-item">
                        <span class="info-label">客戶公司</span>
                        <span class="info-value"><a href="#" onclick="event.preventDefault(); CRM_APP.navigateTo('company-details', { companyName: '${encodedCompanyName}' })">${opp.customerCompany}</a></span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">負責業務</span>
                        <span class="info-value">${opp.assignee}</span>
                    </div>
                    <div class="info-item value-highlight">
                        <span class="info-label">機會價值</span>
                        <span class="info-value">${formatCurrency(opp.opportunityValue)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">預計結案日期</span>
                        <span class="info-value">${formatDate(opp.expectedCloseDate)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">機會種類</span>
                        <span class="info-tag-value" data-color style="--brand-color: ${typeColor};">${typeNote}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">機會來源</span>
                        <span class="info-tag-value">${sourceNote}</span>
                    </div>
                </div>

                <div class="info-col-right">
                    ${_renderOptionsGroup('下單機率', opp.orderProbability, '下單機率')}
                    ${_renderOptionsGroup('可能下單規格', opp.potentialSpecification, '可能下單規格')}
                    ${_renderOptionsGroup('可能銷售管道', opp.salesChannel, '可能銷售管道')}
                    ${_renderOptionsGroup('設備規模', opp.deviceScale, '設備規模')}
                </div>

                <div class="notes-section">
                    <div class="info-item">
                        <span class="info-label">備註</span>
                        <span class="info-value">${opp.notes || '-'}</span>
                    </div>
                </div>

            </div>
        `;
    }

    // 渲染「編輯模式」的 HTML 骨架
    function _renderEditMode(opp) {
        // 實際的表單內容將由 events.js 動態填入，這裡只提供骨架
        return `
            <div class="info-card-header">
                <h2 class="widget-title" style="margin: 0;">編輯核心資訊</h2>
                <div>
                    <button class="action-btn small secondary" onclick="OpportunityInfoCardEvents.toggleEditMode(false)">取消</button>
                    <button class="action-btn small primary" onclick="OpportunityInfoCardEvents.save()">💾 儲存</button>
                </div>
            </div>
            <div id="opportunity-info-edit-form-container">
                <div class="loading show"><div class="spinner"></div></div>
            </div>
        `;
    }

    return { render };
})();


// 2. 關聯機會模組 (母/子機會)
const OpportunityAssociatedOpps = (() => {
    function render(details) {
        const container = document.getElementById('associated-opportunities-list');
        if (!container) return;

        const { opportunityInfo, parentOpportunity, childOpportunities } = details;
        let html = '';

        if (parentOpportunity) {
            html += `
                <div class="summary-item" style="margin-bottom: 1rem;">
                    <span class="summary-label">母機會</span>
                    <span class="summary-value" style="font-size: 1rem;">
                        <a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${parentOpportunity.opportunityId}' })">${parentOpportunity.opportunityName}</a>
                    </span>
                </div>
            `;
        } else {
             // 只有在沒有母機會時才顯示按鈕
            const addButton = document.getElementById('add-associated-opportunity-btn');
            if (addButton) {
                addButton.textContent = '+ 設定母機會';
                addButton.onclick = () => showLinkOpportunityModal(opportunityInfo.opportunityId, opportunityInfo.rowIndex);
                addButton.style.display = 'flex'; // 確保按鈕可見
            }
        }

        if (childOpportunities && childOpportunities.length > 0) {
            html += `<div class="summary-item"><span class="summary-label">子機會 (${childOpportunities.length})</span></div>`;
            html += `<ul style="list-style: none; padding-left: 1rem; margin-top: 0.5rem;">`;
            childOpportunities.forEach(child => {
                html += `<li style="margin-bottom: 0.5rem;"><a href="#" class="text-link" onclick="event.preventDefault(); CRM_APP.navigateTo('opportunity-details', { opportunityId: '${child.opportunityId}' })">${child.opportunityName}</a></li>`;
            });
            html += `</ul>`;
        }

        if (!html && !parentOpportunity) { // 如果沒有母機會也沒有子機會，才顯示提示
            html = '<div class="alert alert-info">尚無關聯機會。</div>';
        } else if (!html && parentOpportunity) {
             // 如果有母機會但沒有子機會，不顯示任何內容（只顯示母機會）
        }


        container.innerHTML = html;

        // 確保在有母機會時隱藏按鈕
        const addButton = document.getElementById('add-associated-opportunity-btn');
        if (addButton && parentOpportunity) {
            addButton.style.display = 'none';
        }
    }
    return { render };
})();