import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describeWorldWeather } from './world-presentation.js'
import { projectCurrentWorld } from '../world-state.js'
import type { WorldEntity, PlaceComponent, WorldStateSnapshot } from '../contracts.js'

const css = `
:host{display:block;position:relative;min-height:100%;font:14px/1.45 system-ui,sans-serif;color:#e8ecff;pointer-events:none}*{box-sizing:border-box}.tw-panel{pointer-events:auto;position:absolute;top:60px;right:20px;width:min(450px,calc(100% - 40px));height:60vh;min-width:280px;min-height:200px;display:flex;flex-direction:column;overflow:hidden;border:1px solid #ffffff3d;border-radius:12px;background:color-mix(in srgb,var(--tw-panel-sky) 38%,transparent);box-shadow:0 5px 25px #0008;backdrop-filter:blur(18px) saturate(130%);transition:box-shadow .2s ease}.tw-panel.no-glass{backdrop-filter:none;background:color-mix(in srgb,var(--tw-panel-sky) 70%,transparent)}.tw-panel::before{content:"";position:absolute;inset:0;background:var(--tw-panel-sky);opacity:.08;pointer-events:none}.tw-head,.tw-tabs,.tw-content{position:relative;z-index:1}.tw-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 15px;background:color-mix(in srgb,var(--tw-panel-sky) 24%,transparent);border-bottom:1px solid #ffffff33;cursor:move;user-select:none;flex-shrink:0}.tw-brand{display:flex;align-items:center;gap:10px;min-width:0}.tw-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:11px;background:color-mix(in srgb,var(--tw-panel-sky) 46%,#000);transition:.3s;overflow:hidden}.tw-icon.weather-clear{background:linear-gradient(160deg,#f6c453,#c8792c)}.tw-icon.weather-cloudy{background:linear-gradient(160deg,#7f8c8d,#344052)}.tw-icon.weather-rain{background:linear-gradient(160deg,#526d9a,#1e2d48)}.tw-icon.weather-snow{background:linear-gradient(160deg,#b8d7ef,#58759a)}.tw-icon.weather-storm{background:linear-gradient(160deg,#4a637f,#182235)}.tw-icon.weather-night{background:linear-gradient(160deg,#273c75,#111936)}.tw-title{font-weight:700}.tw-subtitle{font-size:11px;color:#aeb9d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tw-close{width:30px;height:30px;border:0;border-radius:4px;background:transparent;color:inherit;font-size:24px;line-height:1;cursor:pointer;transition:transform .2s}.tw-close:hover{background:#0003;transform:scale(1.15) rotate(90deg)}.tw-tabs{display:flex;gap:5px;padding:5px;background:color-mix(in srgb,var(--tw-panel-sky) 18%,transparent);border-bottom:1px solid #ffffff33;flex-shrink:0}.tw-tab{flex:1;border:0;border-radius:6px;padding:8px;background:transparent;color:#aeb9d8;font-weight:700;cursor:pointer}.tw-tab.active,.tw-tab:hover{background:#00000026;color:#fff}.tw-content{flex:1;min-height:0;position:relative}.tw-pane{position:absolute;inset:0;overflow-y:auto;padding:15px;display:none;opacity:0;transform:translateY(10px);transition:opacity .3s ease,transform .3s ease;pointer-events:none;touch-action:pan-y}.tw-pane.active{display:block;opacity:1;transform:translateY(0);pointer-events:auto}.tw-grid{display:grid;gap:10px}.tw-card{padding:12px;border:1px solid #ffffff33;border-radius:8px;background:color-mix(in srgb,var(--tw-panel-sky) 24%,transparent)}.tw-hero{display:grid;grid-template-columns:74px 1fr;gap:12px;align-items:center}.tw-weather{width:68px;height:68px;display:grid;place-items:center;border-radius:18px;background:color-mix(in srgb,var(--tw-panel-sky) 30%,transparent)}.tw-time{font-size:30px;font-weight:750}.tw-meta{color:#d2d8e8;font-size:12px}.tw-row{display:flex;justify-content:space-between;gap:10px;align-items:center}.tw-form{display:grid;grid-template-columns:1fr 1fr auto;gap:7px}.tw-form input,.tw-form button{min-height:34px;border:1px solid #ffffff4d;border-radius:7px;background:#080d1b99;color:inherit;padding:6px 9px;font:inherit}.tw-actions{display:flex;flex-wrap:wrap;gap:7px}.tw-action{border:1px solid #ffffff4d;border-radius:7px;padding:7px 9px;background:#ffffff0d;color:inherit;cursor:pointer}.tw-list{display:grid;gap:7px}.tw-list-item{padding:9px;border-radius:7px;background:color-mix(in srgb,var(--tw-panel-sky) 20%,transparent);border-left:3px solid #7c9cff}.tw-location-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.tw-location{position:relative;min-height:80px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:12px;border:1px solid transparent;border-radius:8px;background:color-mix(in srgb,var(--tw-panel-sky) 30%,transparent);color:#fff;text-align:center;transition:transform .3s,box-shadow .3s}.tw-location:hover{transform:translateY(-5px);border-color:#8c9fb8;box-shadow:0 8px 20px #00000059}.tw-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #ffffff33}.tw-switch:first-of-type{border-top:0}.tw-switch input{accent-color:#668fff}.tw-resize{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;z-index:10;background:linear-gradient(135deg,transparent 40%,#ffffff4d 40% 60%,transparent 60%),linear-gradient(135deg,transparent 70%,#ffffff4d 70%)}.tw-weather-icon{position:relative;display:inline-block;width:2.5em;height:2.5em;font-size:.5em;color:#e8ecff}.tw-weather-icon .cloud{position:absolute;z-index:1;top:50%;left:50%;width:3.6875em;height:3.6875em;margin:-1.84375em;background:#e2e8f0;border-radius:50%;box-shadow:-2.1875em .6875em 0 -.6875em #e2e8f0,2.0625em .9375em 0 -.9375em #e2e8f0,0 0 0 .375em #fff,-2.1875em .6875em 0 -.3125em #fff,2.0625em .9375em 0 -.5625em #fff}.tw-weather-icon .cloud:after{content:"";position:absolute;bottom:0;left:-.5em;width:4.5625em;height:1em;background:#e2e8f0;box-shadow:0 .4375em 0 -.0625em #fff}.tw-weather-icon .cloud:nth-child(2){z-index:0;background:#fff;opacity:.3;transform:scale(.5) translate(6em,-3em);animation:tw-cloud 4s linear infinite}.tw-weather-icon .sun{position:absolute;top:50%;left:50%;width:2.5em;height:2.5em;margin:-1.25em;border-radius:50%;box-shadow:0 0 0 .375em #fff;animation:tw-spin 12s infinite linear;color:#f7ed47}.tw-weather-icon .rays{position:absolute;top:-2em;left:50%;width:.375em;height:1.125em;margin-left:-.1875em;background:#fff;border-radius:.25em;box-shadow:0 5.375em #fff}.tw-weather-icon .rays:before,.tw-weather-icon .rays:after{content:"";position:absolute;top:0;left:0;width:.375em;height:1.125em;transform:rotate(60deg);transform-origin:50% 3.25em;background:#fff;border-radius:.25em;box-shadow:0 5.375em #fff}.tw-weather-icon .rays:before{transform:rotate(120deg)}.tw-weather-icon .rain,.tw-weather-icon .lightning,.tw-weather-icon .snow{position:absolute;z-index:2;top:50%;left:50%;width:3.75em;height:3.75em;margin:.375em 0 0 -2em}.tw-weather-icon .rain:after{content:"";position:absolute;top:50%;left:50%;width:1.125em;height:1.125em;margin:-1em 0 0 -.25em;background:#0cf;border-radius:100% 0 60% 50% / 60% 0 100% 50%;box-shadow:.625em .875em 0 -.125em #ffffff33,-.875em 1.125em 0 -.125em #ffffff33,-1.375em -.125em 0 #ffffff33;transform:rotate(-28deg);animation:tw-rain 3s linear infinite}.tw-weather-icon .bolt{position:absolute;top:50%;left:50%;margin:-.25em 0 0 -.125em;color:#fff;opacity:.3;animation:tw-lightning 2s linear infinite}.tw-weather-icon .bolt:before,.tw-weather-icon .bolt:after{content:"";position:absolute;z-index:2;top:50%;left:50%;margin:-1.625em 0 0 -1.0125em;border-top:1.25em solid transparent;border-right:.75em solid;border-bottom:.75em solid;border-left:.5em solid transparent;transform:skewX(-10deg)}.tw-weather-icon .bolt:after{margin:-.25em 0 0 -.25em;border-top:.75em solid;border-right:.5em solid transparent;border-bottom:1.25em solid transparent;border-left:.75em solid}.tw-weather-icon .flake:before,.tw-weather-icon .flake:after{content:"\\2744";position:absolute;top:50%;left:50%;margin:-1.025em 0 0 -1.0125em;color:#fff;opacity:.35;animation:tw-spin 8s linear infinite reverse}.tw-weather-icon .flake:after{margin:.125em 0 0 -1em;font-size:1.5em;animation:tw-spin 14s linear infinite}.night-moon .sun{background:#f0e68c;box-shadow:inset .65em -.35em 0 .1em #273c75,0 0 0 .375em #f0e68c88;animation:none}.night-moon .sun:after{content:"";position:absolute;inset:-1.5em;background:radial-gradient(circle at 20% 20%,#fff 0 1px,transparent 2px,transparent 100%);opacity:.8}@keyframes tw-spin{to{transform:rotate(360deg)}}@keyframes tw-cloud{0%{opacity:0}50%{opacity:.3}100%{opacity:0;transform:scale(.5) translate(-200%,-3em)}}@keyframes tw-rain{0%,100%{opacity:.35}50%{opacity:1}}@keyframes tw-lightning{45%,55%{opacity:.2}50%{opacity:1;color:#0cf}}
@media(max-width:600px){.tw-panel{top:8px;right:8px;width:calc(100% - 16px);height:calc(100% - 16px)}.tw-form{grid-template-columns:1fr}.tw-hero{grid-template-columns:60px 1fr}}
`
const stLayoutCss = `
.tw-state{min-height:100%}.tw-notice{text-align:center;color:#aeb9d8;padding:48px 12px}.tw-status{text-align:center;padding:0 0 6px}.ws-details{display:grid;grid-template-columns:3.75em 1fr auto;align-items:center;gap:15px;padding:10px 15px;color:#e8ecff}.ws-weather-display{width:3.75em;height:3.75em;display:grid;place-items:center}.ws-time-display{display:flex;flex-direction:column;line-height:1}.ws-time-main{font-size:50px;font-weight:300;letter-spacing:0}.ws-time-main span{font-size:22px}.ws-time-secondary{margin-top:5px;color:#aeb9d8}.ws-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px;text-align:right}.ws-summary{font-size:18px;font-weight:600}.ws-date{font-size:14px;color:#aeb9d8}.ws-content-inner{padding:0 15px 15px}.ws-separator{border:0;height:1px;margin:8px 0;background:#ffffff33}.ws-secondary-info{display:flex;flex-wrap:wrap;gap:8px}.ws-info-block{display:flex;align-items:center;gap:8px;flex-grow:1;padding:8px 15px;border:1px solid #ffffff33;border-radius:20px;background:#0003;font-size:13px}.ws-info-block .ws-label{font-weight:700;color:#aeb9d8;white-space:nowrap}.ws-info-block .ws-value{font-size:90%;word-break:break-word}.ws-scene-block{display:block;width:100%;margin-top:8px}.ws-scene-block .ws-value{display:block;margin-top:4px;white-space:pre-wrap}.tw-state-stats{margin-top:12px}.tw-state-stats.tw-card{background:color-mix(in srgb,var(--tw-panel-sky) 20%,transparent)}.tw-map{min-height:100%}.locations_container{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.location_card{position:relative;min-height:80px;padding:12px;border:1px solid transparent;border-radius:8px;background:#3a3f47;color:#fff;cursor:pointer;text-align:center}.location_name{font-weight:700}.location_echo{position:absolute;top:4px;right:6px;font-size:12px;color:#cbd5e1}.map_action_area{display:flex;justify-content:center;padding-top:15px;margin-top:15px;border-top:1px solid #ffffff33}.go_button{padding:8px 25px;border:0;border-radius:30px;background:#738c82;color:#fff}.go_button.disabled{opacity:.5;background:#4a5568}.settings-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #ffffff33}.settings-item-text{flex:1}.settings-item-text h4{margin:0 0 4px;font-size:1em}.settings-item-text p{margin:0;color:#aeb9d8;font-size:.85em}.theme-list{display:flex;flex-direction:column;gap:12px;padding-bottom:15px}.theme-card{padding:12px;border:2px solid transparent;border-radius:8px;background:#0003}.theme-actions{display:flex;gap:8px;margin-top:10px}.theme-actions button{flex:1;padding:8px;border:0;border-radius:6px;background:#4a5568;color:#fff;cursor:pointer}.toggle-switch{position:relative;width:50px;height:28px}.toggle-switch input{opacity:0;width:0;height:0}.toggle-switch label{position:absolute;inset:0;border-radius:28px;background:#888;cursor:pointer}.toggle-switch label:before{content:"";position:absolute;left:4px;bottom:4px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}.toggle-switch input:checked+label{background:#2196f3}.toggle-switch input:checked+label:before{transform:translateX(22px)}`

const stSettingsCss = `.tw-settings-pane>.tw-grid{gap:0}.tw-settings-pane .tw-card{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border:0;border-bottom:1px solid #ffffff33;border-radius:0;background:transparent}.tw-settings-pane .settings-item-text{flex:1;min-width:180px}.tw-settings-pane .settings-item-text h4{margin:0 0 4px;font-size:15px;letter-spacing:.01em}.tw-settings-pane .settings-item-text p{line-height:1.4}.tw-settings-pane .tw-card>.settings-item-text{padding-bottom:4px}.tw-settings-pane .tw-form,.tw-settings-pane .tw-actions,.tw-settings-pane .tw-range{flex-basis:100%}.tw-settings-pane .tw-switch{width:100%;min-height:42px;padding:8px 0}.tw-settings-pane .settings-slider{width:150px;accent-color:#8fb3ff}.tw-settings-pane .settings-select{min-height:32px;border:1px solid #ffffff45;border-radius:7px;background:#080d1b99;color:inherit;padding:5px 8px}.tw-settings-pane .tw-extra-settings{display:grid;gap:0}.tw-settings-pane .tw-extra-settings small{display:block;margin-top:3px;color:#aeb9d8;font-size:12px}.tw-settings-pane .tw-extra-settings .tw-switch:first-child{border-top:0}`
const stControlsCss = `.tw-settings-pane .settings-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #ffffff33}.tw-settings-pane .settings-item small{display:block;margin-top:3px;color:#aeb9d8;font-size:.85em}.settings-slider{width:150px;accent-color:#668fff}.settings-select{min-height:32px;padding:5px 8px;border:1px solid #ffffff4d;border-radius:6px;background:#080d1b99;color:inherit;font:inherit}.tw-weather-scroller-container{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px;padding:8px 4px;border:1px solid #ffffff2b;border-radius:8px;background:#00000024}.tw-weather-scroller-column{min-width:0;max-height:146px;overflow:auto;scrollbar-width:thin}.tw-weather-scroller-list{display:grid;gap:3px;margin:0;padding:0;list-style:none}.tw-weather-scroller-item{width:100%;padding:7px 4px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}.tw-weather-scroller-item:hover,.tw-weather-scroller-item:focus-visible{background:#ffffff18}.tw-weather-scroller-item.selected{background:#ffffff24;box-shadow:inset 0 0 0 1px #a0c4ff;color:#fff}.tw-weather-scroller-item:active{background:#ffffff2b;transform:scale(.98)}`
const stMotionCss = `.tw-panel{max-width:50vw;animation:tw-panel-in .24s ease-out}.tw-content{overflow:visible}.tw-pane{display:block;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .3s ease,transform .3s ease,visibility 0s linear .3s}.tw-pane.active{opacity:1;visibility:visible;transform:translateY(0);transition-delay:0s}.tw-pane::-webkit-scrollbar{width:8px}.tw-pane::-webkit-scrollbar-track{background:transparent}.tw-pane::-webkit-scrollbar-thumb{border-radius:8px;background:#ffffff35}.tw-pane::-webkit-scrollbar-thumb:hover{background:#ffffff55}.tw-head:active{cursor:grabbing}.tw-tab{font-size:14px}.tw-panel button:focus-visible,.tw-panel input:focus-visible{outline:2px solid #8fb3ff;outline-offset:2px}.tw-header-tabs{display:flex;flex:0 0 auto;gap:3px;padding:0;background:transparent;border:0}.tw-header-tabs .tw-tab{flex:0 0 auto;padding:4px 7px;font-size:12px}.tw-header-tabs .tw-tab.active{background:rgba(255,255,255,.16)}.tw-head .tw-brand{display:flex;flex:1;min-width:0;gap:10px}.tw-head .tw-brand>div:last-child{min-width:0}.tw-head>.tw-close{flex:0 0 30px}.tw-head{min-height:62px}.tw-title,.tw-subtitle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ws-time-interact,.ws-weather-interact{cursor:pointer;border-radius:8px;transition:background .2s,transform .2s}.ws-time-interact:hover,.ws-weather-interact:hover{background:#ffffff12;transform:translateY(-1px)}.tw-quick-editor{position:absolute;left:15px;right:15px;top:12px;z-index:8;padding:11px 12px;border:1px solid #ffffff45;border-radius:9px;background:color-mix(in srgb,var(--tw-panel-sky) 70%,#101827);box-shadow:0 10px 26px #0008;backdrop-filter:blur(14px)}.tw-editor-close{border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer}.sub_locations_container{margin-top:10px;padding:12px;border-radius:8px;background:#00000026}.sub_location{min-height:70px;background:color-mix(in srgb,var(--tw-panel-sky) 26%,transparent)}.tw-switch input{appearance:none;width:46px;height:24px;margin:0;border:1px solid #ffffff45;border-radius:999px;background:#00000045;position:relative;cursor:pointer;transition:background .2s,border-color .2s}.tw-switch input::before{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#eef3ff;box-shadow:0 1px 3px #0007;transition:transform .2s}.tw-switch input:checked{background:#668fff;border-color:#9eb8ff}.tw-switch input:checked::before{transform:translateX(22px)}.location_card{background:color-mix(in srgb,var(--tw-panel-sky) 28%,transparent);border-color:#ffffff26;transition:background .2s,border-color .2s,transform .2s,box-shadow .2s}.location_card:hover{background:color-mix(in srgb,var(--tw-panel-sky) 42%,transparent)}.location_card.selected{border-color:#a0c4ff;box-shadow:0 0 12px #a0c4ff;background:color-mix(in srgb,var(--tw-panel-sky) 48%,transparent)}.location_card:active{transform:scale(.98)}.location_card.has-bg{overflow:hidden;text-shadow:1px 1px 3px #000d;background-size:cover;background-position:center}.location_card.has-bg::before{content:"";position:absolute;inset:0;background:#0008;border-radius:8px;transition:background .2s}.location_card.has-bg:hover::before{background:#0004}.location_card>*{position:relative;z-index:1}.travel_time{position:absolute;top:4px;left:6px;font-size:10px;color:#ddd;background:#0008;padding:1px 4px;border-radius:4px}.characters_list{margin-top:5px;font-size:10px;color:#d7deee;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.go_button{position:relative;overflow:hidden}.go_button::after,.location_card::after{content:"";position:absolute;inset:50%;border-radius:50%;background:#ffffff55;transform:translate(-50%,-50%) scale(0);pointer-events:none}.go_button:active::after,.location_card:active::after{animation:tw-ripple .42s ease-out}.tw-close{transition:background .2s,transform .2s,opacity .2s}.tw-close:hover{opacity:1}.tw-close:active{transform:scale(.9)}@media(max-width:420px){.tw-panel{max-width:calc(100vw - 16px)}.ws-details{grid-template-columns:3.75em 1fr;gap:10px}.ws-weather-interact{grid-column:2;align-items:flex-start}.ws-right{align-items:flex-start;text-align:left}.tw-content .tw-pane{padding:12px}.locations_container{grid-template-columns:1fr}.tw-quick-editor{left:12px;right:12px}}@keyframes tw-ripple{to{inset:-120%;opacity:0}}@keyframes tw-panel-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}`
const stLayersCss = `.tw-theme-layers{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:12px;pointer-events:none}.tw-bg-layer-1,.tw-bg-layer-2{position:absolute;inset:0;background:var(--tw-panel-sky);background-size:200% 200%;opacity:.34;transition:opacity 9s ease-in-out}.tw-bg-layer-2{opacity:0}.tw-fx-container-local{position:absolute;inset:0;z-index:2;overflow:hidden;border-radius:12px;pointer-events:none}.tw-head,.tw-tabs,.tw-content,.tw-resize{z-index:3}.tw-panel::before{opacity:0}.tw-panel{background:rgba(0,0,0,.12)}.tw-panel.no-glass{background:rgba(0,0,0,.42)}`

type PanelContext = { target: { timelineId: string; branchId: string }; close(): void }
const contextCss = `
.tw-context{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 12px;font-size:12px}
.tw-context dt{color:#aeb9d8}.tw-context dd{margin:0;overflow-wrap:anywhere}
.tw-panel{max-width:calc(100% - 16px);max-height:calc(100% - 76px)}
.tw-settings-pane .settings-item{flex-wrap:wrap}.tw-settings-pane select{max-width:100%}
.location_name,.ws-summary,.ws-date{overflow-wrap:anywhere}
.tw-panel select:focus-visible{outline:2px solid #8fb3ff;outline-offset:2px}
@media(max-width:600px){.tw-panel{max-height:calc(100% - 16px)}}
`
type PanelResult = { revisionId: string; state: { theWorld: WorldStateSnapshot } }
type PanelSnapshot = { result?: PanelResult; status: string; weatherEffectsEnabled: boolean; themeId: string }
type PanelOptions = {
  getSnapshot(): PanelSnapshot
  subscribe(listener: () => void): () => void
  setWeatherEffectsEnabled(enabled: boolean): Promise<void>
  setTheme(themeId: string): Promise<void>
}

export function mountTheWorldPanel(root: HTMLElement, context: PanelContext, options: PanelOptions): { dispose(): void } {
  const reactRoot: Root = createRoot(root)
  reactRoot.render(<><style>{css + stLayoutCss + stSettingsCss + stControlsCss + stMotionCss + stLayersCss + contextCss}</style><WorldPanel context={context} options={options} /></>)
  return { dispose: () => reactRoot.unmount() }
}

function WorldPanel(props: { context: PanelContext; options: PanelOptions }) {
  const [tab, setTab] = useState('state')
  const view = useSyncExternalStore(props.options.subscribe, props.options.getSnapshot)
  const { result, status } = view
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [glass, setGlass] = useState(true)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [size, setSize] = useState({ width: 450, height: 720 })
  const panelRef = useRef<HTMLElement>(null)
  const gesture = useRef<(() => void) | undefined>(undefined)
  const weather = describeWorldWeather(result?.state.theWorld)
  const layoutStyle = position.left ? { left: position.left, top: position.top, right: 'auto', width: size.width, height: size.height } : { width: size.width, height: size.height }
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem('the-world:panel-layout') || 'null'); if (saved) { setPosition({ left: saved.left, top: saved.top }); setSize({ width: saved.width, height: saved.height }) } } catch { /* Unavailable or malformed local preferences leave the default layout intact. */ } }, [])
  const saveLayout = (nextPosition = position, nextSize = size) => { try { localStorage.setItem('the-world:panel-layout', JSON.stringify({ ...nextPosition, ...nextSize })) } catch { /* The in-memory layout remains usable when browser storage is unavailable. */ } }
  useEffect(() => () => gesture.current?.(), [])
  async function changePreference(operation: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await operation() } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }
  return <section ref={panelRef} className={`tw-panel${glass ? '' : ' no-glass'}`} style={{ ...layoutStyle, '--tw-panel-sky': weather.sky ?? '#343a40' } as unknown as React.CSSProperties}>
    <div className="tw-theme-layers" aria-hidden="true"><div className="tw-bg-layer-1" /><div className="tw-bg-layer-2" /></div>
    <header className="tw-head tw-header" onPointerDown={event => { gesture.current?.(); gesture.current = beginDrag(event, panelRef.current, saveLayout, setPosition) }}>
      <div className="tw-brand"><nav className="tw-tabs tw-header-tabs" aria-label="The World">{[['state','场景'],['map','地图'],['settings','设置']].map(([id,label]) => <button className={`tw-tab tw-tab-link${tab === id ? ' active' : ''}`} key={id} type="button" onPointerDown={event => event.stopPropagation()} onClick={() => setTab(id)}>{label}</button>)}</nav><div><div className="tw-title">世界仪表盘</div><div className="tw-subtitle">{weather.subtitle}</div></div></div><button className="tw-close" type="button" aria-label="关闭" onPointerDown={event => event.stopPropagation()} onClick={() => props.context.close()}>×</button>
    </header>
    <div className="tw-content">
      <div className={`tw-pane${tab === 'state' ? ' active' : ''}`}><StatePane result={result} status={status} weather={weather} /></div>
      <div className={`tw-pane${tab === 'map' ? ' active' : ''}`}><MapPane result={result} /></div>
      <div className={`tw-pane tw-settings-pane${tab === 'settings' ? ' active' : ''}`}>
        <dl className="tw-context"><dt>Timeline</dt><dd>{props.context.target.timelineId}</dd><dt>Branch</dt><dd>{props.context.target.branchId}</dd></dl>
        <label className="settings-item"><span>天色主题</span><select className="settings-select" disabled={busy} value={view.themeId} onChange={event => { void changePreference(() => props.options.setTheme(event.target.value)) }}>
          <option value="default">蔚蓝天空</option><option value="legacy">经典天色</option><option value="eternal_night">永恒夜幕</option>
        </select></label>
        <label className="tw-switch"><span>故事天气效果</span><input type="checkbox" disabled={busy} checked={view.weatherEffectsEnabled} onChange={event => { void changePreference(() => props.options.setWeatherEffectsEnabled(event.target.checked)) }} /></label>
        <label className="tw-switch"><span>面板毛玻璃</span><input type="checkbox" checked={glass} onChange={event => setGlass(event.target.checked)} /></label>
        <button className="tw-action" type="button" onClick={() => { const position = { left: 0, top: 0 }; const size = { width: 450, height: 720 }; setPosition(position); setSize(size); saveLayout(position, size) }}>重置面板位置</button>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </div>
    <div className="tw-resize tw-resize-handle" onPointerDown={event => { gesture.current?.(); gesture.current = beginResize(event, panelRef.current, position, setSize, saveLayout) }} />
  </section>
}

function beginDrag(event: React.PointerEvent<HTMLElement>, panel: HTMLElement | null, saveLayout: (position: { left: number; top: number }) => void, setPosition: (position: { left: number; top: number }) => void) {
  if (!panel || (event.target as HTMLElement).closest('button')) return
  event.preventDefault()
  const rect = panel.getBoundingClientRect()
  const start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
  let latest = { left: start.left, top: start.top }
  const move = (next: PointerEvent) => {
    const margin = 16
    const maxLeft = Math.max(margin, window.innerWidth - panel.offsetWidth - margin)
    const maxTop = Math.max(margin, window.innerHeight - panel.offsetHeight - margin)
    latest = { left: Math.min(maxLeft, Math.max(margin, start.left + next.clientX - start.x)), top: Math.min(maxTop, Math.max(margin, start.top + next.clientY - start.y)) }
    panel.style.left = `${latest.left}px`
    panel.style.top = `${latest.top}px`
  }
  const cancel = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
  }
  const end = () => {
    cancel()
    panel.style.left = `${latest.left}px`
    panel.style.top = `${latest.top}px`
    setPosition(latest)
    saveLayout(latest)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end, { once: true })
  return cancel
}

function beginResize(event: React.PointerEvent<HTMLElement>, panel: HTMLElement | null, position: { left: number; top: number }, setSize: (size: { width: number; height: number }) => void, saveLayout: (position: { left: number; top: number }, size?: { width: number; height: number }) => void) {
  if (!panel) return
  event.preventDefault()
  event.stopPropagation()
  const start = { x: event.clientX, y: event.clientY, width: panel.offsetWidth, height: panel.offsetHeight }
  const move = (next: PointerEvent) => { const size = { width: Math.max(280, start.width + next.clientX - start.x), height: Math.max(320, start.height + next.clientY - start.y) }; setSize(size); saveLayout(position, size) }
  const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end) }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end, { once: true })
  window.addEventListener('pointercancel', end, { once: true })
  return end
}

function StatePane(props: { result?: PanelResult; status: string; weather: ReturnType<typeof describeWorldWeather> }) {
  if (!props.result) return <p className="tw-notice" role="status">{props.status}</p>
  const entities = Object.entries(props.result.state.theWorld.entities)
  const current = projectCurrentWorld(props.result.state.theWorld)
  const scene = current.scene
  return <div className="tw-state">
    {props.status ? <div className="tw-meta tw-status" role="status">{props.status}</div> : null}
    <div className="ws-details">
      <div className="ws-weather-display">{weatherIcon(props.weather.kind)}</div>
      <div>
        <div className="ws-time-display"><div className="ws-time-main">{props.weather.time.slice(0, 2)}<span>:{props.weather.time.slice(3)}</span></div><div className="ws-time-secondary"><div className="ws-date-full">{props.weather.date}</div></div></div>
      </div>
      <div className="ws-right"><div className="ws-summary">{props.weather.subtitle.split(' · ')[0]}</div><div className="ws-date">{props.weather.subtitle.split(' · ')[1]}</div></div>
    </div>
    <div className="ws-content-inner">
      <hr className="ws-separator" />
      <div className="ws-secondary-info">
        <div className="ws-info-block"><span className="ws-label">时间:</span><span className="ws-value">{props.weather.time}</span></div>
        <div className="ws-info-block"><span className="ws-label">地点:</span><span className="ws-value">{current.place?.components.place?.name ?? '未知'}</span></div>
      </div>
      {scene?.components.scene?.description ? <div className="ws-info-block ws-scene-block"><span className="ws-label">场景:</span><div className="ws-value">{scene.components.scene.description}</div></div> : null}
      <dl className="tw-context"><dt>实体</dt><dd>{entities.length}</dd><dt>Revision</dt><dd>{props.result.revisionId}</dd></dl>
    </div>
  </div>
}
function MapPane(props: { result?: PanelResult }) {
  const [selected, setSelected] = useState<string | null>(null)
  const entries = Object.entries(props.result?.state?.theWorld?.entities || {}).filter((entry): entry is [string, WorldEntity & { components: { place: PlaceComponent } }] => Boolean(entry[1]?.components?.place))
  const mains = entries.filter(([, entity]) => !entity.components.place.parentPlaceId)
  const children = entries.filter(([, entity]) => entity.components.place.parentPlaceId)
  const selectedPlace = entries.find(([id]) => id === selected)?.[1].components.place
  return entries.length ? <div className="tw-map">
    <div className="locations_container main_locations">{mains.map(([id, entity]) => <LocationCard key={id} id={id} place={entity.components.place} main selected={selected === id} onSelect={setSelected} />)}</div>
    {mains.map(([mainId, mainEntity]) => {
      const mainName = mainEntity.components.place.name || mainId
      const nested = children.filter(([, child]) => child.components.place.parentPlaceId === mainId)
      return nested.length ? <div className="locations_container sub_locations_container" data-main={mainName} key={`sub-${mainId}`}>{nested.map(([id, entity]) => <LocationCard key={id} id={id} place={entity.components.place} selected={selected === id} onSelect={setSelected} />)}</div> : null
    })}
    {selectedPlace?.description ? <p>{selectedPlace.description}</p> : null}
  </div> : <p className="tw-notice">当前还没有地点数据。</p>
}
function LocationCard(props: { id: string; place: PlaceComponent; main?: boolean; selected?: boolean; onSelect: (id: string) => void }) {
  return <button className={`location_card${props.main ? ' main_location' : ' sub_location'}${props.selected ? ' selected' : ''}`} type="button" aria-pressed={props.selected} onClick={() => props.onSelect(props.id)}>
    <span className="location_name">{props.place.name}</span>
  </button>
}

function weatherIcon(kind: string) {
  if (kind === 'unknown') return <span aria-label="天气未知">?</span>
  if (kind === 'clear') return <span className="tw-weather-icon"><span className="icon sunny"><span className="sun"><span className="rays" /></span></span></span>
  if (kind === 'night') return <span className="tw-weather-icon"><span className="icon sunny night-moon"><span className="sun" /></span></span>
  if (kind === 'rain') return <span className="tw-weather-icon"><span className="icon rainy"><span className="cloud" /><span className="rain" /></span></span>
  if (kind === 'sun-shower') return <span className="tw-weather-icon"><span className="icon sun-shower"><span className="cloud" /><span className="sun"><span className="rays" /></span><span className="rain" /></span></span>
  if (kind === 'snow') return <span className="tw-weather-icon"><span className="icon flurries"><span className="cloud" /><span className="snow"><span className="flake" /><span className="flake" /></span></span></span>
  if (kind === 'storm') return <span className="tw-weather-icon"><span className="icon thunder-storm"><span className="cloud" /><span className="lightning"><span className="bolt" /><span className="bolt" /></span></span></span>
  return <span className="tw-weather-icon"><span className="icon cloudy"><span className="cloud" /><span className="cloud" /></span></span>
}
