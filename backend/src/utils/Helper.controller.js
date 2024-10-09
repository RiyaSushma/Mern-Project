const findEmptyEntry = (fields) => {
    const emptyFields = Object.keys(fields).filter(key => {
        return fields[key]?.trim() === "";
    });
    return emptyFields;
}

const emailValidation = (email) => {
    const emailRegrex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegrex.test(email);
}

const passwordValidation = (password) => {
    const passwordRegrex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!#$%^*_])[^\s]{8,}$/;
    return passwordRegrex.test(password);
}

export { findEmptyEntry, emailValidation, passwordValidation };