import { useRef } from 'react';
import { useAuth } from '../AuthContext';

export default function Header({ title, onMenuClick, onCategoryClick, showMenu, onExport, onImport }) {
  const { user, logout } = useAuth();
  const importRef = useRef();

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        onImport(data);
      } catch {
        alert('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-logo">🍰</span>
        <span className="header-title">{title || 'お菓子レシピ帳'}</span>
      </div>
      <div className="header-right">
        <span className="header-user">👤 {user?.username}</span>
        <button className="header-menu-btn" onClick={onMenuClick} aria-label="メニュー">
          ☰
        </button>
      </div>
      {showMenu && (
        <div className="dropdown-menu">
          <button onClick={onCategoryClick} className="dropdown-item">📂 カテゴリ管理</button>
          <button onClick={onExport} className="dropdown-item">📤 データ書き出し</button>
          <button onClick={() => importRef.current?.click()} className="dropdown-item">📥 データ読み込み</button>
          <button onClick={logout} className="dropdown-item logout-item">🚪 ログアウト</button>
        </div>
      )}
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
    </header>
  );
}
