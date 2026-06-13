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

// ==========================================
// 🎨 2. 定数・グローバル変数定義（エラー修正＆10キラート完全版）
// ==========================================
let apiArabicData = null;   
let translationData = null;  
let currentSurahId = '1';
let currentResourceId = 'quran-uthmani'; 
let currentReciterId = 'Alafasy_128kbps'; 

const COLORS = {
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

// 🚨 復活フォントファミリー
const SANS_FONT = "'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif";

let currentAudio = new Audio();
let isPlaying = false;
const durationCache = {};

// ==========================================
// 🚀 3. ライフサイクル & イベント配線
// ==========================================
window.onload = async () => {
    console.log("[System] Quran Offline App Started (Al Quran Cloud / Full Features)");
    
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
 * キラート選択モーダルを開く
 */
function openQiraatModal() {
    const container = document.getElementById('qiraat-options-container');
    if (!container) return;

    let html = '';
    Object.keys(qiraatConfig).forEach(key => {
        const item = qiraatConfig[key];
        const isSelected = (currentResourceId === item.id);
        
        html += `
            <button onclick="selectQiraatFromModal('${key}')" 
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

    const modalEl = document.getElementById('qiraatModal');
    if (modalEl) {
        let bModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        bModal.show();
    }
}

/**
 * モーダル内でのキラート決定・データ再リロード処理
 */
async function selectQiraatFromModal(qiraatKey) {
    const modalEl = document.getElementById('qiraatModal');
    if (modalEl) {
        const bModal = bootstrap.Modal.getInstance(modalEl);
        if (bModal) bModal.hide();
    }

    const item = qiraatConfig[qiraatKey];
    if (!item) return;

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

// ==========================================
// 📥 4. データロード & ハイブリッドキャッシュ
// ==========================================
async function loadHybridData(surahId, editionId) {
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
                
                ayah.words = wordsArray.map((wordText, wIdx) => ({
                    display_arabic: wordText,
                    isVariant: (editionId !== 'quran-uthmani' && wordText !== hafsWordsArray[wIdx]),
                    char_type_name: 'word'
                }));
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
// 🎨 6. レンダリングエンジン
// ==========================================
function renderWordsHtml(verse) {
    let wHtml = '';
    if (!verse.words) return wHtml;
    
    verse.words.forEach((w) => {
        if (w.char_type_name === 'end') return;
        
        const displayWord = w.display_arabic;
        const variantStyle = w.isVariant ? `color: ${COLORS.VARIANT_ORANGE}; font-weight: bold; text-shadow: 0 0 5px rgba(255,140,0,0.3);` : '';
        
        // 💡 エスケープ処理をより安全な文字列置換へ統一
        const escapedTranslation = (w.translation ? w.translation.text : '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        
        wHtml += `
            <div class="word-box" onclick="openWordModal('${displayWord}', '${escapedTranslation}')">
                <span style="font-family: 'Scheherazade New', 'Amiri', serif; font-size: 3.2rem; ${variantStyle}">${displayWord}</span>
                <span class="wbw">${w.translation ? w.translation.text : ''}</span>
            </div>`;
    });
    wHtml += `
        <div class="word-box" style="cursor: default; display: inline-flex; align-items: center;">
            <span style="font-family: 'Scheherazade New', 'Amiri', serif; font-size: 3.2rem; color: ${COLORS.DEEP_GREEN}; opacity: 0.8;">&#xFD3F;${verse.verse_number}&#xFD3E;</span>
        </div>`;
    return wHtml;
}

function render() {
    const content = document.getElementById('quran-content');
    const surahTitleEl = document.getElementById('surah-title');
    if (!content || !apiArabicData || !translationData) return;

    const info = window.surahInfo;
    const surahNameArabic = info ? info.name : ""; 
    const surahNameEnglish = info ? info.englishName : "";
    const juzId = info ? info.juz : 1; 
    const ayahsCount = translationData.length;

    const found = Object.values(qiraatConfig).find(item => item.id === currentResourceId);
    const selectedText = found ? found.name : "Hafs";

    if (surahTitleEl) surahTitleEl.innerText = `${surahNameEnglish}`;

    let html = `
        <div style="background: ${COLORS.DEEP_GREEN_HERO}; color: white; padding: 40px; font-family: ${SANS_FONT}; width: 100%; direction: ltr; margin-bottom: 20px; border-radius: 12px;">
            <div style="max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-family: 'Scheherazade New', 'Amiri', serif; font-size: 2.2rem; font-weight: 700; line-height: 1.2; margin-bottom: 10px;">
                        ${surahNameArabic}
                    </div>
                    <button onclick="openAudioModal(${currentSurahId})" 
                            style="background: white; color: ${COLORS.DEEP_GREEN}; border: none; border-radius: 8px; padding: 8px 16px; font-weight: bold; cursor: pointer; font-size: 0.9rem; margin-top: 10px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <span class="material-symbols-outlined" style="font-size: 18px;">settings_voice</span> 範囲再生設定
                    </button>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 1px; background: rgba(255,255,255,0.2); height: 50px;"></div>
                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: ${COLORS.TEXT_HERO_JP}; text-align: right;">
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 2px;">
                            <span>JUZ</span><span style="color:#fff; font-weight:bold;">${juzId}</span>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 8px;">
                            <span>AYAHS</span><span style="color:#fff; font-weight:bold;">${ayahsCount}</span>
                        </div>
                        <div>
                            <span style="font-size: 0.6rem; opacity: 0.5; display: block;">QIRA'AT</span>
                            <span style="color: ${COLORS.VARIANT_ORANGE}; font-size: 1.1rem; font-weight: 800;">
                                ${selectedText.split(' ')[0].toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    apiArabicData.forEach((apiVerse, idx) => {
        const translationText = translationData[idx] ? translationData[idx].text : "...";
        html += `
            <div id="ayah-anchor-${apiVerse.verse_number}" class="ayah-container" style="transition: all 0.4s; padding: 20px 0; border-bottom: 1px solid #eee;">
                <div style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; direction: ltr;">
                        <span style="font-family: monospace; font-weight: bold; color: ${COLORS.DEEP_GREEN};">AYAH ${apiVerse.verse_number}</span>
                        <button onclick="playAyahAudio(${currentSurahId}, ${apiVerse.verse_number})" 
                                style="background:none; border:1px solid ${COLORS.DEEP_GREEN}; border-radius:50%; width:32px; height:32px; color:${COLORS.DEEP_GREEN}; cursor:pointer; display: flex; align-items:center; justify-content:center;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">play_arrow</span>
                        </button>
                        <div style="flex-grow:1; height:1px; background:linear-gradient(to right, ${COLORS.DEEP_GREEN}, transparent); opacity:0.1;"></div>
                    </div>
                    <div style="direction: rtl; margin-bottom: 25px; text-align: right;">
                        <div style="display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 10px 15px; line-height: 4.5rem;">
                            ${renderWordsHtml(apiVerse)}
                        </div>
                    </div>
                    <div style="border-left: 4px solid ${COLORS.DEEP_GREEN}; padding-left: 20px; color: #333; line-height: 1.6; font-size: 1.1rem; direction: ltr; text-align: left;">
                        ${translationText}
                    </div>
                </div>
            </div>`;
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

/**
 * 音声ファイルをEveryAyahからフェッチしてIndexedDB（倉庫）に保存する関数
 */
async function cacheAyahAudio(storageKey, surahId, ayahNum, reciterId) {
    const sStr = String(surahId).padStart(3, '0');
    const aStr = String(ayahNum).padStart(3, '0');
    
    const urlCandidates = [];
    urlCandidates.push(`https://www.everyayah.com/data/${reciterId}/${sStr}${aStr}.mp3`);

    if (reciterId.includes('/')) {
        urlCandidates.push(`https://www.everyayah.com/data/${reciterId}/${sStr}/${aStr}.mp3`);
    }

    if (reciterId !== 'Alafasy_128kbps') {
        urlCandidates.push(`https://www.everyayah.com/data/Alafasy_128kbps/${sStr}${aStr}.mp3`);
    }

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
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
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