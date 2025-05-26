<?php
/**
 * Plugin Name: DRIP Calculator
 * Plugin URI: https://morrisonfinancial.com
 * Description: A calculator for showing DRIP investment returns
 * Version: 1.0
 * Author: Morrison Financial
 * Author URI: https://morrisonfinancial.com
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('DRIP_CALCULATOR_VERSION', '1.0');
define('DRIP_CALCULATOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('DRIP_CALCULATOR_PLUGIN_URL', plugin_dir_url(__FILE__));

// Register activation hook
register_activation_hook(__FILE__, 'drip_calculator_activate');

// Register deactivation hook
register_deactivation_hook(__FILE__, 'drip_calculator_deactivate');

/**
 * Plugin activation
 */
function drip_calculator_activate() {
    // Set default options
    add_option('drip_calculator_version', DRIP_CALCULATOR_VERSION);
    add_option('drip_calculator_default_initial_investment', '50000');
    add_option('drip_calculator_default_annual_rate', '9.25');
    add_option('drip_calculator_default_years', '20');
    add_option('drip_calculator_default_contribution_amount', '0');
    add_option('drip_calculator_default_contribution_frequency', '12');
    
    // Log activation
    error_log('DRIP Calculator plugin activated');
}

/**
 * Plugin deactivation
 */
function drip_calculator_deactivate() {
    // Clear any scheduled events if we had any
    wp_clear_scheduled_hook('drip_calculator_cleanup');
    
    // Log deactivation
    error_log('DRIP Calculator plugin deactivated');
}

// Enqueue necessary scripts and styles
function drip_calculator_enqueue_scripts() {
    // Enqueue Chart.js from CDN
    wp_enqueue_script('chartjs', 'https://cdn.jsdelivr.net/npm/chart.js', array(), '4.0.0', true);
    
    // Enqueue Montserrat font
    wp_enqueue_style('montserrat', 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap', array(), null);
    
    // Enqueue our custom styles
    wp_enqueue_style('drip-calculator-style', plugins_url('styles-front.css', __FILE__), array(), '1.0.0');
    wp_enqueue_style('drip-tooltip-style', plugins_url('components/tooltipicon.css', __FILE__), array(), '1.0.0');
    
    // Enqueue our custom script
    wp_enqueue_script('drip-calculator-script', plugins_url('js/calculator.js', __FILE__), array('chartjs', 'jquery'), '1.0.0', true);

    // Localize script with plugin data and nonce
    wp_localize_script('drip-calculator-script', 'dripCalculator', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'pluginUrl' => plugins_url('', __FILE__),
        'nonce' => wp_create_nonce('drip_calculator_nonce'),
        'emailEndpoint' => 'drip_calculator_email',
        'defaultValues' => array(
            'initialInvestment' => get_option('drip_calculator_default_initial_investment', '50000'),
            'annualRate' => get_option('drip_calculator_default_annual_rate', '9.25'),
            'years' => get_option('drip_calculator_default_years', '20'),
            'contributionAmount' => get_option('drip_calculator_default_contribution_amount', '0'),
            'contributionFrequency' => get_option('drip_calculator_default_contribution_frequency', '12')
        )
    ));
}
add_action('wp_enqueue_scripts', 'drip_calculator_enqueue_scripts');

// Add AJAX endpoint for email functionality
function drip_calculator_email() {
    // Verify nonce
    if (!check_ajax_referer('drip_calculator_nonce', 'nonce', false)) {
        wp_send_json_error('Invalid security token');
        wp_die();
    }

    // Get POST data
    $data = isset($_POST['data']) ? sanitize_text_field($_POST['data']) : '';
    $email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
    
    if (empty($email)) {
        wp_send_json_error('Email address is required');
        wp_die();
    }

    // Email headers
    $headers = array('Content-Type: text/csv; charset=utf-8');
    
    // Send email with data attachment
    $sent = wp_mail(
        $email,
        'DRIP Returns Data',
        'Please find your DRIP calculator results attached.',
        $headers,
        array(
            array(
                'content' => $data,
                'filename' => 'drip_returns.csv',
                'type' => 'text/csv'
            )
        )
    );

    if ($sent) {
        wp_send_json_success('Data sent successfully');
    } else {
        wp_send_json_error('Failed to send email');
    }
    wp_die();
}
add_action('wp_ajax_drip_calculator_email', 'drip_calculator_email');
add_action('wp_ajax_nopriv_drip_calculator_email', 'drip_calculator_email');

// Register shortcode
function drip_calculator_shortcode() {
    ob_start();
    ?>
    <section id="drip-calculator">
        <h2>Mortgage Investment<br>Returns Calculator</h2>

        <label for="initialInvestment">Initial Investment ($)</label>
        <input id="initialInvestment" type="text" inputmode="numeric" step="10000" value="50,000"/>

        <label for="annualRate">Annualized Distribution Yield (%)</label>
        <input id="annualRate" type="number" min="0" step="0.25" value="9.25"/>

        <label for="years">Time Horizon (years)</label>
        <input id="years" type="number" min="1" step="1" value="20"/>

        <label for="contributionAmount">Additional Contribution Amount ($)</label>
        <input id="contributionAmount" type="text" inputmode="numeric" value="0"/>

        <label for="contributionFrequency">Contribution Frequency (months)</label>
        <input id="contributionFrequency" type="number" min="1" step="1" value="12"/>

        <button id="calculateDrip">Calculate</button>

        <div id="dripResults" aria-live="polite"></div>
        <div class="chart-container">
            <div class="chart-wrapper">
                <canvas id="dripChart"></canvas>
            </div>
        </div>
        <div class="table-controls">
            <button id="toggleView">Show Details by Month</button>
        </div>
        <div class="drip-table-wrapper">
            <div id="dripTableContainer"></div>
        </div>
        <div id="dripActions">
            <button id="downloadCsv">Export CSV</button>
            <button id="downloadChart">Download Chart</button>
            <button id="emailData">Email Data</button>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('drip_calculator', 'drip_calculator_shortcode'); 