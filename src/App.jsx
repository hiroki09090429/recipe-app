import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './components/LoginPage';
import RecipeList from './components/RecipeList';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import CategoryManager from './components/CategoryManager';
import Header from './components/Header';
import { exportUserData, importUserData } from './db';
import './App.css';

function AppInner() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('list');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  if (loading) return <div className="loading-screen"><span>🍰</span></div>;
  if (!user) return <LoginPage />;

  const goToCategories = () => {
    setShowMenu(false);
    setView('categories');
  };

  const toggleMenu = () => setShowMenu(v => !v);

  const handleExport = async () => {
    setShowMenu(false);
    try {
      const data = await exportUserData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipe-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('書き出しに失敗しました: ' + e.message);
    }
  };

  const handleImport = async (data) => {
    setShowMenu(false);
    try {
      await importUserData(user.id, data);
      window.__reloadRecipeList?.();
      alert('データを読み込みました');
    } catch (e) {
      alert('読み込みに失敗しました: ' + e.message);
    }
  };

  return (
    <div className="app" onClick={e => {
      if (showMenu && !e.target.closest('.app-header')) setShowMenu(false);
    }}>
      {view === 'list' && (
        <Header
          title="お菓子レシピ帳"
          onMenuClick={toggleMenu}
          onCategoryClick={goToCategories}
          showMenu={showMenu}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
      <main className={`main-content${view !== 'list' ? ' no-header' : ''}`}>
        {view === 'list' && (
          <RecipeList
            onSelect={r => { setSelectedRecipe(r); setView('detail'); }}
            onAdd={() => { setSelectedRecipe(null); setView('form'); }}
          />
        )}
        {view === 'detail' && selectedRecipe && (
          <RecipeDetail
            recipe={selectedRecipe}
            onEdit={() => setView('form')}
            onBack={() => { setView('list'); setSelectedRecipe(null); }}
            onDeleted={() => { setView('list'); setSelectedRecipe(null); }}
          />
        )}
        {view === 'form' && (
          <RecipeForm
            existing={selectedRecipe}
            onSave={(saved) => {
              if (selectedRecipe) {
                // Editing existing: go back to detail with updated recipe
                setSelectedRecipe(saved);
                setView('detail');
              } else {
                // Adding new: go to list
                setSelectedRecipe(null);
                setView('list');
              }
            }}
            onCancel={() => setView(selectedRecipe ? 'detail' : 'list')}
          />
        )}
        {view === 'categories' && (
          <CategoryManager onBack={() => setView('list')} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
