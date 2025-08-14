<?php

// Abort if not called by WordPress
if (!defined('WP_UNINSTALL_PLUGIN')) {
    die;
}

/**
 * Cleanup hook executed on plugin uninstall.
 * Currently a no-op; scaffold left for future data storage.
 */
function mf_drip_calculator_uninstall_cleanup() {
    // Example placeholders (uncomment when options/transients/events are introduced):
    // delete_option('mf_drip_calculator_options');
    // delete_transient('mf_drip_calculator_cache');
    // wp_clear_scheduled_hook('mf_drip_calculator_scheduled_event');
}

mf_drip_calculator_uninstall_cleanup();