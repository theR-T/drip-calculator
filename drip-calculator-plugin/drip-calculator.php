<?php
/**
 * Plugin Name: DRIP Calculator
 * Plugin URI: https://morrisonfinancial.com
 * Description: A calculator for showing DRIP investment returns vs regular investment returns
 * Version: 1.0.5
 * Author: Morrison Financial
 * Author URI: https://morrisonfinancial.com
 * License: GPL v2 or later
 * Text Domain: drip-calculator
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('DRIP_CALCULATOR_VERSION', '1.0.5');
define('DRIP_CALCULATOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('DRIP_CALCULATOR_PLUGIN_URL', plugin_dir_url(__FILE__));

// Enqueue scripts and styles
function drip_calculator_enqueue_scripts() {
    // Enqueue Chart.js from CDN first
    wp_enqueue_script('chartjs', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js', array(), '4.4.0', false);
    
    // Enqueue Montserrat font
    wp_enqueue_style('montserrat', 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap', array(), null);
    
    // Enqueue our custom styles
    wp_enqueue_style('drip-calculator-style', DRIP_CALCULATOR_PLUGIN_URL . 'css/styles-front.css', array(), DRIP_CALCULATOR_VERSION);
    wp_enqueue_style('drip-tooltip-style', DRIP_CALCULATOR_PLUGIN_URL . 'components/tooltipicon.css', array(), DRIP_CALCULATOR_VERSION);
    
    // Enqueue our custom script with Chart.js dependency
    wp_enqueue_script('drip-calculator-script', DRIP_CALCULATOR_PLUGIN_URL . 'js/calculator.js', array('chartjs'), DRIP_CALCULATOR_VERSION, true);

    // Localize script with plugin data
    wp_localize_script('drip-calculator-script', 'dripCalculator', array(
        'pluginUrl' => DRIP_CALCULATOR_PLUGIN_URL,
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('drip_calculator_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'drip_calculator_enqueue_scripts');

// Register shortcode
function drip_calculator_shortcode($atts) {
    // Parse shortcode attributes
    $atts = shortcode_atts(array(
        'initial_investment' => '50,000',
        'annual_rate' => '9.25',
        'years' => '20',
        'contribution_amount' => '0',
        'contribution_frequency' => '12'
    ), $atts, 'drip_calculator');

    ob_start();
    ?>
    <section id="drip-calculator">
        <h2>Mortgage Investment<br>Returns Calculator</h2>

        <label for="initialInvestment">Initial Investment ($)</label>
        <input id="initialInvestment" type="text" inputmode="numeric" step="10000" value="<?php echo esc_attr($atts['initial_investment']); ?>"/>

        <label for="annualRate">Annualized Distribution Yield (%)</label>
        <input id="annualRate" type="number" min="0" step="0.25" value="<?php echo esc_attr($atts['annual_rate']); ?>"/>

        <label for="years">Time Horizon (years)</label>
        <input id="years" type="number" min="1" step="1" value="<?php echo esc_attr($atts['years']); ?>"/>

        <label for="contributionAmount">Additional Contribution Amount ($)</label>
        <input id="contributionAmount" type="text" inputmode="numeric" value="<?php echo esc_attr($atts['contribution_amount']); ?>"/>

        <label for="contributionFrequency">Contribution Frequency (months)</label>
        <input id="contributionFrequency" type="number" min="1" step="1" value="<?php echo esc_attr($atts['contribution_frequency']); ?>"/>

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

// Plugin activation hook
register_activation_hook(__FILE__, 'drip_calculator_activate');
function drip_calculator_activate() {
    // Flush rewrite rules
    flush_rewrite_rules();
}

// Plugin deactivation hook
register_deactivation_hook(__FILE__, 'drip_calculator_deactivate');
function drip_calculator_deactivate() {
    // Flush rewrite rules
    flush_rewrite_rules();
}

 