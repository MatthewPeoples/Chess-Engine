# Matthew's Chess Engine

[CI](https://github.com/MatthewPeoples/Chess-Engine/actions/workflows/ci.yaml)

A UCI chess engine written from scratch in C++20, with a browser front end for playing it and a built-in arena for proving a new version is actually stronger than the old one.

---

## What it does

- **Plays chess properly.** Bitboard move generation, validated against the standard perft positions to 119 million nodes.
- **Thinks.** Alpha-beta search with iterative deepening, quiescence and move ordering, reaching depth 7 in the opening inside a fifth of a second.
- **Speaks UCI**, so it loads into any chess GUI, or onto Lichess as a bot.
- **Tests itself.** Run two versions against each other, hundreds of games in parallel, and get an Elo difference with a confidence margin and a statistical verdict.



## See it

> *Screenshot slot: Bot vs Bot*
>
> *Screenshot slot: Results tab*



**Play -** Bot vs Bot or User vs Bot

**Results** - every run, and the engine's strength across versions. 

## Quick start

sh

```sh
git clone https://github.com/MatthewPeoples/Chess-Engine.git
cd Chess-Engine
cmake --preset release && cmake --build build-release
cd ui && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and play.

To use it in a chess GUI instead, point [Cute Chess](https://cutechess.com/) at `build-release/bin/chess_uci`. It also runs as a Lichess bot through [lichess-bot](https://github.com/lichess-bot-devs/lichess-bot) - the engine speaks ordinary UCI, so nothing special is needed.

## How strong is it


| Metric             | Strength                              |
| ------------------ | ------------------------------------- |
| Search depth in 1s | 7 from the opening position           |
| Bench              | 13.3M nodes, ~2.1M nodes/sec, depth 6 |
| Perft 6            | 119,060,324 nodes in 4.0s             |


*Measured on a 14" MacBook Pro (M5 Pro)*

## Proving it's correct

**Perft**: Counts leaf nodes to a fixed depth and compares against published values, and a single wrong move anywhere changes the total

All six standard positions match:


| Position   | Depth | Nodes       |
| ---------- | ----- | ----------- |
| Start      | 6     | 119,060,324 |
| Kiwipete   | 5     | 193,690,690 |
| Position 3 | 5     | 674,624     |
| Position 4 | 4     | 422,333     |
| Position 5 | 4     | 2,103,487   |
| Position 6 | 4     | 3,894,594   |




81 unit tests cover square and piece encoding, FEN in both directions, attack generation, make and unmake, legality, perft, evaluation, search and the UCI protocol. CI builds and runs them on Linux, macOS and Windows.

```sh
cmake --preset debug && cmake --build build && ctest --test-dir build --output-on-failure
```



## Testing a new change

The hard question in engine development isn't "does it work", it's **"is this version actually better, or did it get lucky?"** A hundred games can easily show a 55% score from a change worth nothing.

The arena answers it properly. Two versions play hundreds of games in parallel, each opening played twice with the colours swapped so white's advantage cancels out, and the result is scored with a **sequential probability ratio test** - The standard tool in engine development. It tracks how strongly the games favour the new version, and crossing ±2.94 means 95% confidence in either direction.



> *Screenshot slot: the scoreboard and LLR bar, mid-run.*



Speed and strength get separate charts on purpose. Some changes like a transposition table makes an engine substantially stronger while making nodes-per-second go *down*, because each node does more work.

## How it works

```
include/types.hpp      colours, pieces, squares, and the conversions between them
include/bitboard.hpp   file masks, shifts, attack tables, ray walking
include/move.hpp       a move packed into 16 bits, and a fixed-capacity move list
include/position.hpp   the board, FEN, make/unmake, attack queries
include/movegen.hpp    pseudo-legal and legal move generation
include/eval.hpp       material and piece-square tables
include/search.hpp     alpha-beta with iterative deepening
include/uci.hpp        the protocol loop
ui/server              Node: owns the engine processes, the rules and the clocks
ui/web                 React: boards, metrics, charts
```

The engine is a static library with no I/O and no web dependency. The browser can't start a process, so the Node server owns the engine and acts as the arbiter - it validates every move with `chess.js` and runs the clocks, and the engine is only ever asked "**what would you play here**", which is the same question Lichess would ask it.  


### Decisions worth explaining

**The board is stored twice.** Bitboards answer "where are all the black knights" in one operation but are slow at "what is on e4"; a plain 64-square array is the reverse. Move generation needs the first constantly, printing and captures need the second. The cost is two copies of the same truth, so the data is private and one function is the only writer.

**A move is 16 bits with no capture flag.** Six bits each for from and to, four for the type and promotion piece. There's no "is a capture" bit because the board already knows, and a second copy of a fact can disagree with the first.

**Make/unmake rather than copy-make.** Copying the whole position per move is simpler and harder to get wrong. Make/unmake with an undo record is faster and is what NNUE needs (planned for future), because the evaluation is updated incrementally as pieces move and rolled back on the way out. The undo record carries the moved piece and the captured piece for exactly that reason.

**Classical ray-walking sliders are permanent.** They're slow and obviously correct, which makes them the reference the magic bitboard version gets tested against when it arrives.

## What's next

- **Magic bitboards** for sliding attacks, differentially tested against the ray walker
- **Transposition table**, and a Zobrist key, which also brings repetition detection
- **NNUE evaluation** - the reason make/unmake was chosen over copy-make



##### Note:

Built with AI assistance throughout. The design decisions were mine · see `DECISIONS.md`