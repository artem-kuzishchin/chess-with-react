export type pair = {
  x:number,
  y:number
};

export type pieceTypes = 'k'|'q'|'r'|'b'|'n'|'p';

export type color = "w" | "b";

export type piece = pair & {
  id : string;
  ruleset : pieceTypes,
  color : color
  };


export type square = piece | "empty";

export type castleData = [[boolean,boolean],[boolean,boolean]];

export type epData = pair | "-";

export type chessPosition = {
  board:square[][];
  turn:color;
  epTarget: epData;
  castles: castleData;
  halfMovesSinceProgress:number;
  fullMoves:number;
}

export type gameStateReply = "checkmate" | "stalemate" | "insufficient material" | "halfmove draw" |"threefold repetition" | "ongoing";

export type castleReply = "no" | "kingside" | "queenside";

export type squareDecorations = "dest" | "capture" | "epCapture" | "origin"  | "prevMove"; 

export type selPieceData= {
  piece:piece;
  dispCoord: pair;
  isDragging : boolean;
  hasLeftOriginSquare:boolean;
}|"none";





