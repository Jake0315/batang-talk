#!/usr/bin/env python3
"""배포 때 환경 변수로 config.js를 만들어요 (deploy-pages 워크플로가 사용)."""
import json, os, sys
c = {k: os.environ.get(k, '') for k in ['SUPABASE_URL', 'SUPABASE_KEY', 'GAS_URL', 'VAPID_PUBLIC_KEY']}
c['VERSION'] = os.environ.get('VER', '')
open(sys.argv[1], 'w', encoding='utf-8').write('window.BATANG_CONFIG = ' + json.dumps(c, ensure_ascii=False, indent=2) + ';\n')
