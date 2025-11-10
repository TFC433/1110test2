// services/index.js (已修正初始化順序並補上 API 客戶端)

const config = require('../config');
const DashboardService = require('./dashboard-service');
const OpportunityService = require('./opportunity-service');
const CompanyService = require('./company-service');
const EventLogService = require('./event-log-service');
const WeeklyBusinessService = require('./weekly-business-service'); // 保持引入
const SalesAnalysisService = require('./sales-analysis-service');

// 從 google-services.js 遷移過來的日期輔助函式
const dateHelpers = {
    getWeekId: (d) => {
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
    },
    getWeekInfo: (weekId) => {
        const [year, week] = weekId.split('-W').map(Number);
        const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
        const day = d.getUTCDay() || 7; // getUTCDay() returns 0 for Sunday
        // 找到該週的星期一
        if (day !== 1) d.setUTCDate(d.getUTCDate() - day + 1);
        const start = d;
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 4); // 星期五
        const weekOfMonth = Math.ceil(start.getUTCDate() / 7);
        const month = start.toLocaleString('zh-TW', { month: 'long', timeZone: 'UTC' });
        // 修正 formatDate 以使用 UTC 日期
        const formatDate = (dt) => `${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${String(dt.getUTCDate()).padStart(2, '0')}`;
        // 產生週一到週五的日期資訊
        const days = Array.from({length: 5}, (_, i) => {
            const dayDate = new Date(start);
            dayDate.setUTCDate(start.getUTCDate() + i);
            return {
                dayIndex: i + 1, // 1 for Monday, ..., 5 for Friday
                date: dayDate.toISOString().split('T')[0], // YYYY-MM-DD
                displayDate: formatDate(dayDate) // MM/DD
            };
        });
        return {
            title: `${year}年 ${month}, 第 ${weekOfMonth} 週`,
            dateRange: `(${formatDate(start)} - ${formatDate(end)})`,
            month, weekOfMonth, shortDateRange: `${formatDate(start)} - ${formatDate(end)}`, days
        };
    }
};

/**
 * 初始化所有業務邏輯服務
 * @param {object} coreServices - 從 service-container 初始化的核心服務 (readers, writers, etc.)
 * @returns {object} - 包含所有業務邏輯服務實例的物件
 */
function initializeBusinessServices(coreServices) {
    // 將 config 和 dateHelpers 加入核心服務，方便傳遞
    const servicesWithUtils = { ...coreServices, config, dateHelpers };

    // --- 【修改】調整實例化順序 ---
    // 1. 先實例化沒有依賴其他 Business Service 的服務
    const opportunityService = new OpportunityService(servicesWithUtils);
    const companyService = new CompanyService(servicesWithUtils);
    const eventLogService = new EventLogService(servicesWithUtils);
    const weeklyBusinessService = new WeeklyBusinessService(servicesWithUtils); // <-- 先建立
    const salesAnalysisService = new SalesAnalysisService(servicesWithUtils);

    // 2. 將已建立的 Business Service 加入到要傳遞的物件中 (如果需要的話)
    //    在這個案例中，DashboardService 需要 weeklyBusinessService，所以我們需要一個包含它的物件
    const allInitializedServices = {
        ...servicesWithUtils, // 包含 coreServices 和 utils
        // 加入已建立的 business services
        opportunityService,
        companyService,
        eventLogService,
        weeklyBusinessService,
        salesAnalysisService
        // 注意：這裡先不加入 dashboardService，因為它還沒建立
    };

    // 3. 實例化依賴其他 Business Service 的服務 (例如 DashboardService)
    //    將包含 weeklyBusinessService 的 allInitializedServices 傳入
    const dashboardService = new DashboardService(allInitializedServices); // <-- 現在可以正確注入 weeklyBusinessService

    // --- 修改結束 ---


    // 【重構】返回一個結構清晰的物件，明確暴露所有需要的服務和資料模組
    return {
        // --- Google API 客戶端 (!!修正：補上此區塊!!) ---
        sheets: coreServices.sheets,
        calendar: coreServices.calendar,
        drive: coreServices.drive, // <--- 已補上

        // --- 業務邏輯服務 ---
        dashboardService, // <-- 包含修正後的 DashboardService
        opportunityService,
        companyService,
        eventLogService,
        weeklyBusinessService,
        salesAnalysisService,

        // --- 核心工作流服務 ---
        workflowService: coreServices.workflowService,
        calendarService: coreServices.calendarService,

        // --- 資料層 Readers ---
        contactReader: coreServices.contactReader,
        opportunityReader: coreServices.opportunityReader,
        companyReader: coreServices.companyReader,
        interactionReader: coreServices.interactionReader,
        systemReader: coreServices.systemReader,
        weeklyBusinessReader: coreServices.weeklyBusinessReader,
        eventLogReader: coreServices.eventLogReader,
        announcementReader: coreServices.announcementReader,

        // --- 資料層 Writers ---
        companyWriter: coreServices.companyWriter,
        contactWriter: coreServices.contactWriter,
        opportunityWriter: coreServices.opportunityWriter,
        interactionWriter: coreServices.interactionWriter,
        eventLogWriter: coreServices.eventLogWriter,
        weeklyBusinessWriter: coreServices.weeklyBusinessWriter,
        announcementWriter: coreServices.announcementWriter
    };
}

module.exports = initializeBusinessServices;