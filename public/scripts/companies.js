// views/scripts/companies.js (重構後的主控制器)
// 職責：載入公司詳細資料頁的數據，並協調UI渲染與事件綁定模組

/**
 * 載入並渲染公司詳細資料頁面的主函式
 * @param {string} encodedCompanyName - URL編碼過的公司名稱
 */
async function loadCompanyDetailsPage(encodedCompanyName) {
    const container = document.getElementById('page-company-details');
    const companyName = decodeURIComponent(encodedCompanyName);
    if (!container) return;

    container.innerHTML = `<div class="loading show" style="padding-top: 100px;"><div class="spinner"></div><p>正在載入 ${companyName} 的詳細資料...</p></div>`;

    try {
        const result = await authedFetch(`/api/companies/${encodedCompanyName}/details`);
        if (!result.success) throw new Error(result.error || '無法載入公司資料');

        const { companyInfo, contacts = [], opportunities = [], potentialContacts = [], interactions = [], eventLogs = [] } = result.data;
        
        // 1. 設定頁面標題
        document.getElementById('page-title').textContent = companyInfo.companyName;
        document.getElementById('page-subtitle').textContent = '公司詳細資料與關聯活動';

        // 2. 渲染頁面骨架 (改為垂直瀑布流)
        // 【錯誤修正】為下方幾個卡片補上 margin-top 以增加間距
        container.innerHTML = `
            ${renderCompanyInfoCard(companyInfo)}

            <div id="tab-content-company-events" class="tab-content active" style="margin-bottom: var(--spacing-6);"></div>

            <div id="tab-content-company-interactions" class="tab-content active" style="margin-bottom: var(--spacing-6);">
                <div class="interaction-layout">
                    <div class="interaction-history-section">
                        <h3 style="margin-bottom: 1.5rem;">歷史互動紀錄</h3>
                        <div id="interaction-history-list" class="interaction-timeline"></div>
                    </div>
                    <div class="interaction-form-section">
                        <h3 style="margin-bottom: 1.5rem;">新增/編輯互動</h3>
                        <form id="new-interaction-form">
                            <input type="hidden" id="interaction-opportunity-id">
                            <input type="hidden" id="interaction-edit-rowIndex">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">互動類型</label>
                                    <div class="select-wrapper">
                                        <select class="form-select" id="interaction-event-type" required></select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">互動時間</label>
                                    <input type="datetime-local" class="form-input" id="interaction-time" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">內容摘要 *</label>
                                <textarea class="form-textarea" id="interaction-summary" placeholder="記錄互動重點..." required></textarea>
                            </div>
                             <div class="form-group">
                                <label class="form-label">下次行動</label>
                                <input type="text" class="form-input" id="interaction-next-action" placeholder="準備報價單並於下週三前寄出..."></input>
                            </div>
                            <button type="submit" class="submit-btn" id="interaction-submit-btn">💾 新增紀錄</button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">相關機會案件 (${opportunities.length})</h2></div>
                <div class="widget-content">${renderCompanyOpportunitiesTable(opportunities)}</div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">已建檔聯絡人 (${contacts.length})</h2></div>
                <div class="widget-content">${renderCompanyContactsTable(contacts)}</div>
            </div>

            <div class="dashboard-widget grid-col-12" style="margin-top: var(--spacing-6);">
                <div class="widget-header"><h2 class="widget-title">潛在聯絡人 (${potentialContacts.length})</h2></div>
                <div id="potential-contacts-container" class="widget-content"></div>
            </div>
        `;
        
        // 3. 初始化並渲染各個模組
        OpportunityEvents.init(eventLogs, { companyId: companyInfo.companyId, companyName: companyInfo.companyName });
        
        // 【修改點】傳入互動區塊的容器元素
        const companyInteractionContainer = document.getElementById('tab-content-company-interactions');
        OpportunityInteractions.init(companyInteractionContainer, { companyId: companyInfo.companyId }, interactions);
        
        if (window.PotentialContactsManager) {
            PotentialContactsManager.render({
                containerSelector: '#potential-contacts-container',
                potentialContacts: potentialContacts, 
                comparisonList: contacts, 
                comparisonKey: 'name',
                context: 'company'
            });
        }

        // 4. 綁定所有互動事件
        initializeCompanyEventListeners(companyInfo);
        
        // 5. 更新下拉選單
        CRM_APP.updateAllDropdowns();

    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('載入公司詳細資料失敗:', error);
            document.getElementById('page-title').textContent = '錯誤';
            container.innerHTML = `<div class="alert alert-error">載入公司資料失敗: ${error.message}</div>`;
        }
    }
}

// 向主應用程式註冊此模組管理的頁面載入函式
if (window.CRM_APP) {
    window.CRM_APP.pageModules['company-details'] = loadCompanyDetailsPage;
}