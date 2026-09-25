/**
 * selection.js - 聖典目録の取得と描画 (外部JSON・Android 16 Expressive版)
 */

const db = new Dexie("QuranOfflineDB");
db.version(4).stores({
    surahs: "id",       
    metadata: "key"     
});

// Juz割り振りヘルパー
function getJuzForSurah(surahNumber) {
    return Math.min(30, Math.max(1, Math.ceil(surahNumber / 4))); 
}

async function fetchAndRenderSurahs() {
    const container = document.getElementById('surah-list-container');
    if (!container) return;

    try {
        let surahs = await db.metadata.get('all_surahs');
        
        if (!surahs) {
            container.innerHTML = `<div class="p-5 center-align font-bold">ローカル目録を読み込み中...</div>`;
            
            // 💡 外部のローカルJSONファイルから安全に取得
            const res = await fetch('./surahs.json');
            if (!res.ok) throw new Error("surahs.json の読み込みに失敗しました");
            
            const json = await res.json();
            surahs = { key: 'all_surahs', data: json.surahs };
            
            // 次回から高速化するためにIndexedDBにキャッシュ保存
            await db.metadata.put(surahs);
        }
        
        const surahList = surahs.data;
        const savedKeys = await db.surahs.toCollection().primaryKeys();

        let html = '';
        let currentJuz = null;

        surahList.forEach(s => {
            const isSaved = savedKeys.some(key => key.startsWith(`${s.number}_`));
            const juzNum = getJuzForSurah(s.number);

            // Android 16 Expressive風：Juzグループのセクションヘッダー＆大角丸カード
            if (currentJuz !== juzNum) {
                if (currentJuz !== null) {
                    html += `</div>`; 
                }
                currentJuz = juzNum;
                
                html += `
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--android-text-main, #1c1b1f); margin: 24px 8px 8px 8px; letter-spacing: 0.5px; text-transform: uppercase;">
                        Juz ${currentJuz} パート
                    </div>
                    <div style="background: var(--android-surface, #ffffff); border-radius: 24px; padding: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); margin-bottom: 16px;">
                `;
            }

            html += `
                <a href="reader.html?surah=${s.number}" class="android-setting-item" style="border-radius: 16px; transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);">
                    <div class="android-item-left">
                        <div class="android-circle-icon" 
                             style="background-color: ${isSaved ? 'var(--android-selected-bg)' : 'var(--android-icon-bg)'} !important;
                                    color: ${isSaved ? 'var(--android-selected-text)' : 'var(--android-text-main)'} !important;">
                            ${String(s.number).padStart(3, '0')}
                        </div>
                        
                        <div class="android-item-text">
                            <div class="android-title-row">
                                <span class="android-surah-title" style="font-weight: 700;">${s.englishName}</span>
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

                    <div class="surah-name-ar" style="font-size: 1.25rem;">${s.name}</div>
                </a>
            `;
        });

        if (surahList.length > 0) {
            html += `</div>`; 
        }
        
        container.innerHTML = html;

    } catch (e) {
        console.error("リスト表示エラー:", e);
        container.innerHTML = `
            <div class="error padding round margin max-width" style="margin: 24px auto !important; color: red;">
                <h5>オフライン読み込みエラー</h5>
                <p>ローカルの `;surahs.json` が見つからないか、通信エラーが発生しました: ${e.message}</p>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSurahs();
});