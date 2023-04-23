import React, { MouseEvent, createRef, useState, useMemo } from 'react'

import BoardBackground from './Background'
import {Piece, offsetStyle} from './Piece'
import {square, piece, pair , color,selPieceData} from "../types"
import {deepClone} from "../modules/moveLogic"
import '../chessStyles.css'


export default function ChessGame() { 

  let steve :square[][] = [];
  for(let x = 0; x< 8 ; x++){
    let col:square[] = [];
    for(let y = 0; y< 8 ; y++){
      col.push("empty");
    }
    steve.push(col);
  }

  steve[0][0] = {id:"bob", ruleset:"p", color:"w", x:0,y:0};



  // Stores board
  const [boardState, set_boardState] = useState<square[][]>(steve);
  const [turn, set_turn] = useState<color>("w"); 

  // For interaction with pieces.
  const [selPiece,set_selpiece] = useState<selPieceData>("none");

  const allPieces:piece[] = useMemo( () => {
      let idList:piece[] = [];
      boardState.forEach(x => x.forEach(y => {
        if(y !== "empty"){idList.push(y)}}));
      return idList;
    }, [boardState] );
  
  const pieceStyles: Map<string,offsetStyle> = useMemo( ()=> {
      let styles  = new Map<string,offsetStyle>();
      allPieces.forEach( piece => {
        if(selPiece !=="none" && piece.id === selPiece.piece.id){
          styles.set(piece.id, {top: `${selPiece.dispCoord.y}px`,left: `${selPiece.dispCoord.x}px`, transform :""});
        } else {
          styles.set(piece.id, {top: ``,left: ``, transform : `translate(${100*piece.x}%,${100*piece.y}% )`});
        }
      });
      return styles;
      },[selPiece, allPieces]);
  
  const container = createRef<HTMLDivElement>();

  function processMoveRequest (piece:piece , endpoint:pair):void{
    console.log("movereq")
    console.log(boardState);
    const boardXY = clientToBoard(endpoint);
    if(onBoard(boardXY) && (boardXY.x === boardXY.y) ){
        set_boardState((prev) => {
          console.log("movereq2")
          console.log(prev);
          let newState = deepClone(prev);
          let oldPiece = newState[piece.x][piece.y] ;
          if(oldPiece!== "empty"){
            newState[boardXY.x][boardXY.y] = {...oldPiece, x:boardXY.x, y:boardXY.y}
            newState[piece.x][piece.y] = "empty";
          }
          return newState;
        });
    }
    
  }
  


  function clientToBoard(point:pair):pair{
    let [boardX, boardY] = [-1,-1];
    if(container.current?.clientWidth && container.current?.clientHeight){
      boardX = Math.floor(8*point.x/ container.current.clientWidth);
      boardY = Math.floor(8*point.y/ container.current.clientHeight); 
    }
    return {x:boardX, y:boardY};
  }

  function onBoard(point:pair):boolean{
    let [x,y] = [point.x,point.y];
    return (0 <= x && 0<=y && x<=7 && y<=7);
  }


  function dragStart(e:MouseEvent){
    e.preventDefault();
    if(container.current?.clientWidth && container.current?.clientHeight){
      const boardXY = clientToBoard({x:e.clientX, y:e.clientY});
      const square = boardState[boardXY.x][boardXY.y];
      if(square!=="empty" ){
        
        const pieceDiv = document.getElementById(square.id);
        let newX = 0;
        let newY = 0;
        if(pieceDiv){
           newX = pieceDiv.getBoundingClientRect().left;
           newY = pieceDiv.getBoundingClientRect().top ;
        }
        set_selpiece({piece:square , dispCoord: {x:newX,y:newY} , isDragging :true });
      }
      
    }
      
  }

  function dragging(e:MouseEvent){
    e.preventDefault();
    if(selPiece!== "none"){
      const pieceDiv = document.getElementById(selPiece.piece.id);
      if(pieceDiv){
        const newX = pieceDiv.getBoundingClientRect().left - selPiece.dispCoord.x+e.clientX;
        const newY = pieceDiv.getBoundingClientRect().top - selPiece.dispCoord.y+e.clientY;
        set_selpiece({ ...selPiece, dispCoord: {x:newX,y:newY} });
      }
      
    }
    
  }

  function dragEnd(e:MouseEvent){
    e.preventDefault();
    if(selPiece!== "none"){
      processMoveRequest(selPiece.piece, {x:e.clientX, y:e.clientY});
    }
    
    set_selpiece("none");
    
    
  }


  if(selPiece !== "none"){

    return (
      <div ref = {container} 
        className='boardContainer'
        onMouseDown={dragStart}
        onMouseMove={dragging}
        onMouseUp = {dragEnd} 
        onMouseLeave={dragEnd}
      >
        <BoardBackground/>
  
        
        <Piece
           id = {"bob"}
           pieceStyle = {pieceStyles.get("bob") as offsetStyle}
        />
      </div>
    );

  } else{
    return (
      <div ref = {container} 
        className='boardContainer'
        onMouseDown={dragStart}
      >
        <BoardBackground/>
  
        
        <Piece
           id = {"bob"}
           pieceStyle = {pieceStyles.get("bob") as offsetStyle}
        />
      </div>
    );
  }
  
}
