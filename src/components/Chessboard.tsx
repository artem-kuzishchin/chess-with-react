import React, { MouseEvent, createRef, useState, useMemo } from 'react'

import BoardBackground from './Background'
import {Piece, offsetStyle} from './Piece'
import Square from './Square'
import GameEndPopup from './gameEndPopup'
import uuid from 'react-uuid'
import {square, piece, pair , color,selPieceData, chessPosition, castleData, epData, squareDecorations, castleReply, gameStateReply} from "../types"
import {calcLegalMoves, getAllPiecesOf, deepClone, decideEPFlag, moveIsCastles, getStateOfGame} from "../modules/moveLogic"
import { startingPosition, fenToPosition } from '../modules/fenParsing'
import '../chessStyles.css'
import { hover } from '@testing-library/user-event/dist/hover'


export default function ChessGame() { 

  const defaultPosition:chessPosition = useMemo<chessPosition>(() => startingPosition(),[]);
  const container = createRef<HTMLDivElement>();
 
  /* -------------------------------------------------------------------------- */
  /*                         STATE FOR ALL THE GAME DATA                        */
  /* -------------------------------------------------------------------------- */

  const [boardState, set_boardState] = useState<square[][]>(defaultPosition.board);
  const [turn, set_turn] = useState<color>(defaultPosition.turn); 
  const [castles,set_castles] = useState<castleData>(defaultPosition.castles);
  const [epTarget, set_epTarget] = useState<epData>(defaultPosition.epTarget);
  const [halfMovesSinceProgress, set_halfMoves] = useState<number>(defaultPosition.halfMovesSinceProgress);
  const [fullMoves, set_fullMoves] = useState<number>(defaultPosition.fullMoves);
  // Holds (position, multiplicity) for the threefold repetition rule.
  const [seenPositions, set_seenPositions] = useState<[chessPosition , number][]>([[defaultPosition,1]]);

  const position: chessPosition = useMemo<chessPosition>(()=>{return {
    board:boardState,
    turn: turn,
    epTarget: epTarget,
    castles: castles,
    halfMovesSinceProgress: halfMovesSinceProgress,
    fullMoves: fullMoves
  }},[boardState, castles, epTarget, fullMoves, halfMovesSinceProgress, turn]);


  const allPieces:piece[] = useMemo( () => {
    let idList:piece[] = [];
    boardState.forEach(x => x.forEach(y => {
      if(y !== "empty"){idList.push(y)}}));
    return idList;
  }, [boardState] );


  const legalMoves = useMemo( () => {
      let activePieces = getAllPiecesOf(position,position.turn);
      return calcLegalMoves(position,activePieces);
  }, [position]);
  

  const gameState = useMemo(() => getStateOfGame(position,legalMoves), [position,legalMoves]);
 
  /* -------------------------------------------------------------------------- */
  /*                              STATE FOR VISUALS                             */
  /* -------------------------------------------------------------------------- */

  const [selPiece,set_selpiece] = useState<selPieceData>("none");
  const [lastMove, set_lastMove] = useState<[pair,pair]>([{x:-1,y:-1},{x:-1,y:-1}]);
  
  const pieceStyles: Map<string,offsetStyle> = useMemo( ()=> {
    let styles  = new Map<string,offsetStyle>();
    allPieces.forEach( (piece) => {
        styles.set(piece.id, {top: ``,left: ``, transform : `translate(${100*piece.x}%,${100*(7-piece.y)}% )`});
    });
    return styles;
    },[allPieces]);

  const dragStyle = useMemo<offsetStyle| "none">(() => {
    if(selPiece === "none"){
      return "none";
    }
    return {top: `${selPiece.dispCoord.y}px`,left: `${selPiece.dispCoord.x}px`, transform :""};
  }, [selPiece]);

  /* -------------------------------------------------------------------------- */
  /*                        FUNCTIONS FOR UPDATING STATE                        */
  /* -------------------------------------------------------------------------- */

  function processMoveRequest (piece:piece , endpoint:pair):void{
    const boardXY = clientToBoard(endpoint);
    if(onBoard(boardXY) && legalMoves.has(piece) ){
      let moves = legalMoves.get(piece) as boolean[][];
      if (moves[boardXY.x][boardXY.y]) {
        updateSeenPositions(position);
        updateBoard(piece, boardXY);
        updateLastTurn(piece,boardXY);
        iterateTurn();
        updateCastles(piece, boardXY);
        updateEPflag(piece,boardXY);
        updateHalfMove();
        updateFullMove();
      }
    }
  }

  function updateSeenPositions(newPositon: chessPosition){
    set_seenPositions((prev) => {
      let newList = [...prev];
      newList.push([newPositon,1]);
      return newList;
    });
  }

  function updateBoard(piece:piece , newXY :pair){
    set_boardState((prev) => {
      let newState = deepClone(prev);
      let newPiece = newState[piece.x][piece.y];
      if (newPiece !== "empty") {
        
        // Move the piece. If it is a normal capture, this is sufficient.
        newState[newXY.x][newXY.y] = { ...newPiece, x: newXY.x, y: newXY.y }
        newState[piece.x][piece.y] = "empty";
        
        // For en-passant, the capture happens on a different square than the destination.
        if (piece.ruleset === "p" && isEPTarget(newXY)){
            let facingDirection = (piece.color === "w") ? 1 : -1;
            newState[newXY.x][newXY.y-facingDirection] = "empty";
        }

        // We also need to handle castling.
        if (piece.ruleset === "k" ){
          let reply : castleReply = moveIsCastles(position, piece, newXY);
          if(reply !== "no"){
            let [rookStartX,rookEndX] = (reply === "kingside") ? [7,5] : [0,3];
            let rook = newState[rookStartX][piece.y] as piece;
            newState[rookEndX][piece.y] = { ...rook, x: rookEndX, y: piece.y };
            newState[rookStartX][piece.y] = "empty";
          }
        }

      } 
      return newState;
    });
  }

  function updateLastTurn (piece:piece, newXY:pair){
    const oldXY = {x:piece.x,y:piece.y};
    set_lastMove([oldXY,newXY]);
  }
  

  function iterateTurn():void{
    const newTurn = (turn === "w") ? "b" : "w";
    set_turn(newTurn);
  }

  function updateCastles(piece:piece, target:pair){
    let reply = moveIsCastles(position,piece,target);
    let color = (piece.color === "w")? 0 : 1;
    if(reply !== "no"){
      let side = (reply === "kingside") ? 0 : 1;
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



  /* -------------------------------------------------------------------------- */
  /*                              HELPER FUNCTIONS                              */
  /* -------------------------------------------------------------------------- */

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
    return (0 <= x && 0 <=y && x <=7 && y <=7);
  }

  function isEPTarget (point:pair):boolean{
    if(epTarget!== "-"){
      return pairsAreEqual(epTarget,point);
    }
    return false;
  }

  function pairsAreEqual(a:pair, b:pair):boolean{
    return a.x===b.x && a.y === b.y;
  }


  /* -------------------------------------------------------------------------- */
  /*                               EVENT LISTENERS                              */
  /* -------------------------------------------------------------------------- */


  /* --------------- Let the player select a piece on the board. -------------- */
  /* ------------- If their choice is valid, movement is allowed. ------------- */
  function selectPiece(e:MouseEvent){
    e.preventDefault();
    if(container.current?.clientWidth && container.current?.clientHeight){
      const boardXY = clientToBoard({x:e.clientX, y:e.clientY});
      const square = boardState[boardXY.x][boardXY.y];

      if(square!=="empty" && square.color === turn){
        const originX = 100*square.x;
        const originY = 100*(7-square.y);
        set_selpiece({piece:square , dispCoord: {x:originX,y:originY} , isDragging:true, hasLeftOriginSquare : false  });
      }
    }  
  }

  /* ------- Only possible to call when the player has a piece selected. ------ */
  /* -- If the player is dragging the piece, the mouse button is already down - */
  /* The player is therefore either
      - Making a request to submit a move with the piece they have selected,
      - or starting a new drag on one of their pieces. */
  function decideSubmitOrDrag(e:MouseEvent){
    e.preventDefault();
    if(selPiece === "none"){
      selectPiece(e);
      return;
    };

    // Allows clicking onto 
    let cursorOver = clientToBoard({x:e.clientX, y:e.clientY});
    let hoveredPiece = boardState[cursorOver.x][cursorOver.y]
    if (hoveredPiece !== "empty" && hoveredPiece.color === turn){
      selectPiece(e);
    }
    else {
      processMoveRequest(selPiece.piece,{x:e.clientX, y:e.clientY});
      set_selpiece("none");
    }
  }


  /* ------ Fires on mousemove inside the container div, and used to animate dragging. ------ */
  function dragging(e:MouseEvent){
    
    // The mousemove event also fires for unmoving, click-selected pieces.
    // If our piece has been click-selected, we ignore drag animation.
    if(selPiece === "none" || !selPiece.isDragging ) return;  

    const pieceDiv = document.getElementById(selPiece.piece.id);

    if(pieceDiv === null) return;

    const width = pieceDiv.getBoundingClientRect().right - pieceDiv.getBoundingClientRect().left;
    const newX = pieceDiv.getBoundingClientRect().left - selPiece.dispCoord.x + e.clientX - width / 2;
    const newY = pieceDiv.getBoundingClientRect().top - selPiece.dispCoord.y + e.clientY - width / 2;
    

  
    let newDisplayInfo = { ...selPiece, dispCoord: { x: newX, y: newY } };

    // The piece has left its origin square exactly when the cursor hovers over some other square. 
    if (!selPiece.hasLeftOriginSquare) {
      const boardCo = clientToBoard({ x: e.clientX, y: e.clientY });
      if (!pairsAreEqual({ x: selPiece.piece.x, y: selPiece.piece.y }, boardCo)) {
        newDisplayInfo.hasLeftOriginSquare = true;
      }
    }

    set_selpiece(newDisplayInfo);

  }

  /* --------- Fired when a player stops dragging their selected piece. --------- */
  function draggingMouseUp(e:MouseEvent){
    e.preventDefault();
    /* Submitting a move with a click also fires a mouseUp event, 
    but preventDefault in the mouseDown handler prevents draggingMouseUp
    from being called in that context. This is just for safety.*/
    if(selPiece === "none" || !selPiece.isDragging) return;


    if(selPiece.hasLeftOriginSquare){
      processMoveRequest(selPiece.piece, {x:e.clientX, y:e.clientY});
      set_selpiece("none");
    }
    // Makes the piece act as though click-selected if the player selects it
    // with their cursor still in motion. 
    else {
      snapBack(e);
    }
    
  }

  function snapBack(e:MouseEvent){
    if(selPiece === "none") return;
    let originX = 100*selPiece.piece.x;
    let originY = 100*(7-selPiece.piece.y);
    set_selpiece({...selPiece, dispCoord:{x:originX, y:originY}, isDragging: false});
  }


 
  /* -------------------------------------------------------------------------- */
  /*                                  RENDERING                                 */
  /* -------------------------------------------------------------------------- */


  /* -------------------------------------------------------------------------- */
  /* Here the player has a piece selected. To make a move, they can either      */
  /*                  - drag it to a target square                              */
  /*                  - click on a target square                                */
  /* -------------------------------------------------------------------------- */

    if(gameState === "ongoing"){
      return (
        <div ref = {container} 
          className='boardContainer'
          onMouseDown = {decideSubmitOrDrag}
          onMouseMove={dragging}
          onMouseUp = {draggingMouseUp}
          onPointerLeave={snapBack}
        >
  
          
          <BoardBackground/>
  
          
          {/* ---------------------------- Draw board pieces --------------------------- */
          /* - The selected piece, if dragging, will have correct styles pre-computed - */
          allPieces.map(piece => { 
            return (selPiece !== "none" && piece.id === selPiece.piece.id) 
            ? (<Piece key = {uuid()}
                id = {piece.id}
                srcPath = {`./images/${piece.color}${piece.ruleset}.svg`}
                pieceStyle = {dragStyle as offsetStyle}
              />)
            : (<Piece key = {uuid()}
                id = {piece.id}
                srcPath = {`./images/${piece.color}${piece.ruleset}.svg`}
                pieceStyle = {pieceStyles.get(piece.id) as offsetStyle}
            />)
          })}
  
  
          {(selPiece!== "none") &&  
          /* --------------- Draw the legal moves of the selected piece. -------------- */
          legalMoves.get(selPiece.piece)?.map( (col, colIndex) => {
            return col.map((isLegal,rowIndex) => {
  
              // Governs what styles will be applied to a given square.
              let conditionals :squareDecorations[]= [];
  
              if(isLegal){
                conditionals.push((boardState[colIndex][rowIndex] !== "empty") ? "capture" : "dest");
                // En-passant squares are empty, but should also have the capture style.
                if(selPiece.piece.ruleset === "p" && colIndex !== selPiece.piece.x){
                  conditionals.push("capture");
                }
              }
  
              // Highlight the square of origin.
              if(selPiece.piece.x === colIndex && selPiece.piece.y === rowIndex ){
                conditionals.push("origin");
              }
  
              return (isLegal || conditionals.indexOf("origin")!==-1) ? <Square 
                key = {uuid()} 
                coordinates={ {x:colIndex, y:rowIndex}}
                conditionals = {conditionals}
                /> : null;
            })
          })}
          
          
  
          {/* ---------------------- Highlight the last move made ---------------------- */
          lastMove.map(sq => {
            return (sq.x> -1)? 
            <Square 
                key = {uuid()} 
                coordinates={ {x:sq.x, y:sq.y}}
                conditionals = {['prevMove']}
                />
            : null;
          })}
  
          <GameEndPopup currentPlayer= {turn} endBy = {getStateOfGame(position,legalMoves)}/>
         
          
        </div>
      );
    }

    else {
      return (
        <div ref = {container} 
          className='boardContainer'
        >
  
          
          <BoardBackground/>
  
          
          {/* ---------------------------- Draw board pieces --------------------------- */
          /* - The selected piece, if dragging, will have correct styles pre-computed - */
          allPieces.map(piece => { 
            return (selPiece !== "none" && piece.id === selPiece.piece.id) 
            ? (<Piece key = {uuid()}
                id = {piece.id}
                srcPath = {`./images/${piece.color}${piece.ruleset}.svg`}
                pieceStyle = {dragStyle as offsetStyle}
              />)
            : (<Piece key = {uuid()}
                id = {piece.id}
                srcPath = {`./images/${piece.color}${piece.ruleset}.svg`}
                pieceStyle = {pieceStyles.get(piece.id) as offsetStyle}
            />)
          })}
          
          
  
          {/* ---------------------- Highlight the last move made ---------------------- */
          lastMove.map(sq => {
            return (sq.x> -1)? 
            <Square 
                key = {uuid()} 
                coordinates={ {x:sq.x, y:sq.y}}
                conditionals = {['prevMove']}
                />
            : null;
          })}

          <div className='dimOverlay'></div>
          <GameEndPopup currentPlayer= {turn} endBy = {gameState}/>
         
          
        </div>
      );
    }
    
  }


