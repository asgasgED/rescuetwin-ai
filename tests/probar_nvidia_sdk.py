#!/usr/bin/env python3
"""Prueba OPCIONAL e independiente de la clave NVIDIA con openai SDK.
No prueba el contrato de RescueTwin; para eso ejecutar Node tests/test_nemotron_real.cjs.
Instalar (opcional): python -m venv .venv; .venv\\Scripts\\activate; pip install openai
"""
import os
from pathlib import Path

def load_local_env():
    path = Path(__file__).resolve().parents[1] / ".env.local"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k not in os.environ:
            os.environ[k.strip()] = v.strip().strip('"').strip("'")

load_local_env()
key = os.environ.get("NVIDIA_API_KEY", "")
if not key or key.startswith("REEMPLAZAR"):
    raise SystemExit("Configura NVIDIA_API_KEY en .env.local primero.")
try:
    from openai import OpenAI
except ImportError:
    raise SystemExit("Falta OpenAI SDK: python -m pip install openai (en tu venv opcional)")

client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=key, timeout=40.0)
completion = client.chat.completions.create(
    model="nvidia/nemotron-3.5-super-vl-120b-a12b",
    messages=[{"role": "user", "content": "Responde con una sola frase en español: ¿qué debe contener un plan familiar de emergencia?"}],
    temperature=1, top_p=0.95, max_tokens=256, stream=False,
    extra_body={"chat_template_kwargs": {"enable_thinking": False}},
)
text = completion.choices[0].message.content or ""
if not text.strip():
    raise SystemExit("Respuesta sin contenido. Revisa límites y configuración.")
print("OK — NVIDIA responde usando el SDK Python. Texto:", text.strip()[:320])
print("Sin mostrar credenciales. Esto no reemplaza las pruebas completas del módulo TS.")
