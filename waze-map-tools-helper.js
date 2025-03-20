// ==UserScript==
// @name         Map Tools Helper for Waze Partners
// @namespace    https://cflsmartroads.com/
// @version      0.2.0
// @description  Improves the map tools UI in the Waze Partner Hub to make it easier to draw and manage routes.
// @author       Patti Shih Blough <patti.shih@dot.state.fl.us>
// @match        https://www.waze.com/partnerhub/*/traffic-view*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Local storage key for route check states (persist across browser sessions)
    const STORAGE_KEY = 'watchlistCheckedItems';

    // Session storage keys for hiding behavior (reset each browser session)
    const HIDE_CHECKED_KEY = 'hideChecked';
    const HIDE_UNCHECKED_KEY = 'hideUnchecked';

    // Load existing states
    let savedChecks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    /** Helper: are we hiding checked or unchecked routes? */
    function isHideChecked() {
        return sessionStorage.getItem(HIDE_CHECKED_KEY) === 'true';
    }
    function isHideUnchecked() {
        return sessionStorage.getItem(HIDE_UNCHECKED_KEY) === 'true';
    }

    /** Toggle the hide-checked session flag and re-apply. */
    function toggleHideChecked() {
        sessionStorage.setItem(HIDE_CHECKED_KEY, String(!isHideChecked()));
        applyHiding();
    }

    /** Toggle the hide-unchecked session flag and re-apply. */
    function toggleHideUnchecked() {
        sessionStorage.setItem(HIDE_UNCHECKED_KEY, String(!isHideUnchecked()));
        applyHiding();
    }

    /**
     * Loop all routes and hide them if:
     *   - hideChecked==true & route is checked
     *   - hideUnchecked==true & route is unchecked
     */
    function applyHiding() {
        document.querySelectorAll('app-traffic-view-route').forEach(route => {
            const checkbox = route.querySelector('.watchlist-checkbox');
            if (!checkbox) return;
            // Hide logic
            if (isHideChecked() && checkbox.checked) {
                route.style.display = 'none';
            } else if (isHideUnchecked() && !checkbox.checked) {
                route.style.display = 'none';
            } else {
                route.style.display = '';
            }
        });
    }

    /**
     * Clear all checked boxes, update localStorage, then re-apply hide logic.
     */
    function clearCheckmarks() {
        document.querySelectorAll('app-traffic-view-route').forEach(routeEl => {
            const nameEl = routeEl.querySelector('wz-subhead4');
            if (!nameEl) return;
            const routeName = nameEl.textContent.trim();

            const checkbox = routeEl.querySelector('.watchlist-checkbox');
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
                savedChecks[routeName] = false;
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedChecks));
        applyHiding();
    }

    /**
     * Return the HTML for each menu label.
     */
    function getHideCheckedLabelHTML() {
        return isHideChecked()
            ? 'Show<span style="font-size: large;">☑</span>'
            : 'Hide<span style="font-size: large;">☑</span>';
    }
    function getHideUncheckedLabelHTML() {
        return isHideUnchecked()
            ? 'Show<span style="font-size: large;">☐</span>'
            : 'Hide<span style="font-size: large;">☐</span>';
    }
    function getClearLabelHTML() {
        return '<span style="color: #e42828;">Clear all ✓</span>';
    }

    // Update the text (innerHTML) of the dropdown menu items based on current hide states
    function updateMenuLabels(hideCheckedItem, hideUncheckedItem) {
        hideCheckedItem.innerHTML = getHideCheckedLabelHTML();
        hideUncheckedItem.innerHTML = getHideUncheckedLabelHTML();
    }

    /**
     * Insert a checkbox into <app-traffic-view-route>, storing checked state in localStorage.
     */
    function addCheckboxToRoute(routeEl) {
        if (routeEl.querySelector('.watchlist-checkbox')) return;

        const nameEl = routeEl.querySelector('wz-subhead4');
        if (!nameEl) return;

        const routeName = nameEl.textContent.trim();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('watchlist-checkbox');
        checkbox.checked = !!savedChecks[routeName];

        checkbox.addEventListener('change', () => {
            savedChecks[routeName] = checkbox.checked;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedChecks));
            applyHiding();
        });

        nameEl.parentNode.insertBefore(checkbox, nameEl);
    }

    /**
     * Hide any <app-traffic-view-meter> elements (existing or newly added).
     */
    function hideMeters(node) {
        if (node.matches?.('app-traffic-view-meter')) {
            node.style.display = 'none';
        }
        node.querySelectorAll?.('app-traffic-view-meter').forEach(meter => {
            meter.style.display = 'none';
        });
    }

    /**
     * Add a <wz-button color="clear-icon"> with a dot-menu icon, plus a <wz-menu> inside the
     * <app-map-side-panel-header>, replicating the style of the route "..." menu.
     *
     * We'll manage the 'expanded' attribute ourselves for toggling.
     */
    function addWzDropdownMenuToHeader(headerEl) {
        // If we already added it, skip
        if (headerEl.querySelector('#my-watchlist-menu-container')) return;

        // Container div
        const container = document.createElement('div');
        container.id = 'my-watchlist-menu-container';
        container.style.display = 'inline-block';
        container.style.position = 'relative';
        container.style.marginLeft = '8px';

        // The WZ button
        // color="clear-icon" uses Waze's style for a transparent icon button
        // We add a slightly larger icon with inline style
        const wzButton = document.createElement('wz-button');
        wzButton.setAttribute('color', 'clear-icon');
        wzButton.style.cursor = 'pointer';

        const icon = document.createElement('i');
        icon.classList.add('w-icon', 'w-icon-dot-menu');
        icon.style.fontSize = '24px'; // Make the dot-menu icon bigger
        wzButton.appendChild(icon);

        // The WZ menu
        // We'll default to collapsed (expanded="false"), and toggle it on button click
        const wzMenu = document.createElement('wz-menu');
        wzMenu.setAttribute('expanded', 'false');
        wzMenu.id = 'my-watchlist-menu';

        // Build each menu item
        const clearItem = document.createElement('wz-menu-item');
        clearItem.id = 'clearItem';
        clearItem.innerHTML = getClearLabelHTML();
        clearItem.addEventListener('click', () => {
            wzMenu.setAttribute('expanded', 'false');
            if (!confirm('Are you sure you want to clear all checked items?')) return;
            clearCheckmarks();
        });

        const hideCheckedItem = document.createElement('wz-menu-item');
        hideCheckedItem.id = 'hideCheckedItem';
        hideCheckedItem.innerHTML = getHideCheckedLabelHTML();
        hideCheckedItem.addEventListener('click', () => {
            wzMenu.setAttribute('expanded', 'false');
            toggleHideChecked();
            // Update the labels in case we re-open
            updateMenuLabels(hideCheckedItem, hideUncheckedItem);
        });

        const hideUncheckedItem = document.createElement('wz-menu-item');
        hideUncheckedItem.id = 'hideUncheckedItem';
        hideUncheckedItem.innerHTML = getHideUncheckedLabelHTML();
        hideUncheckedItem.addEventListener('click', () => {
            wzMenu.setAttribute('expanded', 'false');
            toggleHideUnchecked();
            updateMenuLabels(hideCheckedItem, hideUncheckedItem);
        });

        wzMenu.appendChild(hideCheckedItem);
        wzMenu.appendChild(hideUncheckedItem);
        wzMenu.appendChild(clearItem);

        // Toggle menu on button click
        wzButton.addEventListener('click', ev => {
            ev.stopPropagation(); // So it won't close immediately if there's a doc-level listener
            const expanded = wzMenu.getAttribute('expanded') === 'true';
            if (expanded) {
                wzMenu.setAttribute('expanded', 'false');
            } else {
                // Update labels each time we open
                updateMenuLabels(hideCheckedItem, hideUncheckedItem);
                wzMenu.setAttribute('expanded', 'true');
            }
        });

        // If user clicks outside, close the menu
        document.addEventListener('click', () => {
            if (wzMenu.getAttribute('expanded') === 'true') {
                wzMenu.setAttribute('expanded', 'false');
            }
        });

        // Append everything
        container.appendChild(wzButton);
        container.appendChild(wzMenu);
        headerEl.appendChild(container);
    }

    /**
     * Observe new nodes. We:
     *   - Hide meters
     *   - Add checkboxes to routes
     *   - Insert WZ dropdown in the header
     *   - Hide "Unusual traffic" by default
     */
    function processNewNode(node) {
        if (node.nodeType !== 1) return;

        hideMeters(node);

        if (node.matches?.('app-traffic-view-route')) {
            addCheckboxToRoute(node);
            applyHiding();
        }

        // If it's the side panel header, insert our WZ menu
        if (node.matches?.('app-map-side-panel-header')) {
            addWzDropdownMenuToHeader(node);
        }

        // Descendants
        node.querySelectorAll?.('app-traffic-view-route').forEach(r => {
            addCheckboxToRoute(r);
            applyHiding();
        });
        node.querySelectorAll?.('app-map-side-panel-header').forEach(h => {
            addWzDropdownMenuToHeader(h);
        });
    }

    /***************************************************************************
     * Collapse the "Unusual traffic" section if it’s expanded (once)
     **************************************************************************/

    /**
     * Poll up to 100 times, every 300ms, to see if we can find an
     * <app-traffic-view-sidebar-section> with <wz-caption> text "Unusual traffic"
     * and a chevron <i class="w-icon w-icon-chevron-up">.
     * If found, we simulate a click to collapse (i.e., hide) it.
     */
    function collapseUnusualTraffic() {
        let attempts = 0;
        const maxAttempts = 100;

        const intervalID = setInterval(() => {
            attempts++;
            // Find all title sections
            const sections = document.querySelectorAll('app-traffic-view-sidebar-section.title-section.title');
            for (const section of sections) {
                const caption = section.querySelector('wz-caption');
                if (!caption) continue;
                const text = caption.textContent.trim().toLowerCase();
                if (text.includes('unusual traffic')) {
                    // Found the unusual traffic section
                    const chevron = section.querySelector('i.w-icon-chevron-up');
                    if (chevron) {
                        // It's currently "up," meaning it's open. We want to click it
                        // so that the page event toggles it to "down" & removes routes from the DOM
                        chevron.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true
                        }));
                    }
                    clearInterval(intervalID);
                    return;
                }
            }
            if (attempts >= maxAttempts) {
                clearInterval(intervalID);
            }
        }, 300);
    }

    /**
     * Initial pass on page load.
     */
    function processExistingElements() {
        // Hide existing meters
        document.querySelectorAll('app-traffic-view-meter').forEach(m => {
            m.style.display = 'none';
        });

        // Add checkboxes to existing routes
        document.querySelectorAll('app-traffic-view-route').forEach(r => {
            addCheckboxToRoute(r);
        });

        // Insert the WZ menu in the header if found
        const header = document.querySelector('app-map-side-panel-header');
        if (header) {
            addWzDropdownMenuToHeader(header);
        }

        // Hide "Unusual traffic"
        collapseUnusualTraffic();

        // Apply hide settings
        applyHiding();
    }

    // MutationObserver for dynamic changes
    const observer = new MutationObserver(mutations => {
        for (const mut of mutations) {
            for (const addedNode of mut.addedNodes) {
                processNewNode(addedNode);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial run
    processExistingElements();
})();
