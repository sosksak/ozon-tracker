import re, shutil, datetime, subprocess, sys
p = 'index.html'
import glob, os
base = 'index_pre_v7_base.html'
if not os.path.exists(base): shutil.copy(p, base)
src = open(base, encoding='utf-8').read()

css = open('_v7.css', encoding='utf-8').read()
js  = open('_v7.js',  encoding='utf-8').read()

def rep(old, new, count=1):
    global src
    assert old in src, f'NOT FOUND: {old[:60]}'
    src = src.replace(old, new, count)

# 1. CSS before </style>
rep('</style>', css + '\n</style>')

# 2. Remove legacy wheel block, inject v7 JS before the end of main script
start = src.index('// --- Fortune Wheel ---')
end = src.index('// --- Contextual phrases for timer ---')
src = src[:start] + '// --- Fortune Wheel: see v7 block (window.openWheelModal / spinWheel) ---\n\n' + src[end:]
# main script ends at the first </script> after 'window.bootV6 = bootV6;'
anchor = 'window.bootV6 = bootV6;\n'
i = src.index(anchor) + len(anchor)
src = src[:i] + '\n' + js + '\n' + src[i:]

# 3. Branding
rep('<title>Life &amp; Work Tracker v6.1</title>', '<title>Life Tracker v7.0</title>')
rep('<div class="splash-title">OZON WORK</div>\n  <div class="splash-sub">TRACKER</div>', '<div class="splash-title">LIFE</div>\n  <div class="splash-sub">TRACKER</div>')
rep('<h1>📊 OZON WORK TRACKER</h1>\n  <div class="subtitle">Профессиональный учёт рабочего времени</div>', '<h1>🧭 LIFE TRACKER</h1>\n  <div class="subtitle">Работа · привычки · здоровье · финансы — всё в одном месте</div>')
rep("rp: { name: 'OZON Tracker', id: location.hostname }", "rp: { name: 'Life Tracker', id: location.hostname }")
rep('<div class="auth-title">OZON TRACKER</div>', '<div class="auth-title">LIFE TRACKER</div>')
rep("const APP_VERSION = 'v6.1.0';", "const APP_VERSION = 'v7.0.0';")
rep('<span class="fab-label">Бонусы</span>', '<span class="fab-label">Колесо бонусов</span>')

open(p, 'w', encoding='utf-8').write(src)

# sw / manifest
sw = open('sw.js', encoding='utf-8').read()
sw = sw.replace("const VERSION = 'v6.1.0';", "const VERSION = 'v7.0.0';").replace('// OZON Grind Tracker — service worker', '// Life Tracker — service worker').replace("'ozon-tracker-'", "'life-tracker-'")
open('sw.js', 'w', encoding='utf-8').write(sw)
mf = open('manifest.json', encoding='utf-8').read()
mf = mf.replace('"name": "Life & Work Tracker"', '"name": "Life Tracker"').replace('"short_name": "Tracker"', '"short_name": "Life Tracker"').replace('"Учёт смен, заработка, привычек, здоровья и финансов"', '"Трекер жизни: работа любого типа, привычки, здоровье, финансы, фокус и рефлексия"')
open('manifest.json', 'w', encoding='utf-8').write(mf)

# 4. Syntax check every inline script
scripts = re.findall(r'<script>(.*?)</script>', src, re.S)
for n, s in enumerate(scripts):
    fn = f'_chk_{n}.js'
    open(fn, 'w', encoding='utf-8').write(s)
    r = subprocess.run(['node', '--check', fn], capture_output=True, text=True)
    print(f'script #{n}: {len(s)//1024}KB ->', 'OK' if r.returncode == 0 else 'FAIL\n' + r.stderr[:1500])
print('lines:', src.count('\n'), 'size:', len(src)//1024, 'KB')
