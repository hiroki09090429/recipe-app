import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { getRecipes, getCategories } from '../db';

const SORT_OPTIONS = [
  { value: 'category', label: 'カテゴリ別' },
  { value: 'no', label: '登録番号順' },
  { value: 'kana', label: 'あいうえお順' },
];

export default function RecipeList({ onSelect, onAdd, onManageCategories }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sort, setSort] = useState('category');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const reload = async () => {
    const [r, c] = await Promise.all([getRecipes(user.id), getCategories(user.id)]);
    setRecipes(r);
    setCategories(c);
  };

  useEffect(() => { reload(); }, [user.id]);
  // Expose reload to parent via window for simplicity
  useEffect(() => {
    window.__reloadRecipeList = reload;
    return () => { delete window.__reloadRecipeList; };
  }, [user.id]);

  const filtered = useMemo(() => {
    let list = [...recipes];
    if (filterCategory) list = list.filter(r => r.category === filterCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        (r.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (sort === 'no') list.sort((a, b) => a.registrationNo - b.registrationNo);
    else if (sort === 'kana') list.sort((a, b) => a.name?.localeCompare(b.name, 'ja'));
    else {
      // category sort
      list.sort((a, b) => {
        const ca = a.category || '';
        const cb = b.category || '';
        if (ca !== cb) return ca.localeCompare(cb, 'ja');
        return a.registrationNo - b.registrationNo;
      });
    }
    return list;
  }, [recipes, sort, search, filterCategory]);

  const grouped = useMemo(() => {
    if (sort !== 'category') return { '': filtered };
    return filtered.reduce((acc, r) => {
      const cat = r.category || '未分類';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {});
  }, [filtered, sort]);

  const categoryNames = useMemo(() => ['', ...categories.map(c => c.name)], [categories]);

  return (
    <div className="recipe-list-page">
      {/* Search bar */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="名前・カテゴリ・タグで検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Filter + Sort */}
      <div className="filter-row">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="filter-select">
          <option value="">全カテゴリ</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <div className="sort-tabs">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              className={sort === o.value ? 'sort-tab active' : 'sort-tab'}
              onClick={() => setSort(o.value)}
            >{o.label}</button>
          ))}
        </div>
      </div>

      {/* Recipe groups */}
      <div className="recipe-groups">
        {Object.keys(grouped).length === 0 ? (
          <div className="empty-state">
            <span>🍪</span>
            <p>レシピがまだありません</p>
            <p className="empty-sub">「＋ レシピ追加」から追加しましょう</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="recipe-group">
              {sort === 'category' && cat && (
                <h3 className="group-heading">{cat}</h3>
              )}
              <div className="recipe-cards">
                {items.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} onClick={() => onSelect(recipe)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={onAdd}>＋</button>
    </div>
  );
}

function RecipeCard({ recipe, onClick }) {
  return (
    <div className="recipe-card" onClick={onClick}>
      {recipe.photo ? (
        <img src={recipe.photo} alt={recipe.name} className="recipe-card-img" />
      ) : (
        <div className="recipe-card-img placeholder-img">🍰</div>
      )}
      <div className="recipe-card-body">
        <div className="recipe-card-no">No.{recipe.registrationNo}</div>
        <h4 className="recipe-card-name">{recipe.name}</h4>
        {recipe.baseServings && <div className="recipe-card-servings">{recipe.baseServings}</div>}
        {recipe.category && <span className="recipe-card-tag category-tag">{recipe.category}</span>}
        {(recipe.tags || []).slice(0, 2).map((t, i) => (
          <span key={i} className="recipe-card-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}
