// controllers/event.controller.js
const { handleApiError } = require('../middleware/error.middleware');

// 輔助函式：從 req.app 獲取服務
const getServices = (req) => req.app.get('services');

// --- Event Log Routes ---

// POST /api/events
exports.createEventLog = async (req, res) => {
    try {
        const { eventLogService } = getServices(req);
        res.json(await eventLogService.createEventLog(req.body));
    } catch (error) { handleApiError(res, error, 'Create Event Log'); }
};

// GET /api/events/:eventId
exports.getEventLogById = async (req, res) => {
    try {
        const { eventLogReader } = getServices(req);
        const data = await eventLogReader.getEventLogById(req.params.eventId);
        res.json({ success: !!data, data });
    } catch (error) { handleApiError(res, error, 'Get Event Log By Id'); }
};

// PUT /api/events/:eventId
exports.updateEventLog = async (req, res) => {
    try {
        const { eventLogService } = getServices(req);
        res.json(await eventLogService.updateEventLog(req.params.eventId, req.body, req.user.name));
    } catch (error) { handleApiError(res, error, 'Update Event Log'); }
};

// DELETE /api/events/:eventId
exports.deleteEventLog = async (req, res) => {
    try {
        const { eventLogService } = getServices(req);
        res.json(await eventLogService.deleteEventLog(req.params.eventId, req.user.name));
    } catch (error) {
        handleApiError(res, error, 'Delete Event Log');
    }
};

// --- Calendar Routes ---

// POST /api/calendar/events
exports.createCalendarEvent = async (req, res) => {
    try {
        const { calendarService } = getServices(req);
        res.json(await calendarService.createCalendarEvent(req.body));
    } catch (error) { handleApiError(res, error, 'Create Calendar Event'); }
};

// GET /api/calendar/week
exports.getThisWeekEvents = async (req, res) => {
    try {
        const { calendarService } = getServices(req);
        res.json(await calendarService.getThisWeekEvents());
    } catch (error) { handleApiError(res, error, 'Get Week Events'); }
};