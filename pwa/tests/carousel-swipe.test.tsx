import assert from 'node:assert/strict';
import test from 'node:test';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {useCarouselSwipe} from '../src/components/swipe';

test('carousel accepts horizontal pointer gestures and ignores vertical scrolling, controls and cancellation',async()=>{
 const dom=new JSDOM('<div id="root"></div>');
 const previous={window:globalThis.window,document:globalThis.document,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const moves:number[]=[];
 function Harness(){const swipe=useCarouselSwipe(d=>moves.push(d));return <section {...swipe}><span>Card</span><button>Start</button></section>;}
 const root=createRoot(dom.window.document.getElementById('root')!);
 const emit=async(target:Element,type:string,x:number,y:number)=>act(()=>{
  const e=new dom.window.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});
  Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true}});target.dispatchEvent(e);
 });
 try{
  await act(()=>root.render(<Harness/>));
  const span=dom.window.document.querySelector('span')!,button=dom.window.document.querySelector('button')!;
  await emit(span,'pointerdown',200,200);await emit(span,'pointerup',100,210);
  await emit(span,'pointerdown',100,200);await emit(span,'pointerup',200,210);
  assert.deepEqual(moves,[1,-1]);
  await emit(span,'pointerdown',200,200);await emit(span,'pointerup',190,300);
  await emit(span,'pointerdown',200,200);await emit(span,'pointercancel',100,200);await emit(span,'pointerup',100,200);
  await emit(button,'pointerdown',200,200);await emit(button,'pointerup',100,200);
  assert.deepEqual(moves,[1,-1]);
 }finally{await act(()=>root.unmount());dom.window.close();Object.assign(globalThis,previous);}
});
