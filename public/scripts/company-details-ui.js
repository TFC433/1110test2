// views/scripts/company-details-ui.js
// 職責：渲染「公司詳細資料頁」的所有UI元件

/**
 * 為新的公司資訊卡片注入專屬樣式
 */
function _injectStylesForInfoCard() {
    const styleId = 'company-info-card-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .company-info-card {
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
            margin-bottom: var(--spacing-4);
            padding-bottom: var(--spacing-4);
            border-bottom: 1px solid var(--border-color);
        }
        .core-info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: var(--spacing-6);
            text-align: center;
            margin-bottom: var(--spacing-5);
            padding-bottom: var(--spacing-5);
            border-bottom: 1px solid var(--border-color);
        }
        .core-info-item .info-label {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--spacing-2);
            font-weight: 500;
        }
        .core-info-item .info-value {
            font-size: var(--font-size-lg);
            font-weight: 700;
            color: var(--text-primary);
        }
        .company-introduction-section .info-label {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--spacing-3);
            font-weight: 500;
        }
        .company-introduction-content {
            font-size: var(--font-size-base);
            color: var(--text-secondary);
            line-height: 1.7;
            white-space: pre-wrap;
            max-height: 6em; /* 約 3-4 行 */
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }
        .company-introduction-content.expanded {
            max-height: 1000px; /* 展開後的高度 */
        }
        .toggle-intro-btn {
            background: none;
            border: none;
            color: var(--accent-blue);
            cursor: pointer;
            font-weight: 600;
            margin-top: var(--spacing-2);
            padding: 0;
        }
        .additional-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--spacing-4);
            margin-top: var(--spacing-5);
            padding-top: var(--spacing-5);
            border-top: 1px solid var(--border-color);
        }
        .additional-info-item {
            display: flex;
            flex-direction: column;
        }
        .additional-info-item .info-label {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--spacing-1);
        }
        .additional-info-item .info-value {
            font-size: var(--font-size-base);
            color: var(--text-secondary);
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
}


/**
 * 渲染公司基本資訊卡片 (V2 - 新版設計)
 * @param {object} companyInfo - 公司資料物件
 * @returns {string} HTML 字串
 */
function renderCompanyInfoCard(companyInfo) {
    _injectStylesForInfoCard(); // 注入樣式

    if (!companyInfo) return `<div class="company-info-card"><div class="alert alert-warning">找不到公司基本資料</div></div>`;

    const encodedCompanyName = encodeURIComponent(companyInfo.companyName);
    
    if (companyInfo.isPotential) {
        return `
        <div class="company-info-card">
             <div class="widget-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
                <h2 class="widget-title">公司基本資料 (潛在)</h2>
             </div>
             <div class="alert alert-info">此公司來自潛在客戶名單，尚未建立正式檔案。請先將其任一潛在聯絡人升級為機會案件，系統將自動建立公司檔案。</div>
        </div>`;
    }
    
    const systemConfig = window.CRM_APP.systemConfig;
    const getNote = (configKey, value) => (systemConfig[configKey] || []).find(i => i.value === value)?.note || value || '-';
    
    const typeName = getNote('公司類型', companyInfo.companyType);
    const stageName = getNote('客戶階段', companyInfo.customerStage);
    const ratingName = getNote('互動評級', companyInfo.engagementRating);

    const introductionContent = companyInfo.introduction || '尚無公司簡介。';
    const needsToggle = introductionContent.split('\n').length > 3 || introductionContent.length > 150;

    return `
        <div class="company-info-card" id="company-info-card-container">
            <div id="company-info-display-mode">
                <div class="info-card-header">
                    <h2 class="widget-title" style="margin: 0;">${companyInfo.companyName}</h2>
                    <div id="company-info-buttons">
                        <button class="action-btn small warn" onclick="toggleCompanyEditMode(true)">✏️ 編輯</button>
                    </div>
                </div>

                <div class="core-info-grid">
                    <div class="core-info-item">
                        <div class="info-label">公司類型</div>
                        <div class="info-value">${typeName}</div>
                    </div>
                    <div class="core-info-item">
                        <div class="info-label">客戶階段</div>
                        <div class="info-value">${stageName}</div>
                    </div>
                    <div class="core-info-item">
                        <div class="info-label">互動評級</div>
                        <div class="info-value">${ratingName}</div>
                    </div>
                </div>

                <div class="company-introduction-section">
                    <div class="info-label">公司簡介</div>
                    <div class="company-introduction-content" id="intro-content">${introductionContent}</div>
                    ${needsToggle ? `<button id="toggle-intro-btn" class="toggle-intro-btn" onclick="toggleIntroduction(this)">...顯示更多</button>` : ''}
                </div>

                <div class="additional-info-grid">
                    <div class="additional-info-item">
                        <div class="info-label">電話</div>
                        <div class="info-value">${companyInfo.phone || '-'}</div>
                    </div>
                     <div class="additional-info-item">
                        <div class="info-label">縣市</div>
                        <div class="info-value">${companyInfo.county || '-'}</div>
                    </div>
                    <div class="additional-info-item" style="grid-column: span 2;">
                        <div class="info-label">地址</div>
                        <div class="info-value">${companyInfo.address || '-'}</div>
                    </div>
                </div>
            </div>

            <div id="company-info-edit-mode" style="display: none;">
                </div>
        </div>
    `;
}

// ====================================================================
// 以下為詳細頁面中其他元件的渲染函式
// ====================================================================

function renderCompanyInteractionsTab(interactions, companyInfo) {
    const container = document.getElementById('tab-content-company-interactions');
    // 實際的渲染邏輯現在由 CompanyInteractions 模組處理，這裡保留函式簽名以防萬一
    // 但主控制器會直接呼叫 CompanyInteractions.render()
}

function renderCompanyFullDetails(companyInfo) {
    const container = document.getElementById('tab-content-company-details');
    
    const systemConfig = window.CRM_APP.systemConfig;
    const typeName = (systemConfig['公司類型'] || []).find(i => i.value === companyInfo.companyType)?.note || companyInfo.companyType;
    const stageName = (systemConfig['客戶階段'] || []).find(i => i.value === companyInfo.customerStage)?.note || companyInfo.customerStage;
    const ratingName = (systemConfig['互動評級'] || []).find(i => i.value === companyInfo.engagementRating)?.note || companyInfo.engagementRating;
    
    const details = {
        '公司 ID': companyInfo.companyId,
        '公司名稱': companyInfo.companyName,
        '公司類型': typeName,
        '客戶階段': stageName,
        '互動評級': ratingName,
        '公司電話': companyInfo.phone,
        '地址': companyInfo.address,
        '縣市': companyInfo.county,
        '建立時間': formatDateTime(companyInfo.createdTime),
        '最後更新時間': formatDateTime(companyInfo.lastUpdateTime),
        '建立者': companyInfo.creator,
        '最後變更者': companyInfo.lastModifier,
        '公司簡介': companyInfo.introduction,
    };

    const content = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1rem;">
            ${Object.entries(details).map(([key, value]) => `
                <div class="summary-item">
                    <span class="summary-label">${key}</span>
                    <span class="summary-value" style="font-size: 1rem; white-space: pre-wrap;">${value || '-'}</span>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = `<div class="dashboard-widget"><div class="widget-content">${content}</div></div>`;
}

function renderCompanyOpportunitiesTable(opportunities) {
    if (!opportunities || opportunities.length === 0) return '<div class="alert alert-info" style="text-align:center;">該公司尚無相關機會案件</div>';
    if (typeof renderOpportunitiesTable === 'function') {
        return renderOpportunitiesTable(opportunities);
    }
    return '<div class="alert alert-warning">機會列表渲染函式不可用</div>';
}

function renderCompanyContactsTable(contacts) {
    if (!contacts || contacts.length === 0) return '<div class="alert alert-info" style="text-align:center;">該公司尚無已建檔的聯絡人</div>';
    
    let tableHTML = `<table class="data-table"><thead><tr><th>姓名</th><th>職位</th><th>部門</th><th>手機</th><th>公司電話</th><th>Email</th><th>操作</th></tr></thead><tbody>`;

    contacts.forEach(contact => {
        const contactJsonString = JSON.stringify(contact).replace(/'/g, "&apos;");
        tableHTML += `
            <tr>
                <td data-label="姓名"><strong>${contact.name || '-'}</strong></td>
                <td data-label="職位">${contact.position || '-'}</td>
                <td data-label="部門">${contact.department || '-'}</td>
                <td data-label="手機">${contact.mobile || '-'}</td>
                <td data-label="公司電話">${contact.phone || '-'}</td>
                <td data-label="Email">${contact.email || '-'}</td>
                <td data-label="操作">
                    <button class="action-btn small warn" onclick='showEditContactModal(${contactJsonString})'>✏️ 編輯</button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
}

// 【修改點】移除 renderPotentialContactsTable 函式，因為它的邏輯已經被遷移到 potential-contacts-manager.js