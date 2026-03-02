import os

BASE = '/mnt/DATA/HYNK/Personal/Personal/MtB/ShiftV_Project'

files = {
    'src/doctor-module/core/doctor-engine.js': '../../ui/icon-paths.js',
    'src/doctor-module/core/ftm-analyzer.js': '../../ui/icon-paths.js',
    'src/doctor-module/core/health-evaluator.js': '../../ui/icon-paths.js',
    'src/doctor-module/core/mtf-analyzer.js': '../../ui/icon-paths.js',
    'src/doctor-module/core/symptom-analyzer.js': '../../ui/icon-paths.js',
    'src/doctor-module/core/trend-predictor.js': '../../ui/icon-paths.js',
    'src/ui/components/streak-strip.js': '../icon-paths.js',
    'src/ui/components/sv-cards.js': '../icon-paths.js',
    'src/ui/medication-selector.js': './icon-paths.js',
    'src/ui/symptom-selector.js': './icon-paths.js',
    'src/ui/modals/action-guide-modal.js': '../icon-paths.js',
    'src/ui/modals/ai-advisor-modal.js': '../icon-paths.js',
    'src/ui/modals/body-briefing-modal.js': '../icon-paths.js',
    'src/ui/modals/change-roadmap-modal.js': '../icon-paths.js',
    'src/ui/modals/health-modal.js': '../icon-paths.js',
    'src/ui/modals/onboarding-flow.js': '../icon-paths.js',
    'src/ui/modals/quest-modal.js': '../icon-paths.js',
}

for filepath, import_path in files.items():
    full = os.path.join(BASE, filepath)
    with open(full, 'r') as f:
        content = f.read()

    if 'icon-paths' in content[:2000]:
        print(f"SKIP (already imported): {filepath}")
        continue

    import_line = f"import {{ svgIcon }} from '{import_path}';"
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') and ' from ' in stripped:
            last_import_idx = i

    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
        print(f"ADDED after line {last_import_idx + 1}: {filepath}")
    else:
        lines.insert(0, import_line)
        print(f"ADDED at top: {filepath}")

    with open(full, 'w') as f:
        f.write('\n'.join(lines))

print("\nDone!")
