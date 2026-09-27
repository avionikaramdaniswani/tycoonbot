/**
 * UI Pinterest di dalam bubble WA (HTML Primitive / AIRich).
 *
 * Semua jalan client-side: layar pencarian dengan keyboard on-screen (keyboard
 * native sering tak bisa fokus di webview WA — sama alasannya kayak keypad
 * TTT), lalu hasil ditampilkan grid masonry ala Pinterest. Query dikirim ke
 * server lewat native WebSocket (/pin); server yang nembak API pihak ketiga.
 *
 * opts.wsUrl = endpoint wss://.../pin ('' = pencarian nonaktif / server offline)
 */
export async function renderPinterestHtml(opts = {}) {
  const wsUrl = opts.wsUrl || ''

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
        <style>
          *{box-sizing:border-box;margin:0;padding:0;}
          :root{--bg:#fff;--ink:#111;--red:#e60023;--gray:#767676;--soft:#efefef;--line:#e1e1e1;}
          html,body{background:var(--bg);color:var(--ink);font-family:'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;-webkit-tap-highlight-color:transparent;}
          .app{width:100%;max-width:360px;margin:0 auto;position:relative;min-height:540px;overflow:hidden;}
          .screen{display:none;}
          .screen.active{display:block;animation:fade .25s ease;}
          @keyframes fade{from{opacity:0;}to{opacity:1;}}
          .home{padding:22px 16px 10px;text-align:center;}
          .logo{width:54px;height:54px;border-radius:50%;background:var(--red);color:#fff;font-size:32px;font-weight:900;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;margin:4px auto 10px;}
          .htitle{font-size:20px;font-weight:800;letter-spacing:-.01em;}
          .hsub{font-size:13px;color:var(--gray);margin-top:2px;}
          .sbar{display:flex;align-items:center;gap:9px;background:var(--soft);border-radius:24px;padding:13px 17px;margin:16px 4px 14px;}
          .sbar .mag{font-size:16px;color:var(--gray);flex-shrink:0;}
          .sbar .q{flex:1;text-align:left;font-size:15px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .sbar .q.empty{color:var(--gray);font-weight:500;}
          .caret{display:inline-block;width:2px;height:15px;background:var(--red);vertical-align:middle;margin-left:1px;animation:blink 1s steps(1) infinite;}
          @keyframes blink{50%{opacity:0;}}
          .chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:0 6px;}
          .chip{background:#fff;border:1.5px solid var(--line);border-radius:18px;padding:7px 13px;font-size:12px;font-weight:600;color:var(--ink);cursor:pointer;}
          .chip:active{background:var(--soft);}
          .kb{background:#f6f6f6;border-top:1px solid var(--line);padding:9px 5px 13px;margin-top:16px;}
          .krow{display:flex;justify-content:center;gap:5px;margin-bottom:6px;}
          .key{flex:1;max-width:31px;height:42px;background:#fff;border:1px solid var(--line);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;cursor:pointer;user-select:none;box-shadow:0 1px 0 rgba(0,0,0,.13);color:var(--ink);}
          .key:active{background:var(--soft);transform:translateY(1px);}
          .key.fn{max-width:44px;flex:none;width:44px;background:#e4e4e4;font-size:18px;}
          .key.space{max-width:none;flex:4;}
          .key.go{max-width:none;flex:2;background:var(--red);color:#fff;border-color:var(--red);font-size:13px;font-weight:800;letter-spacing:.03em;}
          .topbar{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;padding:9px 12px;}
          .back{width:36px;height:36px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;cursor:pointer;flex-shrink:0;color:var(--ink);}
          .back:active{background:#e0e0e0;}
          .qpill{flex:1;display:flex;align-items:center;gap:8px;background:var(--soft);border-radius:20px;padding:9px 15px;font-size:14px;font-weight:600;cursor:pointer;overflow:hidden;}
          .qpill .qt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .status{padding:14px 16px;font-size:13px;color:var(--gray);text-align:center;line-height:1.5;}
          .status.err{color:var(--red);font-weight:600;}
          .diag{display:none;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;line-height:1.5;background:#fbfbfb;border:1px dashed var(--line);border-radius:10px;padding:9px 11px;margin:0 12px 8px;word-break:break-all;color:#555;}
          .diag.show{display:block;}
          .diag b{color:var(--red);}
          .grid{column-count:2;column-gap:8px;padding:8px;}
          .card{break-inside:avoid;margin-bottom:8px;border-radius:16px;overflow:hidden;background:var(--soft);cursor:pointer;}
          .card img{width:100%;height:auto;display:block;}
          .sk{break-inside:avoid;margin-bottom:8px;border-radius:16px;background:linear-gradient(100deg,#ededed 30%,#f7f7f7 50%,#ededed 70%);background-size:200% 100%;animation:sh 1.2s infinite linear;}
          @keyframes sh{to{background-position:-200% 0;}}
          .viewer{position:fixed;inset:0;background:rgba(0,0,0,.93);display:none;align-items:center;justify-content:center;flex-direction:column;z-index:50;padding:20px;}
          .viewer.show{display:flex;}
          .viewer img{max-width:100%;max-height:76%;border-radius:14px;object-fit:contain;}
          .vclose{position:absolute;top:14px;right:16px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:23px;font-weight:800;display:flex;align-items:center;justify-content:center;cursor:pointer;}
          .vlink{margin-top:18px;color:#fff;font-size:13px;font-weight:700;text-decoration:none;border:1.5px solid rgba(255,255,255,.55);border-radius:20px;padding:9px 18px;}
        </style>
      </head>
      <body>
        <div class="app">
          <section class="screen active" id="s-search">
            <div class="home">
              <div class="logo">P</div>
              <div class="htitle">Cari di Pinterest</div>
              <div class="hsub">Ketik kata kunci, temukan idenya</div>
              <div class="sbar">
                <span class="mag">&#128269;</span>
                <div class="q empty" id="q-disp">Cari ide...<span class="caret"></span></div>
              </div>
              <div class="chips" id="chips">
                <div class="chip">wallpaper</div><div class="chip">aesthetic</div>
                <div class="chip">anime</div><div class="chip">kucing</div>
                <div class="chip">outfit</div><div class="chip">sunset</div>
                <div class="chip">quotes</div><div class="chip">mobil</div>
              </div>
            </div>
            <div class="kb" id="kb">
              <div class="krow" data-row="qwertyuiop"></div>
              <div class="krow" data-row="asdfghjkl"></div>
              <div class="krow">
                <div class="krow-letters" style="display:flex;gap:5px;" data-row="zxcvbnm"></div>
                <div class="key fn" data-k="bksp">&#9003;</div>
              </div>
              <div class="krow">
                <div class="key space" data-k="space">spasi</div>
                <div class="key go" data-k="go">Cari</div>
              </div>
            </div>
          </section>
          <section class="screen" id="s-results">
            <div class="topbar">
              <div class="back" id="r-back">&#8249;</div>
              <div class="qpill" id="r-qpill"><span class="mag">&#128269;</span><span class="qt" id="r-qt"></span></div>
            </div>
            <div class="status" id="r-status"></div>
            <div class="diag" id="diag"></div>
            <div class="grid" id="grid"></div>
          </section>
          <div class="viewer" id="viewer">
            <div class="vclose" id="v-close">&times;</div>
            <img id="v-img" src="" alt="">
            <a class="vlink" id="v-link" href="#" target="_blank" rel="noopener">Buka di Pinterest &#8599;</a>
          </div>
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', function(){
            var WS_URL = ${JSON.stringify(wsUrl)};
            var ONLINE = !!WS_URL;
            var ws = null, query = '', reqId = 0, pending = null, lastEvt = 'init', settled = false;
            function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
            function stateName(w){ return w ? ['CONNECTING','OPEN','CLOSING','CLOSED'][w.readyState] : 'null'; }
            function updateDiag(){
              var d=document.getElementById('diag');
              if(!ONLINE){ d.classList.add('show'); d.innerHTML='<b>WS:</b> nonaktif (PUBLIC_URL/tunnel kosong)'; return; }
              // Hasil sudah tampil & tidak ada pencarian tertunda -> sembunyikan diag.
              // Webview WA rutin menutup WS (code 1005) SETELAH hasil terkirim; itu
              // normal & tidak memengaruhi gambar yang sudah dirender, jadi jangan
              // munculkan panel error gara-gara close yang tak berbahaya itu.
              if(settled && !pending){ d.classList.remove('show'); return; }
              var ok = ws && ws.readyState===1 && !pending;
              if(ok){ d.classList.remove('show'); return; }
              d.classList.add('show');
              d.innerHTML='<b>WS:</b> '+esc(WS_URL)+'<br><b>STATE:</b> '+stateName(ws)+' | <b>EVT:</b> '+esc(lastEvt);
            }
            function buildKeys(){
              var rows=document.querySelectorAll('[data-row]');
              for(var r=0;r<rows.length;r++){
                var L=rows[r].getAttribute('data-row').split(''), h='';
                for(var i=0;i<L.length;i++){ h+='<div class="key" data-k="'+L[i]+'">'+L[i]+'</div>'; }
                rows[r].innerHTML=h;
              }
            }
            function swapTo(id){
              var list=document.querySelectorAll('.screen');
              for(var i=0;i<list.length;i++) list[i].classList.remove('active');
              document.getElementById('s-'+id).classList.add('active');
            }
            function updateQ(){
              var d=document.getElementById('q-disp');
              if(query){ d.classList.remove('empty'); d.innerHTML=esc(query)+'<span class="caret"></span>'; }
              else { d.classList.add('empty'); d.innerHTML='Cari ide...<span class="caret"></span>'; }
            }
            function keyTap(k){
              if(k==='bksp'){ query=query.slice(0,-1); updateQ(); return; }
              if(k==='space'){ if(query.length && query.length<60) query+=' '; updateQ(); return; }
              if(k==='go'){ doSearch(); return; }
              if(query.length>=60) return;
              query+=k; updateQ();
            }
            function connectWs(){
              if(!ONLINE) return;
              lastEvt='connecting';
              try{ ws=new WebSocket(WS_URL); }catch(e){ ws=null; lastEvt='throw:'+(e&&e.message||e); updateDiag(); return; }
              ws.onopen=function(){ lastEvt='open'; flush(); updateDiag(); };
              ws.onmessage=function(ev){
                var m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
                lastEvt='msg:'+m.type;
                if(m.type==='results'){ if(m.reqId!==reqId) return; pending=null; renderResults(m.items||[], m.query); }
                else if(m.type==='error'){ if(m.reqId!==reqId && m.reqId!==0) return; pending=null; showError(m.message||'Gagal'); }
                updateDiag();
              };
              ws.onerror=function(){ lastEvt='error'; updateDiag(); };
              ws.onclose=function(e){ ws=null; lastEvt='close:'+(e&&e.code); if(pending) showError('Koneksi terputus. Balik lalu cari lagi ya.'); updateDiag(); };
            }
            function ensureWs(){ if(!ws || ws.readyState>1) connectWs(); }
            function flush(){ if(pending && ws && ws.readyState===1){ try{ ws.send(JSON.stringify({type:'search',query:pending.query,reqId:pending.reqId})); }catch(e){} } }
            function setStatus(txt,isErr){
              var s=document.getElementById('r-status');
              if(!txt){ s.style.display='none'; s.innerText=''; return; }
              s.style.display='block'; s.className='status'+(isErr?' err':''); s.innerText=txt;
            }
            function showError(msg){ document.getElementById('grid').innerHTML=''; setStatus(msg,true); }
            function showSkeleton(){
              setStatus('');
              var hs=[150,210,170,240,190,160,220,180], h='';
              for(var i=0;i<8;i++){ h+='<div class="sk" style="height:'+hs[i]+'px"></div>'; }
              document.getElementById('grid').innerHTML=h;
            }
            function doSearch(){
              var q=query.trim();
              if(!q) return;
              query=q; updateQ();
              document.getElementById('r-qt').innerText=q;
              swapTo('results');
              if(!ONLINE){ showError('Server offline — PUBLIC_URL / tunnel belum aktif.'); return; }
              reqId++; pending={query:q,reqId:reqId}; settled=false;
              showSkeleton(); ensureWs(); flush(); updateDiag();
            }
            function renderResults(items,q){
              settled=true;
              var grid=document.getElementById('grid');
              if(!items.length){ grid.innerHTML=''; setStatus('Nggak nemu hasil buat "'+(q||query)+'". Coba kata kunci lain.',false); return; }
              setStatus('');
              var h='';
              for(var i=0;i<items.length;i++){
                var it=items[i];
                h+='<div class="card" data-src="'+esc(it.img)+'" data-link="'+esc(it.link||it.img)+'"><img loading="lazy" src="'+esc(it.img)+'"></div>';
              }
              grid.innerHTML=h;
              var imgs=grid.querySelectorAll('img');
              for(var j=0;j<imgs.length;j++){ imgs[j].onerror=function(){ this.parentNode.style.display='none'; }; }
            }
            function openViewer(src,link){
              document.getElementById('v-img').src=src;
              document.getElementById('v-link').href=link||src;
              document.getElementById('viewer').classList.add('show');
            }
            function closeViewer(){ document.getElementById('viewer').classList.remove('show'); document.getElementById('v-img').src=''; }
            document.getElementById('kb').addEventListener('pointerdown', function(e){ var k=e.target.closest('.key'); if(!k) return; e.preventDefault(); keyTap(k.getAttribute('data-k')); });
            document.getElementById('chips').addEventListener('pointerdown', function(e){ var c=e.target.closest('.chip'); if(!c) return; e.preventDefault(); query=c.innerText.trim(); updateQ(); doSearch(); });
            document.getElementById('grid').addEventListener('pointerdown', function(e){ var card=e.target.closest('.card'); if(!card) return; e.preventDefault(); openViewer(card.getAttribute('data-src'), card.getAttribute('data-link')); });
            document.getElementById('r-back').addEventListener('pointerdown', function(e){ e.preventDefault(); swapTo('search'); });
            document.getElementById('r-qpill').addEventListener('pointerdown', function(e){ e.preventDefault(); swapTo('search'); });
            document.getElementById('v-close').addEventListener('pointerdown', function(e){ e.preventDefault(); closeViewer(); });
            buildKeys(); updateQ();
            if(ONLINE) connectWs();
          });
        </script>
      </body>
    </html>
`
  return html
}
