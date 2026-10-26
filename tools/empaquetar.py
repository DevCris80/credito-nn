# Genera credito-demo.html: index.html con styles.css y todos los .js locales incrustados (un solo archivo).
# Uso: python empaquetar.py   (desde cualquier carpeta)
import re
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
html = (raiz / 'index.html').read_text(encoding='utf-8')

html = re.sub(r'<link rel="stylesheet" href="(styles\.css)">',
              lambda m: f'<style>\n{(raiz / m[1]).read_text(encoding="utf-8")}\n</style>', html)
html = re.sub(r'<script src="((?!https?:)[^"]+)"></script>',
              lambda m: f'<script>\n{(raiz / m[1]).read_text(encoding="utf-8")}\n</script>', html)

assert 'href="styles.css"' not in html and not re.search(r'<script src="(?!https?:)', html)
(raiz / 'credito-demo.html').write_text(html, encoding='utf-8')
print('credito-demo.html', len(html) // 1024, 'KB')
