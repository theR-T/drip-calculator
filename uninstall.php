<?php
/**
 * DRIP Calculator Uninstall
 * 
 * This file is executed when the plugin is deleted from WordPress admin.
 * It removes all plugin data from the database.
 */

// If uninstall not called from WordPress, then exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

/**
 * Remove all plugin data
 */
function drip_calculator_remove_plugin_data() {
    // Remove plugin options
    delete_option('drip_calculator_version');
    delete_option('drip_calculator_default_initial_investment');
    delete_option('drip_calculator_default_annual_rate');
    delete_option('drip_calculator_default_years');
    delete_option('drip_calculator_default_contribution_amount');
    delete_option('drip_calculator_default_contribution_frequency');
    
    // Remove any user meta data related to the plugin
    delete_metadata('user', 0, 'drip_calculator_preferences', '', true);
    delete_metadata('user', 0, 'drip_calculator_last_calculation', '', true);
    
    // Clear any transients
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_drip_calculator_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_drip_calculator_%'");
    
    // Remove any custom database tables if we had created any
    // (Currently we don't have any, but this is where they would be removed)
    
    // Clear any cached data
    wp_cache_flush();
    
    // Remove any uploaded files in the plugin directory
    $upload_dir = wp_upload_dir();
    $plugin_upload_dir = $upload_dir['basedir'] . '/drip-calculator/';
    if (is_dir($plugin_upload_dir)) {
        drip_calculator_remove_directory($plugin_upload_dir);
    }
    
    // Log the uninstall for debugging purposes
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('DRIP Calculator plugin: All data removed during uninstall');
    }
}

/**
 * Recursively remove directory and its contents
 */
function drip_calculator_remove_directory($dir) {
    if (!is_dir($dir)) {
        return false;
    }
    
    $files = array_diff(scandir($dir), array('.', '..'));
    foreach ($files as $file) {
        $path = $dir . DIRECTORY_SEPARATOR . $file;
        if (is_dir($path)) {
            drip_calculator_remove_directory($path);
        } else {
            unlink($path);
        }
    }
    return rmdir($dir);
}

// Execute the cleanup
drip_calculator_remove_plugin_data(); 