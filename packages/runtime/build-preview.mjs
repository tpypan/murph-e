import { writeFileSync } from 'node:fs'
import { build } from 'esbuild'

const bundle = await build({
  entryPoints: ['src/build-preview-worker.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
})
const worker = JSON.stringify(bundle.outputFiles[0].text).replaceAll('<', '\\u003c')
// The iframe has no same-origin permission. CSP is inherited by its blob worker;
// network and nested frames are disabled. A window timer kills stalled workers.
// This limit includes linked catalog pixels. Streamed customization alone keeps
// its separate 150k parser limit in the cabinet's draftScene function.
const maxAssembledCharacters = 1_000_000
writeFileSync(
  'build-preview.html',
  `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; worker-src blob:; connect-src 'none'; style-src 'unsafe-inline'">
<style>html,body{margin:0;background:#000;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}</style>
<canvas width="256" height="224" aria-label="Draft game scene"></canvas>
<script>
const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
let worker=null, watchdog=null;
function stop(){clearTimeout(watchdog);if(worker)worker.terminate();worker=null}
function stalled(){stop();parent.postMessage({type:'preview-unavailable'},'*')}
addEventListener('message',event=>{
 if(event.source!==parent)return;
 if(event.data?.type==='preview-stop'){stop();return}
 if(event.data?.type==='preview-heartbeat'){worker?.postMessage({type:'heartbeat'});return}
 if(event.data?.type==='preview-ping'){parent.postMessage({type:'preview-ready'},'*');return}
 if(event.data?.type!=='preview-code')return;
 stop();
 const {code,players,motion,mode,genre}=event.data;
 if(typeof code!=='string'||code.length>${maxAssembledCharacters}){stalled();return}
 const url=URL.createObjectURL(new Blob([${worker}],{type:'text/javascript'}));
 worker=new Worker(url);URL.revokeObjectURL(url);
 worker.onerror=stalled;
 worker.onmessage=event=>{
  clearTimeout(watchdog);
  const data=event.data;
  if(data?.type!=='pixels'||!(data.pixels instanceof Uint8Array)||data.pixels.length!==256*224*4){stalled();return}
  const image=ctx.createImageData(256,224);
  image.data.set(data.pixels);
  ctx.putImageData(image,0,0);parent.postMessage({type:'preview-frame'},'*');
  if(motion)watchdog=setTimeout(stalled,1000);
 };
 watchdog=setTimeout(stalled,1000);
 worker.postMessage({code,players:players===2?2:1,motion:!!motion,mode:mode==='demo'?'demo':'draft',genre:typeof genre==='string'?genre.slice(0,64):''});
});
addEventListener('pagehide',stop);
parent.postMessage({type:'preview-ready'},'*');
</script>`,
)
