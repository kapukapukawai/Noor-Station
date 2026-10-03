/**
 * selection.js - 聖典目録の取得と描画 (Android 16 M3 Expressive グループカード版)
 */

// 倉庫の定義
const db = new Dexie("QuranOfflineDB");
db.version(4).stores({
    surahs: "id",       // 保存済みデータ
    metadata: "key"     // 静的データ（全スーラリスト用）
});

/**
 * 各スーラの番号から大まかな Juz（1〜30）を割り振る簡易マッピング関数
 * （※必要に応じて正確なJuz境界データに拡張可能やで）
 */
function getJuzForSurah(surahNumber) {
    // ざっくりとしたJuzの目安（主要な区切り、またはパート分け）
    if (surahNumber === 1) return 1;
    if (surahNumber <= 2) return 1; // Al-Baqarahの一部
    if (surahNumber <= 3) return 3;
    if (surahNumber <= 4) return 4;
    if (surahNumber <= 5) return 6;
    if (surahNumber <= 6) return 7;
    if (surahNumber <= 7) return 8;
    if (surahNumber <= 8) return 9;
    if (surahNumber <= 9) return 10;
    if (surahNumber <= 10) return 11;
    // 簡易的に数章ごと、あるいはJuzごとのグループにまとめる表現
    return Math.min(30, Math.ceil(surahNumber / 4)); 
}

async function fetchAndRenderSurahs() {
    const container = document.getElementById('surah-list-container');
    if (!container) return;

    try {
        let surahs = await db.metadata.get('all_surahs');
        if (!surahs) {
            container.innerHTML = `<div class="p-5 center-align font-bold">聖典情報を同期中...</div>`;
            const res = await fetch('https://api.alquran.cloud/v1/surah');
            const json = await res.json();
            surahs = { key: 'all_surahs', data: json.data };
            await db.metadata.put(surahs);
        }
        const surahList = surahs.data;

        const savedKeys = await db.surahs.toCollection().primaryKeys();

        // 💡 Android 16 M3 Expressive風：Juzやパートごとにグループ化したセクションを構築
        let html = '';
        let currentJuz = null;

        surahList.forEach(s => {
            const isSaved = savedKeys.some(key => key.startsWith(`${s.number}_`));
            const juzNum = getJuzForSurah(s.number);

            // Juzが変わるごとに、Android 16風の浮き出るセクションヘッダー＆カードコンテナを挿入
            if (currentJuz !== juzNum) {
                if (currentJuz !== null) {
                    html += `</div>`; // 前のグループの閉じタグ
                }
                currentJuz = juzNum;
                
                // M3 Expressive セクションタイトル
                html += `
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--android-text-main, #1c1b1f); margin: 24px 8px 8px 8px; letter-spacing: 0.5px; text-transform: uppercase;">
                    
                    </div>
                    <div style="background: var(--android-surface, #ffffff); border-radius: 24px; padding: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); margin-bottom: 16px;">
                `;
            }

            // 各スーラアイテム
            html += `
                <a href="reader.html?surah=${s.number}" class="android-setting-item" style="border-radius: 8px; transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);">
                    <div class="android-item-left">
                        <div class="android-circle-icon" 
                             style="background-color: ${isSaved ? 'var(--android-selected-bg)' : 'var(--android-icon-bg)'} !important;
                                    color: ${isSaved ? 'var(--android-selected-text)' : 'var(--android-text-main)'} !important;">
                            ${String(s.number).padStart(3, '0')}
                        </div>
                        
                        <div class="android-item-text">
                            <div class="android-title-row">
                                <span class="android-surah-title" style="font-weight: 500;">${s.englishName}</span>
                            </div>
                            <span class="android-surah-subtitle">
                                ${s.numberOfAyahs} 節
                                ${isSaved ? `
                                    <span style="color: var(--android-selected-text) !important;  margin-left: 4px;">
                                        ・ 保存済
                                    </span>
                                ` : ''}
                            </span>
                        </div>
                    </div>

                    <div class="surah-name-ar" style="font-size: 0.8rem;">${s.name}</div>
                </a>
            `;
        });

        if (surahList.length > 0) {
            html += `</div>`; // 最後のグループの閉じタグ
        }
        
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

// 画面読み込み時のトリガー
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSurahs();
    checkAppUpdate();
});