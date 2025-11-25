/**
 * Floating Admin Access Button
 * Adds a floating button to access admin dashboard from any page
 */

(function() {
    'use strict';

    // Don't show on admin page itself
    if (window.location.pathname.includes('admin.html')) {
        return;
    }

    // Show to everyone - admin page has its own authentication
    // If you want to restrict visibility, modify this section

    // Create the floating button
    const adminButton = document.createElement('div');
    adminButton.id = 'floating-admin-button';
    adminButton.innerHTML = `
        <button onclick="window.location.href='/admin.html'"
                style="
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
                    background-size: 200% 200%;
                    animation: gradientShift 3s ease infinite;
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    padding: 14px 24px;
                    border-radius: 50px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
                    z-index: 9999;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(10px);
                    transform: translateY(0);
                "
                onmouseover="
                    this.style.transform='translateY(-4px) scale(1.05)';
                    this.style.boxShadow='0 12px 35px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
                    this.style.borderColor='rgba(255, 255, 255, 0.2)';
                "
                onmouseout="
                    this.style.transform='translateY(0) scale(1)';
                    this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset';
                    this.style.borderColor='rgba(255, 255, 255, 0.1)';
                "
                title="Go to Admin Dashboard">
            <span style="font-size: 20px;">🎛️</span>
            <span>Admin</span>
        </button>
    `;

    // Add gradient animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            #floating-admin-button button {
                bottom: 20px !important;
                right: 20px !important;
                padding: 12px 20px !important;
                font-size: 14px !important;
            }
        }

        /* RTL support */
        [dir="rtl"] #floating-admin-button button {
            right: auto;
            left: 30px;
        }

        @media (max-width: 768px) {
            [dir="rtl"] #floating-admin-button button {
                left: 20px !important;
                right: auto !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Add button to page when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(adminButton);
        });
    } else {
        document.body.appendChild(adminButton);
    }
})();
