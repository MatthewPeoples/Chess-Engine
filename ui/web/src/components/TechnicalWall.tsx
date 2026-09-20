const BITBOARD = [
    0, 1, 1, 0, 0, 1, 1, 0,
    1, 1, 0, 0, 0, 0, 1, 1,
    0, 0, 1, 0, 0, 1, 0, 0,
    0, 0, 0, 1, 1, 0, 0, 0,
    0, 0, 0, 1, 1, 0, 0, 0,
    0, 0, 1, 0, 0, 1, 0, 0,
    1, 1, 0, 0, 0, 0, 1, 1,
    0, 1, 1, 0, 0, 1, 1, 0,
];

const EVAL_HEAT = [
    -3, -2, -1, -1, -1, -1, -2, -3,
    -2, 0, 1, 1, 1, 1, 0, -2,
    -1, 1, 2, 3, 3, 2, 1, -1,
    -1, 1, 3, 4, 4, 3, 1, -1,
    -1, 1, 3, 4, 4, 3, 1, -1,
    -1, 1, 2, 3, 3, 2, 1, -1,
    -2, 0, 1, 1, 1, 1, 0, -2,
    -3, -2, -1, -1, -1, -1, -2, -3,
];

export function TechnicalWall() {
    return (
        <div className="technical-room" aria-hidden>
            <div className="technical-wall">
                <section className="wall-module wall-bitboard">
                    <div className="wall-module-head">
                        <span>POSITION</span>
                        <span>BITBOARD · 64-BIT</span>
                    </div>
                    <div className="wall-bitboard-grid">
                        {BITBOARD.map((active, index) => (
                            <span key={index} className={active ? "on" : ""} />
                        ))}
                    </div>
                    <code>0x66C3_1818_C366</code>
                </section>

                <section className="wall-module wall-fen">
                    <div className="wall-module-head">
                        <span>STATE</span>
                        <span>FEN</span>
                    </div>
                    <code>rnbqkbnr/pppppppp/8/8/8/8/</code>
                    <code>PPPPPPPP/RNBQKBNR w KQkq - 0 1</code>
                    <div className="wall-fen-fields">
                        <span>BOARD</span><span>TURN</span><span>CASTLE</span><span>EP</span>
                    </div>
                </section>

                <section className="wall-module wall-search">
                    <div className="wall-module-head">
                        <span>SEARCH</span>
                        <span>ALPHA–BETA</span>
                    </div>
                    <svg viewBox="0 0 260 112">
                        <g className="search-edges">
                            <path d="M130 14 62 48M130 14l68 34M62 48 28 92M62 48l38 44M198 48l-38 44M198 48l34 44" />
                        </g>
                        <g className="search-nodes">
                            <circle cx="130" cy="14" r="7" />
                            <circle cx="62" cy="48" r="6" />
                            <circle cx="198" cy="48" r="6" />
                            <circle cx="28" cy="92" r="5" />
                            <circle cx="100" cy="92" r="5" />
                            <circle cx="160" cy="92" r="5" />
                            <circle cx="232" cy="92" r="5" />
                        </g>
                        <g className="search-labels">
                            <text x="140" y="17">PV</text>
                            <text x="69" y="45">α</text>
                            <text x="205" y="45">β</text>
                            <text x="76" y="109">QUIESCE</text>
                        </g>
                    </svg>
                    <div className="search-flow">ITERATIVE DEEPENING → PV ORDERING → QUIESCE</div>
                </section>

                <section className="wall-module wall-eval">
                    <div className="wall-module-head">
                        <span>EVALUATION</span>
                        <span>PIECE–SQUARE</span>
                    </div>
                    <div className="wall-eval-grid">
                        {EVAL_HEAT.map((value, index) => (
                            <span key={index} data-value={value} />
                        ))}
                    </div>
                    <div className="eval-caption">MATERIAL + POSITION · CENTIPAWNS</div>
                </section>

                <section className="wall-module wall-roadmap">
                    <div className="wall-module-head">
                        <span>ROADMAP</span>
                        <span>NOT IMPLEMENTED</span>
                    </div>
                    <strong>NNUE</strong>
                    <div className="nnue-sketch">
                        <span>41K</span><i />
                        <span>256</span><i />
                        <span>32</span><i />
                        <span>32</span><i />
                        <span>CP</span>
                    </div>
                    <div>HalfKP feature accumulator · neural evaluation</div>
                    <div className="roadmap-line"><span /></div>
                </section>

                <section className="wall-module wall-ordering">
                    <div className="wall-module-head">
                        <span>MOVE ORDERING</span>
                        <span>MVV–LVA</span>
                    </div>
                    <div className="ordering-row"><code>Q×P</code><span style={{ width: "92%" }} /><b>10800</b></div>
                    <div className="ordering-row"><code>R×N</code><span style={{ width: "68%" }} /><b>12800</b></div>
                    <div className="ordering-row"><code>P×Q</code><span style={{ width: "100%" }} /><b>18900</b></div>
                    <div className="ordering-row"><code>e2e4</code><span style={{ width: "18%" }} /><b>0</b></div>
                </section>

                <section className="wall-module wall-depth">
                    <div className="wall-module-head">
                        <span>ITERATIVE DEEPENING</span>
                        <span>PV SEARCH</span>
                    </div>
                    <div className="depth-chart">
                        {[16, 27, 43, 67, 91].map((height, index) => (
                            <span key={height} style={{ height: `${height}%` }}><i>D{index + 1}</i></span>
                        ))}
                    </div>
                    <code>discard incomplete iteration → retain last PV</code>
                </section>

                <section className="wall-module wall-perft">
                    <div className="wall-module-head">
                        <span>LEGAL MOVEGEN</span>
                        <span>PERFT</span>
                    </div>
                    <div className="perft-table">
                        <span>D1</span><b>20</b>
                        <span>D2</span><b>400</b>
                        <span>D3</span><b>8,902</b>
                        <span>D4</span><b>197,281</b>
                    </div>
                </section>

                <section className="wall-module wall-movegen">
                    <div className="wall-module-head">
                        <span>PAWN ATTACKS</span>
                        <span>BIT SHIFTS</span>
                    </div>
                    <code>east = pawns &lt;&lt; 9 &amp; ~FILE_A</code>
                    <code>west = pawns &lt;&lt; 7 &amp; ~FILE_H</code>
                    <div className="movegen-routes">
                        <span>NW</span><i>↑</i><span>NE</span>
                        <i>↖</i><b>♟</b><i>↗</i>
                    </div>
                </section>

                <section className="wall-module wall-phase">
                    <div className="wall-module-head">
                        <span>PHASE SWITCH</span>
                        <span>KING TABLE</span>
                    </div>
                    <div className="phase-track">
                        <span>MIDDLEGAME</span><i /><span>ENDGAME</span>
                    </div>
                    <code>non-pawn material ≤ 2 × (rook + bishop)</code>
                </section>

                <section className="wall-module wall-time">
                    <div className="wall-module-head">
                        <span>TIME MANAGEMENT</span>
                        <span>BUDGET</span>
                    </div>
                    <code>min(left ÷ 25 + inc × ¾, left − 50)</code>
                    <div className="time-gauge"><span /></div>
                    <code>clock probe every 2,048 nodes</code>
                </section>

                <section className="wall-module wall-terminal">
                    <div className="wall-module-head">
                        <span>TERMINAL STATE</span>
                        <span>RULES</span>
                    </div>
                    <div className="terminal-grid">
                        <span>CHECKMATE</span><b>−MATE + PLY</b>
                        <span>STALEMATE</span><b>0 CP</b>
                        <span>50 MOVE</span><b>100 PLY</b>
                    </div>
                </section>

                <section className="wall-module wall-telemetry">
                    <div className="wall-module-head">
                        <span>UCI TELEMETRY</span>
                        <span>SEARCH INFO</span>
                    </div>
                    <code>info depth 9 score cp +34</code>
                    <code>nodes 148392 nps 824400 time 180</code>
                    <code>pv e2e4 e7e5 g1f3 b8c6</code>
                </section>
            </div>
            <div className="technical-wall-shadow">
                <span className="wall-shadow-crown" />
                <span className="wall-shadow-stem" />
                <span className="wall-shadow-base" />
            </div>
            <div className="technical-floor">
                <div className="technical-floor-shadow" />
            </div>
        </div>
    );
}
