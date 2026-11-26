import{i as e}from"./rolldown-runtime-COiEfhsA.js";import{_ as t}from"./pack-generator-BzAFLP2u.js";import{t as n}from"./controllers-Beb7oStQ.js";import{Dn as r,L as i,c as a,n as o,wn as s}from"./options-model-k-LiMSPa.js";import{m as c}from"./app-CFYgDB_k.js";import{T as l}from"./units-DBqh7KQL.js";import{t as u}from"./heightmap-generator-BTx9owXP.js";import{a as d,n as f}from"./draw-heightmap-BCEqN4vw.js";import{t as p}from"./app-commands-Pm_BHLNT.js";import{t as m}from"./dialog-DbLt0nsh.js";import{a as h,i as g}from"./index-4OdfBWhp.js";import{i as _,r as v}from"./node-utils-C10yOMSQ.js";import{m as y}from"./names-generator-DmmhfU2E.js";var b=e(t()),x=y(),S=null,C=null;function w(){m.closeAll(`.stable`),S=M(),C=N(),E(),D(),O(),A(options.generation.template),v(`heightmapSelection`).style.setProperty(`--preview-aspect-ratio`,`${S.width}/${S.height}`),L(),m.open(`heightmapSelection`,{title:h(`Select Heightmap`),position:{my:`center`,at:`center`,of:`svg`},onClose:T,buttons:[{label:h(`Cancel`),onClick:()=>{m.close(`heightmapSelection`)}},{label:h(`Select`),onClick:()=>{let e=k();e&&(o.set(t=>t.generation.template=e),p.syncOptionInputs(),a.set(`template`,options.generation.template),m.close(`heightmapSelection`))}},{label:h(`New Map`),onClick:()=>{let e=k();if(!e)return;o.set(t=>t.generation.template=e),p.syncOptionInputs(),a.set(`template`,options.generation.template);let t=j(),n=C,r=S;m.close(`heightmapSelection`),n&&r&&p.regeneratePrompt({seed:t,graph:n,...r})}}]})}function T(){m.destroy(`heightmapSelection`),_(`heightmapSelectionStyle`)?.remove(),C=null,S=null,u.clearData()}function E(){if(_(`heightmapSelectionStyle`))return;let e=document.createElement(`style`);e.id=`heightmapSelectionStyle`,e.textContent=`
    div.dialog > div.heightmap-selection {
      width: 70vw;
      height: 70vh;
    }

    .heightmap-selection_container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      grid-gap: 6px;
    }

    @media (max-width: 600px) {
      .heightmap-selection_container {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        grid-gap: 4px;
      }
    }

    @media (min-width: 2000px) {
      .heightmap-selection_container {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        grid-gap: 8px;
      }
    }

    .heightmap-selection_options {
      display: grid;
      grid-template-columns: 2fr 1fr;
    }

    .heightmap-selection_options > div:first-child {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      align-items: center;
      justify-self: start;
      justify-items: start;
    }

    @media (max-width: 600px) {
      .heightmap-selection_options {
        grid-template-columns: 3fr 1fr;
      }

      .heightmap-selection_options > div:first-child {
        display: block;
      }
    }

    .heightmap-selection_options > div:last-child {
      justify-self: end;
    }

    .heightmap-selection article {
      padding: 4px;
      border-radius: 8px;
      transition: all 0.1s ease-in-out;
      filter: drop-shadow(1px 1px 4px #999);
    }

    .heightmap-selection article:hover {
      background-color: #ddd;
      filter: drop-shadow(1px 1px 8px #999);
      cursor: pointer;
    }

    .heightmap-selection article.selected {
      background-color: #ccc;
      outline: 1px solid var(--dark-solid);
      filter: drop-shadow(1px 1px 8px #999);
    }

    .heightmap-selection article > div {
      display: flex;
      justify-content: space-between;
      padding: 2px 1px;
    }

    .heightmap-selection article > img {
      width: 100%;
      aspect-ratio: var(--preview-aspect-ratio);
      border-radius: 8px;
      object-fit: fill;
    }

    .heightmap-selection article .regeneratePreview {
      outline: 1px solid #bbb;
      padding: 1px 3px;
      border-radius: 4px;
      transition: all 0.1s ease-in-out;
    }

    .heightmap-selection article .regeneratePreview:hover {
      outline: 1px solid #666;
    }

    .heightmap-selection article .regeneratePreview:active {
      outline: 1px solid #333;
      color: #000;
      transform: rotate(45deg);
    }
  `,document.head.appendChild(e)}function D(){m.destroy(`heightmapSelection`);let e=C,t=S;if(!e||!t)return;let n=d.names().map(e=>`<option value="${e}">${i[e]??e}</option>`).join(``),r=`<div id="heightmapSelection" class="dialog stable">
    <div class="heightmap-selection">
      <section data-tip="${h(`Select heightmap template – template provides unique, but similar-looking maps on generation`)}">
        <header><h1>${h(`Heightmap templates`)}</h1></header>
        <div class="heightmap-selection_container"></div>
      </section>
      <section data-tip="${h(`Select precreated heightmap – it will be the same for each map`)}">
        <header><h1>${h(`Precreated heightmaps`)}</h1></header>
        <div class="heightmap-selection_container"></div>
      </section>
      <section>
        <header><h1>${h(`Options`)}</h1></header>
        <div class="heightmap-selection_options">
          <div>
            <label data-tip="${h(`Rerender all preview images`)}" class="checkbox-label" id="heightmapSelectionRedrawPreview">
              <i class="icon-cw"></i>
              ${h(`Redraw preview`)}
            </label>
            <div>
              <input id="heightmapSelectionRenderOcean" class="checkbox" type="checkbox" />
              <label data-tip="${h(`Draw heights of water cells`)}" for="heightmapSelectionRenderOcean" class="checkbox-label">${h(`Render ocean heights`)}</label>
            </div>
            <div data-tip="${h(`Color scheme used for heightmap preview`)}">
              ${h(`Color scheme`)}
              <select id="heightmapSelectionColorScheme">${n}</select>
            </div>
          </div>
          <div>
            <button data-tip="${h(`Template Editor`)}" data-tool="templateEditor" id="heightmapSelectionEditTemplates">${h(`Edit Templates`)}</button>
            <button data-tip="${h(`Image Converter`)}" data-tool="imageConverter" id="heightmapSelectionImportHeightmap">${h(`Import Heightmap`)}</button>
          </div>
        </div>
      </section>
    </div>
  </div>`;v(`dialogs`).insertAdjacentHTML(`beforeend`,r);let a=document.getElementsByClassName(`heightmap-selection_container`);a[0].innerHTML=Object.keys(s).map(n=>{let r=s[n].name;return Math.random=(0,b.default)(x),`<article data-id="${n}" data-seed="${x}">
        <img src="${z(u.fromTemplate(e,n,t))}" alt="${r}" />
        <div>
          ${r}
          <span data-tip="${h(`Regenerate preview`)}" class="icon-cw regeneratePreview"></span>
        </div>
      </article>`}).join(``),a[1].innerHTML=Object.keys(c).map(e=>{let t=c[e].name;return F(e),`<article data-id="${e}" data-seed="${x}">
        <img alt="${t}" />
        <div>${t}</div>
      </article>`}).join(``)}function O(){v(`heightmapSelection`).addEventListener(`click`,e=>{let t=e.target,n=t.closest(`#heightmapSelection article`);if(!n)return;let r=n.dataset.id;r&&(t.matches(`span.icon-cw`)&&I(n,r),A(r))}),v(`heightmapSelectionRenderOcean`).addEventListener(`change`,L),v(`heightmapSelectionColorScheme`).addEventListener(`change`,L),v(`heightmapSelectionRedrawPreview`).addEventListener(`click`,L),v(`heightmapSelectionEditTemplates`).addEventListener(`click`,e=>R(e.currentTarget)),v(`heightmapSelectionImportHeightmap`).addEventListener(`click`,e=>R(e.currentTarget))}function k(){return v(`heightmapSelection`).querySelector(`.selected`)?.dataset?.id}function A(e){let t=v(`heightmapSelection`);t.querySelector(`.selected`)?.classList?.remove(`selected`),t.querySelector(`[data-id="${e}"]`)?.classList?.add(`selected`)}function j(){return v(`heightmapSelection`).querySelector(`.selected`)?.dataset?.seed}function M(){let{width:e,height:t,density:n,sampling:i,jitter:a}=options.generation.graph;return{width:e,height:t,points:r(n),sampling:i,jitter:a}}function N(){let e=S??M(),t=options.map.graph;if([`width`,`height`,`points`,`sampling`,`jitter`].some(n=>t[n]!==e[n]))return l.generate(x,e);let n=structuredClone(grid);return l.resetHeights(n),n}function P(e){let t=C,n=S;if(!t||!n)return;let r=z(u.fromTemplate(t,e,n));v(`heightmapSelection`).querySelector(`[data-id="${e}"]`)?.querySelector(`img`)?.setAttribute(`src`,r)}async function F(e){let t=C,n=S;if(!t||!n)return;let r=await u.fromPrecreated(t,e,n);if(t!==C)return;let i=z(r);v(`heightmapSelection`).querySelector(`[data-id="${e}"]`)?.querySelector(`img`)?.setAttribute(`src`,i)}function I(e,t){if(!C)return;l.resetHeights(C);let n=y();e.dataset.seed=n,Math.random=(0,b.default)(n),P(t)}function L(){if(!C)return;l.resetHeights(C);let e=v(`heightmapSelection`).querySelectorAll(`article`);for(let t of e){let{id:e,seed:n}=t.dataset;e&&n&&(Math.random=(0,b.default)(n),e in s?P(e):F(e))}}function R(e){let t=e.dataset.tool;t&&m.confirm({title:e.dataset.tip??``,message:g(h(`Opening the tool will erase the current map`),h(`Are you sure you want to proceed?`)),confirm:h(`Continue`),onConfirm:()=>n.HeightmapEditor.open({mode:`erase`,tool:t})})}function z(e){if(!C||!S||!e?.length)return``;let t=d.get(v(`heightmapSelectionColorScheme`).value),n=v(`heightmapSelectionRenderOcean`).checked;return f({heights:e,raster:l.getRaster(C,S.width,S.height),scheme:t,renderOcean:n})}var B={open:w};export{B as HeightmapSelection};