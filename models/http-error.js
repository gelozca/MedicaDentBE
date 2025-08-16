class HttpError extends Error {
    constructor(message, errorCode, validationErrors = null) {
        super(message);
        this.code = errorCode;
        this.validationErrors = validationErrors;
    }
}

module.exports = HttpError;