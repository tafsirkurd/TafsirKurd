// Text Highlighter - Highlights Kurdish text from admin panel "Show Location"
(function() {
    // Check if there's text to highlight
    const highlightText = sessionStorage.getItem('highlightText');
    const highlightTime = sessionStorage.getItem('highlightTime');

    // Only highlight if set within last 10 seconds (to avoid stale highlights)
    if (highlightText && highlightTime && (Date.now() - highlightTime < 10000)) {

        // Wait for page to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', highlightKurdishText);
        } else {
            highlightKurdishText();
        }

        function highlightKurdishText() {
            // Find all text nodes containing the Kurdish text
            const elementsFound = [];

            // Search in body
            findAndHighlight(document.body, highlightText, elementsFound);

            if (elementsFound.length > 0) {
                // Scroll to first highlighted element
                elementsFound[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Show notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    color: white;
                    padding: 20px 30px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(79, 172, 254, 0.4);
                    z-index: 10001;
                    font-weight: 600;
                    animation: fadeIn 0.3s ease;
                `;
                notification.innerHTML = `
                    <div style="font-size: 24px; margin-bottom: 5px;">✨</div>
                    <div>Text highlighted!</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">Found ${elementsFound.length} occurrence(s)</div>
                `;
                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.3s';
                    setTimeout(() => notification.remove(), 300);
                }, 4000);

                // Clear the session storage
                sessionStorage.removeItem('highlightText');
                sessionStorage.removeItem('highlightTime');
            }
        }

        function findAndHighlight(element, text, foundElements) {
            // Skip script, style, and other non-visible elements
            if (element.nodeType === Node.ELEMENT_NODE) {
                const tagName = element.tagName.toLowerCase();
                if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
                    return;
                }
            }

            // If it's a text node, check if it contains our text
            if (element.nodeType === Node.TEXT_NODE) {
                const content = element.textContent;
                if (content.includes(text)) {
                    // Wrap the text in a highlight span
                    const parent = element.parentNode;
                    const wrapper = document.createElement('span');

                    // Split the text and create highlighted version
                    const parts = content.split(text);
                    const fragment = document.createDocumentFragment();

                    parts.forEach((part, i) => {
                        if (i > 0) {
                            // Add highlighted text
                            const highlight = document.createElement('mark');
                            highlight.textContent = text;
                            highlight.style.cssText = `
                                background: linear-gradient(135deg, #fff3cd 0%, #ffeb3b 50%);
                                color: #000;
                                font-weight: 900;
                                padding: 4px 8px;
                                border-radius: 4px;
                                box-shadow: 0 2px 8px rgba(255, 235, 59, 0.5);
                                animation: pulse 2s ease-in-out 3;
                                font-size: 1.1em;
                            `;
                            fragment.appendChild(highlight);
                            foundElements.push(highlight);
                        }
                        // Add regular text
                        if (part) {
                            fragment.appendChild(document.createTextNode(part));
                        }
                    });

                    parent.replaceChild(fragment, element);
                }
            } else if (element.nodeType === Node.ELEMENT_NODE) {
                // Recursively search child nodes
                const children = Array.from(element.childNodes);
                children.forEach(child => findAndHighlight(child, text, foundElements));
            }
        }
    }

    // Add CSS animation
    if (!document.getElementById('highlight-animations')) {
        const style = document.createElement('style');
        style.id = 'highlight-animations';
        style.textContent = `
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 2px 8px rgba(255, 235, 59, 0.5);
                }
                50% {
                    transform: scale(1.05);
                    box-shadow: 0 4px 16px rgba(255, 235, 59, 0.8);
                }
            }
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
})();
