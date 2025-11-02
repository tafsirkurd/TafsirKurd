/**
 * Auto Kurdish Number Converter
 * Automatically converts all displayed numbers to Kurdish numerals on page load
 * Works across all pages with IBM Plex Sans Arabic font
 */

(function() {
    'use strict';

    // Wait for KurdishNumbers utility to be loaded
    function waitForKurdishNumbers() {
        return new Promise((resolve) => {
            if (window.KurdishNumbers) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.KurdishNumbers) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            }
        });
    }

    // Convert all number text nodes in the document
    function convertNumbersInElement(element) {
        if (!window.KurdishNumbers) return;

        // Skip script, style, and input elements
        const tagsToSkip = ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'CODE', 'PRE'];
        if (tagsToSkip.includes(element.tagName)) return;

        // Process text nodes
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip if parent is a tag we want to skip
                    let parent = node.parentElement;
                    while (parent) {
                        if (tagsToSkip.includes(parent.tagName)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        // Skip elements with class 'no-kurdish-convert'
                        if (parent.classList && parent.classList.contains('no-kurdish-convert')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        parent = parent.parentElement;
                    }
                    // Only process if contains digits
                    if (/\d/.test(node.textContent)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        const nodesToConvert = [];
        let node;
        while (node = walker.nextNode()) {
            nodesToConvert.push(node);
        }

        // Convert the numbers
        nodesToConvert.forEach(textNode => {
            const originalText = textNode.textContent;
            const convertedText = window.KurdishNumbers.toKurdish(originalText);
            if (originalText !== convertedText) {
                textNode.textContent = convertedText;
            }
        });
    }

    // Observe DOM changes and convert new numbers
    function setupMutationObserver() {
        if (!window.KurdishNumbers) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        convertNumbersInElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize conversion
    async function init() {
        await waitForKurdishNumbers();

        // Convert existing numbers
        convertNumbersInElement(document.body);

        // Setup observer for dynamic content
        setupMutationObserver();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
