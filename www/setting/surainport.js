// ==========================================
// 📦 倉庫（IndexedDB）の定義（バージョン4）
// ==========================================
var db = new Dexie("QuranOfflineDB");
db.version(4).stores({
    surahs: "id",
    translations: "id",
    wbw_data: "id",
    audios: "id"
});

// 10キラート全対応マッピング
const qiraatMap = {
    'hafs': 'quran-uthmani', 'warsh': 'ar.warsh', 'qulun': 'ar.qaloohan', 
    'duri': 'ar.duri', 'shuba': 'ar.shubah', 'kisai': 'ar.kisai',
    'hamza': 'ar.hamza', 'abujafar': 'ar.abujafar', 'yaqub': 'ar.yaqub', 'khalaf': 'ar.khalaf'
};

const qiraatLabels = {
    'hafs': 'ハフス', 'warsh': 'ワルシュ', 'qulun': 'カルーン', 
    'duri': 'ドゥリー', 'shuba': 'シューバ', 'kisai': 'キサイ',
    'hamza': 'ハムザ', 'abujafar': 'アブージャファル', 'yaqub': 'ヤークーブ', 'khalaf': 'ハラフ'
};

function getModeConfig() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'text';
    const configs = {
        'text':  { title: "📖 聖典本文管理", table: "surahs", label: "本文", color: "#1d4533" },
        'ja':    { title: "🇯🇵 和訳データ管理", table: "translations", label: "和訳", color: "#003366" },
        'wbw':   { title: "🧩 WBWデータ管理", table: "wbw_data", label: "単語訳", color: "#6a1b9a" },
        'audio': { title: "🔊 音声データ管理", table: "audios", label: "音声", color: "#c62828" }
    };
    return { name: mode, ...configs[mode] };
}

/**
 * リスト描画
 */
async function initList() {
    const config = getModeConfig();
    const container = document.getElementById('dl-list-container');
    if(!container) return;
    
    const infoRes = await fetch("https://api.quran.com/api/v4/chapters?language=ja");
    const infoData = await infoRes.json();
    const options = Object.keys(qiraatMap).map(k => `<option value="${k}">${qiraatLabels[k]}</option>`).join('');

    let html = "";
    const savedKeys = await db[config.table].toCollection().primaryKeys();

    for(const surah of infoData.chapters) {
        const defaultId = qiraatMap['hafs'];
        const isSaved = savedKeys.includes(`${surah.id}_${defaultId}`);

        let selector = (config.name === 'text' || config.name === 'wbw') 
            ? `<select id="qiraat-select-${surah.id}" class="form-select form-select-sm" style="width:120px; margin-right:10px;" onchange="refreshButtonState(${surah.id})">${options}</select>` : "";

        html += `
            <div class="dl-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee; background:white;">
                <div style="flex:1"><strong>${surah.id}. ${surah.name_simple}</strong></div>
                <div style="display:flex; align-items:center;">
                    ${selector}
                    <button id="btn-${surah.id}" onclick="handleProcess(${surah.id}, ${isSaved})" class="btn-dl"
                        style="background:${isSaved ? config.color : 'transparent'}; color:${isSaved ? 'white' : config.color}; border:1px solid ${config.color}; border-radius:20px; padding:5px 15px; min-width:90px;">
                        ${isSaved ? '削除' : config.label + '保存'}
                    </button>
                </div>
            </div>`;
    }
    container.innerHTML = html;
}

/**
 * 選択変更時にボタンを即時反映
 */
async function refreshButtonState(surahId) {
    const config = getModeConfig();
    const qSelect = document.getElementById(`qiraat-select-${surahId}`);
    const btn = document.getElementById(`btn-${surahId}`);
    const selectedResourceId = qiraatMap[qSelect.value];
    
    const exists = await db[config.table].get(`${surahId}_${selectedResourceId}`) !== undefined;
    
    btn.innerText = exists ? '削除' : config.label + '保存';
    btn.style.background = exists ? config.color : 'transparent';
    btn.style.color = exists ? 'white' : config.color;
    btn.onclick = () => handleProcess(surahId, exists);
}

/**
 * 保存・削除実行
 */
async function handleProcess(surahId, isSaved) {
    const config = getModeConfig();
    const qSelect = document.getElementById(`qiraat-select-${surahId}`);
    const selectedQiraat = qSelect ? qiraatMap[qSelect.value] : qiraatMap['hafs'];

    if (isSaved) {
        if (confirm("削除しますか？")) { 
            await db[config.table].delete(`${surahId}_${selectedQiraat}`); 
            refreshButtonState(surahId);
        }
    } else {
        await downloadRouter(surahId, config, selectedQiraat);
        refreshButtonState(surahId);
    }
}

async function downloadRouter(id, config, resourceId) {
    try {
        if (config.name === 'text') await downloadText(id, resourceId);
        else if (config.name === 'ja') await downloadJa(id, resourceId);
        else if (config.name === 'wbw') await downloadWBW(id, resourceId);
        else if (config.name === 'audio') await downloadAudio(id, resourceId);
    } catch(e) { alert("失敗: " + e); }
}

async function downloadText(id, resourceId) {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/${resourceId}`);
    const json = await res.json();
    await db.surahs.put({ id: `${id}_${resourceId}`, data: json.data.ayahs });
}

async function downloadJa(id, resourceId) {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/ja.japanese`);
    const json = await res.json();
    await db.translations.put({ id: `${id}_${resourceId}`, data: json.data.ayahs });
}

async function downloadWBW(id, resourceId) {
    const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${id}?words=true`);
    const json = await res.json();
    await db.wbw_data.put({ id: `${id}_${resourceId}`, data: json.verses });
}

// downloadAudioは前回までのBlob保存ロジックをそのままここに追記してください
async function downloadAudio(id, resourceId) { /* 既存の音声DLロジック */ }

window.addEventListener('load', initList);