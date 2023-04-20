import React, { MouseEvent, createRef, useState, useMemo } from 'react'
import {v4 as uuid} from 'uuid'
import BoardBackground from './Background'
import {Piece, offsetStyle} from './Piece'
import '../chessStyles.css'

type pieceTypes = 'k'|'q'|'r'|'b'|'n'|'p';

type color = "w" | "b";

type pair = {
  x:number,
  y:number
};



type piece = {
  id : string;
  ruleset : pieceTypes,
  color : color
  };


type square = piece | 'empty';


type selPieceData= {
  id:string;
  dispCoord: pair;
  isDragging:boolean;
}|"none";

export default function ChessGame() { 

  let steve :square[][] = [];
  for(let x = 0; x< 8 ; x++){
    let col:square[] = [];
    for(let y = 0; y< 8 ; y++){
      col.push("empty");
    }
    steve.push(col);
  }

  steve[0][0] = {id:"bob", ruleset:"p", color:"w"};



  // Stores board
  const [boardState, set_boardState] = useState<square[][]>(steve);
  const [turn, set_turn] = useState<color>("w"); 

  // For interaction with pieces.
  const [selPiece,set_selpiece] = useState<selPieceData>({id:"none", dispCoord:{x:0,y:0}, isDragging:false});

  const pieceIDlist:string[] = useMemo( () => {
      let idList:string[] = [];
      boardState.forEach(x => x.forEach(y => {
        if(y !== "empty"){idList.push(y.id)}}));
      return idList;
    }, [boardState] );
  

  const locations: Map<string,pair> = useMemo(()=>{
      let loc = new Map <string,pair>();
      boardState.forEach((row,x) => row.forEach((square,y) => {
        if(square!=="empty"){
          loc.set(square.id, {x:x,y:y});
        }
      }));
      console.log("location update");
      console.log(loc);
      return loc;
  }, [boardState]);
  
  const pieceStyles: Map<string,offsetStyle> = useMemo( ()=> {
      let styles  = new Map<string,offsetStyle>();
      let loc:pair|undefined;
      pieceIDlist.forEach(id => {
        loc = locations.get(id);
        if(selPiece!=="none" && id === selPiece.id){
          styles.set(id, {top: `${selPiece.dispCoord.y}px`,left: `${selPiece.dispCoord.x}px`, transform :""});
        } else if(loc!== undefined){
          styles.set(id, {top: ``,left: ``, transform : `translate(${100*loc.x}%,${100*loc.y}% )`});
        }
      });
      return styles;
      },[selPiece,pieceIDlist,locations]);
  
  const container = createRef<HTMLDivElement>();

  function processMoveRequest (pieceId:string , endpoint:pair):void{
    console.log("movereq")
    console.log(boardState);
    const boardXY = clientToBoard(endpoint);
    const curPos = locations.get(pieceId);
    console.log("pos");
    console.log(curPos);
    if(onBoard(boardXY) && (boardXY.x === boardXY.y) && curPos!== undefined){
        set_boardState((xm) => {
          console.log("movereq2")
          console.log(xm);
          let newState = deepClone(xm);
          
          newState[boardXY.x][boardXY.y] = xm[curPos.x][curPos.y];
          newState[curPos.x][curPos.y] = "empty";
          console.log(newState);
          return newState;
        });
    }
    
  }
  
  function deepClone(board:square[][]):square[][]{
    let clone :square[][] = [];
    let col: square[] = [];
    let sq : square = "empty";
    for(let x = 0; x< 8 ; x++){
      col = [];
      for(let y = 0; y< 8 ; y++){
        sq = board[x][y];
        if(sq === "empty"){
          col.push("empty");
        } else {
          col.push({id:sq.id, color :sq.color, ruleset:sq.ruleset});
        }
        
      }
      clone.push(col);
    }

    return clone;
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
        set_selpiece({id:square.id , dispCoord: {x:newX,y:newY} , isDragging :true });
      }
      
    }
      
  }

  function dragging(e:MouseEvent){
    e.preventDefault();
    if(selPiece!== "none"){
      const pieceDiv = document.getElementById(selPiece.id);
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
      processMoveRequest(selPiece.id, {x:e.clientX, y:e.clientY});
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
