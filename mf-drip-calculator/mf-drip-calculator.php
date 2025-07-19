<?php
/**
 * Plugin Name:       Mortgage Investment Returns Calculator
 * Description:       A calculator for DRIP investment returns. Use the shortcode [mf_drip_calculator] to display.
 * Version:           1.7.5
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

        wp_enqueue_style( 'mf-drip-calculator-styles', plugin_dir_url( __FILE__ ) . 'assets/css/styles-front.css', [], $style_ver );
        wp_enqueue_style( 'mf-tooltip-icon-styles', plugin_dir_url( __FILE__ ) . 'assets/css/tooltipicon.css', [], $tooltip_ver );
        wp_enqueue_script( 'chart-js', 'https://cdn.jsdelivr.net/npm/chart.js', [], '4.4.1', true );
        wp_enqueue_script( 'mf-drip-calculator-js', plugin_dir_url( __FILE__ ) . 'assets/js/calculator.js', ['chart-js'], '1.0.0', true );
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
        <h2>Mortgage Investment<br>Returns Calculator</h2>

        <label for="initialInvestment-<?php echo $instance; ?>">Initial Investment ($)</label>
        <input id="initialInvestment-<?php echo $instance; ?>" class="mf-initialInvestment" type="text" inputmode="numeric" step="10000" value="50,000"/>

        <label for="annualRate-<?php echo $instance; ?>">Annualized Distribution Yield (%)</label>
        <input id="annualRate-<?php echo $instance; ?>" class="mf-annualRate" type="number" min="0" step="0.25" value="9.25"/>

        <label for="years-<?php echo $instance; ?>">Time Horizon (years)</label>
        <input id="years-<?php echo $instance; ?>" class="mf-years" type="number" min="1" step="1" value="20"/>

        <label for="contributionAmount-<?php echo $instance; ?>">Additional Contribution Amount ($)</label>
        <input id="contributionAmount-<?php echo $instance; ?>" class="mf-contributionAmount" type="text" inputmode="numeric" value="0"/>

        <label for="contributionFrequency-<?php echo $instance; ?>">Contribution Frequency (months)</label>
        <input id="contributionFrequency-<?php echo $instance; ?>" class="mf-contributionFrequency" type="number" min="1" step="1" value="12"/>

        <button class="mf-calculateDrip">Calculate</button>

        <div class="mf-dripResults" aria-live="polite"></div>
        <div class="chart-container">
            <div class="chart-wrapper">
                <canvas class="mf-dripChart"></canvas>
            </div>
        </div>
        <div class="table-controls">
            <button class="mf-toggleView">Show Details by Month</button>
        </div>
        <div class="drip-table-wrapper">
            <div class="mf-dripTableContainer"></div>
        </div>
        <div class="dripActions">
            <button class="mf-downloadCsv btn-green">Export CSV</button>
            <button class="mf-downloadChart btn-green">Download Graph</button>
            <button class="mf-emailData btn-green">Email Data</button>
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