import React from 'react'
import { pair, squareDecorations} from '../types'
import '../chessStyles.css'

interface squareProp{
    coordinates:pair;
    conditionals: squareDecorations[];
}

export default function Square({coordinates,conditionals} : squareProp) {

    const translateStyle = {transform : `translate(${100*coordinates.x}%,${100*(7-coordinates.y)}% )`};
    
    const squareClasses = "sq " + conditionals.join(" ");
    return (
            <div className= {squareClasses}
                style = {translateStyle}>
            </div>
        )
}
