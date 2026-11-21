<?php

/**
 * Aturan format kode PHP: PSR-12 ditambah beberapa aturan kerapian.
 * Dijalankan lewat `composer lint` (cek) dan `composer lint:fix` (perbaiki).
 */

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__)
    ->exclude(['vendor', 'runtime', 'web/assets'])
    ->append([__DIR__ . '/yii']);

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(false)
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'no_unused_imports' => true,
        'single_quote' => true,
        'trailing_comma_in_multiline' => ['elements' => ['arrays']],
    ])
    ->setFinder($finder);
