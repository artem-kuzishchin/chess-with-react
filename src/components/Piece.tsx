import React from 'react'
import '../chessStyles.css'




export interface offsetStyle{
    left:string;
    top:string;
    transform: string;
}

interface piecePosProp {
    id:string;
    srcPath:string;
    pieceStyle:offsetStyle;
}

export function Piece({id,srcPath, pieceStyle}:piecePosProp) {

  return (
    <img
        id = {id}
        src = {srcPath} 
        alt ='' 
        className='piece' 
        style = {pieceStyle}
    />
  )
}
