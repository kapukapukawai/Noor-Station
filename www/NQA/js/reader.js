// ==========================================
// 📦 1. 倉庫（IndexedDB / Dexie）の定義
// ==========================================
const db = new Dexie("QuranOfflineDB");
db.version(4).stores({ 
    surahs: "id",
    translations: "id",
    wbw_data: "id", 
    audios: "id"
});
document.addEventListener('DOMContentLoaded', () => {
    const reciterSelect = document.getElementById('audio-reciter');
    if (reciterSelect) {
        // すでに存在しているグローバル変数があれば、セレクトボックスの選択状態をそれに合わせる
        if (typeof currentReciterId !== 'undefined') {
            reciterSelect.value = currentReciterId;
        }

        // ユーザーが別の声を選んだときの処理
        reciterSelect.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            
            // 既存の変数に新しい値を代入（変数名が書き換え可能ならこれでOK）
            if (typeof currentReciterId !== 'undefined') {
                currentReciterId = selectedId;
            }
            window.currentReciterId = selectedId; // 念のためグローバルにも持たせる
            
            console.log(`[AudioEngine] 読み手が変更されました: ${selectedId}`);
            localStorage.setItem('preferredReciterId', selectedId);
        });
    }
});

// ==========================================
// 🎨 2. 定数・グローバル変数定義（Material You 拡張版）
// ==========================================
let apiArabicData = null;   
let translationData = null;  
let currentSurahId = '1';
let currentResourceId = 'quran-uthmani'; 
let currentReciterId = 'Alafasy_128kbps'; 

// Material You (M3) 動的カラーパレットシステム
const COLORS = {
    // Primary (深みのある聖典グリーン)
    PRIMARY: '#2c4538',
    ON_PRIMARY: '#ffffff',
    PRIMARY_CONTAINER: '#edf5f1',
    ON_PRIMARY_CONTAINER: '#1d4533',
    
    // Secondary / Accent (異読用アクセントオレンジ)
    CUSTOM_ORANGE: '#FF8C00',
    SURFACE_VARIANT: '#f0f4f1',
    ON_SURFACE_VARIANT: '#414944',
    
    // M3ベースカラー
    BACKGROUND: '#f8faf7',
    SURFACE: '#ffffff',
    OUTLINE: '#717974',
    OUTLINE_VARIANT: '#c1c9c4',
    
    // 既存ロジック・変数との完全互換用マッピング（破壊防止ガード）
    DEEP_GREEN_HERO: '#2c4538',
    TEXT_HERO_JP: '#829b8f',
    DEEP_GREEN: '#1d4533',
    VARIANT_ORANGE: '#FF8C00'
};

// 🌟 キラートの定義メタデータ（怒涛の10伝承フルコンプリート！）
const qiraatConfig = {
    'hafs':   { id: 'quran-uthmani', name: 'Hafs (ハフス読み)', desc: '世界標準・最も一般的' },
    'warsh':  { id: 'ar.warsh',       name: 'Warsh (ワルシュ読み)', desc: '北アフリカ・モロッコ等' },
    'khalaf': { id: 'ar.khalaf',      name: 'Khalaf (ハラフ読み)', desc: 'クーファ派・伝統的伝承' },
    'qulun':  { id: 'ar.qaloohan',    name: 'Qalun (カールーン読み)', desc: 'リビア・チュニジア等' },
    'duri':   { id: 'ar.duri',        name: 'Al-Duri (ドゥーリー読み)', desc: 'スーダン・東アフリカ等' },
    'shuba':  { id: 'ar.shubah',      name: 'Shu\'bah (シュウバ読み)', desc: 'ハフスと並ぶイマーム伝承' },
    'qumbul': { id: 'ar.qumbul',      name: 'Qumbul (クンブル読み)', desc: 'マッカ派・イマーム・イブン・カシール伝承' },
    'bazzi':  { id: 'ar.bazzi',       name: 'Al-Bazzi (バッジー読み)', desc: 'マッカ派・伝統的な美しい読誦伝承' },
    'susi':   { id: 'ar.susi',        name: 'Al-Susi (スースィー読み)', desc: 'バスラ派・独特の規則を持つ読誦' },
    'kisai':  { id: 'ar.alkisai',     name: 'Al-Kisa\'i (キサイ読み)', desc: 'クーファ派・文法学者由来の伝承' }
};

// 🚨 タイポグラフィシステム（復活フォントファミリーにM3のエッセンスを調和）
const SANS_FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif";
const ARABIC_FONT = "'Scheherazade New', 'Amiri', serif";

let currentAudio = new Audio();
let isPlaying = false;
const durationCache = {};

// ==========================================
// 💅 2.5. Material You グローバルスタイル自動注入
// ==========================================
const injectMaterialYouStyles = () => {
    if (document.getElementById('m3-dynamic-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'm3-dynamic-styles';
    style.innerHTML = `
        body {
            background-color: ${COLORS.BACKGROUND} !important;
            font-family: ${SANS_FONT};
            transition: background-color 0.3s ease;
            margin: 0;
            padding: 16px;
        }

        /* Material You カードコンテナ（滑らかな大角丸） */
        .ayah-container {
            background: ${COLORS.SURFACE};
            border-radius: 24px !important;
            margin-bottom: 16px;
            border: none !important;
            box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.08);
            transition: all 0.3s cubic-bezier(0.2, 0, 0, 1) !important;
        }

        /* 再生中ハイライト：コンテナが美しく浮き上がり、色味が優しく変化 */
        .ayah-container.ayah-highlight {
            background: ${COLORS.PRIMARY_CONTAINER} !important;
            box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.06) !important;
            transform: scale(1.005);
        }

        /* 単語ボックス：文字の長さに合わせつつ、余白を削ってコンパクトに */
        .word-box {
            background: ${COLORS.SURFACE_VARIANT};
            color: ${COLORS.ON_SURFACE_VARIANT};
            border-radius: 10px;
            padding: 8px 8px !important;
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 0px !important;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
            border: 1px solid transparent;
            user-select: none;
            width: fit-content; /* ← 文字列の長さに合わせる */
            min-width: auto !important; /* ← 制限を解除 */
        }
            
        .word-box:hover {
            background: ${COLORS.PRIMARY_CONTAINER};
            color: ${COLORS.ON_PRIMARY_CONTAINER};
            transform: translateY(-3px);
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.08);
        }

        .word-box:active {
            transform: translateY(-1px);
            opacity: 0.85;
        }

        /* アイコンボタンのM3インタラクション */
        .m3-icon-btn {
            background: ${COLORS.SURFACE_VARIANT};
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            color: ${COLORS.PRIMARY};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        }

        .m3-icon-btn:hover {
            background: ${COLORS.PRIMARY_CONTAINER};
            color: ${COLORS.ON_PRIMARY_CONTAINER};
            transform: scale(1.05);
        }

        /* Webkitスクロールバーの最適化 */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.OUTLINE_VARIANT}; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: ${COLORS.OUTLINE}; }
    `;
    document.head.appendChild(style);
};

// ==========================================
// 🚀 3. ライフサイクル & イベント配線
// ==========================================
window.onload = async () => {
    console.log("[System] Quran Offline App Started (Al Quran Cloud / Full Features)");
    
    // Material You スタイルのインジェクションを実行
    injectMaterialYouStyles();
    
    const urlParams = new URLSearchParams(window.location.search);
    currentSurahId = urlParams.get('surah') || '1';
    
    // 初期キラートラベル（HAFSなど）をヘッダーボタンに反映
    updateQiraatTriggerLabel();
    
    await loadHybridData(currentSurahId, currentResourceId);
};

/**
 * 旧セレクトボックス用の互換ラップ関数
 */
function changeQiraat(value) {
    if (qiraatConfig[value]) {
        selectQiraatFromModal(value);
    }
}

/**
 * キラート選択モーダルを開く（ネイティブ dialog 完全対応版）
 */
function openQiraatModal() {
    const container = document.getElementById('qiraat-options-container');
    if (!container) return;

    let html = '';
    Object.keys(qiraatConfig).forEach(key => {
        const item = qiraatConfig[key];
        const isSelected = (currentResourceId === item.id);
        
        html += `
            <button type="button" onclick="selectQiraatFromModal('${key}')" 
                    style="width: 100%; text-align: left; padding: 12px 16px; border-radius: 10px; border: 2px solid ${isSelected ? COLORS.DEEP_GREEN : '#e0e0e0'}; background: ${isSelected ? '#edf5f1' : 'white'}; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; cursor: pointer; margin-bottom: 4px;">
                <div>
                    <div style="font-weight: bold; color: ${isSelected ? COLORS.DEEP_GREEN : '#333'}; font-size: 0.95rem;">${item.name}</div>
                    <div style="font-size: 0.75rem; color: #777; margin-top: 2px;">${item.desc}</div>
                </div>
                ${isSelected ? `<span class="material-symbols-outlined" style="color: ${COLORS.DEEP_GREEN}; font-weight: bold; font-size: 20px;">check_circle</span>` : ''}
            </button>
        `;
    });
    container.innerHTML = html;

    // Bootstrapを廃止し、ネイティブの showModal() を使用
    const modalEl = document.getElementById('qiraatModal');
    if (modalEl && typeof modalEl.showModal === 'function') {
        modalEl.showModal();
    }
}
/**
 * モーダル内でのキラート決定・データ再リロード処理
 */
/**
 * モーダル内でのキラート決定・データ再リロード処理
 */
async function selectQiraatFromModal(qiraatKey) {
    const modalEl = document.getElementById('qiraatModal');
    if (modalEl) {
        // 自前モーダルを非表示にして閉じる
        modalEl.style.display = 'none';
    }

    const item = qiraatConfig[qiraatKey];
    if (!item) return;

    // スクロール位置を安全に取得
    const scrollPos = window.scrollY;
    currentResourceId = item.id;
    
    updateQiraatTriggerLabel();

    // 🎧 粛清ガード：特殊音源は全滅したため、一律で生存が確認されている王道最高峰（Alafasy）へ流します
    currentReciterId = 'Alafasy_128kbps';

    const reciterSelect = document.getElementById('audio-reciter');
    if (reciterSelect) {
        reciterSelect.value = currentReciterId;
    }

    console.log(`[QiraatEngine] モーダル切り替え: ${qiraatKey} (${currentResourceId}) -> 生存音源: ${currentReciterId}`);
    
    await loadHybridData(currentSurahId, currentResourceId); 
    requestAnimationFrame(() => window.scrollTo(0, scrollPos));
}
/**
 * 🌟 追加：アラビア語の文字列を安全に比較・正規化するヘルパー
 */
function normalizeArabic(str) {
    if (!str) return '';
    return str
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // ゼロ幅スペース等のノイズを除去
        .replace(/\s+/g, ' ')                 // 連続するスペースを単一化
        .trim();
}
/**
 * ヘッダーボタンのテキストラベルを同期更新する
 */
function updateQiraatTriggerLabel() {
    const labelEl = document.getElementById('current-qiraat-label');
    if (!labelEl) return;
    
    const found = Object.values(qiraatConfig).find(item => item.id === currentResourceId);
    if (found) {
        labelEl.innerText = found.name.split(' ')[0].toUpperCase(); 
    }
}
/**
 * アラビア語の文字列を安全に比較・正規化するヘルパー（ノイズ・空白の誤検知防止）
 */
function normalizeArabic(str) {
    if (!str) return '';
    return str
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // ゼロ幅スペース等のノイズを除去
        .replace(/\s+/g, ' ')                 // 連続するスペースを単一化
        .trim();
}

/**
 * 📥 データロード & ハイブリッドキャッシュ（正規化比較・誤爆防止完全版）
 */
async function loadHybridData(surahId, editionId) {
    // URLの ?surah=1 みたいなパラメータから現在の章番号を確実に取得する
const urlParams = new URLSearchParams(window.location.search);
const currentSurahId = urlParams.get('surah') || '1'; // デフォルトで第1章

//もし surahInfo がまだなければAPIから最低限の情報を引っ張ってくる
if (!window.surahInfo) {
    try {
        const infoRes = await fetch(`https://api.alquran.cloud/v1/surah/${currentSurahId}`);
        const infoJson = await infoRes.json();
        if (infoJson.code === 200) {
            window.surahInfo = {
                name: infoJson.data.name,                 // アラビア語名
                englishName: infoJson.data.englishName,   // 英語名
                juz: infoJson.data.ayahs[0].juz           // 所属するジュズ
            };
        }
    } catch (e) {
        console.error("スーラ情報の取得に失敗しました", e);
    }
}
    const content = document.getElementById('quran-content');
    if (content) content.innerHTML = `<div class="p-5 text-center"><div class="spinner-border text-success" role="status"></div></div>`;
    
    const storageKey = `${surahId}_${editionId}`;
    
    try {
        const savedText = await db.surahs.get(storageKey);
        
        if (savedText && savedText.data) {
            apiArabicData = savedText.data;
            const savedTrans = await db.translations.get(storageKey);
            translationData = savedTrans ? savedTrans.data : [];
            console.log(`[Database] 倉庫から ${editionId} を復元`);
        } else {
            console.log(`[API] 倉庫不在: ${editionId} をフェッチ中...`);

            const arabicRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/${editionId}`);
            const arabicJson = await arabicRes.json();
            
            const hafsRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`);
            const hafsJson = await hafsRes.json();
            const hafsVerses = hafsJson.data.ayahs;

            const transRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/ja.japanese`);
            const transJson = await transRes.json();

            apiArabicData = arabicJson.data.ayahs;
            apiArabicData.forEach((ayah, aIdx) => {
                const wordsArray = ayah.text ? ayah.text.split(' ') : [];
                const hafsWordsArray = hafsVerses[aIdx]?.text ? hafsVerses[aIdx].text.split(' ') : [];
                
                ayah.words = wordsArray.map((wordText, wIdx) => {
                    // 💡 各々を完全に正規化してから比較する
                    const normCurrent = normalizeArabic(wordText);
                    const normHafs = normalizeArabic(hafsWordsArray[wIdx] || '');
                    
                    return {
                        display_arabic: wordText,
                        // 正規化した結果が一致するかどうかで安全に判定
                        isVariant: (editionId !== 'quran-uthmani' && normCurrent !== normHafs),
                        char_type_name: 'word'
                    };
                });
                ayah.verse_number = ayah.numberInSurah;
            });

            translationData = transJson.data.ayahs;

            await db.surahs.put({ id: storageKey, data: apiArabicData });
            await db.translations.put({ id: storageKey, data: translationData });
        }

        render();
    } catch (e) {
        console.error("フェッチ失敗:", e);
    }
}
// ==========================================
// 📥 5. 自動保存タスク
// ==========================================
async function performAutoDownload(surahId, editionId) {
    const storageKey = `${surahId}_${editionId}`;
    try {
        const existingTrans = await db.translations.get(storageKey);
        const isDataValid = existingTrans && existingTrans.data && existingTrans.data.length > 0 && !existingTrans.data[0].text.match(/^[A-Za-z]/);

        if (isDataValid) return; 

        const arabicRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/${editionId}`);
        const arabicJson = await arabicRes.json();
        
        const transRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/ja.japanese`);
        const transJson = await transRes.json();

        let hafsVerses = [];
        if (editionId !== 'quran-uthmani') {
            const hafsRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`);
            const hafsJson = await hafsRes.json();
            hafsVerses = hafsJson.data.ayahs;
        }

        const autoArabicData = arabicJson.data.ayahs;
        const autoTransData = transJson.data.ayahs.map(a => ({ text: a.text }));

        autoArabicData.forEach((ayah, aIdx) => {
            const wordsArray = ayah.text ? ayah.text.split(' ') : [];
            const hafsAyahText = hafsVerses[aIdx]?.text || '';
            const hafsWordsArray = hafsAyahText ? hafsAyahText.split(' ') : [];

            ayah.words = wordsArray.map((wordText, wIdx) => {
                const hafsWordText = hafsWordsArray[wIdx] || '';
                return {
                    display_arabic: wordText,
                    isVariant: (editionId !== 'quran-uthmani' && wordText !== hafsWordText),
                    char_type_name: 'word',
                    translation: { text: '' }
                };
            });
            ayah.verse_number = ayah.numberInSurah;
        });

        await db.transaction('rw', [db.surahs, db.translations, db.wbw_data], async () => {
            await db.surahs.put({ id: storageKey, data: autoArabicData });
            await db.translations.put({ id: storageKey, data: autoTransData });
            await db.wbw_data.put({ id: storageKey, data: autoArabicData });
        });
    } catch (error) {
        console.error("[AutoSave] 自動保存タスク失敗:", error);
    }
}

async function handleAutoSaveTrigger(surahId, editionId) {
    const isAutoSaveOn = localStorage.getItem('auto_cache_mode') !== 'false';
    if (isAutoSaveOn) {
        await performAutoDownload(surahId, editionId);
    }
}

// ==========================================
// 🎨 6. レンダリングエンジン (Material Design 3 統合)
// ==========================================
/**
 * アラビア語の文字列を安全に比較・正規化するヘルパー（ノイズ・空白の誤検知防止）
 */
function normalizeArabic(str) {
    if (!str) return '';
    return str
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // ゼロ幅スペース等のノイズを除去
        .replace(/\s+/g, ' ')                 // 連続するスペースを単一化
        .trim();
}

/**
 * 節（アヤ）の単語群をレンダリング（完全安全ガード版）
 */
/**
 * 節（アヤ）の単語群をレンダリング（完全・鉄壁ガード版）
 */
function renderWordsHtml(verse) {
    let wHtml = '';
    
    // 💡 verse が無い、または words が配列じゃない場合はフォールバックとして text をそのまま表示して安全に抜ける
    if (!verse || !Array.isArray(verse.words)) {
        const fallbackText = verse && (verse.text || verse.arabic_text) ? (verse.text || verse.arabic_text) : '';
        return `<span style="font-family: ${ARABIC_FONT}; font-size: 2rem;">${fallbackText}</span>`;
    }

    verse.words.forEach((w) => {
        if (!w || w.char_type_name === 'end') return;

        const displayWord = w.display_arabic || '';
        const normalizedDisplay = normalizeArabic(displayWord);
        const isActuallyDifferent = w.isVariant && normalizedDisplay !== '';

        const variantStyle = isActuallyDifferent 
            ? `color: ${COLORS.CUSTOM_ORANGE}; font-weight: 800; text-shadow: 0 0 10px rgba(255,140,0,0.2);` 
            : `color: ${COLORS.ON_PRIMARY_CONTAINER};`;

        const escapedTranslation = (w.translation && w.translation.text) ? w.translation.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
        const wordTranslationText = (w.translation && w.translation.text) ? w.translation.text : '';

        wHtml += `
            <div class="word-box" onclick="openWordModal('${displayWord}', '${escapedTranslation}')" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 8px; margin: 4px; background: ${COLORS.PRIMARY_CONTAINER}; border-radius: 12px; min-width: 70px;">
                <span style="font-family: ${ARABIC_FONT}; font-size: 1.8rem; line-height: 1.4; text-align: center; ${variantStyle}">${displayWord}</span>
                <span class="wbw" style="font-size: 0.75rem; opacity: 0.8; font-family: ${SANS_FONT}; font-weight: 500; text-align: center; margin-top: 4px;">${wordTranslationText}</span>
            </div>
        `;
    });

    // アヤ番号バッジ
    const verseNum = verse.verse_number || '';
    wHtml += `
        <div class="word-box" style="cursor: default; background: ${COLORS.PRIMARY_CONTAINER}; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; min-width: 55px; box-shadow: none;">
            <span style="font-family: ${ARABIC_FONT}; font-size: 2.2rem; color: ${COLORS.PRIMARY}; font-weight: bold; line-height: 1;">&#xFD3F;${verseNum}&#xFD3E;</span>
        </div>`;
        
    return wHtml;
}

function render() {
    const content = document.getElementById('quran-content');
    const surahTitleEl = document.getElementById('surah-title');
    if (!content) return;

    let ayahs = [];
    if (Array.isArray(window.apiArabicData)) {
        ayahs = window.apiArabicData;
    } else if (window.apiArabicData && Array.isArray(window.apiArabicData.ayahs)) {
        ayahs = window.apiArabicData.ayahs;
    } else if (typeof apiArabicData !== 'undefined') {
        if (Array.isArray(apiArabicData)) {
            ayahs = apiArabicData;
        } else if (apiArabicData && Array.isArray(apiArabicData.ayahs)) {
            ayahs = apiArabicData.ayahs;
        }
    }

    const safeTranslation = Array.isArray(translationData) ? translationData : [];

    if (ayahs.length === 0) {
        content.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; font-family: ${SANS_FONT}; color: ${COLORS.ON_SURFACE};">
                <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 8px;">データをダウンロード・準備中やで... 🔄</div>
                <div style="font-size: 0.9rem; opacity: 0.7;">少しだけ待ってな！自動で表示されるで〜</div>
            </div>
        `;
        return;
    }

    const info = window.surahInfo || {};
    const surahNameArabic = info.name || ""; 
    const surahNameEnglish = info.englishName || "";
    const juzId = info.juz || 1; 
    const safeAyahsCount = safeTranslation.length > 0 ? safeTranslation.length : ayahs.length;
    const currentSurahId = window.currentSurahId || (info ? info.number : 1);

    const found = Object.values(qiraatConfig).find(item => item.id === currentResourceId);
    const selectedText = found ? found.name : "Hafs";

    if (surahTitleEl) {
        surahTitleEl.innerText = `${surahNameEnglish}`;
    }

    // 💡 ヘッダー部分を画面幅100%に拡大
    let html = `
        <div style="background: ${COLORS.PRIMARY}; color: ${COLORS.ON_PRIMARY}; padding: 28px 40px; font-family: ${SANS_FONT}; width: 100%; box-sizing: border-box; margin-bottom: 24px; border-radius: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px;">
                <div style="display: flex; flex-direction: row; align-items: center; gap: 20px; min-width: 220px; flex-wrap: wrap;">
                    <div style="font-family: ${ARABIC_FONT}; font-size: 2.0rem; font-weight: 700; line-height: 1.2;">
                        ${surahNameArabic}
                    </div>
                    <button onclick="openAudioModal('${currentSurahId}')" 
                            style="background: ${COLORS.PRIMARY_CONTAINER}; color: ${COLORS.ON_PRIMARY_CONTAINER}; border: none; border-radius: 100px; padding: 10px 22px; font-weight: 600; cursor: pointer; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: fit-content;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">settings_voice</span>
                        <span>再生</span>
                    </button>
                </div>
                <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                    <div style="font-family: monospace; font-size: 0.85rem; color: ${COLORS.TEXT_HERO_JP}; text-align: right; display: flex; align-items: center; gap: 16px;">
                        <div>
                            <div style="margin-bottom: 4px;"><span>JUZ</span> <strong style="color:#fff;">${juzId}</strong></div>
                            <div><span>AYAHS</span> <strong style="color:#fff;">${safeAyahsCount}</strong></div>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); text-align: center;">
                            <span style="font-size: 0.6rem; opacity: 0.7; display: block; letter-spacing: 1px;">QIRA'AT</span>
                            <span style="color: ${COLORS.CUSTOM_ORANGE}; font-size: 1rem; font-weight: 900;">
                                ${typeof selectedText !== 'undefined' ? selectedText.split(' ')[0].toUpperCase() : 'HAFS'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    ayahs.forEach((verse, index) => {
        const translationVerse = safeTranslation[index] || {};
        html += `
            <div class="verse-container" style="width: 100%; box-sizing: border-box; margin-bottom: 24px; padding: 28px; background: ${COLORS.SURFACE}; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                <div class="arabic-text" style="font-family: ${ARABIC_FONT}; font-size: 2.2rem; line-height: 2.8; direction: rtl; display: flex; flex-direction: row; flex-wrap: wrap; justify-content: flex-start; align-items: center; gap: 6px; width: 100%;">
                    ${renderWordsHtml(verse)}
                </div>
                <div class="translation-text" style="font-family: ${SANS_FONT}; font-size: 1rem; margin-top: 16px; color: ${COLORS.ON_SURFACE}; line-height: 1.6; text-align: left;">
                    ${translationVerse.text || ''}
                </div>
            </div>
        `;
    });
    content.innerHTML = html;
}
// ==========================================
// 🛑 7. オーディオ制御コア（生存者24枠特化型）
// ==========================================
function stopPlayback() {
    isPlaying = false; 
    currentAudio.pause(); 
    currentAudio.src = ""; 
    currentAudio.onended = null; 
    updateNavPlayButton(false);
    document.querySelectorAll('.ayah-container').forEach(el => el.classList.remove('ayah-highlight'));
}

function togglePlayback() {
    if (isPlaying) stopPlayback();
    else openAudioModal(currentSurahId);
}

function updateNavPlayButton(playing) {
    const btn = document.getElementById('nav-play-btn');
    if (!btn) return;
    const icon = playing ? 'stop' : 'play_arrow';
    btn.innerHTML = `<span class="material-symbols-outlined" style="vertical-align: middle;">${icon}</span> ${playing ? "停止" : "再生"}`;
    btn.style.background = playing ? "#dc3545" : "#ffffff";
    btn.style.color = playing ? "#ffffff" : COLORS.DEEP_GREEN;
}

function getEveryAyahUrl(surahId, ayahNum, reciterId) {
    const sStr = String(surahId).padStart(3, '0');
    const aStr = String(ayahNum).padStart(3, '0');
    
    if (reciterId.includes('/') && !reciterId.startsWith('Portuguese')) {
        return `https://www.everyayah.com/data/${reciterId}/${sStr}/${aStr}.mp3`;
    }
    return `https://www.everyayah.com/data/${reciterId}/${sStr}${aStr}.mp3`;
}

async function cacheAyahAudio(storageKey, surahId, ayahNum, reciterId) {
    const sStr = String(surahId).padStart(3, '0');
    const aStr = String(ayahNum).padStart(3, '0');
    
    const urlCandidates = [];
    
    // 💡 選択された読み手のフォルダ構成に合わせてURLを生成
    urlCandidates.push(`https://www.everyayah.com/data/${reciterId}/${sStr}${aStr}.mp3`);

    if (reciterId.includes('/')) {
        urlCandidates.push(`https://www.everyayah.com/data/${reciterId}/${sStr}/${aStr}.mp3`);
    }

    // ❌ ここにあった「勝手にAlafasyにフォールバックする処理」を完全削除！

    let response = null;
    let successfulUrl = "";

    for (const url of urlCandidates) {
        try {
            console.log(`[AudioEngine] 接続トライ: ${url}`);
            const res = await fetch(url);
            if (res.ok) {
                response = res;
                successfulUrl = url;
                break;
            } else {
                console.warn(`[AudioEngine] ステータス ${res.status}: 404スキップ。次を試します。`);
            }
        } catch (e) {
            console.warn(`[AudioEngine] 通信失敗。次へシフトします。`, e);
        }
    }

    if (!response || !response.ok) {
        throw new Error(`[AudioEngine] 致命的: すべてのURL候補が全滅しました。`);
    }

    console.log(`[AudioEngine] 🎉 接続成功URL: ${successfulUrl}`);
    const audioBlob = await response.blob();

    await db.audios.put({
        id: storageKey,
        blob: audioBlob,
        updatedAt: Date.now()
    });
    
    console.log(`[AudioEngine] 倉庫保存完了: ${storageKey}`);
    return audioBlob;
}
/**
 * 単一アーヤ（節）の再生関数
 */
async function playAyahAudio(surahId, ayahNum) {
    document.querySelectorAll('.ayah-container').forEach(el => el.classList.remove('ayah-highlight'));
    const anchor = document.getElementById(`ayah-anchor-${ayahNum}`);
    if (anchor) {
        anchor.classList.add('ayah-highlight');
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return new Promise(async (resolve, reject) => {
        const storageKey = `audio_${surahId}_${ayahNum}_${currentReciterId}`;
        let audioBlob = null;

        try {
            const cachedRecord = await db.audios.get(storageKey);
            
            if (cachedRecord && cachedRecord.blob) {
                console.log(`[AudioEngine] ⚡倉庫（IndexedDB）からオフライン再生: ${storageKey}`);
                audioBlob = cachedRecord.blob;
            } else {
                audioBlob = await cacheAyahAudio(storageKey, surahId, ayahNum, currentReciterId);
            }

            const localAudioUrl = URL.createObjectURL(audioBlob);

            currentAudio.pause();
            currentAudio.src = localAudioUrl;
            
            const speedInput = document.getElementById('audio-speed');
            currentAudio.playbackRate = parseFloat(speedInput?.value || 1.0);

            currentAudio.onended = () => {
                if (anchor) anchor.classList.remove('ayah-highlight');
                URL.revokeObjectURL(localAudioUrl); 
                resolve();
            };

            currentAudio.onerror = (e) => {
                console.error(`[AudioEngine] 再生エラー:`, currentAudio.error);
                URL.revokeObjectURL(localAudioUrl);
                reject(e);
            };

            await currentAudio.play();

        } catch (error) {
            console.error(`[AudioEngine] キャッシュ再生タスクでエラー:`, error);
            if (anchor) anchor.classList.remove('ayah-highlight');
            reject(error);
        }
    });
}
/**
 * 🎧 オーディオ設定・範囲選択モーダルを開く関数
 */
function openAudioModal(surahId) {
    const modal = document.getElementById('audioModal');
    if (!modal) return;

    // 読み手セレクトボックスの初期化（まだなら生成）
    loadRecitersAndPopulateSelect();

    // 現在のスーラ（章）に含まれるアヤの数をもとに、開始・終了のセレクトボックスを動的生成
    const fromSelect = document.getElementById('audio-from');
    const toSelect = document.getElementById('audio-to');
    
    if (fromSelect && toSelect && apiArabicData) {
        const totalAyahs = apiArabicData.length;
        let optionsHtml = '';
        for (let i = 1; i <= totalAyahs; i++) {
            optionsHtml += `<option value="${i}">第 ${i} 節</option>`;
        }
        
        fromSelect.innerHTML = optionsHtml;
        toSelect.innerHTML = optionsHtml;
        
        // デフォルト値（最初から最後まで）
        fromSelect.value = 1;
        toSelect.value = totalAyahs;
    }

    // ネイティブの <dialog> をモーダルとして表示
    if (typeof modal.showModal === 'function') {
        modal.showModal();
    } else {
        modal.style.display = 'block'; // フォールバック
    }

    // モーダルが開いたタイミングで速度や見積もりも更新しておく
    const speedInput = document.getElementById('audio-speed');
    if (speedInput) {
        updateSpeedLabel(speedInput.value);
    }
}

/**
 * ループ範囲再生開始タスク
 */
async function startRangePlayback() {
    const from = parseInt(document.getElementById('audio-from')?.value || 1);
    const to = parseInt(document.getElementById('audio-to')?.value || 1);
    const totalLoops = parseInt(document.getElementById('loop-count')?.value || 1); 
    if (from > to) return alert("開始節が終了節より後です");

    if (document.activeElement) {
        document.activeElement.blur();
    }

    const modalEl = document.getElementById('audioModal');
if (modalEl && typeof modalEl.close === 'function') {
    modalEl.close();
}
    
    isPlaying = true;
    updateNavPlayButton(true);

    for (let loop = 0; loop < totalLoops; loop++) {
        if (!isPlaying) break;
        for (let i = from; i <= to; i++) {
            if (!isPlaying) break;
            await new Promise((resolve) => {
                playAyahAudio(currentSurahId, i)
                    .then(() => resolve())
                    .catch((err) => {
                        console.warn(`[AudioEngine] 節 ${i} スキップガード発動`, err);
                        document.getElementById(`ayah-anchor-${i}`)?.classList.remove('ayah-highlight');
                        resolve();
                    });
            });
        }
    }
    stopPlayback();
}

/**
 * 🏆 検証済み生存枠24選・生成エンジン
 */
async function loadRecitersAndPopulateSelect() {
    const reciterSelect = document.getElementById('audio-reciter');
    if (!reciterSelect) return;
    if (reciterSelect.options.length > 1) return;

    const rawReciters = [
        // --- 【不動の王道・スター朗誦者】 ---
        "Alafasy_128kbps|Mishary Rashid Alafasy [ハフス・標準最高峰]",
        "Abdurrahmaan_As-Sudais_192kbps|Abdul Rahman Al-Sudais [元メッカ総長・高速]",
        "Saood_ash-Shuraym_128kbps|Saud Al-Shuraim [元メッカ・魂の読誦]",
        "MaherAlMuaiqly128kbps|Maher Al-Muaiqly [現代メッカ・超人気]",
        "Yasser_Ad-Dussary_128kbps|Yasser Al-Dosari [心に響く重低音]",
        "Husary_64kbps|Mahmoud Khalil Al-Husary (Murattal) [エジプト大長老]",
        "Minshawy_Murattal_128kbps|Siddiq Al-Minshawi (Murattal) [天上の哀愁ボイス]",
        "Abdul_Basit_Murattal_192kbps|Abdul Basit (Murattal) [世紀のレジェンド]",
        "Abdul_Basit_Mujawwad_128kbps|Abdul Basit (Mujawwad) [神がかった超絶技巧]",
        "Abu_Bakr_Ash-Shaatree_128kbps|Abu Bakr Al-Shatri [優しく穏やかな響き]",
        "Hani_Rifai_192kbps|Hani ar-Rifai [涙を誘うエモーショナル読誦]",
        "Nasser_Alqatami_128kbps|Nasser Al-Qatami [ドラマチックな感情表現]",
        "Mustafa_Ismail_48kbps|Mustafa Ismail [エジプト伝説 of 巨匠]",

        // --- 【実力派イマーム・教育用（A-Z）】 ---
        "Abdullah_Basfar_192kbps|Abdullah Basfar [正確なタジュウィード教育用]",
        "Abdullah_Basfar_64kbps|Abdullah Basfar (64kbps)",
        "Abdullah_Matroud_128kbps|Abdullah Matroud [クリアで聴き取りやすい]",
        "Aziz_Alili_128kbps|Aziz Alili [東欧ボスニアの透明感ある声]",
        "Hani_Rifai_64kbps|Hani ar-Rifai (64kbps / 低ビットレート版)",
        "Khalefa_Al_Tunaiji_64kbps|Khalifa Al-Tunaiji [UAE・美しく響く低音]",
        "Muhammad_Ayyoub_128kbps|Muhammad Ayyub [元預言者モスク・元祖マディナ調]",
        "Muhammad_Ayyoub_32kbps|Muhammad Ayyub (Light 32kbps)",
        "Muhammad_Ayyoub_64kbps|Muhammad Ayyub (64kbps)",
        "Muhammad_Jibreel_128kbps|Muhammad Jibreel [ラマダーンの祈りで有名な巨匠]",
        "Muhammad_Jibreel_64kbps|Muhammad Jibreel (64kbps)",
        "Salah_Al_Budair_128kbps|Salah Al-Budair [マディナ・エモーショナル]"
    ];

    reciterSelect.innerHTML = ''; 

    rawReciters.forEach(item => {
        const parts = item.split('|');
        const folderId = parts[0];
        const displayName = parts[1];

        const option = document.createElement('option');
        option.value = folderId;
        option.textContent = displayName;
        
        if (folderId === currentReciterId) option.selected = true;
        reciterSelect.appendChild(option);
    });
}

/**
 * 再生速度変更 ＆ 終了見込み時間シミュレーター
 */
async function updateSpeedLabel(val) {
    const speed = parseFloat(val);
    const label = document.getElementById('speed-label');
    if (label) label.innerText = speed.toFixed(1) + 'x';
    if (currentAudio && isPlaying) currentAudio.playbackRate = speed;

    const estimateEl = document.getElementById('finish-estimate');
    if (!estimateEl || !apiArabicData) return;

    const from = parseInt(document.getElementById('audio-from')?.value || 1);
    const to = parseInt(document.getElementById('audio-to')?.value || apiArabicData.length);
    const loopCount = parseInt(document.getElementById('loop-count')?.value || 1);

    estimateEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:12px; vertical-align:middle;">sync</span> 計算中...`;

    const rangeSize = to - from + 1;
    if (rangeSize > 15) {
        let estimatedTotal = 0;
        for (let i = from; i <= to; i++) {
            const key = `duration_${currentSurahId}_${i}_${currentReciterId}`;
            estimatedTotal += durationCache[key] || 4.5; 
        }
        showFinalEstimate(estimatedTotal, loopCount, speed, estimateEl);
    } else {
        const durationPromises = [];
        for (let i = from; i <= to; i++) durationPromises.push(getAudioDuration(currentSurahId, i));
        const durations = await Promise.all(durationPromises);
        const totalSeconds = durations.reduce((a, b) => a + b, 0);
        showFinalEstimate(totalSeconds, loopCount, speed, estimateEl);
    }
}

function showFinalEstimate(totalSeconds, loopCount, speed, element) {
    const finalSeconds = (totalSeconds * loopCount) / speed;
    const m = Math.floor(finalSeconds / 60);
    const s = Math.round(finalSeconds % 60);
    element.innerHTML = `<span class="material-symbols-outlined" style="font-size:12px; vertical-align:middle;">schedule</span> 約 ${m}分 ${s}秒`;
}

function getAudioDuration(surahId, ayahNum) {
    const key = `duration_${surahId}_${ayahNum}_${currentReciterId}`;
    if (durationCache[key]) return Promise.resolve(durationCache[key]);
    
    return new Promise(async (resolve) => {
        try {
            const storageKey = `audio_${surahId}_${ayahNum}_${currentReciterId}`;
            const cachedRecord = await db.audios.get(storageKey);
            const audio = new Audio();
            
            if (cachedRecord && cachedRecord.blob) {
                audio.src = URL.createObjectURL(cachedRecord.blob);
            } else {
                audio.src = getEveryAyahUrl(surahId, ayahNum, currentReciterId);
            }
            
            audio.preload = "metadata";
            audio.onloadedmetadata = () => { 
                durationCache[key] = audio.duration; 
                resolve(audio.duration); 
            };
            audio.onerror = () => resolve(4.5); 
            setTimeout(() => resolve(4.5), 1500); 
        } catch {
            resolve(4.5);
        }
    });
}

function openWordModal(arabic, trans) {
    console.log(`[WordModal] Word: ${arabic}, Translation: ${trans}`);
}