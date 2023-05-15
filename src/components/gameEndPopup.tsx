import React from 'react'
import { gameStateReply, color } from '../types'

interface GameEndPopupProps{
    endBy:gameStateReply;
    currentPlayer:color;
}

export default function GameEndPopup({endBy, currentPlayer}:GameEndPopupProps) {
    let outcome = "";
    let message = "";
    switch(endBy){
        case('checkmate'):
            outcome = "Checkmate:"
            message = `${(currentPlayer === "w") ? "Black" : "White"}  is victorious.`;
            break;
        case('halfmove draw'):
            outcome = "Draw:";
            message = '50 moves without progress.';
            break;
        case('insufficient material'):
            outcome = "Draw:";
            message = 'Insufficient material.';
            break;    
        case('stalemate'):
            outcome = "Draw:";
            message =  `${(currentPlayer === "w") ? "Black" : "White"} is stalemated.`;
            break;
        case ('threefold repetition'):
            outcome = "Draw:";
            message =  'Threefold Repetition.';
            break;
        default:
            message = "whoops.";
            break;
    }

    return (endBy === "ongoing") ? null 
    : <div className= 'gameEndPopup'> 
        <div className='endOutcome'>{outcome}</div> 
        <div className='endMessage'>{message}</div> 
      </div>


}
