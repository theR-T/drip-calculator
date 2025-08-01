<?php

// if uninstall.php is not called by WordPress, die
if (!defined('WP_UNINSTALL_PLUGIN')) {
    die;
}

// Clean up plugin data when uninstalled
function mf_drip_calculator_uninstall_cleanup() {
    // Remove any plugin options (none currently exist)
    // delete_option('mf_drip_calculator_options');
    
    // Remove any transients (none currently exist)
    // delete_transient('mf_drip_calculator_cache');
    
    // Clear any scheduled events (none currently exist)
    // wp_clear_scheduled_hook('mf_drip_calculator_scheduled_event');
    
    // Note: This plugin currently doesn't store any persistent data
    // but this structure is ready for future enhancements
}

// Execute cleanup
mf_drip_calculator_uninstall_cleanup(); 