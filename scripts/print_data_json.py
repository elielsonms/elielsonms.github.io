from __future__ import annotations

import json
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    data = yaml.safe_load((ROOT / "datasource.yaml").read_text(encoding="utf-8"))
    print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    main()
