/**
 * Kurdish Number Utility
 * Converts English/Arabic numerals to Kurdish (Eastern Arabic) numerals
 * Uses IBM Plex Sans Arabic font for proper display
 */

// Kurdish (Eastern Arabic) numerals mapping
const KURDISH_DIGITS = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩'
};

/**
 * Convert a number or string to Kurdish numerals
 * @param {number|string} value - The value to convert
 * @returns {string} Kurdish numeral representation
 */
function toKurdishNumber(value) {
    if (value === null || value === undefined) return '';

    const str = String(value);
    return str.split('').map(char => KURDISH_DIGITS[char] || char).join('');
}

/**
 * Convert Kurdish numerals back to English numerals
 * @param {string} kurdishNum - Kurdish numeral string
 * @returns {string} English numeral representation
 */
function fromKurdishNumber(kurdishNum) {
    if (!kurdishNum) return '';

    const reverseMap = Object.fromEntries(
        Object.entries(KURDISH_DIGITS).map(([k, v]) => [v, k])
    );

    return String(kurdishNum).split('').map(char => reverseMap[char] || char).join('');
}

/**
 * Format a number with Kurdish numerals and optional separators
 * @param {number} num - The number to format
 * @param {boolean} useComma - Whether to use comma separators (default: false)
 * @returns {string} Formatted Kurdish number
 */
function formatKurdishNumber(num, useComma = false) {
    if (num === null || num === undefined) return '';

    let str = String(num);

    if (useComma) {
        // Add comma separators for thousands
        str = str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    return toKurdishNumber(str);
}

// Export functions for use in other scripts
window.KurdishNumbers = {
    toKurdish: toKurdishNumber,
    fromKurdish: fromKurdishNumber,
    format: formatKurdishNumber
};
