// XSS Protection Utilities
// Safe alternatives to innerHTML and other XSS-prone operations

/**
 * Safely set text content (prevents XSS)
 * Use this instead of: element.innerHTML = userText
 * @param {HTMLElement} element - The element to update
 * @param {string} text - The text content to set
 */
function safeSetText(element, text) {
    if (!element) return;
    element.textContent = text;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Safely create an element with text content
 * @param {string} tagName - The tag name (e.g., 'div', 'span')
 * @param {string} text - The text content
 * @param {Object} attributes - Optional attributes to set
 * @returns {HTMLElement} - The created element
 */
function createSafeElement(tagName, text = '', attributes = {}) {
    const element = document.createElement(tagName);
    element.textContent = text;

    // Set attributes safely
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'class') {
            element.className = value;
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else if (key === 'id' || key === 'title' || key === 'alt') {
            element.setAttribute(key, escapeHTML(value));
        }
    }

    return element;
}

/**
 * Safely append multiple text nodes to an element
 * @param {HTMLElement} parent - The parent element
 * @param {Array<string>} texts - Array of text strings
 */
function appendSafeTexts(parent, texts) {
    if (!parent || !Array.isArray(texts)) return;

    texts.forEach(text => {
        const textNode = document.createTextNode(text);
        parent.appendChild(textNode);
    });
}

/**
 * Safely build HTML structure from template
 * Use this for complex HTML structures instead of innerHTML
 * @param {Object} template - The template object
 * @returns {HTMLElement} - The built element
 *
 * Example:
 * const el = safeB uildHTML({
 *     tag: 'div',
 *     class: 'container',
 *     children: [
 *         { tag: 'h2', text: userInput },
 *         { tag: 'p', text: description }
 *     ]
 * });
 */
function safeBuildHTML(template) {
    const element = document.createElement(template.tag || 'div');

    // Set class
    if (template.class) {
        element.className = template.class;
    }

    // Set ID
    if (template.id) {
        element.id = template.id;
    }

    // Set text content (safe)
    if (template.text) {
        element.textContent = template.text;
    }

    // Set attributes
    if (template.attributes) {
        for (const [key, value] of Object.entries(template.attributes)) {
            element.setAttribute(key, escapeHTML(value));
        }
    }

    // Add children recursively
    if (template.children && Array.isArray(template.children)) {
        template.children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (typeof child === 'object') {
                element.appendChild(safeBuildHTML(child));
            }
        });
    }

    return element;
}

/**
 * Safely clear and replace element content
 * @param {HTMLElement} element - The element to clear
 * @param {HTMLElement|string} content - The new content (element or text)
 */
function safeReplaceContent(element, content) {
    if (!element) return;

    // Clear existing content
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    // Add new content
    if (typeof content === 'string') {
        element.textContent = content;
    } else if (content instanceof HTMLElement) {
        element.appendChild(content);
    }
}

/**
 * Safely set HTML from trusted source only
 * WARNING: Only use this with fully trusted, server-generated HTML
 * For user input, use safeSetText() or safeBuildHTML() instead
 * @param {HTMLElement} element - The element to update
 * @param {string} trustedHTML - The TRUSTED HTML string
 */
function setTrustedHTML(element, trustedHTML) {
    if (!element) return;

    console.warn('setTrustedHTML called - ensure HTML is from trusted source only');
    element.innerHTML = trustedHTML;
}

/**
 * Sanitize URL to prevent javascript: protocol XSS
 * @param {string} url - The URL to sanitize
 * @returns {string} - Safe URL or empty string
 */
function sanitizeURL(url) {
    if (typeof url !== 'string') return '';

    const trimmed = url.trim().toLowerCase();

    // Block dangerous protocols
    if (trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')) {
        return '';
    }

    return url;
}

/**
 * Safely set link href
 * @param {HTMLAnchorElement} link - The link element
 * @param {string} url - The URL
 */
function safeSetHref(link, url) {
    if (!link || link.tagName !== 'A') return;

    const safeURL = sanitizeURL(url);
    if (safeURL) {
        link.href = safeURL;
    }
}

/**
 * Create safe table row from data
 * @param {Array} cells - Array of cell data (strings)
 * @returns {HTMLTableRowElement} - The table row
 */
function createSafeTableRow(cells) {
    const row = document.createElement('tr');

    cells.forEach(cellData => {
        const cell = document.createElement('td');
        cell.textContent = cellData;
        row.appendChild(cell);
    });

    return row;
}

/**
 * Safely populate a table
 * @param {HTMLTableElement} table - The table element
 * @param {Array<Array>} rows - Array of rows, each containing cell data
 */
function safePopulateTable(table, rows) {
    if (!table || !Array.isArray(rows)) return;

    // Clear existing rows
    const tbody = table.querySelector('tbody') || table;
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    // Add new rows
    rows.forEach(rowData => {
        tbody.appendChild(createSafeTableRow(rowData));
    });
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        safeSetText,
        escapeHTML,
        createSafeElement,
        appendSafeTexts,
        safeBuildHTML,
        safeReplaceContent,
        setTrustedHTML,
        sanitizeURL,
        safeSetHref,
        createSafeTableRow,
        safePopulateTable
    };
}
