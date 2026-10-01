"""Check saved artifacts, not merely API success responses."""
import collections
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile
import logging
import sys
import pdfplumber

logging.getLogger('pdfminer').setLevel(logging.ERROR)
results = []
pdf_names = ['current', 'conversation', 'selection']
if Path('tmp/print-regression/isolated-current.pdf').exists():
    pdf_names += ['isolated-current', 'isolated-conversation', 'isolated-selection']
for name in pdf_names:
    with pdfplumber.open(Path('tmp/print-regression') / (name + '.pdf')) as pdf:
        text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
        assert '한글 본문' in text, (name, text)
        assert 'PDF 선명도 회귀 검증' in text
        assert 'energy' in text
        colors = collections.Counter(str(c.get('non_stroking_color')) for page in pdf.pages for c in page.chars)
        assert not any('0.9294' in color for color in colors), colors
        results.append(dict(file=name + '.pdf', pages=len(pdf.pages), colors=dict(colors)))

hwpx_count = 0
for folder in (() if '--pdf-only' in sys.argv else ('equations', 'site-compatibility')):
    for path in Path('tmp', folder).glob('*.hwpx'):
        hwpx_count += 1
        fixture = path.with_suffix('.json') if folder == 'site-compatibility' else path.parent / 'fixture.json'
        expected = len(json.loads(fixture.read_text(encoding='utf-8'))['equations'])
        with zipfile.ZipFile(path) as archive:
            sections = [ET.fromstring(archive.read(name)) for name in archive.namelist()
                        if name.startswith('Contents/section') and name.endswith('.xml')]
            equations = [node for section in sections for node in section.iter() if node.tag.endswith('}equation')]
            scripts = [node.text or '' for eq in equations for node in eq.iter() if node.tag.endswith('}script')]
            text = ''.join(''.join(section.itertext()) for section in sections)
            assert len(equations) == expected, (path, expected, len(equations))
            assert 'AICEEQ' not in text, (path, 'unreplaced marker')
            if path.stem == 'edited':
                assert '+ 1' in scripts[0], scripts
            results.append(dict(file=str(path), equations=len(equations), markers=0))
if '--pdf-only' not in sys.argv:
    assert hwpx_count >= 8, 'Expected 8 HWPX fixtures (saved, edited, and 6 site cases); use --pdf-only for PDF verification.'
Path('tmp/artifact-verification.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'PASS: {len(pdf_names)} PDFs with Korean/text/colors; {hwpx_count} HWPX files checked.')
