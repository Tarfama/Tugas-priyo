/**
 * js/auth-header.js
 * Wrapper ke navbar-dropdown.js untuk kompatibilitas script lama.
 */
// Load navbar-dropdown logic
(function() {
    const script = document.createElement('script');
    script.src = 'js/navbar-dropdown.js';
    document.head.appendChild(script);
})();
