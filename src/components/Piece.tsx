import React from 'react'
import '../chessStyles.css'




export interface offsetStyle{
    left:string;
    top:string;
    transform: string;
}

interface piecePosProp {
    id:string
    pieceStyle:offsetStyle
}

export function Piece({id,pieceStyle}:piecePosProp) {


  return (
    <img
        id = {id}
        src = './images/pawn.svg' 
        alt ='' 
        className='piece' 
        style = {pieceStyle}
    />
  )
}
