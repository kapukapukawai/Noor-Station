/**
 * selection.js - 聖典目録の取得と描画 (外部JSONのJuz情報＆日本語切替対応版)
 */

const db = new Dexie("QuranOfflineDB");
db.version(4).stores({
    surahs: "id",       
    metadata: "key"     // all_surahs, displayJapanese などの保存用
});

async function getSurahListData() {
    // 1. IndexedDBのキャッシュをチェック
    let cached = await db.metadata.get('all_surahs');
    if (cached && cached.data && cached.data.length > 0) {
        return cached.data;
    }

    try {
        // 2. `surahs.json` と `surah_ja.json` の両方を同時にフェッチする
        const [resSurahs, resJa] = await Promise.all([
            fetch('../surahs.json'),
            fetch('../surah_ja.json')
        ]);

        if (resSurahs.ok) {
            const jsonSurahs = await resSurahs.json();
            const surahArray = jsonSurahs.surahs || jsonSurahs;
            
            // 日本語データ（{ "1": "開端章", ... }）が取得できたらマージする
            let jaData = {};
            if (resJa.ok) {
                jaData = await resJa.json();
            }

            // 各スーラに日本語名（japaneseName）を合体させる
            const enrichedData = surahArray.map(s => ({
                ...s,
                japaneseName: jaData[s.number] || s.englishName, // キーが章番号の文字列や数値に対応
                juz: s.juz || Math.min(30, Math.ceil(s.number / 4))
            }));

            await db.metadata.put({ key: 'all_surahs', data: enrichedData });
            return enrichedData;
        }
    } catch (e) {
        console.warn("ローカルJSONの取得・マージに失敗しました", e);
    }

    return [];
}
// 「日本語で表示」のスイッチ要素を取得
const japaneseDisplaySwitch = document.getElementById('japaneseDisplaySwitch');

if (japaneseDisplaySwitch) {
    japaneseDisplaySwitch.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        
        // 1. IndexedDBの metadata に設定を保存
        await db.metadata.put({ key: 'displayJapanese', value: isChecked });
        
        // 2. リストを再描画して即座に言語を切り替える
        if (typeof fetchAndRenderSurahs === 'function') {
            fetchAndRenderSurahs();
        }
    });
}
async function fetchAndRenderSurahs() {
    const container = document.getElementById('surah-list-container');
    if (!container) return;

    try {
        // 1. 「日本語で表示」の設定を取得
        const settingObj = await db.metadata.get('displayJapanese');
        const isJapanese = settingObj ? settingObj.value : false;

        const japaneseDisplaySwitch = document.getElementById('japaneseDisplaySwitch');
        if (japaneseDisplaySwitch) {
            japaneseDisplaySwitch.checked = isJapanese;
        }

        // 2. スーラリストデータの取得
        const surahList = await getSurahListData();
        if (surahList.length === 0) {
            container.innerHTML = `<div class="p-5 center-align font-bold" style="color: var(--android-text-sub);">聖典データが見つかりません。オンライン状態で一度再読み込みしてください。</div>`;
            return;
        }

        const savedKeys = await db.surahs.toCollection().primaryKeys();

        let html = '';
        let currentJuz = null;

        surahList.forEach(s => {
            const sNum = s.number;
            const isSaved = savedKeys.some(key => key.startsWith(`${sNum}_`));
            
            // 💡 外部JSONから取得したJuz情報を使用（なければフォールバック計算）
            const juzNum = s.juz || s.juzNumber || Math.min(30, Math.ceil(sNum / 4));

            // Juzが変わるごとにセクションヘッダー＆カードコンテナを構築
            if (currentJuz !== juzNum) {
                if (currentJuz !== null) {
                    html += `</div>`; 
                }
                currentJuz = juzNum;
                
                html += `
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--android-text-main, #1c1b1f); margin: 24px 8px 8px 8px; letter-spacing: 0.5px; text-transform: uppercase;">
                        Juz ${juzNum}
                    </div>
                    <div style="background: var(--android-surface, #ffffff); border-radius: 24px; padding: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); margin-bottom: 16px;">
                `;
            }

            // 💡 スイッチの状態に応じて日本語名／英語名を切り替え
            const displayName = isJapanese ? (s.japaneseName || s.englishName) : s.englishName;

            html += `
                <a href="reader.html?surah=${sNum}" class="android-setting-item" style="border-radius: 8px; transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);">
                    <div class="android-item-left">
                        <div class="android-circle-icon" 
                             style="background-color: ${isSaved ? 'var(--android-selected-bg)' : 'var(--android-icon-bg)'} !important;
                                     color: ${isSaved ? 'var(--android-selected-text)' : 'var(--android-text-main)'} !important;">
                            ${String(sNum).padStart(3, '0')}
                        </div>
                        
                        <div class="android-item-text">
                            <div class="android-title-row">
                                <span class="android-surah-title" style="font-weight: 500;">${displayName}</span>
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
            html += `</div>`; 
        }
        
        container.innerHTML = html;

    } catch (e) {
        console.error("リスト描画エラー:", e);
    }
}

// オフキャンバスを閉じるグローバル関数
function closeOffcanvasMenu() {
    const menu = document.getElementById('offcanvasMenu');
    if (menu && typeof menu.close === 'function') {
        menu.close();
    }
}

// 画面読み込み時＆スイッチ変更時のイベント登録
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSurahs();
    if (typeof checkAppUpdate === 'function') {
        checkAppUpdate();
    }

    const japaneseDisplaySwitch = document.getElementById('japaneseDisplaySwitch');
    if (japaneseDisplaySwitch) {
        japaneseDisplaySwitch.addEventListener('change', async (e) => {
            const isChecked = e.target.checked;
            await db.metadata.put({ key: 'displayJapanese', value: isChecked });
            fetchAndRenderSurahs(); // 即座に再描画して言語を反映！
        });
    }
});