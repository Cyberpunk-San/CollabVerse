#!/usr/bin/env python3
"""Lightweight backend health/check script for local development.

Usage: python backend/tools/check_backend.py

This script performs the following checks:
- Compile all Python files under `backend` using `compileall`.
- Walk the backend tree and attempt to parse each .py file with `ast` to find syntax errors.
- If `peerlens.db` exists, list tables inside it (SQLite).
"""
import compileall
import sys
import os
import ast
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"


def run_compileall(path: Path) -> bool:
    print(f"Compiling Python files under: {path}")
    ok = compileall.compile_dir(str(path), force=True, quiet=1)
    print("compileall result:", "OK" if ok else "FAILED")
    return ok


def parse_files(path: Path) -> int:
    errors = 0
    print(f"Parsing .py files under {path} for syntax errors...")
    for p in path.rglob("*.py"):
        try:
            text = p.read_text(encoding="utf-8")
            ast.parse(text)
        except Exception as e:
            errors += 1
            print(f"SYNTAX ERROR in {p.relative_to(ROOT)}: {e}")
    if errors == 0:
        print("No syntax errors found by AST parse.")
    return errors


def check_sqlite_db(root: Path) -> None:
    db_path = root / "peerlens.db"
    if not db_path.exists():
        print(f"No SQLite DB found at {db_path}; skipping DB checks.")
        return
    print(f"Inspecting SQLite DB: {db_path}")
    try:
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cur.fetchall()
        if not tables:
            print("No tables found in the DB.")
        else:
            print("Tables in database:")
            for t in tables:
                print(f" - {t[0]}")
        conn.close()
    except Exception as e:
        print("Failed to open/inspect SQLite DB:", e)


def main() -> int:
    os.chdir(ROOT)
    ok = run_compileall(BACKEND)
    errors = parse_files(BACKEND)
    check_sqlite_db(ROOT)

    if not ok or errors > 0:
        print("One or more checks failed.")
        return 2
    print("Backend quick checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
