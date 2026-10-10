#!/usr/bin/env python3
"""
Life Tracker — сборка production-файлов.

    src/app.html  ──►  index.html   (минифицированные CSS/JS, <meta app-version>)
    src/sw.js     ──►  sw.js        (VERSION = APP_VERSION из app.html)

Запуск:  python build.py          (нужны node + npx; terser и csso ставятся сами)
         python build.py --no-min (быстрая сборка без минификации — для отладки)

Правила:
  • Правим ТОЛЬКО src/*. index.html и sw.js — артефакты, руками не трогать.
  • Версия задаётся один раз: `const APP_VERSION = 'vX.Y.Z';` в src/app.html.
    Сборщик прокидывает её в <title>, <meta name="app-version"> и sw.js —
    именно по этой мете service worker понимает, что вышла новая сборка.
  • После сборки каждый inline-скрипт прогоняется через `node --check`:
    один лишний backtick ломает весь 350 KB скрипт, а в браузере это почти
    незаметно (см. историю v5.3.0).
"""
import re, subprocess, sys, os, shutil, tempfile, gzip

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
MINIFY = '--no-min' not in sys.argv
NPX = shutil.which('npx') or 'npx'

src = open('src/app.html', encoding='utf-8').read()

# ── версия ────────────────────────────────────────────────────────────────
m = re.search(r"const APP_VERSION = '([^']+)';", src)
assert m, 'APP_VERSION не найден в src/app.html'
VER = m.group(1)
print('version:', VER)

src = re.sub(r'<title>[^<]*</title>', f'<title>Life Tracker {VER}</title>', src, count=1)
if '<meta name="app-version"' not in src:
    src = src.replace('<meta charset="UTF-8">', f'<meta charset="UTF-8">\n<meta name="app-version" content="{VER}">', 1)
else:
    src = re.sub(r'<meta name="app-version" content="[^"]*">', f'<meta name="app-version" content="{VER}">', src)


def run(cmd, data):
    r = subprocess.run(cmd, input=data, capture_output=True, text=True, encoding='utf-8', shell=(os.name == 'nt'))
    if r.returncode != 0:
        raise SystemExit(f'FAIL {cmd[0]}:\n{r.stderr[:2000]}')
    return r.stdout


def min_css(css):
    if not MINIFY: return css
    return run([NPX, '--yes', 'csso-cli', '--no-restructure'], css).strip()


def min_js(js):
    if not MINIFY: return js
    # Без mangle верхнего уровня: глобальные функции дергаются из onclick="..." в разметке
    # и через typeof/window[...]. Внутри функций и IIFE имена ужимаются.
    out = run([NPX, '--yes', 'terser', '--compress', 'passes=2,drop_debugger=true',
               '--mangle', '--comments', 'false', '--ecma', '2020'], js)
    # В Firefox/Safari inline-скрипт заканчивается на первом же `</script` даже в строке.
    return out.replace('</script', '<\\/script').strip()


# ── CSS ───────────────────────────────────────────────────────────────────
def css_repl(mo):
    return '<style>' + min_css(mo.group(1)) + '</style>'
src, n = re.subn(r'<style>(.*?)</style>', css_repl, src, flags=re.S)
print('css blocks:', n)

# ── JS (только inline, без src=) ──────────────────────────────────────────
checked = []
def js_repl(mo):
    code = mo.group(1)
    out = min_js(code)
    checked.append(out)
    return '<script>' + out + '</script>'
src, n = re.subn(r'<script>(.*?)</script>', js_repl, src, flags=re.S)
print('js blocks:', n)

# ── HTML: убираем комментарии и пустые строки между тегами ────────────────
src = re.sub(r'<!--(?!\[if).*?-->', '', src, flags=re.S)
src = re.sub(r'\n[ \t]*\n+', '\n', src)

# ── syntax check ──────────────────────────────────────────────────────────
tmp = tempfile.mkdtemp()
for i, code in enumerate(checked):
    fn = os.path.join(tmp, f'chk_{i}.js')
    open(fn, 'w', encoding='utf-8').write(code.replace('<\\/script', '</script'))
    r = subprocess.run(['node', '--check', fn], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f'script #{i} SYNTAX ERROR:\n{r.stderr[:1500]}')
    print(f'  script #{i}: {len(code)//1024} KB OK')
shutil.rmtree(tmp, ignore_errors=True)

open('index.html', 'w', encoding='utf-8', newline='\n').write(src)

# ── sw.js ─────────────────────────────────────────────────────────────────
sw = open('src/sw.js', encoding='utf-8').read().replace('__APP_VERSION__', VER)
open('sw.js', 'w', encoding='utf-8', newline='\n').write(sw)
r = subprocess.run(['node', '--check', 'sw.js'], capture_output=True, text=True)
if r.returncode != 0: raise SystemExit('sw.js SYNTAX ERROR:\n' + r.stderr[:1500])

raw = len(src.encode('utf-8')); gz = len(gzip.compress(src.encode('utf-8'), 9))
print(f'index.html: {raw//1024} KB raw, {gz//1024} KB gzip  |  sw.js VERSION={VER}')
