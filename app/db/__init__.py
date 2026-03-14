from app.config.config import Config
from app.db.json_store import JSONStore

_cfg = Config()
store = JSONStore(path=_cfg.json_db_path)