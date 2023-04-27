

import { chessGamestate, color, pieceTypes, square, pair } from "../types";
import { v4 as uuid } from 'uuid'

// Takes in a string, expected to be in Forsyth–Edwards Notation
// Returns data in the following form:
// [0-7] : string[] of columns of a chessboard
//         - holds pieces as their characters in algebraic notation.
// [8] : string[] of the following form:
//       [ 0: "w" or "b"  ( the active player's turn ) 
//         1: Castling rights as in FEN ie "KQkq", ect
//         2: The coordinates of the en-passant target
//              stored as "x,y" if active or "-" if not.
//         3: The number of half-turns since a pawn was pushed or a piece taken.
//         4: The number of full turns taken. 
//       ]
export function parseFen(fen: string): string[][] {
    let fenSplit = fen.split(' ');
    if (fenSplit.length !== 6) {
        throw new Error("Improperly Formatted FEN");
    }

    let board = parseBoardFEN(fenSplit[0]);

    let turn = parseTurnFEN(fenSplit[1]);

    let castles = parseCastleData(fenSplit[2]);

    let enPassantTargetInFen: string = algebraicNotationToNumpair(fenSplit[3]);

    if (Number.isNaN(parseInt(fenSplit[4]))) {
        throw new Error("Invalid Half Moves field in FEN.");
    }


    if (Number.isNaN(parseInt(fenSplit[5]))) {
        throw new Error("Invalid Full Moves field in FEN.");
    }


    board.push([turn, castles, enPassantTargetInFen, fenSplit[4], fenSplit[5]]);
    return board;

}

function parseBoardFEN(boardFen: string): string[][] {
    let board = Array.from(Array(8), () => Array(8).fill(""));

    // Throws error if inadmissable characters are used or the wrong number of rows are provided.
    let boardRows = getRowsFromFen(boardFen);

    let rowFen: string = "";
    let runningColumn = 0;
    let char: string = "";

    for (let i = 0; i < 8; i++) {
        rowFen = boardRows[i];

        // Throws an error if row encodes more than 8 filled squares.
        rowLengthCheck(rowFen, i);

        for (let d = 0; d < rowFen.length; d++) {
            char = rowFen.charAt(d);

            if (Number.isNaN(parseInt(char))) {
                board[runningColumn][7 - i] = char;

                runningColumn++;
            } else {
                for (let x = runningColumn; x < runningColumn + parseInt(char); x++) {
                    board[x][7 - i] = "-";
                }
                runningColumn += parseInt(char);
            }

        }

        if (runningColumn < 7) {
            for (let x = runningColumn; x < 8; x++) {
                board[x][7 - i] = "-";
            }
        }

        runningColumn = 0;

    }

    return board;

}



function getRowsFromFen(fen: string): string[] {
    let admissables = ["p", "k", "q", "r", "n", "b", "/"];
    let gapSizes = ["1", "2", "3", "4", "5", "6", "7", "8"];

    admissables = admissables.concat(gapSizes);

    for (let char of fen) {
        if (admissables.indexOf(char.toLowerCase()) === -1) {
            throw new Error("Invalid characters in FEN");
        }
    }

    let boardRows = fen.split("/");

    if (boardRows.length !== 8) {
        throw new Error("Wrong number of rows in FEN");
    }

    return boardRows;
}

function rowLengthCheck(rowFen: string, rowNumber: number) {
    let rowLength = 0;
    for (let char of rowFen) {
        if (Number.isNaN(parseInt(char))) {
            rowLength++;
        } else {
            rowLength += parseInt(char);
        }
    }

    if (rowLength > 8) {
        throw new Error(`FEN row ${rowNumber} overflows the chessboard.`)
    }
}

function parseTurnFEN(turn: string): string {
    if (turn.toLowerCase() !== "w" && turn.toLowerCase() !== "b") {
        throw new Error("Invalid turn field in FEN.");
    } else {
        return turn.toLowerCase();
    }


}

function parseCastleData(castleFen: string): string {
    if (castleFen === "-") { return castleFen; }

    let castleRights = ["K", "Q", "k", "q"];
    let i = 0;
    for (let char of castleFen) {
        i = castleRights.indexOf(char);

        if (i === -1) {
            throw new Error("Invalid castling rights specified in the FEN.");
        }

        // This ensures an error is thrown in cases where
        // 1) castle rights for one player are repeated "KQKq"
        // 2) when the string is too long
        castleRights.splice(i, 1);
    }

    return castleFen;


}

function algebraicNotationToNumpair(alg: string): string {
    if (alg === "-") {
        return "NONE";
    }

    if (alg.length !== 2) {
        throw new Error("Invalid algebraic notation.");
    }

    let admissableCols = ["a", "b", "c", "d", "e", "f", "g", "h"];
    let admissableRows = ["1", "2", "3", "4", "5", "6", "7", "8"];

    let x = admissableCols.indexOf(alg.charAt(0));
    let y = admissableRows.indexOf(alg.charAt(1));

    if (x === -1 || y === -1) {
        throw new Error("Invalid algebraic notation.");
    }

    return `${x},${y}`;

}



export function defaultFen(): string[][] {
    let board = Array.from(Array(8), () => Array(8).fill(""));
    // [color, piece row, pawn row];
    let pieceRows: [string, number, number][] = [["w", 0, 1], ["b", 7, 6]];
    let minorPieces = ["R", "N", "B"];

    for (let rows of pieceRows) {
        let capitalization = (rows[0] === "w")
            ? (x: string) => { return x; }
            : (x: string) => { return x.toLowerCase(); }
        for (let i = 0; i < 8; i++) {
            board[i][rows[2]] = capitalization("P");
        }
        board[3][rows[1]] = capitalization("Q");
        board[4][rows[1]] = capitalization("K");
        minorPieces.forEach((pieceLetter, index) => {
            board[index][rows[1]] = capitalization(pieceLetter);
            board[7 - index][rows[1]] = capitalization(pieceLetter);
        }
        );
    }

    board.push(["w", "KQkq", "-", "0", "1"]);

    return board;
}


/* -------------------------------------------------------------------------- */
/*      Methods turning sanitized FEN input into expected data structure.     */
/* -------------------------------------------------------------------------- */

export function fenToPosition(fen: string): chessGamestate {
    let sanitizedFEN: string[][] = []
    try {
        sanitizedFEN = parseFen(fen);
    } catch {
        sanitizedFEN = defaultFen();
    }

    let board: square[][] = [];
    sanitizedFEN.forEach((col, index) => {
        if(index<8){
            board.push(fenColToSquareCol(col, index));
        }
    });
    const turn = sanitizedFEN[8][0] as color;
    const castles = fenToCastle(sanitizedFEN[8][1]);
    let epTarget: pair | "-" = "-";
    if (sanitizedFEN[8][2] !== "-") {
        let split = sanitizedFEN[8][2].split(",");
        epTarget = { x: parseInt(split[0]), y: parseInt(split[1]) }
    }
    const halfmoves = parseInt(sanitizedFEN[8][3]);
    const fullmoves = parseInt(sanitizedFEN[8][4]);
    return {
        board: board,
        turn: turn,
        castles: castles,
        epTarget: epTarget,
        halfMovesSinceProgress: halfmoves,
        fullMoves:fullmoves
    }
}


export function startingPosition():chessGamestate{
    return fenToPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
}


function fenToCastle(fen: string): [[boolean, boolean], [boolean, boolean]] {
    let castles: [[boolean, boolean], [boolean, boolean]] = [[false, false], [false, false]];
    let color = 0;
    let castleSide = 0;
    for (let char of fen) {
        color = (char === char.toLowerCase()) ? 1 : 0;
        castleSide = (char.toLowerCase() === "k") ? 0 : 1;
        if ("KQkq".indexOf(char) !== -1) {
            castles[color][castleSide] = true;
        }
    }
    return castles;
}

function fenColToSquareCol(fenCol: string[], columnIndex: number): square[] {
    let sqCol: square[] = [];
    fenCol.forEach((sqChar, rowIndex) => {
        sqCol.push(fenStringToSquare(sqChar, columnIndex, rowIndex));
    });
    return sqCol;
}

function fenStringToSquare(fen: string, columnIndex: number, rowIndex: number): square {
    if (fen === "-") {
        return "empty";
    }
    else {
        let id = uuid();
        let ruleset = fen.toLowerCase() as pieceTypes;
        let color: color = (fen === fen.toLowerCase()) ? "b" : "w";
        return { id: id, ruleset: ruleset, color: color, x: columnIndex, y: rowIndex };
    }

}