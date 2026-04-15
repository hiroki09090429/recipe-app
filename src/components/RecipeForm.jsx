import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { addRecipe, updateRecipe, getCategories, addCategory } from '../db';
import OcrModal from './OcrModal';

const emptyIngredient = () => ({ name: '', amount: '', unit: '' });
const emptyForm = () => ({
  name: '',
  category: '',
  baseServings: '',
  baseServingsNum: '',
  ingredients: [emptyIngredient()],
  steps: [''],
  notes: '',
  photo: '',
  tags: '',
});

export default function RecipeForm({ existing, onSave, onCancel }) {
  const { user } = useAuth();
  const [form, setForm] = useState(existing ? {
    ...existing,
    tags: (existing.tags || []).join(', '),
  } : emptyForm());
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [showOcr, setShowOcr] = useState(false);
  const [voiceField, setVoiceField] = useState(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    getCategories(user.id).then(setCategories);
  }, [user.id]);

  // Voice input
  const startVoice = (fieldType, index) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('このブラウザは音声入力に対応していません');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    setListening(true);
    setVoiceField({ fieldType, index });
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (fieldType === 'step') {
        const steps = [...form.steps];
        steps[index] = (steps[index] || '') + text;
        setForm(f => ({ ...f, steps }));
      } else if (fieldType === 'notes') {
        setForm(f => ({ ...f, notes: f.notes + text }));
      } else if (fieldType === 'name') {
        setForm(f => ({ ...f, name: f.name + text }));
      }
      setListening(false);
      setVoiceField(null);
    };
    recognition.onerror = () => { setListening(false); setVoiceField(null); };
    recognition.onend = () => { setListening(false); };
    recognition.start();
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }));
  const removeIngredient = (i) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  const updateIngredient = (i, key, val) => {
    const ingredients = [...form.ingredients];
    ingredients[i] = { ...ingredients[i], [key]: val };
    setForm(f => ({ ...f, ingredients }));
  };

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, ''] }));
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  const updateStep = (i, val) => {
    const steps = [...form.steps];
    steps[i] = val;
    setForm(f => ({ ...f, steps }));
  };

  const handleCategorySelect = (val) => {
    if (val === '__new__') return;
    setForm(f => ({ ...f, category: val }));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await addCategory(user.id, newCategory.trim());
    const cats = await getCategories(user.id);
    setCategories(cats);
    setForm(f => ({ ...f, category: newCategory.trim() }));
    setNewCategory('');
  };

  const handleOcrResult = (text) => {
    setShowOcr(false);
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let ingredients = [];

    // 各行を分類: 数値のみ / テキストのみ / 混合
    const isNumLine = (l) => /^[\d.\/]+\s*[^\d\s]*$/.test(l);
    const isTextLine = (l) => !/\d/.test(l);

    const numLines = lines.filter(isNumLine);
    const textLines = lines.filter(isTextLine);

    // 列ごとパターン検出: テキスト行と数値行が同数で、交互でない場合
    if (textLines.length > 0 && numLines.length > 0
        && textLines.length === numLines.length
        && ingredients.length === 0) {
      // テキスト行と数値行の位置を確認
      const firstTextIdx = lines.indexOf(textLines[0]);
      const firstNumIdx = lines.indexOf(numLines[0]);
      const lastTextIdx = lines.lastIndexOf(textLines[textLines.length - 1]);
      const lastNumIdx = lines.lastIndexOf(numLines[numLines.length - 1]);

      // テキストが先に並び、その後数値が並ぶ（列ごと出力）
      const isColumnFormat = (lastTextIdx < firstNumIdx) || (lastNumIdx < firstTextIdx);

      if (isColumnFormat) {
        const names = lastTextIdx < firstNumIdx ? textLines : numLines;
        const amounts = lastTextIdx < firstNumIdx ? numLines : textLines;
        for (let i = 0; i < names.length; i++) {
          const amMatch = amounts[i].match(/([\d.\/]+)\s*(.*)/);
          ingredients.push({
            name: names[i],
            amount: amMatch ? amMatch[1] : amounts[i],
            unit: amMatch ? amMatch[2].trim() : '',
          });
        }
      }
    }

    // 列ごとで処理できなかった場合、行ごとにパース
    if (ingredients.length === 0) {
      for (const line of lines) {
        // タブ区切り: 「材料名\t数量」
        if (line.includes('\t')) {
          const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const p0isNum = /^[\d.\/]/.test(parts[0]);
            const p1isNum = /^[\d.\/]/.test(parts[1]);
            let name, amountRaw;
            if (p0isNum && !p1isNum) {
              name = parts[1]; amountRaw = parts[0];
            } else {
              name = parts[0]; amountRaw = parts[1];
            }
            const amMatch = amountRaw.match(/([\d.\/]+)\s*(.*)/);
            ingredients.push({ name, amount: amMatch ? amMatch[1] : amountRaw, unit: amMatch ? amMatch[2].trim() : '' });
          } else if (parts.length === 1) {
            ingredients.push({ name: parts[0], amount: '', unit: '' });
          }
          continue;
        }
        // スペース区切り: 「材料名 数量単位」
        const m = line.match(/^(.+?)\s+([\d.\/]+)\s*([^\d\s]*)$/);
        if (m && m[1].length > 0) {
          ingredients.push({ name: m[1], amount: m[2], unit: m[3] || '' });
        }
      }
    }

    if (ingredients.length > 0) {
      setForm(f => ({ ...f, ingredients }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('レシピ名を入力してください'); return; }
    setSaving(true);
    try {
      const tags = form.tags ? form.tags.split(/[,、]/).map(t => t.trim()).filter(Boolean) : [];
      const data = {
        ...form,
        userId: user.id,
        tags,
        baseServingsNum: parseFloat(form.baseServingsNum) || 0,
        ingredients: form.ingredients.filter(i => i.name.trim()),
        steps: form.steps.filter(s => s.trim()),
      };
      let saved;
      if (existing) {
        await updateRecipe(existing.id, data);
        saved = { ...existing, ...data };
      } else {
        const newId = await addRecipe(data);
        saved = { ...data, id: newId };
      }
      window.__reloadRecipeList?.();
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="recipe-form-page">
      <div className="form-header">
        <button className="back-btn" onClick={onCancel}>← 戻る</button>
        <h2>{existing ? 'レシピを編集' : '新しいレシピ'}</h2>
        <div className="form-actions-top">
          <button type="button" className="btn-ocr" onClick={() => setShowOcr(true)}>📷 OCR</button>
        </div>
      </div>

      {showOcr && <OcrModal onResult={handleOcrResult} onClose={() => setShowOcr(false)} />}

      <form onSubmit={handleSubmit} className="recipe-form">
        {/* Photo */}
        <div className="photo-section">
          {form.photo ? (
            <div className="photo-preview-wrap">
              <img src={form.photo} alt="レシピ写真" className="photo-preview" />
              <button type="button" className="remove-photo" onClick={() => setForm(f => ({ ...f, photo: '' }))}>✕</button>
            </div>
          ) : (
            <button type="button" className="photo-placeholder" onClick={() => fileRef.current?.click()}>
              <span>📷</span>
              <span>写真を追加</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>

        {/* Name */}
        <div className="form-group">
          <label>レシピ名 <span className="required">*</span></label>
          <div className="input-with-voice">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="例：ガトーショコラ"
            />
            <button type="button" className={`voice-btn${listening && voiceField?.fieldType === 'name' ? ' active' : ''}`} onClick={() => startVoice('name', 0)}>🎤</button>
          </div>
        </div>

        {/* Category */}
        <div className="form-group">
          <label>カテゴリ</label>
          <div className="category-select-row">
            <select value={form.category} onChange={e => handleCategorySelect(e.target.value)} className="category-select">
              <option value="">未分類</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="new-category-row">
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="新しいカテゴリを追加"
              className="new-category-input"
            />
            <button type="button" className="btn-add-cat" onClick={handleAddCategory}>追加</button>
          </div>
        </div>

        {/* Base servings */}
        <div className="form-group form-row">
          <div className="form-col">
            <label>基準量（テキスト）</label>
            <input
              type="text"
              value={form.baseServings}
              onChange={e => setForm(f => ({ ...f, baseServings: e.target.value }))}
              placeholder="例: 10個分"
            />
          </div>
          <div className="form-col">
            <label>基準数値</label>
            <input
              type="number"
              value={form.baseServingsNum}
              onChange={e => setForm(f => ({ ...f, baseServingsNum: e.target.value }))}
              placeholder="10"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        {/* Ingredients */}
        <div className="form-section">
          <h3>材料</h3>
          {form.ingredients.map((ing, i) => (
            <div key={i} className="ingredient-row">
              <input
                type="text"
                value={ing.name}
                onChange={e => updateIngredient(i, 'name', e.target.value)}
                placeholder="材料名"
                className="ing-name"
              />
              <input
                type="text"
                value={ing.amount}
                onChange={e => updateIngredient(i, 'amount', e.target.value)}
                placeholder="量"
                className="ing-amount"
              />
              <input
                type="text"
                value={ing.unit}
                onChange={e => updateIngredient(i, 'unit', e.target.value)}
                placeholder="単位"
                className="ing-unit"
              />
              <button type="button" className="remove-btn" onClick={() => removeIngredient(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="btn-add-row" onClick={addIngredient}>＋ 材料を追加</button>
        </div>

        {/* Steps */}
        <div className="form-section">
          <h3>手順</h3>
          {form.steps.map((step, i) => (
            <div key={i} className="step-row">
              <span className="step-no">{i + 1}</span>
              <textarea
                value={step}
                onChange={e => updateStep(i, e.target.value)}
                placeholder={`手順${i + 1}`}
                rows={2}
                className="step-textarea"
              />
              <div className="step-btns">
                <button type="button" className={`voice-btn sm${listening && voiceField?.fieldType === 'step' && voiceField.index === i ? ' active' : ''}`} onClick={() => startVoice('step', i)}>🎤</button>
                <button type="button" className="remove-btn" onClick={() => removeStep(i)}>✕</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-add-row" onClick={addStep}>＋ 手順を追加</button>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label>タグ <span className="hint">カンマ区切り</span></label>
          <input
            type="text"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="例: チョコレート, バレンタイン"
          />
        </div>

        {/* Notes */}
        <div className="form-group">
          <label>メモ</label>
          <div className="input-with-voice">
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="ポイントや保存方法など"
              rows={3}
            />
            <button type="button" className={`voice-btn${listening && voiceField?.fieldType === 'notes' ? ' active' : ''}`} onClick={() => startVoice('notes', 0)}>🎤</button>
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="form-footer-btns">
          <button type="button" className="btn-cancel" onClick={onCancel}>キャンセル</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '保存中...' : existing ? '更新する' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  );
}
