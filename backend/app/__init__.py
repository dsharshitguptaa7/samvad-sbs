import os
import sys

# Ensure project root is in sys.path so 'backend.app.*' imports work from both root and backend/
_root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)
