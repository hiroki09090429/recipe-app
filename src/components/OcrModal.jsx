import { useState, useRef } from 'react';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function runClaudeOcr(imageDataUrl) {
  const [meta, base64] = imageDataUrl.split(',');
  const mediaType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: 'この画像に写っているレシピの材料・分量・手順をすべてそのままテキストに書き起こしてください。表形式の場合は「材料名 数量 単位」の形式で1行ずつ出力してください。余計な説明は不要です。',
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
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
