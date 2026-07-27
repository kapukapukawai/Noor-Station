/**
 * selection.js - 聖典目録の取得と描画 (Material You 脱カプセル版)
 */

// 倉庫の定義
const db = new Dexie("QuranOfflineDB");
db.version(4).stores({
    surahs: "id",       // 保存済みデータ
    metadata: "key"     // 静的データ（全スーラリスト用）
});

async function fetchAndRenderSurahs() {
    const container = document.getElementById('surah-list-container');
    if (!container) return;

    try {
        // 1. 全スーラリストの取得（メタデータから取得、なければAPIから補完）
        let surahs = await db.metadata.get('all_surahs');
        if (!surahs) {
            container.innerHTML = `<div class="p-5 center-align font-bold">聖典情報を同期中...</div>`;
            const res = await fetch('https://api.alquran.cloud/v1/surah');
            const json = await res.json();
            surahs = { key: 'all_surahs', data: json.data };
            await db.metadata.put(surahs);
        }
        const surahList = surahs.data;

        // 2. 保存済みキーをすべて取得（前方一致用）
        const savedKeys = await db.surahs.toCollection().primaryKeys();

        // 3. レンダリング
        let html = '';
        surahList.forEach(s => {
    const isSaved = savedKeys.some(key => key.startsWith(`${s.number}_`));

    // 📱 気ぃ散る要素を完全排除：座布団もチェックアイコンもすべて捨てました。
    // 保存されている時は、サブテキスト（節数）の横に、上品な深緑で「・ 保存済」と静かに寄り添うだけにします。
    html += `
        <a href="reader.html?surah=${s.number}" class="android-setting-item" style="background-color: transparent !important;">
            
            <div class="android-item-left">
                <div class="android-circle-icon" 
                     style="background-color: ${isSaved ? 'var(--android-selected-bg)' : 'var(--android-icon-bg)'} !important;
                            color: ${isSaved ? 'var(--android-selected-text)' : 'var(--android-text-main)'} !important;">
                    ${String(s.number).padStart(3, '0')}
                </div>
                
                <div class="android-item-text">
                    <div class="android-title-row">
                        <span class="android-surah-title">${s.englishName}</span>
                    </div>
                    <span class="android-surah-subtitle">
                        第 ${s.number} 章 / ${s.numberOfAyahs} 節
                        ${isSaved ? `
                            <span style="color: var(--android-selected-text) !important; font-weight: bold; margin-left: 8px;">
                                ・ 保存済
                            </span>
                        ` : ''}
                    </span>
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
            <div class="error padding round margin max-width" style="margin: 24px auto !important;">
                <i>error</i>
                <div class="max">
                    <h5>通信環境を確認してください</h5>
                    <p>オフラインのまま初期化しようとしています。一度オンラインで再起動してください。</p>
                </div>
            </div>`;
    }
}

// ==========================================
// 🚀 自作アプデ通知機能
// ==========================================
const CURRENT_VERSION = "3.4.0";

async function checkAppUpdate() {
    try {
        const response = await fetch('https://nxqa-40cde.web.app/version.json', {
            cache: 'no-store'
        });
        const data = await response.json();

        if (data.latestVersion !== CURRENT_VERSION) {
            alert(`新しいバージョン (${data.latestVersion}) がありマス！\nブラウザから最新のAPKをダウンロードして再インストールしてください。`);
        }
    } catch (error) {
        console.log('アプデチェック未実施（オフラインまたはサーバー未設置）');
    }
}

// 画面読み込み時のトリガー
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSurahs();
    checkAppUpdate();
});