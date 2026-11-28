"use strict";

importScripts("./mines-engine.js?v=deduction2");

self.onmessage=({data})=>{
  const board=new Minesweeper(data.level);
  board.seed(data.first);
  const mines=[];
  board.cells.forEach((cell,index)=>{if (cell.mine) mines.push(index);});
  self.postMessage(mines);
};
