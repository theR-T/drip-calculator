# DRIP Calculator WordPress Plugin

A WordPress plugin that provides a comprehensive DRIP (Dividend Reinvestment Plan) calculator to help users understand the benefits of dividend reinvestment over time.

## Features

- **Interactive Calculator**: Calculate investment returns with and without dividend reinvestment
- **Visual Charts**: Dynamic charts showing investment growth over time
- **Detailed Tables**: Monthly and yearly breakdowns of investment performance
- **Export Options**: Download results as CSV or chart images
- **Email Functionality**: Send calculation results via email
- **Responsive Design**: Works on desktop and mobile devices
- **WordPress Integration**: Seamless integration with WordPress themes

## Installation

1. Upload the `drip-calculator` folder to your `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Use the shortcode `[drip_calculator]` on any page or post where you want the calculator to appear

## Usage

### Shortcode
```
[drip_calculator]
```

### Calculator Inputs
- **Initial Investment**: Starting investment amount
- **Annualized Distribution Yield**: Expected annual dividend yield percentage
- **Time Horizon**: Investment period in years
- **Additional Contribution Amount**: Regular additional investments
- **Contribution Frequency**: How often additional contributions are made (in months)

### Features
- **Calculate Button**: Runs the calculation and displays results
- **Toggle View**: Switch between monthly and yearly detail views
- **Export CSV**: Download calculation results as a CSV file
- **Download Chart**: Save the investment chart as a PNG image
- **Email Data**: Send calculation results to an email address

## Plugin Data

The plugin stores the following data in your WordPress database:

### Options Table
- `drip_calculator_version`: Plugin version number
- `drip_calculator_default_initial_investment`: Default initial investment value
- `drip_calculator_default_annual_rate`: Default annual rate value
- `drip_calculator_default_years`: Default time horizon value
- `drip_calculator_default_contribution_amount`: Default contribution amount
- `drip_calculator_default_contribution_frequency`: Default contribution frequency

### Transients
- Temporary cached data with prefix `drip_calculator_`

### User Meta (if applicable)
- `drip_calculator_preferences`: User-specific calculator preferences
- `drip_calculator_last_calculation`: Last calculation data

## Uninstalling the Plugin

### Complete Data Removal

When you delete the plugin through the WordPress admin interface, all plugin data will be automatically removed from your database. This includes:

1. **Plugin Options**: All settings and default values
2. **User Meta Data**: Any user-specific calculator data
3. **Transients**: All cached calculation data
4. **Uploaded Files**: Any files created by the plugin
5. **Cache**: All cached data will be flushed

### Manual Cleanup (if needed)

If you need to manually clean up plugin data, you can run the following SQL queries in your database:

```sql
-- Remove plugin options
DELETE FROM wp_options WHERE option_name LIKE 'drip_calculator_%';

-- Remove transients
DELETE FROM wp_options WHERE option_name LIKE '_transient_drip_calculator_%';
DELETE FROM wp_options WHERE option_name LIKE '_transient_timeout_drip_calculator_%';

-- Remove user meta
DELETE FROM wp_usermeta WHERE meta_key LIKE 'drip_calculator_%';
```

### Deactivation vs. Uninstall

- **Deactivation**: Disables the plugin but keeps all data intact
- **Uninstall/Delete**: Removes the plugin AND all associated data

## Security Features

- **Nonce Verification**: All AJAX requests are protected with WordPress nonces
- **Input Sanitization**: All user inputs are properly sanitized
- **Email Validation**: Email addresses are validated before sending
- **Access Control**: Proper WordPress capability checks

## Technical Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Modern web browser with JavaScript enabled

## Support

For support or questions about this plugin, please contact Morrison Financial.

## Changelog

### Version 1.0
- Initial release
- Basic DRIP calculation functionality
- Chart visualization
- Export capabilities
- Email functionality
- WordPress integration
- Uninstall hooks for data cleanup 