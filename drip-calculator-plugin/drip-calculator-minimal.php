<?php
/**
 * Plugin Name: DRIP Calculator Minimal
 * Plugin URI: https://morrisonfinancial.com
 * Description: A minimal calculator for showing DRIP investment returns vs regular investment returns
 * Version: 1.0.0
 * Author: Morrison Financial
 * Author URI: https://morrisonfinancial.com
 * License: GPL v2 or later
 * Text Domain: drip-calculator-minimal
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Register shortcode
function drip_calculator_minimal_shortcode($atts) {
    return '<div id="drip-calculator"><h2>DRIP Calculator</h2><p>Calculator will be loaded here.</p></div>';
}
add_shortcode('drip_calculator_minimal', 'drip_calculator_minimal_shortcode'); 