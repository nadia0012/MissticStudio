<?php
// =====================================================
// CONFIGURATION DES LIMITES DE UPLOAD
// =====================================================
// Ces valeurs servent de backup si .htaccess ne fonctionne pas

@ini_set('upload_max_filesize', '50M');
@ini_set('post_max_size', '50M');
@ini_set('max_file_uploads', '20');
@ini_set('max_execution_time', '60');
@ini_set('memory_limit', '256M');

// Debug: Log les limites réelles
define('UPLOAD_LIMIT', min(
    parsePhpIniSize(ini_get('upload_max_filesize')),
    parsePhpIniSize(ini_get('post_max_size'))
));

function parsePhpIniSize($value) {
    $value = trim($value);
    $last = strtolower($value[strlen($value)-1]);
    $value = substr($value, 0, -1);
    
    switch ($last) {
        case 'g': $value *= 1024;
        case 'm': $value *= 1024;
        case 'k': $value *= 1024;
    }
    
    return $value;
}
