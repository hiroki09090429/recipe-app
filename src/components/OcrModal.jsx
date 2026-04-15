import { useState, useRef } from 'react';

const WORKER_URL = 'https://recipe-app-ocr-proxy.hiroki09090429.workers.dev';

async function runClaudeOcr(imageDataUrl) {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.text || '';
}

export default function OcrModal({ onResult, onClose }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('');
  const [edited, setEdited] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setImage(ev.target.result);
    };
    reader.readAsDataURL(file);
    setResult('');
    setEdited('');
  };

  const runOcr = async () => {
    if (!image) return;
    setRunning(true);
    setProgress(30);
    try {
      const text = await runClaudeOcr(image);
      setProgress(100);
      setResult(text);
      setEdited(text);
    } catch (err) {
      alert('OCR処理に失敗しました: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleApply = () => {
    onResult(edited || result);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>📷 写真からレシピを読み取り（OCR）</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
            画像を選択
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

          {preview && (
            <div className="ocr-image-preview">
              <img src={preview} alt="OCR対象" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
            </div>
          )}

          {image && !running && !result && (
            <button type="button" className="btn-primary" onClick={runOcr} style={{ marginTop: 12 }}>
              テキストを読み取る
            </button>
          )}

          {running && (
            <div className="ocr-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span>{progress}% 処理中...</span>
            </div>
          )}

          {result && (
            <div className="ocr-result">
              <label>読み取り結果（編集可能）</label>
              <textarea
                value={edited}
                onChange={e => setEdited(e.target.value)}
                rows={8}
                className="ocr-textarea"
              />
              <div className="ocr-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>キャンセル</button>
                <button type="button" className="btn-primary" onClick={handleApply}>このテキストを使う</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
