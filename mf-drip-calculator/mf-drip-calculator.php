<?php
/**
 * Plugin Name:       Mortgage Investment Returns Calculator
 * Description:       A calculator for DRIP investment returns. Use the shortcode [mf_drip_calculator] to display.
 * Version:           1.9.8
 * Author:            Ryan
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       mf-drip-calculator
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

function mf_drip_calculator_enqueue_scripts() {
    global $post;
    if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'mf_drip_calculator' ) ) {
        $style_ver = filemtime(plugin_dir_path(__FILE__) . 'assets/css/styles-front.css');
        $tooltip_ver = filemtime(plugin_dir_path(__FILE__) . 'assets/css/tooltipicon.css');
        $js_ver = filemtime(plugin_dir_path(__FILE__) . 'assets/js/calculator.js');

        wp_enqueue_style( 'mf-drip-calculator-styles', plugin_dir_url( __FILE__ ) . 'assets/css/styles-front.css', [], $style_ver );
        wp_enqueue_style( 'mf-tooltip-icon-styles', plugin_dir_url( __FILE__ ) . 'assets/css/tooltipicon.css', [], $tooltip_ver );
        wp_enqueue_script( 'chart-js', 'https://cdn.jsdelivr.net/npm/chart.js', [], '4.4.1', true );
        wp_enqueue_script( 'mf-drip-calculator-js', plugin_dir_url( __FILE__ ) . 'assets/js/calculator.js', ['chart-js'], $js_ver, true );
    }
}
add_action( 'wp_enqueue_scripts', 'mf_drip_calculator_enqueue_scripts' );

function mf_drip_calculator_shortcode() {
    static $instance = 0;
    $instance++;
    $calculator_id = 'mf-drip-calculator-' . $instance;

    $image_url = plugin_dir_url( __FILE__ ) . 'assets/images/MorrisonM.png';

    // Add an inline script to initialize this specific calculator instance.
    $init_script = sprintf(
        "document.addEventListener('DOMContentLoaded', function() { if (typeof initializeDripCalculator === 'function') { initializeDripCalculator('%s', '%s'); } });",
        esc_js( $calculator_id ),
        esc_js( $image_url )
    );
    wp_add_inline_script( 'mf-drip-calculator-js', $init_script );
    
    ob_start();
    ?>
    <section id="<?php echo esc_attr($calculator_id); ?>" class="drip-calculator-container">
        <label for="initial-investment-<?php echo $instance; ?>" class="light-text">Initial Investment ($)</label>
        <input id="initial-investment-<?php echo $instance; ?>" class="mf-initial-investment" type="text" inputmode="numeric" step="10000" value="50,000"/>

        <label for="annual-rate-<?php echo $instance; ?>" class="light-text">Annualized Distribution Yield (%)</label>
        <input id="annual-rate-<?php echo $instance; ?>" class="mf-annual-rate" type="number" min="0" step="0.25" value="9.25"/>

        <label for="years-<?php echo $instance; ?>" class="light-text">Time Horizon (years)</label>
        <input id="years-<?php echo $instance; ?>" class="mf-years" type="number" min="1" step="1" value="20"/>

        <label for="contribution-amount-<?php echo $instance; ?>" class="light-text">Additional Contribution Amount ($)</label>
        <input id="contribution-amount-<?php echo $instance; ?>" class="mf-contribution-amount" type="text" inputmode="numeric" value="0"/>

        <label for="contribution-frequency-<?php echo $instance; ?>" class="light-text">Contribution Frequency (months)</label>
        <input id="contribution-frequency-<?php echo $instance; ?>" class="mf-contribution-frequency" type="number" min="1" step="1" value="12"/>

        <button class="mf-calculate-drip">Calculate</button>

        <div class="mf-drip-results" aria-live="polite"></div>
        <div class="chart-container">
            <div class="chart-wrapper">
                <canvas class="mf-drip-chart"></canvas>
            </div>
        </div>
        <div class="table-controls">
            <button class="mf-toggle-view">Show Details by Month</button>
        </div>
        <div class="drip-table-wrapper">
            <div class="mf-drip-table-container"></div>
        </div>
        <div class="drip-actions">
            <button class="mf-download-chart btn-green">Download Graph</button>
            <button class="mf-download-csv btn-green">Export CSV</button>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode( 'mf_drip_calculator', 'mf_drip_calculator_shortcode' );

function mf_drip_calculator_activate() {
    // Activation code here.
}
register_activation_hook( __FILE__, 'mf_drip_calculator_activate' );

function mf_drip_calculator_deactivate() {
    // Deactivation code here.
}
register_deactivation_hook( __FILE__, 'mf_drip_calculator_deactivate' ); 