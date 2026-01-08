let allData = [];
let sortMode = 'rank';
let filterGenre = 'All';
const SHEET_ID = '13bOmsDf8HibgVqyfcKWoH7SZPxk3k3ZIIOf--mduqbU';

// --- CONFIGURATION ---
const members = [{id:'kirk', n:'Kirk'},{id:'huber', n:'Huber'},{id:'lattanzio', n:'Lattanzio'},{id:'walco', n:'Walco'}];
const memberIds = ['kirk','huber','lattanzio','walco'];

function formatTime(m) {
    if(!m) return "0m";
    const h = Math.floor(m/60);
    return h > 0 ? `${h}h ${m%60}m` : `${m}m`;
}

async function load() {
    try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`);
        const txt = await res.text();
        
        let totalP = 0, totalM = 0, completedCount = 0;

        allData = txt.split('\n').slice(1).map((r, i) => {
            const c = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const rRaw = (c[11]||"").replace(/"/g,"").trim();
            const hasRank = rRaw && rRaw !== 'N/A';
            const pgs = parseInt((c[39]||"0").replace(/\D/g,"")) || 0;
            const mins = parseInt((c[40]||"0").replace(/\D/g,"")) || 0;
            
            if (hasRank) { totalP += pgs; totalM += mins; completedCount++; }

            return {
                id: parseInt(c[0])||(i+1),
                title: (c[1]||"").replace(/"/g,""),
                author: (c[2]||"").replace(/"/g,""),
                rank: hasRank ? parseInt(rRaw) : 999,
                genre: (c[17]||"Other").replace(/"/g,""),
                pages: pgs,
                length: mins,
                status: (c[41]||"").trim().toLowerCase(),
                img: `covers/${parseInt(c[0])||(i+1)}.jpg`,
                selector: (c[16]||"").replace(/"/g,""),
                scores: [parseInt(c[3])||999, parseInt(c[4])||999, parseInt(c[5])||999, parseInt(c[6])||999]
            };
        }).filter(b => b.title && b.title !== "Book");

        document.getElementById('stat-count').innerText = completedCount;
        document.getElementById('stat-pages').innerText = totalP.toLocaleString();
        document.getElementById('stat-mins').innerText = formatTime(totalM);
        document.getElementById('count-display').innerText = allData.length;

        renderFeatures();
        renderLibrary();
        renderCommittee();
        updateNavUI();
    } catch (e) { console.error("Error loading data:", e); }
}

function renderFeatures() {
    const rankedBooks = allData.filter(b => b.rank !== 999).sort((a,b) => b.id - a.id);
    const lastRead = rankedBooks[0];
    const rd = allData.find(b => b.status === 'reading');
    const nx = allData.find(b => b.status === 'next');

    // 1. Last Read
    if (lastRead) {
            document.getElementById('hero-last').innerHTML = `
            <div class="hero-card" onclick="openModal(${lastRead.id})">
                <img src="${lastRead.img}" class="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0">
                <div class="flex-grow min-w-0">
                    <p class="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Last Read</p>
                    <h3 class="font-black text-sm uppercase leading-none mb-1 text-slate-900 truncate">${lastRead.title}</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 truncate">${lastRead.author}</p>
                    <span class="inline-block px-2 py-0.5 bg-slate-900 text-white text-[8px] font-bold uppercase rounded">Ranked #${lastRead.rank}</span>
                </div>
            </div>`;
    } else { document.getElementById('hero-last').style.display = 'none'; }

    // 2. Reading
    if (rd) {
        document.getElementById('hero-reading').innerHTML = `
            <div class="hero-card hero-pulse" onclick="openModal(${rd.id})">
                <img src="${rd.img}" class="w-16 h-16 rounded-lg object-cover shadow-sm flex-shrink-0">
                <div class="flex-grow min-w-0">
                    <p class="text-[9px] font-black uppercase text-blue-600 mb-1 tracking-widest">Reading Now</p>
                    <h3 class="font-black text-sm uppercase leading-none mb-1 text-slate-900 truncate">${rd.title}</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 truncate">${rd.author}</p>
                    <span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold uppercase rounded">Active</span>
                </div>
            </div>`;
    } else { document.getElementById('hero-reading').style.display = 'none'; }

    // 3. Up Next
    if (nx) {
        document.getElementById('hero-next').innerHTML = `
            <div class="hero-card opacity-80" onclick="openModal(${nx.id})">
                <img src="${nx.img}" class="w-16 h-16 rounded-lg object-cover grayscale flex-shrink-0">
                <div class="flex-grow min-w-0">
                    <p class="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Up Next</p>
                    <h3 class="font-black text-sm uppercase leading-none mb-1 text-slate-500 truncate">${nx.title}</h3>
                    <p class="text-[10px] font-bold text-slate-300 uppercase mb-2 truncate">${nx.author}</p>
                    <span class="inline-block px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-bold uppercase rounded">On Deck</span>
                </div>
            </div>`;
    } else { document.getElementById('hero-next').style.display = 'none'; }
}

function renderLibrary() {
    const grid = document.getElementById('grid');
    const empty = document.getElementById('empty-state');
    const term = document.getElementById('searchInput').value.toLowerCase();
    
    let items = allData.filter(b => 
        (filterGenre === 'All' || b.genre === filterGenre) &&
        (b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term))
    );

    if (items.length === 0) {
        grid.style.display = 'none';
        empty.classList.remove('hidden');
        document.getElementById('count-display').innerText = "0";
        return;
    } else {
        grid.style.display = 'grid';
        empty.classList.add('hidden');
        document.getElementById('count-display').innerText = items.length;
    }

    if(sortMode === 'rank') items.sort((a,b) => a.rank - b.rank);
    else if(sortMode === 'order') items.sort((a,b) => a.id - b.id);
    else if(sortMode === 'title') items.sort((a,b) => a.title.localeCompare(b.title));
    else { 
        const mIdx = memberIds.indexOf(sortMode);
        items.sort((a,b) => a.scores[mIdx] - b.scores[mIdx]);
    }

    grid.innerHTML = items.map(b => {
        let displayRank = b.rank === 999 ? '-' : `#${b.rank}`;
        let displayLabel = 'Consensus';
        let badgeHTML = '';

        if (memberIds.includes(sortMode)) {
            const mIdx = memberIds.indexOf(sortMode);
            const score = b.scores[mIdx];
            displayRank = score === 999 ? '-' : `#${score}`;
            displayLabel = sortMode.toUpperCase();
            if(score <= 5) badgeHTML = `<div class="rank-badge badge-blue">TOP 5</div>`;
        } else {
            if(b.rank <= 10) badgeHTML = `<div class="rank-badge badge-gold">TOP 10</div>`;
        }

        return `
        <div class="book-card" onclick="openModal(${b.id})">
            <div class="aspect-square bg-slate-100 overflow-hidden relative">
                <img src="${b.img}" class="crop-square" onerror="this.src='https://placehold.jp/30/e2e8f0/94a3b8/400x400.png?text=Cover'">
                <div class="genre-pill">${b.genre}</div>
                ${badgeHTML}
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <div class="mb-3">
                    <h3 class="font-black text-[11px] uppercase leading-tight line-clamp-2">${b.title}</h3>
                    <p class="text-[9px] font-bold text-blue-600 uppercase mt-1 truncate">${b.author}</p>
                </div>
                <div class="flex justify-between items-end border-t pt-2 mt-auto">
                    <div class="text-left">
                        <p class="text-[7px] font-black text-slate-400 uppercase tracking-tighter">${displayLabel}</p>
                        <p class="text-[10px] font-bold text-slate-700 leading-none">${displayRank}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[7px] font-black text-slate-400 uppercase leading-none">Order</p>
                        <p class="text-[10px] font-black italic">${b.id}</p>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    updateButtons();
}

function renderCommittee() {
    const ranked = allData.filter(b => b.rank !== 999);
    
    // INSIGHT 1: DOMINANT GENRE
    const gCount = ranked.reduce((a,b)=>{ a[b.genre]=(a[b.genre]||0)+1; return a; }, {});
    const topG = Object.entries(gCount).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('insight-1').innerHTML = `<div class="bg-white p-6 rounded-2xl border shadow-sm h-full flex flex-col justify-center"><p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Dominant Genre</p><p class="text-3xl font-black text-slate-900 mt-2 mb-1 font-header">${topG[0]}</p><p class="text-xs text-slate-500 font-bold">${Math.round((topG[1]/ranked.length)*100)}% of library</p></div>`;

    // INSIGHT 2: THE BATTLEGROUND
    let maxSpread = 0;
    let divisiveBook = { title: '-', spread: 0 };
    
    ranked.forEach(b => {
        const validScores = b.scores.filter(s => s !== 999);
        if (validScores.length > 1) {
            const best = Math.min(...validScores);
            const worst = Math.max(...validScores);
            const spread = worst - best;
            if (spread > maxSpread) {
                maxSpread = spread;
                divisiveBook = { title: b.title, spread: spread, img: b.img, id: b.id };
            }
        }
    });

    document.getElementById('insight-2').innerHTML = `
        <div class="bg-white p-6 rounded-2xl border shadow-sm h-full relative overflow-hidden group cursor-pointer flex flex-col justify-center" onclick="openModal(${divisiveBook.id})">
            <div class="relative z-10">
                <p class="text-[9px] font-black uppercase text-red-500 tracking-widest mb-1 flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> The Battleground</p>
                <p class="text-xl font-black text-slate-900 leading-tight line-clamp-2 mt-2 font-header" title="${divisiveBook.title}">${divisiveBook.title}</p>
                <p class="text-xs text-slate-500 font-bold mt-1">${divisiveBook.spread} spot disagreement</p>
            </div>
            <img src="${divisiveBook.img}" class="absolute right-[-20px] bottom-[-20px] w-28 h-28 object-cover rounded-full opacity-10 group-hover:opacity-30 group-hover:scale-110 transition duration-300 pointer-events-none">
        </div>`;

    // INSIGHT 3: BEST SELECTOR
    let bestSelector = {name:'-', score: 1000};
    members.forEach(m => {
        const picks = ranked.filter(b => b.selector.toLowerCase().includes(m.n.toLowerCase()));
        if(picks.length > 0) {
            const avg = picks.reduce((a,b)=>a+b.rank,0) / picks.length;
            if(avg < bestSelector.score) bestSelector = {name: m.n, score: avg};
        }
    });
    document.getElementById('insight-3').innerHTML = `<div class="bg-white p-6 rounded-2xl border shadow-sm h-full flex flex-col justify-center"><p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Best Selector</p><p class="text-3xl font-black text-slate-900 mt-2 mb-1 font-header">${bestSelector.name}</p><p class="text-xs text-slate-500 font-bold">Avg Pick Rank: #${Math.round(bestSelector.score)}</p></div>`;


    // MEMBER PROFILES
    document.getElementById('member-grid').innerHTML = members.map((m, i) => {
        const myPicks = allData.filter(b => b.selector.toLowerCase().includes(m.n.toLowerCase()) && b.rank !== 999);
        const avgPickRank = myPicks.length ? Math.round(myPicks.reduce((a,b)=>a+b.rank,0)/myPicks.length) : '-';
        const goldenPick = myPicks.sort((a,b)=>a.rank - b.rank)[0];
        const faves = allData.filter(b=>b.scores[i]!==999).sort((a,b)=>a.scores[i]-b.scores[i]).slice(0,5);
        const hates = allData.filter(b=>b.scores[i]!==999).sort((a,b)=>b.scores[i]-a.scores[i]).slice(0,5);

        return `
        <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div class="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 class="text-2xl font-black uppercase italic text-slate-900 font-header">${m.n}</h3>
                    <div class="flex gap-3 mt-1">
                        <span class="text-[9px] font-bold bg-white border px-2 py-1 rounded text-slate-500">Picked ${myPicks.length} Books</span>
                        <span class="text-[9px] font-bold bg-blue-50 border border-blue-100 px-2 py-1 rounded text-blue-600">Avg. Pick Rank #${avgPickRank}</span>
                    </div>
                </div>
                ${goldenPick ? `
                <div class="text-right cursor-pointer" onclick="openModal(${goldenPick.id})">
                    <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Best Contribution</p>
                    <div class="flex items-center gap-3 justify-end group">
                        <div class="text-right">
                            <p class="text-[10px] font-bold leading-tight group-hover:text-blue-600 transition truncate w-24">${goldenPick.title}</p>
                            <p class="text-[9px] font-black text-slate-300 group-hover:text-blue-400">Ranked #${goldenPick.rank}</p>
                        </div>
                        <img src="${goldenPick.img}" class="w-10 h-10 rounded object-cover shadow-sm border group-hover:scale-110 transition flex-shrink-0">
                    </div>
                </div>` : ''}
            </div>

            <div class="p-6">
                <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Hall of Fame (Top 5)
                </p>
                <div class="grid grid-cols-5 gap-3 mb-8">
                    ${faves.map(b => `
                        <div class="cursor-pointer group relative" onclick="openModal(${b.id})">
                            <img src="${b.img}" class="rounded-lg object-cover w-full aspect-square border shadow-sm group-hover:scale-105 transition">
                            <div class="absolute -top-2 -right-2 bg-green-500 text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm border-2 border-white">#${b.scores[i]}</div>
                        </div>
                    `).join('')}
                </div>

                <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Hall of Shame (Bottom 5)
                </p>
                <div class="grid grid-cols-5 gap-3">
                    ${hates.map(b => `
                        <div class="cursor-pointer group relative" onclick="openModal(${b.id})">
                            <img src="${b.img}" class="rounded-lg object-cover w-full aspect-square border shadow-sm grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition">
                            <div class="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm border-2 border-white">#${b.scores[i]}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    }).join('');
}

function switchTab(tab) {
    const isLib = tab === 'library';
    document.getElementById('section-library').classList.toggle('hidden-section', !isLib);
    document.getElementById('section-committee').classList.toggle('hidden-section', isLib);
    
    const controls = document.getElementById('library-controls');
    if (!isLib) { controls.style.opacity = '0'; controls.style.pointerEvents = 'none'; setTimeout(() => controls.classList.add('hidden-section'), 300); } 
    else { controls.classList.remove('hidden-section'); setTimeout(() => { controls.style.opacity = '1'; controls.style.pointerEvents = 'auto'; }, 10); }

    document.getElementById('nav-lib').classList.toggle('active', isLib);
    document.getElementById('nav-com').classList.toggle('active', !isLib);
    updateNavUI();
}

function updateNavUI() {
    const active = document.querySelector('.nav-item.active');
    const line = document.getElementById('nav-line');
    if(active && line) { line.style.width = `${active.offsetWidth}px`; line.style.left = `${active.offsetLeft}px`; }
}

function updateButtons() {
    ['rank','order','title'].forEach(id => {
        const btn = document.getElementById('btn-'+id);
        btn.className = sortMode === id ? "btn-active px-4 py-2 rounded-full border text-[10px] font-bold uppercase transition shadow-md" : "px-4 py-2 rounded-full border text-[10px] font-bold uppercase transition bg-white text-slate-500 hover:bg-slate-50";
    });
    ['All','Fiction','Non-Fiction'].forEach(id => {
        const btn = document.getElementById('gen-'+id);
        btn.className = filterGenre === id ? "btn-active px-3 py-1 rounded-full border text-[9px] font-bold uppercase transition shadow-md" : "px-3 py-1 rounded-full border text-[9px] font-bold uppercase transition bg-white text-slate-400 hover:bg-slate-50";
    });
    const dd = document.getElementById('memberSelect');
    if(memberIds.includes(sortMode)) dd.classList.add('bg-slate-900', 'text-white');
    else { dd.classList.remove('bg-slate-900', 'text-white'); dd.value = ""; }
}

function setSort(s) { sortMode = s; renderLibrary(); }
function setGenre(g) { filterGenre = g; renderLibrary(); }

function openModal(id) {
    const b = allData.find(x => x.id === id);
    document.getElementById('m-img').src = b.img;
    document.getElementById('m-title').innerText = b.title;
    document.getElementById('m-author').innerText = b.author;
    document.getElementById('m-rank').innerText = b.rank === 999 ? 'NR' : '#'+b.rank;
    document.getElementById('m-pages').innerText = b.pages;
    
    document.getElementById('m-scores').innerHTML = members.map((m,i) => `
        <div class="bg-slate-50 p-2 rounded text-center border">
            <div class="text-[7px] font-bold uppercase text-slate-400 mb-1">${m.n}</div>
            <div class="text-sm font-black text-slate-900">${b.scores[i]===999?'-':b.scores[i]}</div>
        </div>
    `).join('');
    document.getElementById('modal').classList.add('active');
}
function closeModal() { document.getElementById('modal').classList.remove('active'); }

document.getElementById('searchInput').addEventListener('input', renderLibrary);
window.addEventListener('resize', updateNavUI);
load();
