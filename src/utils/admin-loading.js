// Admin Loading States & Skeleton Loaders
// Provides instant professional UX with no placeholder data flash

// Loading gate for entire page
function createPageLoadingGate() {
    const gate = document.createElement('div');
    gate.id = 'page-loading-gate';
    gate.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--bg-app);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: opacity 0.3s ease, visibility 0.3s ease;
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 48px;
        height: 48px;
        border: 3px solid var(--border-light);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    `;

    gate.appendChild(spinner);

    // Add spinner animation if not exists
    if (!document.getElementById('spinner-animation')) {
        const style = document.createElement('style');
        style.id = 'spinner-animation';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .fade-in {
                animation: fadeIn 0.4s ease forwards;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    return gate;
}

// Remove loading gate with fade out
function removeLoadingGate() {
    const gate = document.getElementById('page-loading-gate');
    if (gate) {
        gate.style.opacity = '0';
        gate.style.visibility = 'hidden';
        setTimeout(() => gate.remove(), 300);
    }
}

// Skeleton loader for metric cards
function createMetricSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'metric-card-skeleton';
    skeleton.style.cssText = `
        background: var(--bg-surface);
        border: 1px solid var(--border-light);
        border-radius: 8px;
        padding: 20px;
        animation: pulse 1.5s ease-in-out infinite;
    `;

    const valueSkeleton = document.createElement('div');
    valueSkeleton.style.cssText = `
        height: 32px;
        width: 80px;
        background: var(--bg-hover);
        border-radius: 4px;
        margin-bottom: 8px;
    `;

    const labelSkeleton = document.createElement('div');
    labelSkeleton.style.cssText = `
        height: 12px;
        width: 120px;
        background: var(--bg-hover);
        border-radius: 4px;
        margin-bottom: 8px;
    `;

    const changeSkeleton = document.createElement('div');
    changeSkeleton.style.cssText = `
        height: 12px;
        width: 140px;
        background: var(--bg-hover);
        border-radius: 4px;
    `;

    skeleton.appendChild(valueSkeleton);
    skeleton.appendChild(labelSkeleton);
    skeleton.appendChild(changeSkeleton);

    return skeleton;
}

// Skeleton loader for table rows
function createTableSkeleton(columns = 5, rows = 5) {
    const tbody = document.createElement('tbody');

    for (let i = 0; i < rows; i++) {
        const tr = document.createElement('tr');

        for (let j = 0; j < columns; j++) {
            const td = document.createElement('td');
            const skeleton = document.createElement('div');
            skeleton.style.cssText = `
                height: 16px;
                background: var(--bg-hover);
                border-radius: 4px;
                animation: pulse 1.5s ease-in-out infinite;
                animation-delay: ${i * 0.1}s;
            `;
            td.appendChild(skeleton);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }

    // Add pulse animation
    if (!document.getElementById('pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
        `;
        document.head.appendChild(style);
    }

    return tbody;
}

// Skeleton loader for card content
function createCardSkeleton(lines = 5) {
    const container = document.createElement('div');
    container.className = 'card-skeleton';
    container.style.padding = '20px';

    for (let i = 0; i < lines; i++) {
        const line = document.createElement('div');
        line.style.cssText = `
            height: 16px;
            background: var(--bg-hover);
            border-radius: 4px;
            margin-bottom: 12px;
            width: ${Math.random() * 30 + 70}%;
            animation: pulse 1.5s ease-in-out infinite;
            animation-delay: ${i * 0.1}s;
        `;
        container.appendChild(line);
    }

    return container;
}

// Hide element until ready
function hideUntilReady(selector) {
    const elements = typeof selector === 'string'
        ? document.querySelectorAll(selector)
        : [selector];

    elements.forEach(el => {
        if (el) {
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
            el.style.transition = 'opacity 0.4s ease, visibility 0.4s ease';
        }
    });
}

// Show element with fade-in
function showWithFadeIn(selector) {
    const elements = typeof selector === 'string'
        ? document.querySelectorAll(selector)
        : [selector];

    elements.forEach(el => {
        if (el) {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.classList.add('fade-in');
        }
    });
}

// Replace skeleton with real content
function replaceSkeletonWithContent(skeletonElement, contentElement) {
    if (skeletonElement && contentElement) {
        skeletonElement.replaceWith(contentElement);
        contentElement.classList.add('fade-in');
    }
}

// Show empty state (no data)
function showEmptyState(container, icon, title, message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.style.cssText = `
        text-align: center;
        padding: 60px 20px;
        color: var(--text-tertiary);
    `;

    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
    `;
    iconEl.textContent = icon;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-primary);
    `;
    titleEl.textContent = title;

    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        font-size: 14px;
        color: var(--text-secondary);
    `;
    messageEl.textContent = message;

    emptyState.appendChild(iconEl);
    emptyState.appendChild(titleEl);
    emptyState.appendChild(messageEl);

    // Clear container and append empty state
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(emptyState);
}

// Export API
window.adminLoading = {
    createPageLoadingGate,
    removeLoadingGate,
    createMetricSkeleton,
    createTableSkeleton,
    createCardSkeleton,
    hideUntilReady,
    showWithFadeIn,
    replaceSkeletonWithContent,
    showEmptyState
};
