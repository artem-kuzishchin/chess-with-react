import { chessGamestate, piece, pair, square, color } from "../types";


export type gameState = "Checkmate" | "Stalemate" | "Insufficient Material" | "50 Halfmove Draw" | "Ongoing";
export type castleType = "KINGSIDE" | "QUEENSIDE";
export type castleReply = "NO" | castleType;




// Given a gamestate and a list of pieces, finds where each piece can move.
export function calcLegalMoves(position: chessGamestate, pieces: piece[]): Map<piece, boolean[][]> {
    let moves = new Map<piece, boolean[][]>();
    for (let piece of pieces) {
        moves.set(piece, getLegalMovesOf(position, piece));
    }
    return moves;
}


/* Returns an array where [i][k] = true  <==>                
@piece can move to square (i,k) in the position @position  */
function getLegalMovesOf(position: chessGamestate, piece: piece): boolean[][] {
    // We will be changing playing hypothetical moves in the following steps, and want the starting position to be unchanged.
    let currentPosition: chessGamestate = { ...position, board: deepClone(position.board) };

    let candidateMoves: boolean[][] = getMovespaceOf(currentPosition, piece);

    // Try out each potential move to see if leaves the moving player in check, and filter out such moves.
    candidateMoves = inducedCheckFilter(currentPosition, piece, candidateMoves);

    // Finally, see if castling is possible.
    candidateMoves = castleFilter(currentPosition, piece, candidateMoves);

    return candidateMoves;


}


function getMovespaceOf(position: chessGamestate, piece: piece): boolean[][] {

    switch (piece.ruleset) {
        case ("q"): return queenThreats(position, piece);
        case ("k"): return kingThreats(position, piece);
        case ("n"): return knightThreats(position, piece);
        case ("b"): return bishopThreats(position, piece);
        case ("r"): return rookThreats(position, piece);
        case ("p"): return combineBoolArrays(pawnThreats(position, piece), pawnMoves(position, piece));
    }
}

function inducedCheckFilter(position: chessGamestate, piece: piece, candidateMoves: boolean[][]): boolean[][] {
    for (var x = 0; x < 8; x++) {
        for (var y = 0; y < 8; y++) {
            if (candidateMoves[x][y]) {
                candidateMoves[x][y] = moveAvoidsCheck(position, piece, { x: x, y: y });
            }
        }
    }
    return candidateMoves;
}


function castleFilter(position: chessGamestate, piece: piece, threats: boolean[][]): boolean[][] {
    if (piece.ruleset !== "k") {
        return threats;
    }

    const castleInfo = position.castles;
    let [x, y] = piece.color === "w" ? [6, 0] : [6, 7];
    const player = piece.color === "w" ? 0 : 1;
    if (castleInfo[player][0] && kingsideCastleCheck(position, piece)) {
        threats[x][y] = true;
    }

    [x, y] = piece.color === "w" ? [2, 0] : [2, 7];
    if (castleInfo[player][1] && queensideCastleCheck(position, piece)) {
        threats[x][y] = true;

    }

    return threats;
}


/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* --------------------------- MOVESPACE FUNCTIONS -------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

function queenThreats(position: chessGamestate, piece: piece): boolean[][] {
    return combineBoolArrays(bishopThreats(position, piece), rookThreats(position, piece));
}

function bishopThreats(position: chessGamestate, piece: piece): boolean[][] {
    let attackDirections: pair[] = [{ x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: -1, y: -1 }];
    return directionalThreatSearch(position, piece, attackDirections);
}

function rookThreats(position: chessGamestate, piece: piece): boolean[][] {
    let attackDirections: pair[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
    return directionalThreatSearch(position, piece, attackDirections);
}

// Given a @piece, a @position, and @threatDirections a list of vectors [x,y]
// Returns an array where [i][j] = true <===> the piece can potentially move to or capture on square [i][j] 
function directionalThreatSearch(position: chessGamestate, piece: piece,threatDirections: pair[]): boolean[][] {
    let threats = emptyBoolArray();


    let atSquare = {x:piece.x, y:piece.y};



    let threatenedSquare: pair = { ...atSquare };
    let squareContents: square = "empty";

    for (let dir of threatDirections) {
        for (let length = 1; length <= 7; length++) {
            // Taking steps in the direction specified by dir as a vector
            threatenedSquare.x += dir.x;
            threatenedSquare.y += dir.y;

            if (!inBounds(threatenedSquare)) {
                break;
            }

            squareContents = position.board[threatenedSquare.x][threatenedSquare.y];
            if (squareContents !== "empty") {
                // Cannot move past your own pieces.
                if (squareContents.color === piece.color) {
                    break;
                }
                // Otherwise you can capture and move no further.
                threats[threatenedSquare.x][threatenedSquare.y] = true;
                break;
            }

            threats[threatenedSquare.x][threatenedSquare.y] = true;
        }

        threatenedSquare.x = atSquare.x;
        threatenedSquare.y = atSquare.y;
    }

    return threats;
}

function pawnThreats(position: chessGamestate, piece: piece): boolean[][] {

    let threats = emptyBoolArray();
    let atSquare = getLocation(piece);
    let facingDirection = (piece.color === "w" ? 1 : -1);
    let threatSquares = [{ x: atSquare.x + 1, y: atSquare.y + facingDirection },
    { x: atSquare.x - 1, y: atSquare.y + facingDirection }];

    for (let threat of threatSquares) {
        if (inBounds(threat)) {
            if (positionHasEnemyAt(piece, threat, position) || EPCheck(threat, position)) {
                threats[threat.x][threat.y] = true;
            }
        }

    }

    return threats;

}

function pawnMoves(position: chessGamestate, pawn: piece): boolean[][] {
    let moves = emptyBoolArray();
    let facingDirection = (pawn.color === "w" ? 1 : -1);
    let curSq = { x: pawn.x, y: pawn.y + facingDirection };

    if (inBounds(curSq) && !squareIsEmpty(position,curSq)) {
        return moves;
    }

    moves[curSq.x][curSq.y] = true;

    curSq.y += facingDirection;

    if (inBounds(curSq) && squareIsEmpty( position, curSq) && pawnHasNotMoved(pawn)) {
        moves[curSq.x][curSq.y] = true;
    }

    return moves;

}

function knightThreats(position: chessGamestate, piece: piece): boolean[][] {
    let atSquare = getLocation(piece);
    let threats = emptyBoolArray();
    let curThreats: pair[];
    for (let horizStep = -1; horizStep <= 1; horizStep += 2) {
        for (let vertStep = -1; vertStep <= 1; vertStep += 2) {
            curThreats = [{ x: atSquare.x + 2 * horizStep, y: atSquare.y + vertStep },
            { x: atSquare.x + horizStep, y: atSquare.y + 2 * vertStep }];
            for (let square of curThreats) {
                if (inBounds(square)) {
                    threats[square.x][square.y] = canMoveToOrCaptureOn(position, piece,  square);
                }

            }
        }
    }
    return threats;
}

function kingThreats(position: chessGamestate, piece: piece): boolean[][] {

    let threats = emptyBoolArray();
    let curSquare = { x: 0, y: 0 };
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            curSquare.x = piece.x + i;
            curSquare.y = piece.y + j;
            if (inBounds(curSquare)) {
                threats[curSquare.x][curSquare.y] = canMoveToOrCaptureOn(position, piece, curSquare);
            }

        }
    }

    threats[piece.x][piece.y] = false;
    return threats;
}



/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* ----------------------- CHECK DETECTION FUNCTIONS ------------------------ */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

function curPlayerInCheck(position:chessGamestate): boolean {
    let king = getKingOf(position,position.turn);
    if(king === "none"){
        console.log("curPlayerInCheck: cannot find king.")
        return true;
    } else{ 
        return !moveAvoidsCheck(clonePosition(position), king, { x: king.x, y: king.y });
    }
    

}

function moveAvoidsCheck(position: chessGamestate, piece: piece,  target: pair): boolean {

    let king = getKingOf(position, position.turn);
    if (king === "none") {
        console.log("moveAvoidsCheck: king cannot be found.");
    } else {
        let kingLocation = { x: king.x, y: king.y };
        let opponentsPieces = getAllPiecesOf(position, currentOpponent(position));
        // Allowing potential captures.
        opponentsPieces = opponentsPieces.filter(piece => piece.x !== target.x || piece.y !== target.y);
        let origin: pair = { x: piece.x, y: piece.y };
        let testBoard: square[][] = deepClone(position.board);
        let testPiece = { ...piece, x: target.x, y: target.y };
        testBoard[origin.x][origin.y] = "empty";
        testBoard[target.x][target.y] = testPiece;
        let testPos = {...position, board:testBoard};

        if (piece.ruleset === "k") {
            kingLocation = target;
        }

        let curThreats: boolean[][] = [];
        for (let opPiece of opponentsPieces) {
            curThreats = getMovespaceOf(testPos, opPiece);
            if (curThreats[kingLocation.x][kingLocation.y]) {
                return false;
            }
        }


    }
    return true;

}

function getKingOf(position:chessGamestate, player: color): piece | "none" {
    let sq: square = "empty";
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            sq = position.board[x][y];
            if (sq !== "empty" && sq.ruleset === "k" && sq.color === player) {
                return sq;
            }
        }
    }

    return "none";
}


function getAllPiecesOf(position: chessGamestate, player: color): piece[] {
    let playerPieces : piece[] = [];
    let sq: square = "empty";
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            sq = position.board[x][y];
            if (sq !== "empty" && sq.color === player) {
                playerPieces.push(sq);
            }
        }
    }

    return playerPieces;
}

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* --------------------------- CASTLING FUNCTIONS --------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */



function kingsideCastleCheck(position: chessGamestate, king: piece): boolean {
    return intermediateSquaresCheck(position, king, [{ x: 5, y: king.y }, { x: 6, y: king.y }]);
}

function queensideCastleCheck(position: chessGamestate, king: piece): boolean {
    return intermediateSquaresCheck(position, king, [{ x: 1, y: king.y }, { x: 2, y: king.y }, { x: 3, y: king.y }]);
}

function intermediateSquaresCheck(position: chessGamestate, king: piece, intermediateSquares: pair[]): boolean {
    let kingCanTraverse: boolean[] = [];
    for (let square of intermediateSquares) {
        kingCanTraverse.push(squareIsEmpty(position, square) && moveAvoidsCheck(clonePosition(position), king, square));
    }
    return kingCanTraverse.reduce((canTraverseAllSoFar, canTraverseCurrent) => canTraverseAllSoFar && canTraverseCurrent);
}

function moveIsCastles(position: chessGamestate, target: pair): castleReply {
    let player = (position.turn === "w")? 0 : 1;
    let yCo = (position.turn === "w") ? 0 : 7;
    if(yCo!== target.y){
        return "NO";
    }
    if (target.x === 6 && position.castles[player][0]) {
        return "KINGSIDE";
    }

    if (target.x === 2 && position.castles[player][1]) {
        return "QUEENSIDE";
    }
    return "NO";
}

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* --------------------------- ENDSTATE FUNCTIONS --------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */


function gameIsOver(position: chessGamestate, currentPlayersLegalMoves: Map<piece, boolean[][]>): gameState {
    let gameState: gameState = "Ongoing";
    if (!currentPlayerHasLegalMoves(currentPlayersLegalMoves)) {
        if (curPlayerInCheck(position)) {
            gameState = "Checkmate";
        }
        else {
            gameState = "Stalemate";
        }
    }

    if (insufficientMaterialToMate(position)) {
        gameState = "Insufficient Material"
    }

    if (position.halfMovesSinceProgress === 50) {
        gameState = "50 Halfmove Draw"
    }

    return gameState;
}


function currentPlayerHasLegalMoves(currentPlayersLegalMoves: Map<piece, boolean[][]>): boolean {
    let cumulativeSearch = false;
    let pieceHasMoves = false;
    for (let moves of currentPlayersLegalMoves.values()) {
        // true if any move in "moves" is true
        pieceHasMoves = moves.map(a => a.reduce((p, c) => p || c))
            .reduce((p, c) => p || c);
        cumulativeSearch = cumulativeSearch || pieceHasMoves;

    }
    return cumulativeSearch;
}

// Draws by insufficient material happen when no pawns are on the board and BOTH sides have one of:
//  a lone king /  king + bishop  / king + knight
function insufficientMaterialToMate(position:chessGamestate): boolean {
    let whitePieces = getAllPiecesButKingOf(position, "w");
    let blackPieces = getAllPiecesButKingOf(position, "b");

    if (whitePieces.length >= 2 || blackPieces.length >= 2) {
        return false;
    }

    // After guard clause both arrays have at most one element.

    return (drawMaterial(whitePieces) && drawMaterial(blackPieces));
}

// Accepts an array of length 0 or 1.
function drawMaterial(lastPieces: piece[]): boolean {
    if (lastPieces.length === 0) {
        return true;
    }
    return (lastPieces[0].ruleset === "n" || lastPieces[0].ruleset === "b");
}




/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* ---------------------------- UTILITY FUNCTIONS --------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

export function deepClone(board: square[][]): square[][] {
    let clone: square[][] = [];
    let col: square[] = [];
    let sq: square = "empty";
    for (let x = 0; x < 8; x++) {
        col = [];
        for (let y = 0; y < 8; y++) {
            sq = board[x][y];
            if (sq === "empty") {
                col.push("empty");
            } else {
                col.push({ id: sq.id, color: sq.color, ruleset: sq.ruleset , x:sq.x, y:sq.y});
            }

        }
        clone.push(col);
    }

    return clone;
}


function clonePosition(position:chessGamestate):chessGamestate{
    return {...position, board: deepClone(position.board)};
}

function canMoveToOrCaptureOn(position: chessGamestate, piece: piece, square: pair): boolean {
    let content = position.board[square.x][square.y];
    if (content !== "empty") {
        return (piece.color !== content.color);
    }

    return true;
}


function emptyBoolArray(): boolean[][] {
    return Array.from(Array(8), () => Array(8).fill(false));
}


function squareIsEmpty(position: chessGamestate, coordinate: pair): boolean {
    return position.board[coordinate.x][coordinate.y] === "empty";
}

function pawnHasNotMoved(piece: piece): boolean {
    return (piece.color === "w") ? piece.y === 1 : piece.y === 6;
    
}




// Returns true if the given position allows a capture "en passant" on the given square.
function EPCheck(square: pair, position: chessGamestate): boolean {
    let epTarg = position.epTarget;
    if (epTarg === "-") {
        return false;
    } else {
        return (epTarg.x === square.x && epTarg.y === square.y);
    }

}

function positionHasEnemyAt(piece: piece, threat: pair, position: chessGamestate): boolean {
    let square = position.board[threat.x][threat.y];
    let pieceSeesEnemyThere = (square === "empty") ? false : square.color !== piece.color;
    return pieceSeesEnemyThere;

}


// Returns b[i][k] := a1[i][k] || a2[i][k]
function combineBoolArrays(a1: boolean[][], a2: boolean[][]): boolean[][] {
    return a1.map((x, index) =>
        x.map((y, index2) =>
            y || a2[index][index2]
        )
    );
}




function inBounds(sq: pair): boolean {
    return !(sq.x > 7 || sq.y > 7 || sq.x < 0 || sq.y < 0);
}


function currentOpponent(position: chessGamestate): color {
    return (position.turn === "w" ? "b" : "w");
}


function decideEPFlag(pawn: piece, position: chessGamestate, target: pair): pair | "-" {
    if (pawnHasNotMoved(pawn)) {
        let facingDir = pawn.color === "w" ? 1 : -1;
        let startY = pawn.color === "w" ? 1 : 6;
        let movingTwoSpaces = (target.y === startY + 2 * facingDir);
        if (movingTwoSpaces) {
            return { x: target.x, y: target.y - facingDir };
        }
    }

    return "-";
}


function getLocation(piece:piece):pair{
    return {x:piece.x, y:piece.y};
}

function getAllPiecesButKingOf(position:chessGamestate, player:color):piece[]{
    let pieces = getAllPiecesOf(position,player);
    return pieces.filter(x => x.ruleset!=="k");

}

