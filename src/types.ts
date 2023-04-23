export type pieceTypes = 'k'|'q'|'r'|'b'|'n'|'p';

export type color = "w" | "b";

export type pair = {
  x:number,
  y:number
};



export type piece = pair & {
  id : string;
  ruleset : pieceTypes,
  color : color
  };


export type square = piece | 'empty';


export type selPieceData= {
  piece:piece;
  dispCoord: pair;
  isDragging:boolean;
}|"none";



export type chessGamestate = {
  board:square[][],
  turn:color,
  epTarget:pair|"-",
  castles: castleData,
  halfMovesSinceProgress:number,
  fullMoves:number
}

export type castleData = [[boolean,boolean],[boolean,boolean]];

