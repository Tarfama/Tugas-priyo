// ============================================================
// utils/responseHelper.js — Helper Konsisten Respons & Paginasi
// ============================================================

/**
 * Format pagination query parameters
 * @param {object} query - Express req.query
 * @param {number} defaultLimit - default 10
 * @param {number} maxLimit - default 50
 */
function parsePagination(query, defaultLimit = 10, maxLimit = 50) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

/**
 * Respons sukses standar
 */
function successResponse(res, message, data = null, statusCode = 200) {
    const payload = {
        success: true,
        message,
    };
    if (data !== null && data !== undefined) {
        payload.data = data;
    }
    return res.status(statusCode).json(payload);
}

/**
 * Respons sukses paginasi standar
 */
function paginatedResponse(res, message, items, total, page, limit, statusCode = 200) {
    const totalPages = Math.ceil(total / limit) || 1;
    return res.status(statusCode).json({
        success: true,
        message,
        data: items,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
}

/**
 * Respons error standar
 */
function errorResponse(res, message, statusCode = 400, errors = null) {
    const payload = {
        success: false,
        message,
    };
    if (errors) {
        payload.errors = errors;
    }
    return res.status(statusCode).json(payload);
}

module.exports = {
    parsePagination,
    successResponse,
    paginatedResponse,
    errorResponse,
};
