<?php
header('Content-Type: application/json');

// Parse PHP ini values to bytes
function parseSize($value) {
    $value = trim($value);
    if (!$value) return 0;
    
    $last = strtolower($value[strlen($value)-1]);
    $value = (int)$value;
    
    switch ($last) {
        case 'g': $value *= 1024 * 1024 * 1024; break;
        case 'm': $value *= 1024 * 1024; break;
        case 'k': $value *= 1024; break;
    }
    
    return $value;
}

$upload_max = (int)ini_get('upload_max_filesize');
$post_max = (int)ini_get('post_max_size');
$max_uploads = (int)ini_get('max_file_uploads');

echo json_encode([
    'upload_max_filesize' => [
        'raw' => ini_get('upload_max_filesize'),
        'bytes' => parseSize(ini_get('upload_max_filesize')),
        'mb' => round(parseSize(ini_get('upload_max_filesize')) / 1024 / 1024, 5)
    ],
    'post_max_size' => [
        'raw' => ini_get('post_max_size'),
        'bytes' => parseSize(ini_get('post_max_size')),
        'mb' => round(parseSize(ini_get('post_max_size')) / 1024 / 1024, 5)
    ],
    'max_file_uploads' => $max_uploads,
    'effective_limit_mb' => round(min(parseSize(ini_get('upload_max_filesize')), parseSize(ini_get('post_max_size'))) / 1024 / 1024, 5),
    'memory_limit' => [
        'raw' => ini_get('memory_limit'),
        'bytes' => parseSize(ini_get('memory_limit')),
        'mb' => round(parseSize(ini_get('memory_limit')) / 1024 / 1024, 5)
    ]
], JSON_PRETTY_PRINT);
?>
