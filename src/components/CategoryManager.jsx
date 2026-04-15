import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { getCategories, addCategory, deleteCategory } from '../db';

export default function CategoryManager({ onBack }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const reload = async () => {
    const cats = await getCategories(user.id);
    setCategories(cats);
  };

  useEffect(() => { reload(); }, [user.id]);

  const handleAdd = async () => {
    if (!newName.trim()) { setError('カテゴリ名を入力してください'); return; }
    try {
      await addCategory(user.id, newName.trim());
      setNewName('');
      setError('');
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('このカテゴリを削除しますか？（レシピは削除されません）')) return;
    await deleteCategory(id);
    reload();
  };

  return (
    <div className="category-manager-page">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>← 戻る</button>
        <h2>カテゴリ管理</h2>
      </div>

      <div className="category-add-row">
        <input
          type="text"
          value={newName}
          onChange={e => { setNewName(e.target.value); setError(''); }}
          placeholder="新しいカテゴリ名"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn-primary" onClick={handleAdd}>追加</button>
      </div>
      {error && <p className="error-msg">{error}</p>}

      <div className="category-list">
        {categories.length === 0 ? (
          <p className="empty-text">カテゴリがまだありません</p>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="category-item">
              <span className="category-name">{cat.name}</span>
              <button className="btn-delete-icon" onClick={() => handleDelete(cat.id)}>🗑️</button>
            </div>
          ))
        )}
      </div>

      <div className="category-presets">
        <p className="preset-label">よく使うカテゴリ例：</p>
        {['焼き菓子', '生菓子', 'フランス菓子', 'チョコレート', 'アイス・冷菓', '和菓子', 'パン', 'ケーキ', 'クッキー'].map(name => (
          <button
            key={name}
            className="btn-preset"
            onClick={async () => {
              await addCategory(user.id, name);
              reload();
            }}
          >{name}</button>
        ))}
      </div>
    </div>
  );
}
