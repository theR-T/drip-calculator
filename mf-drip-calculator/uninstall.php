<?php

// if uninstall.php is not called by WordPress, die
if (!defined('WP_UNINSTALL_PLUGIN')) {
    die;
}

// Nothing to clean up in this version.
// Future versions might store options or create tables, 
// and the cleanup code for that would go here. 