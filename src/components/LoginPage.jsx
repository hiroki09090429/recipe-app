import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }
    if (mode === 'register') {
      if (password.length < 4) {
        setError('パスワードは4文字以上で設定してください');
        return;
      }
      if (password !== confirm) {
        setError('パスワードが一致しません');
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setShowConfirm(false);
  };

  const toggleShow = (setter) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setter(v => !v);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🍰</span>
          <h1>お菓子レシピ帳</h1>
          <p>あなたの大切なレシピを管理</p>
        </div>

        <div className="tab-switcher">
          <button
            type="button"
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => switchMode('login')}
          >ログイン</button>
          <button
            type="button"
            className={mode === 'register' ? 'tab active' : 'tab'}
            onClick={() => switchMode('register')}
          >新規登録</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ユーザー名を入力"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="form-group">
            <label>パスワード</label>
            <div className="pw-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button
                type="button"
                className="pw-toggle"
                onPointerDown={toggleShow(setShowPassword)}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              >{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>パスワード（確認）</label>
              <div className="pw-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="パスワードを再入力"
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onPointerDown={toggleShow(setShowConfirm)}
                  aria-label={showConfirm ? 'パスワードを隠す' : 'パスワードを表示'}
                >{showConfirm ? '🙈' : '👁️'}</button>
              </div>
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
          </button>
        </form>
      </div>
    </div>
  );
}
