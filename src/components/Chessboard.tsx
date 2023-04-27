import React, { MouseEvent, createRef, useState, useMemo } from 'react'

import BoardBackground from './Background'
import {Piece, offsetStyle} from './Piece'
import uuid from 'react-uuid'
import {square, piece, pair , color,selPieceData, chessGamestate, castleData, epData} from "../types"
import {calcLegalMoves, getAllPiecesOf, deepClone, decideEPFlag, moveIsCastles} from "../modules/moveLogic"
import { startingPosition, fenToPosition } from '../modules/fenParsing'
import '../chessStyles.css'


export default function ChessGame() { 

  const defaultPosition:chessGamestate = useMemo<chessGamestate>(() => startingPosition(),[]);


  // Stores board
  const [boardState, set_boardState] = useState<square[][]>(defaultPosition.board);
  const [turn, set_turn] = useState<color>(defaultPosition.turn); 
  const [castles,set_castles] = useState<castleData>(defaultPosition.castles);
  const [epTarget, set_epTarget] = useState<epData>(defaultPosition.epTarget);
  const [halfMovesSinceProgress, set_halfMoves] = useState<number>(defaultPosition.halfMovesSinceProgress);
  const [fullMoves, set_fullMoves] = useState<number>(defaultPosition.fullMoves);
 
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
          styles.set(piece.id, {top: ``,left: ``, transform : `translate(${100*piece.x}%,${100*(7-piece.y)}% )`});
        }
      });
      return styles;
      },[selPiece, allPieces]);

  const position: chessGamestate = useMemo<chessGamestate>(()=>{return {
    board:boardState,
    turn: turn,
    epTarget: epTarget,
    castles: castles,
    halfMovesSinceProgress: halfMovesSinceProgress,
    fullMoves: fullMoves
  }},[boardState, castles, epTarget, fullMoves, halfMovesSinceProgress, turn]);

  const legalMoves = useMemo( () => {
      let activePieces = getAllPiecesOf(position,position.turn);
      return calcLegalMoves(position,activePieces);
  }, [position]);
  
  const container = createRef<HTMLDivElement>();

  function processMoveRequest (piece:piece , endpoint:pair):void{
    console.log(legalMoves);
    const boardXY = clientToBoard(endpoint);
    if(onBoard(boardXY) && legalMoves.has(piece) ){
      let moves = legalMoves.get(piece) as boolean[][];
      if (moves[boardXY.x][boardXY.y]) {
        updateBoard(piece, boardXY);
        iterateTurn();
        updateCastles(piece, boardXY);
        updateEPflag(piece,boardXY);
        updateHalfMove();
        updateFullMove();
      }
    }

  }

  function updateBoard(piece:piece , newXY :pair){
    set_boardState((prev) => {
       let newState = deepClone(prev);
      let oldPiece = newState[piece.x][piece.y];
      if (oldPiece !== "empty") {
        newState[newXY.x][newXY.y] = { ...oldPiece, x: newXY.x, y: newXY.y }
        newState[piece.x][piece.y] = "empty";
      }
      return newState;
    });
  }
  

  function iterateTurn():void{
    const newTurn = (turn === "w") ? "b" : "w";
    set_turn(newTurn);
  }

  function updateCastles(piece:piece, target:pair){
    let reply = moveIsCastles(position,piece,target);
    let color = (piece.color === "w")? 0 : 1;
    if(reply !== "NO"){
      let side = (reply === "KINGSIDE") ? 0 : 1;
      set_castles((prev) => {
        let update = [...prev] as castleData;
        update[color][side] = true;
        return update;
      });
    }
  }

  function updateEPflag(piece:piece , target:pair){
    if(piece.ruleset === "p"){
      set_epTarget(decideEPFlag(piece,target));
    } else {
      set_epTarget("-");
    }
  }
  
  function updateHalfMove(){
    set_halfMoves(hm => hm +1);
  }
  
  function updateFullMove(){
    if(position.turn === "b"){
      set_fullMoves( (x) => x+1);
    }
  }

  function clientToBoard(point:pair):pair{
    let [boardX, boardY] = [-1,-1];
    if(container.current?.clientWidth && container.current?.clientHeight){
      boardX = Math.floor(8*point.x/ container.current.clientWidth);
      boardY = Math.floor(8*point.y/ container.current.clientHeight); 
    }
    return {x:boardX, y:7-boardY};
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
  
        
        {allPieces.map(piece => { return (
          <Piece key = {uuid()}
            id = {piece.id}
            pieceStyle = {pieceStyles.get(piece.id) as offsetStyle}
          />)
        })}

       
        
      </div>
    );

  } else{
    return (
      <div ref = {container} 
        className='boardContainer'
        onMouseDown={dragStart}
      >
        <BoardBackground/>
  
        {allPieces.map(piece => { return (
          <Piece
            key = {uuid()}
            id = {piece.id}
            pieceStyle = {pieceStyles.get(piece.id) as offsetStyle}
          />)
        })}
        

      </div>
    );
  }
  
}
