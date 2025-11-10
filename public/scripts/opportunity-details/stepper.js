// views/scripts/opportunity-details/stepper.js
// 職責：專門管理「機會進程」區塊的所有 UI 渲染與互動邏輯

const OpportunityStepper = (() => {
    // 模組內的私有變數
    let _opportunityInfo = null;

    // 處理圓圈點擊（三態循環）
    function _handleCircleClick(event) {
        const step = event.currentTarget.closest('.stage-step');
        const iconEl = step.querySelector('.step-circle');
        const allSteps = Array.from(step.parentElement.children);
        const index = allSteps.indexOf(step);
        
        switch (step.dataset.status) {
            case 'pending':
                step.dataset.status = 'completed';
                step.classList.add('completed');
                step.classList.remove('skipped');
                iconEl.innerHTML = '✓';
                break;
            case 'completed':
                step.dataset.status = 'skipped';
                step.classList.remove('completed');
                step.classList.add('skipped');
                iconEl.innerHTML = '✕';
                break;
            case 'skipped':
                step.dataset.status = 'pending';
                step.classList.remove('skipped');
                iconEl.innerHTML = index + 1;
                break;
        }
    }

    // 處理階段名稱點擊（設定為目前）
    function _handleNameClick(event) {
        const currentStep = event.currentTarget.closest('.stage-step');
        document.querySelectorAll('.stage-stepper-container .stage-step').forEach(step => step.classList.remove('current'));
        currentStep.classList.add('current');
    }

    // 儲存變更
    async function _saveChanges() {
        const stepperContainer = document.querySelector('.stage-stepper-container');
        if (!stepperContainer) return;

        const historyItems = [];
        stepperContainer.querySelectorAll('.stage-step').forEach(step => {
            const status = step.dataset.status;
            const stageId = step.dataset.stageId;
            if (status === 'completed') {
                historyItems.push(`C:${stageId}`);
            } else if (status === 'skipped') {
                historyItems.push(`X:${stageId}`);
            }
        });

        const currentStep = stepperContainer.querySelector('.stage-step.current');
        const newCurrentStage = currentStep ? currentStep.dataset.stageId : _opportunityInfo.currentStage;
        const newStageHistory = historyItems.join(',');

        showLoading('正在儲存階段歷程...');
        try {
            const result = await authedFetch(`/api/opportunities/${_opportunityInfo.rowIndex}`, {
                method: 'PUT',
                body: JSON.stringify({
                    currentStage: newCurrentStage,
                    stageHistory: newStageHistory,
                    modifier: getCurrentUser()
                })
            });

            if (result.success) {
                // 【*** 移除衝突 ***】
                // 移除下方的局部刷新和手動通知，authedFetch 會處理整頁刷新和通知
                // showNotification('階段歷程更新成功！', 'success');
                // await loadOpportunityDetailPage(_opportunityInfo.opportunityId);
                // 【*** 移除結束 ***】
            } else {
                throw new Error(result.error || '儲存失敗');
            }

        } catch (error) {
            if (error.message !== 'Unauthorized') {
                showNotification(`儲存失敗: ${error.message}`, 'error');
            }
        } finally {
            hideLoading();
        }
    }
    
    // 渲染檢視模式
    function _renderViewMode() {
        const container = document.getElementById('opportunity-stage-stepper');
        const header = document.querySelector('#opportunity-stage-stepper-container .widget-header');
        const allStages = CRM_APP.systemConfig['機會階段'] || [];

        header.innerHTML = `
            <h2 class="widget-title">機會進程</h2>
            <button class="action-btn small secondary" id="edit-stepper-btn">✏️ 編輯歷程</button>
        `;
        header.querySelector('#edit-stepper-btn').addEventListener('click', () => _renderEditMode());

        const stageStatusMap = new Map();
        if (_opportunityInfo.stageHistory) {
            _opportunityInfo.stageHistory.split(',').forEach(item => {
                const [status, stageId] = item.split(':');
                stageStatusMap.set(stageId, status);
            });
        }

        let stepsHtml = allStages.map((stage, index) => {
            let statusClass = 'pending';
            let icon = index + 1;
            const status = stageStatusMap.get(stage.value);

            if (status === 'C') { statusClass = 'completed'; icon = '✓'; } 
            else if (status === 'X') { statusClass = 'skipped'; icon = '✕'; }
            
            if (stage.value === _opportunityInfo.currentStage) { statusClass += ' current'; }

            return `
                <div class="stage-step ${statusClass.trim()}" data-stage-id="${stage.value}" title="${stage.note || stage.value}">
                    <div class="step-circle">${icon}</div>
                    <div class="step-name">${stage.note || stage.value}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="stage-stepper-container">${stepsHtml}</div>`;
    }

    // 渲染編輯模式
    function _renderEditMode() {
        const container = document.getElementById('opportunity-stage-stepper');
        const header = document.querySelector('#opportunity-stage-stepper-container .widget-header');
        const stepperContainer = container.querySelector('.stage-stepper-container');

        if (!stepperContainer) return; // 如果還沒有渲染，則不執行
        
        // 顯示提示文字
        let hintContainer = document.getElementById('stepper-edit-hint');
        if (!hintContainer) {
            hintContainer = document.createElement('div');
            hintContainer.id = 'stepper-edit-hint';
            hintContainer.className = 'stepper-edit-hint';
            hintContainer.innerHTML = `ℹ️ <strong>操作提示</strong>：點擊 [圓圈] 可在 ( ✓ / ✕ / 無 ) 三種狀態間切換，點擊 [階段名稱] 可設定為目前階段。`;
            container.before(hintContainer);
        }
        hintContainer.style.display = 'block';

        header.innerHTML = `
            <h2 class="widget-title">機會進程 (編輯模式)</h2>
            <div>
                <button class="action-btn small" style="background: #6c757d;" id="cancel-stepper-btn">取消</button>
                <button class="action-btn small primary" id="save-stepper-btn">💾 儲存</button>
            </div>
        `;
        header.querySelector('#cancel-stepper-btn').addEventListener('click', () => {
            hintContainer.style.display = 'none';
            _renderViewMode();
        });
        header.querySelector('#save-stepper-btn').addEventListener('click', _saveChanges);

        // 【修復】移除錯誤的 _renderViewMode() 呼叫
        // _renderViewMode(); // <--- 這行是 Bug 的來源，已移除

        // 直接在現有的 stepperContainer 上增加 class 和事件監聽
        stepperContainer.classList.add('edit-mode');
        
        stepperContainer.querySelectorAll('.stage-step').forEach(step => {
            let status = 'pending';
            if (step.classList.contains('completed')) status = 'completed';
            if (step.classList.contains('skipped')) status = 'skipped';
            step.dataset.status = status;

            step.querySelector('.step-circle').addEventListener('click', _handleCircleClick);
            step.querySelector('.step-name').addEventListener('click', _handleNameClick);
        });
    }

    // 動態注入樣式
    function _injectStyles() {
        const styleId = 'stepper-dynamic-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .stepper-edit-hint {
                background-color: color-mix(in srgb, var(--accent-blue) 15%, var(--primary-bg));
                border: 1px solid var(--accent-blue); color: var(--text-secondary);
                padding: var(--spacing-3) var(--spacing-4); border-radius: var(--rounded-lg);
                margin-bottom: var(--spacing-5); font-size: var(--font-size-sm);
            }
            .stage-step.skipped .step-circle {
                background-color: var(--accent-red); border-color: var(--accent-red); color: white;
            }
            .stage-stepper-container.edit-mode .step-circle {
                cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .stage-stepper-container.edit-mode .step-circle:hover {
                transform: scale(1.15);
            }
            .stage-stepper-container.edit-mode .step-name {
                cursor: pointer; padding: 2px 5px; border-radius: var(--rounded-sm);
                transition: background-color 0.2s ease;
            }
            .stage-stepper-container.edit-mode .step-name:hover {
                background-color: var(--glass-bg);
            }
            .stage-step.current .step-circle {
                box-shadow: 0 0 0 4px var(--accent-blue);
            }
        `;
        document.head.appendChild(style);
    }
    
    // 公開的初始化方法
    function init(opportunityInfo) {
        _opportunityInfo = opportunityInfo;
        const container = document.getElementById('opportunity-stage-stepper-container');
        if (!container) return;
        
        _injectStyles();
        _renderViewMode();
    }

    // 返回公開的 API
    return {
        init: init
    };
})();