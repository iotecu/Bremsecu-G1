import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { I18nProvider } from '../src/i18n';

async function setup() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
  const container=dom.window.document.getElementById('root');
  assert.ok(container);
  const root=createRoot(container);
  await act(async()=>{root.render(<I18nProvider><App /></I18nProvider>);});
  async function cleanup(){
    await act(async()=>root.unmount());
    dom.window.close();
    Object.assign(globalThis,{window:previousWindow,document:previousDocument,IS_REACT_ACT_ENVIRONMENT:previousActEnvironment});
  }
  return {dom,container,cleanup};
}

async function click(dom:JSDOM,container:HTMLElement,selector:string){
  const element=container.querySelector<HTMLElement>(selector);
  assert.ok(element,'Missing element: '+selector);
  await act(async()=>{element.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));});
}

async function setInput(dom:JSDOM,container:HTMLElement,selector:string,value:string){
  const input=container.querySelector<HTMLInputElement>(selector);
  assert.ok(input);
  await act(async()=>{
    const setter=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')?.set;
    setter?.call(input,value);
    input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
    input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  });
}

async function enterTests(dom:JSDOM,container:HTMLElement){
  await click(dom,container,'[data-action="continue-login"]');
  await click(dom,container,'[data-action="new-vehicle"]');
  await setInput(dom,container,'[data-field="tractor-plate"]','34 ABC 123');
  await setInput(dom,container,'[data-field="trailer-plate"]','34 DRS 456');
  const form=container.querySelector<HTMLFormElement>('[data-screen="03-new-vehicle"]');
  assert.ok(form);
  await act(async()=>{form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));});
}

async function moveRight(dom:JSDOM,container:HTMLElement,count:number){
  for(let i=0;i<count;i+=1) await click(dom,container,'.p5-carousel__arrow--right');
}

test('Group D settings card opens approved settings detail and save returns home',async()=>{
  const {dom,container,cleanup}=await setup();
  try{
    await enterTests(dom,container);
    await moveRight(dom,container,6);
    assert.ok(container.querySelector('[data-screen="37-settings"]'));
    await click(dom,container,'[data-action="open-settings"]');
    assert.ok(container.querySelector('[data-screen="38-settings-detail"]'));
    await click(dom,container,'[data-action="save-settings"]');
    assert.ok(container.querySelector('[data-screen="37-settings"]'));
  }finally{await cleanup();}
});

test('Group D battery stays the eighth main carousel state',async()=>{
  const {dom,container,cleanup}=await setup();
  try{
    await enterTests(dom,container);
    await moveRight(dom,container,7);
    assert.ok(container.querySelector('[data-screen="39-battery-status"]'));
    assert.equal(container.querySelector('button.p5-carousel__arrow--right'),null);
    assert.ok(container.querySelector('.p5-carousel__arrow--right.p5-carousel__arrow--decorative'));
  }finally{await cleanup();}
});

test('reports without an active record use the report-context old-record overlay',async()=>{
  const {dom,container,cleanup}=await setup();
  try{
    await click(dom,container,'[data-action="continue-login"]');
    // No service record is activated. Bottom Settings shortcut can establish carousel context,
    // then move left once to Reports without inventing a new route.
    await click(dom,container,'[data-nav="settings"]');
    await click(dom,container,'.p5-carousel__arrow--left');
    assert.ok(container.querySelector('[data-screen="33-reports"]'));
    await click(dom,container,'[data-action="open-reports"]');
    assert.ok(container.querySelector('[data-overlay="40-old-record-search-alt"]'));
  }finally{await cleanup();}
});
