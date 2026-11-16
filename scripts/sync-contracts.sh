#!/usr/bin/env bash
set -euo pipefail

echo "🔄 [1/2] Extraindo especificação OpenAPI 3.1 diretamente do Backend..."
mkdir -p shared/contracts

pushd apps/api > /dev/null
if [ -d ".venv/Scripts" ]; then
  export PATH="$PWD/.venv/Scripts:$PATH"
elif [ -d ".venv/bin" ]; then
  export PATH="$PWD/.venv/bin:$PATH"
fi
export PYTHONIOENCODING=utf-8
python -c "
import json
from pathlib import Path
from src.main import app

openapi_schema = app.openapi()
output_path = Path('../../shared/contracts/openapi.json')
output_path.write_text(json.dumps(openapi_schema, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'✅ Schema exportado com sucesso: {output_path.resolve()}')
"
popd > /dev/null

echo "🔄 [2/2] Gerando cliente HTTP e tipos TypeScript no Frontend..."
pushd apps/web > /dev/null
rm -f openapi-ts-error-*.log
TMP_API_CLIENT="$(mktemp -d)"
npx @hey-api/openapi-ts \
  --input ../../shared/contracts/openapi.json \
  --output "$TMP_API_CLIENT" \
  --client @hey-api/client-fetch
mkdir -p src/api-client
cp -rf "$TMP_API_CLIENT"/* src/api-client/
rm -rf "$TMP_API_CLIENT"
popd > /dev/null

echo "✅ Contratos sincronizados entre Backend e Frontend!"