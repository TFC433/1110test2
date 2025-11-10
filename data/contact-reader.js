// data/contact-reader.js

const BaseReader = require('./base-reader');

/**
 * 專門負責讀取所有與「聯絡人」相關資料的類別
 * (包含潛在客戶、已建檔聯絡人、關聯等)
 */
class ContactReader extends BaseReader {
    constructor(sheets) {
        super(sheets);
    }

    /**
     * 取得原始名片資料 (潛在客戶)
     * @param {number} [limit=2000] - 讀取上限
     * @returns {Promise<Array<object>>}
     */
    async getContacts(limit = 2000) {
        const cacheKey = 'contacts';
        const range = `${this.config.SHEETS.CONTACTS}!A:Y`;

        const rowParser = (row, index) => ({
            rowIndex: index + 2,
            createdTime: row[this.config.CONTACT_FIELDS.TIME] || '',
            name: row[this.config.CONTACT_FIELDS.NAME] || '',
            company: row[this.config.CONTACT_FIELDS.COMPANY] || '',
            position: row[this.config.CONTACT_FIELDS.POSITION] || '',
            department: row[this.config.CONTACT_FIELDS.DEPARTMENT] || '',
            phone: row[this.config.CONTACT_FIELDS.PHONE] || '',
            mobile: row[this.config.CONTACT_FIELDS.MOBILE] || '',
            email: row[this.config.CONTACT_FIELDS.EMAIL] || '',
            website: row[this.config.CONTACT_FIELDS.WEBSITE] || '',
            address: row[this.config.CONTACT_FIELDS.ADDRESS] || '',
            confidence: row[this.config.CONTACT_FIELDS.CONFIDENCE] || '',
            driveLink: row[this.config.CONTACT_FIELDS.DRIVE_LINK] || '',
            status: row[this.config.CONTACT_FIELDS.STATUS] || '',
            // 【新增】讀取使用者暱稱欄位 (USER_NICKNAME)
            userNickname: row[this.config.CONTACT_FIELDS.USER_NICKNAME] || ''
        });
        
        const sorter = (a, b) => {
            const dateA = new Date(a.createdTime);
            const dateB = new Date(b.createdTime);
            if (isNaN(dateB)) return -1;
            if (isNaN(dateA)) return 1;
            return dateB - dateA;
        };

        const allData = await this._fetchAndCache(cacheKey, range, rowParser, sorter);
        
        // --- 【*** 關鍵修正 ***】 ---
        // 移除此處的 filter
        // const filteredData = allData.filter(contact => 
        //     (contact.name || contact.company)
        // );
        // 直接回傳原始的 (已排序) 完整資料，並套用 slice
        // 這確保了 getLinkedContacts 在 join 時可以存取所有 row，即使它們沒有 name 或 company
        return allData.slice(0, limit);
        // --- 【*** 修正結束 ***】 ---
    }

    /**
     * 取得聯絡人總表 (已建檔聯絡人)
     * @returns {Promise<Array<object>>}
     */
    async getContactList() {
        const cacheKey = 'contactList';
        const range = `${this.config.SHEETS.CONTACT_LIST}!A:M`;

        const rowParser = (row) => ({
            contactId: row[0] || '',
            sourceId: row[1] || '',
            name: row[2] || '',
            companyId: row[3] || '',
            department: row[4] || '',
            position: row[5] || '',
            mobile: row[6] || '',
            phone: row[7] || '',
            email: row[8] || '',
            createdTime: row[9] || '',
            lastUpdateTime: row[10] || '',
            creator: row[11] || '',
            lastModifier: row[12] || ''
        });

        return this._fetchAndCache(cacheKey, range, rowParser);
    }
    
    /**
     * 讀取並快取所有的「機會-聯絡人」關聯
     * @returns {Promise<Array<object>>}
     */
    async getAllOppContactLinks() {
        const cacheKey = 'oppContactLinks';
        const range = `${this.config.SHEETS.OPPORTUNITY_CONTACT_LINK}!A:F`;

        const rowParser = (row) => ({
            linkId: row[this.config.OPP_CONTACT_LINK_FIELDS.LINK_ID] || '',
            opportunityId: row[this.config.OPP_CONTACT_LINK_FIELDS.OPPORTUNITY_ID] || '',
            contactId: row[this.config.OPP_CONTACT_LINK_FIELDS.CONTACT_ID] || '',
            createTime: row[this.config.OPP_CONTACT_LINK_FIELDS.CREATE_TIME] || '',
            status: row[this.config.OPP_CONTACT_LINK_FIELDS.STATUS] || '',
            creator: row[this.config.OPP_CONTACT_LINK_FIELDS.CREATOR] || '',
        });

        return this._fetchAndCache(cacheKey, range, rowParser);
    }

    /**
     * 根據機會 ID 取得關聯的聯絡人詳細資料
     * @param {string} opportunityId 
     * @returns {Promise<Array<object>>}
     */
    async getLinkedContacts(opportunityId) {
        const allLinks = await this.getAllOppContactLinks();
        const linkedContactIds = new Set();
        
        for (const link of allLinks) {
            if (link.opportunityId === opportunityId && link.status === 'active') {
                linkedContactIds.add(link.contactId);
            }
        }
        
        if (linkedContactIds.size === 0) return [];
        
        // 【修改】並行獲取所有需要的資料來源
        const [allContacts, allCompanies, allPotentialContacts] = await Promise.all([
            this.getContactList(),
            this.getCompanyList(), // 依賴 CompanyReader
            this.getContacts(9999)    // 獲取原始名片資料(現在是未過濾的)
        ]);

        const companyNameMap = new Map(allCompanies.map(c => [c.companyId, c.companyName]));
        // 建立一個 rowIndex 到名片資料的映射表，以提升查找效率
        const potentialContactsMap = new Map(allPotentialContacts.map(pc => [pc.rowIndex, pc]));

        const linkedContacts = allContacts
            .filter(contact => linkedContactIds.has(contact.contactId))
            .map(contact => {
                let driveLink = '';
                // 如果聯絡人來源是名片 (BC-xxx)
                if (contact.sourceId && contact.sourceId.startsWith('BC-')) {
                    const rowIndex = parseInt(contact.sourceId.replace('BC-', ''), 10);
                    // 【*** 關鍵修正 ***】
                    // 即使 `potentialContact` 沒有 name 或 company，
                    // `potentialContactsMap` 現在也包含它了
                    const potentialContact = potentialContactsMap.get(rowIndex);
                    if (potentialContact) {
                        driveLink = potentialContact.driveLink; // 找到對應的名片連結
                    }
                }

                // 回傳包含 driveLink 的完整物件
                return {
                    contactId: contact.contactId,
                    sourceId: contact.sourceId,
                    name: contact.name,
                    companyId: contact.companyId,
                    department: contact.department,
                    position: contact.position,
                    mobile: contact.mobile,
                    phone: contact.phone,
                    email: contact.email,
                    companyName: companyNameMap.get(contact.companyId) || contact.companyId,
                    driveLink: driveLink // 新增此欄位
                };
            });
        
        return linkedContacts;
    }

    /**
     * 【修改】搜尋潛在客戶，移除分頁並回傳完整陣列
     * @param {string} query 
     * @returns {Promise<object>}
     */
    async searchContacts(query) {
        let contacts = await this.getContacts(); // 獲取未過濾的資料
        
        // --- 【*** 關鍵修正 ***】 ---
        // 將過濾邏輯移到這裡
        contacts = contacts.filter(contact => 
            (contact.name || contact.company)
        );
        // --- 【*** 修正結束 ***】 ---

        if (query) {
            const searchTerm = query.toLowerCase();
            contacts = contacts.filter(c =>
                (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                (c.company && c.company.toLowerCase().includes(searchTerm))
            );
        }
        // 直接回傳篩選後的完整資料，不再分頁
        return { data: contacts };
    }

    /**
     * 搜尋已建檔聯絡人並分頁
     * @param {string} query 
     * @param {number} [page=1] 
     * @returns {Promise<object>}
     */
    async searchContactList(query, page = 1) {
        const [allContacts, allCompanies] = await Promise.all([
            this.getContactList(),
            this.getCompanyList() // 依賴 CompanyReader
        ]);
    
        const companyNameMap = new Map(allCompanies.map(c => [c.companyId, c.companyName]));
    
        let contacts = allContacts.map(contact => ({
            ...contact,
            companyName: companyNameMap.get(contact.companyId) || contact.companyId 
        }));
    
        if (query) {
            const searchTerm = query.toLowerCase();
            contacts = contacts.filter(c =>
                (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                (c.companyName && c.companyName.toLowerCase().includes(searchTerm))
            );
        }
        
        const pageSize = this.config.PAGINATION.CONTACTS_PER_PAGE;
        const startIndex = (page - 1) * pageSize;
        const paginated = contacts.slice(startIndex, startIndex + pageSize);
        return {
            data: paginated,
            pagination: { current: page, total: Math.ceil(contacts.length / pageSize), totalItems: contacts.length, hasNext: (startIndex + pageSize) < contacts.length, hasPrev: page > 1 }
        };
    }

    // Phase 2 中，這個方法會被移除，改為依賴注入
    async getCompanyList() {
        const CompanyReader = require('./company-reader'); // 臨時引用
        const companyReader = new CompanyReader(this.sheets);
        return companyReader.getCompanyList();
    }
}

module.exports = ContactReader;