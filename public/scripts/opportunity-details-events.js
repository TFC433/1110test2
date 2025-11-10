// views/scripts/opportunity-details-events.js
// 職責：處理「機會資訊卡」的所有使用者互動事件，包括編輯、儲存等

const OpportunityInfoCardEvents = (() => {
    // 【修正】新增一個模組內的私有變數來儲存當前的機會資料
    let _currentOppForEditing = null;

    /**
     * 【新增】初始化函式，由主控制器呼叫以傳入資料
     * @param {object} opportunityData - 當前機會的詳細資料物件
     */
    function init(opportunityData) {
        _currentOppForEditing = opportunityData;
    }

    /**
     * 切換檢視模式與編輯模式
     * @param {boolean} isEditing - 是否要進入編輯模式
     */
    function toggleEditMode(isEditing) {
        const displayMode = document.getElementById('opportunity-info-display-mode');
        const editMode = document.getElementById('opportunity-info-edit-mode');

        if (isEditing) {
            // 【修正】在進入編輯模式前，先確保資料已經被初始化
            if (!_currentOppForEditing) {
                showNotification('機會資料尚未載入完成，無法編輯。', 'error');
                console.error('OpportunityInfoCardEvents: _currentOppForEditing is not initialized.');
                return;
            }
            displayMode.style.display = 'none';
            editMode.style.display = 'block';
            _populateEditForm(); // 動態填入編輯表單
        } else {
            displayMode.style.display = 'block';
            editMode.style.display = 'none';
        }
    }

    /**
     * 動態產生並填入編輯表單的 HTML
     * @private
     */
    function _populateEditForm() {
        const container = document.getElementById('opportunity-info-edit-form-container');
        // 【修正】改為使用模組內部儲存的 _currentOppForEditing 變數
        const opp = _currentOppForEditing;
        const systemConfig = window.CRM_APP.systemConfig;

        // 輔助函式：產生下拉選單 HTML
        const createSelectHTML = (configKey, selectedValue, dataField) => {
            let optionsHtml = '<option value="">請選擇...</option>';
            (systemConfig[configKey] || []).forEach(opt => {
                optionsHtml += `<option value="${opt.value}" ${opt.value === selectedValue ? 'selected' : ''}>${opt.note}</option>`;
            });
            return `<div class="select-wrapper"><select class="form-select" data-field="${dataField}">${optionsHtml}</select></div>`;
        };

        // 【新增】輔助函式：產生複選框 HTML
        const createCheckboxHTML = (configKey, selectedValuesStr, dataField) => {
            const options = systemConfig[configKey] || [];
            if (options.length === 0) return '<span>無可用選項</span>';

            const selectedSet = new Set((selectedValuesStr || '').split(',').map(s => s.trim()));

            let checkboxesHtml = '<div class="checkbox-option-group" data-field="' + dataField + '">';
            options.forEach(opt => {
                checkboxesHtml += `
                    <label>
                        <input type="checkbox" value="${opt.value}" ${selectedSet.has(opt.value) ? 'checked' : ''}>
                        <span>${opt.note}</span>
                    </label>
                `;
            });
            checkboxesHtml += '</div>';
            return checkboxesHtml;
        };

        container.innerHTML = `
            <div class="info-grid">
                <div class="info-item form-group">
                    <label class="info-label form-label">機會名稱 *</label>
                    <input type="text" class="form-input" data-field="opportunityName" value="${opp.opportunityName || ''}" required>
                </div>
                <div class="info-item form-group">
                    <label class="info-label form-label">機會種類</label>
                    ${createSelectHTML('機會種類', opp.opportunityType, 'opportunityType')}
                </div>
                <div class="info-item form-group">
                    <label class="info-label form-label">機會來源</label>
                    ${createSelectHTML('機會來源', opp.opportunitySource, 'opportunitySource')}
                </div>
                 <div class="info-item form-group">
                    <label class="info-label form-label">負責業務</label>
                    ${createSelectHTML('團隊成員', opp.assignee, 'assignee')}
                </div>
                <div class="info-item form-group">
                    <label class="info-label form-label">機會價值</label>
                    <input type="text" class="form-input" data-field="opportunityValue" value="${opp.opportunityValue || ''}" placeholder="例如: 1,000,000">
                </div>
                <div class="info-item form-group">
                    <label class="info-label form-label">結案日期</label>
                    <input type="date" class="form-input" data-field="expectedCloseDate" value="${opp.expectedCloseDate || ''}">
                </div>
                <div class="info-item form-group">
                    <label class="info-label form-label">下單機率</label>
                    ${createSelectHTML('下單機率', opp.orderProbability, 'orderProbability')}
                </div>
                <div class="info-item form-group" style="grid-column: span 2;">
                    <label class="info-label form-label">可能下單規格</label>
                    ${createCheckboxHTML('可能下單規格', opp.potentialSpecification, 'potentialSpecification')}
                </div>
                <div class="info-item form-group">
                    <label class="info-label form-label">可能銷售管道</label>
                    ${createSelectHTML('可能銷售管道', opp.salesChannel, 'salesChannel')}
                </div>
                <div class="info-item form-group">
                    <label class="info-label form-label">設備規模</label>
                    ${createSelectHTML('設備規模', opp.deviceScale, 'deviceScale')}
                </div>
            </div>
            <div class="notes-section form-group">
                 <label class="info-label form-label">備註</label>
                 <textarea class="form-textarea" data-field="notes" rows="4">${opp.notes || ''}</textarea>
            </div>
        `;
    }

    /**
     * 儲存編輯後的資訊
     */
    async function save() {
        const formContainer = document.getElementById('opportunity-info-edit-form-container');
        if (!formContainer) return;

        const updateData = {};

        // 處理下拉選單、文字區域和一般輸入框
        formContainer.querySelectorAll('select[data-field], textarea[data-field], input[data-field]').forEach(input => {
            const fieldName = input.dataset.field;
            // 檢查是否為機會名稱，若是且為空，則提示錯誤
            if (fieldName === 'opportunityName' && !input.value.trim()) {
                 showNotification('機會名稱為必填欄位。', 'error');
                 input.focus(); // 聚焦到該欄位
                 throw new Error("機會名稱不可為空"); // 拋出錯誤阻止儲存
            }
            updateData[fieldName] = input.value;
        });

        // 【修改】專門處理複選框的值
        const checkboxGroup = formContainer.querySelector('.checkbox-option-group[data-field="potentialSpecification"]');
        if (checkboxGroup) {
            const selectedSpecs = Array.from(checkboxGroup.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            updateData.potentialSpecification = selectedSpecs.join(',');
        }

        // 驗證機會名稱是否已填寫 (雙重檢查)
        if (!updateData.opportunityName) {
            showNotification('機會名稱為必填欄位。', 'error');
            return; // 不執行儲存
        }

        showLoading('正在儲存變更...');
        try {
            // 【修正】改為使用模組內部儲存的 _currentOppForEditing 變數來獲取 rowIndex 和 opportunityId
            const result = await authedFetch(`/api/opportunities/${_currentOppForEditing.rowIndex}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...updateData,
                    modifier: getCurrentUser()
                })
            });

            if (result.success) {
                // 【*** 移除衝突 ***】
                // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                // showNotification('機會資訊更新成功！', 'success');
                // await loadOpportunityDetailPage(_currentOppForEditing.opportunityId);
                // 【*** 移除結束 ***】
            } else {
                throw new Error(result.error || '儲存失敗');
            }
        } catch (error) {
             // 只有在不是機會名稱驗證錯誤時才顯示一般錯誤訊息
            if (error.message !== "機會名稱不可為空" && error.message !== 'Unauthorized') {
                showNotification(`儲存失敗: ${error.message}`, 'error');
            } else if (error.message === 'Unauthorized') {
                // Unauthorized 錯誤由 authedFetch 處理
            }
        } finally {
            hideLoading();
        }
    }

    // 返回公開的 API
    return {
        init, // 【新增】匯出 init 方法
        toggleEditMode,
        save
    };
})();