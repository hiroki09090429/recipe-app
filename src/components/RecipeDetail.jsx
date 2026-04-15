import { useState } from 'react';
import { deleteRecipe } from '../db';

export default function RecipeDetail({ recipe, onEdit, onBack, onDeleted }) {
  const [scaleTo, setScaleTo] = useState('');
  const [scaled, setScaled] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleScale = () => {
    const target = parseFloat(scaleTo);
    if (!target || target <= 0) return;
    const base = recipe.baseServingsNum || 1;
    const ratio = target / base;
    const scaledIngredients = (recipe.ingredients || []).map(ing => {
      const amount = parseFloat(ing.amount);
      if (isNaN(amount)) return ing;
      const newAmount = amount * ratio;
      return {
        ...ing,
        amount: Number.isInteger(newAmount) ? String(newAmount) : newAmount.toFixed(1).replace(/\.0$/, ''),
      };
    });
    setScaled({ ratio, scaledIngredients, target });
  };

  const handleDelete = async () => {
    await deleteRecipe(recipe.id);
    window.__reloadRecipeList?.();
    onDeleted();
  };

  const displayIngredients = scaled ? scaled.scaledIngredients : recipe.ingredients || [];

  return (
    <div className="recipe-detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← 戻る</button>
        <div className="detail-header-actions">
          <button className="btn-edit" onClick={onEdit}>✏️ 編集</button>
          <button className="btn-delete-icon" onClick={() => setConfirmDelete(true)}>🗑️</button>
        </div>
      </div>

      {recipe.photo && (
        <img src={recipe.photo} alt={recipe.name} className="detail-photo" />
      )}

      <div className="detail-body">
        <div className="detail-meta">
          <span className="detail-no">No.{recipe.registrationNo}</span>
          {recipe.category && <span className="detail-category-tag">{recipe.category}</span>}
        </div>
        <h2 className="detail-name">{recipe.name}</h2>
        {recipe.baseServings && (
          <p className="detail-servings">📊 {recipe.baseServings}</p>
        )}
        {(recipe.tags || []).length > 0 && (
          <div className="detail-tags">
            {recipe.tags.map((t, i) => <span key={i} className="recipe-card-tag">{t}</span>)}
          </div>
        )}

        {/* Scaling */}
        {recipe.baseServingsNum > 0 && (
          <div className="scaling-section">
            <h3>📐 スケーリング計算</h3>
            <p className="scaling-base">基準: {recipe.baseServings || `${recipe.baseServingsNum}個分`}</p>
            <div className="scaling-input-row">
              <input
                type="number"
                value={scaleTo}
                onChange={e => { setScaleTo(e.target.value); setScaled(null); }}
                placeholder="何個分で作る？"
                min="0.1"
                step="0.5"
                className="scaling-input"
              />
              <span className="scaling-unit">{recipe.baseServings?.replace(/[0-9.]+/, '') || '個分'}</span>
              <button className="btn-scale" onClick={handleScale}>計算</button>
            </div>
            {scaled && (
              <p className="scale-ratio">
                × {scaled.ratio % 1 === 0 ? scaled.ratio : scaled.ratio.toFixed(2)} 倍
              </p>
            )}
          </div>
        )}

        {/* Ingredients */}
        <div className="detail-section">
          <h3>材料{scaled ? ` (${scaled.target}${recipe.baseServings?.replace(/[0-9.]+/, '') || '個'}分)` : ''}</h3>
          {displayIngredients.length === 0 ? (
            <p className="empty-text">材料が登録されていません</p>
          ) : (
            <table className="ingredient-table">
              <tbody>
                {displayIngredients.map((ing, i) => (
                  <tr key={i}>
                    <td className="ing-name-cell">{ing.name}</td>
                    <td className="ing-amount-cell">{ing.amount} {ing.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Steps */}
        {(recipe.steps || []).length > 0 && (
          <div className="detail-section">
            <h3>作り方</h3>
            <ol className="step-list">
              {recipe.steps.map((step, i) => (
                <li key={i} className="step-item">
                  <span className="step-number">{i + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Notes */}
        {recipe.notes && (
          <div className="detail-section notes-section">
            <h3>📝 メモ</h3>
            <p className="notes-text">{recipe.notes}</p>
          </div>
        )}

        <div className="detail-footer">
          <span className="detail-date">作成: {new Date(recipe.createdAt).toLocaleDateString('ja-JP')}</span>
          {recipe.updatedAt && recipe.updatedAt !== recipe.createdAt && (
            <span className="detail-date">更新: {new Date(recipe.updatedAt).toLocaleDateString('ja-JP')}</span>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-card confirm-modal">
            <h3>削除の確認</h3>
            <p>「{recipe.name}」を削除しますか？<br />この操作は取り消せません。</p>
            <div className="modal-footer-btns">
              <button className="btn-cancel" onClick={() => setConfirmDelete(false)}>キャンセル</button>
              <button className="btn-delete" onClick={handleDelete}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
