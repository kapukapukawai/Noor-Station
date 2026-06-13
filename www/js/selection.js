/**
 * selection.js - 聖典目録の取得と描画 (堅牢版)
 */

// 倉庫の定義（バージョンを上げることでスキーマ変更を反映）
const db = new Dexie("QuranOfflineDB");
db.version(4).stores({
    surahs: "id",       // 保存済みデータ（例: "1_1", "1_2" など）
    metadata: "key"     // 静的データ（全スーラリスト用）
});

async function fetchAndRenderSurahs() {
    const container = document.getElementById('surah-list-container');
    if (!container) return;

    try {
        // 1. 全スーラリストの取得（メタデータから取得、なければAPIから補完）
        let surahs = await db.metadata.get('all_surahs');
        if (!surahs) {
            container.innerHTML = `<div class="p-5 text-center">聖典情報を同期中...</div>`;
            const res = await fetch('https://api.alquran.cloud/v1/surah');
            const json = await res.json();
            surahs = { key: 'all_surahs', data: json.data };
            await db.metadata.put(surahs);
        }
        const surahList = surahs.data;

        // 2. 保存済みキーをすべて取得（ここが重要：前方一致で全キラートに対応）
        const savedKeys = await db.surahs.toCollection().primaryKeys();

        // 3. レンダリング
        let html = '';
        surahList.forEach(s => {
            // 【修正】章IDで前方一致を確認。1_1, 1_2, 1_3どれが入っていても保存済みとみなす
            const isSaved = savedKeys.some(key => key.startsWith(`${s.number}_`));

            const statusBadge = isSaved 
                ? `<span class="badge-offline"><span class="material-symbols-outlined">cloud_done</span></span>` 
                : '';

            html += `
                <a href="reader.html?surah=${s.number}" class="surah-card" style="${isSaved ? 'border-left: 8px solid var(--deep-green) !important;' : ''}">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="surah-num">${String(s.number).padStart(3, '0')}</span>
                        <div style="flex-grow: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="surah-name-jp">${s.englishName}</span>
                                ${statusBadge}
                            </div>
                            <span class="surah-meta">第 ${s.number} 章 / ${s.numberOfAyahs} 節</span>
                        </div>
                    </div>
                    <div class="surah-name-ar">${s.name}</div>
                </a>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        console.error("リスト表示エラー:", e);
        container.innerHTML = `
            <div class="alert alert-danger m-4">
                <h5>通信環境を確認してください</h5>
                <p>オフラインのまま初期化しようとしています。一度オンラインで再起動してください。</p>
            </div>`;
    }
}

// 実行
document.addEventListener('DOMContentLoaded', fetchAndRenderSurahs);