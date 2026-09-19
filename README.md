# Chess Engine

![CI](https://github.com/MatthewPeoples/Chess-Engine/actions/workflows/ci.yaml/badge.svg)

A UCI chess engine written from scratch in C++20, using bitboard board representation. Builds on Linux, macOS and Windows.

It plays a full game of chess: bitboard move generation validated against the standard perft positions, alpha-beta search with iterative deepening, quiescence and move ordering, and a material plus piece-square table evaluation. It speaks UCI, so it loads into any chess GUI.

## What it does

- **Board representation** - 6 piece-type bitboards, 2 colour bitboards and a redundant piece array, little-endian rank-file mapping
- **Move generation** - compile-time attack tables for knights, kings and pawns, ray walking for sliders, legal move generation validated by perft
- **Search** - alpha-beta negamax, iterative deepening, quiescence search, MVV-LVA move ordering, time management
- **Evaluation** - material and piece-square tables, with a separate king table for the endgame
- **Interface** - UCI over stdin and stdout, plus `d` and `perft` for debugging

Not done yet: magic bitboards, a transposition table, and NNUE evaluation.

## Requirements

- CMake 3.21+
- A C++20 compiler (tested with AppleClang, GCC and MSVC)

GoogleTest is fetched automatically at configure time.

## Building

Configure presets are defined in `CMakePresets.json`. Each writes to its own directory:

| Preset    | Directory       | Flags                               |
| --------- | --------------- | ----------------------------------- |
| `debug`   | `build`         | `-g`                                |
| `release` | `build-release` | `-O3`                               |
| `asan`    | `build-asan`    | `-O2 -g`, address and UB sanitisers |

```sh
cmake --preset release
cmake --build build-release
```

On Windows the Visual Studio generator is multi-config, so the configuration is chosen at build time rather than configure time:

```sh
cmake --build build --config Release
ctest --test-dir build --build-config Release --output-on-failure
```

## Playing against it

The engine speaks UCI, so any GUI can drive it. Point [Cute Chess](https://cutechess.com/) or [Arena](http://www.playwitharena.de/) at `build-release/bin/chess_uci`.

By hand:

```
uci
position startpos moves e2e4 e7e5
go movetime 1000
```

```
info depth 7 score cp 35 nodes 766791 nps 3704304 time 207 pv e2e4 b8c6 g1f3 g8f6 e4e5 f6e4 b1c3
bestmove e2e4
```

`d` prints the board, the FEN and the static evaluation. `perft N` counts leaf nodes from the current position, one line per first move.

Engine against engine, with [cutechess-cli](https://github.com/cutechess/cutechess):

```sh
cutechess-cli \
  -engine name=chess cmd=./build-release/bin/chess_uci proto=uci \
  -engine name=opponent cmd=/path/to/other-engine proto=uci \
  -each tc=10+0.1 -games 100 -pgnout match.pgn
```

## Perft

Move generation is checked against the published node counts on the six standard positions:

| position                                                              | depth | nodes       |
| --------------------------------------------------------------------- | ----- | ----------- |
| start                                                                   | 6     | 119,060,324 |
| kiwipete                                                                | 5     | 193,690,690 |
| `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -`                                 | 5     | 674,624     |
| `r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -`          | 4     | 422,333     |
| `rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8`             | 4     | 2,103,487   |
| `r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10` | 4   | 3,894,594   |

The test suite runs the shallower depths on every build. The two deep ones are run by hand:

```sh
echo -e "position startpos\nperft 6\nquit" | ./build-release/bin/chess_uci
```

## Testing

```sh
cmake --preset debug
cmake --build build && ctest --test-dir build --output-on-failure
```

81 tests covering square and piece encoding, FEN in both directions, attack generation, make and unmake, legality, perft, evaluation, search and the UCI protocol.

## Layout

| Path       | Contents                                  |
| ---------- | ----------------------------------------- |
| `include/` | Public headers (`chess_lib` interface)    |
| `src/`     | Engine implementation                     |
| `apps/`    | Executables - currently the UCI front end |
| `tests/`   | GoogleTest unit tests                     |

Chess logic lives in `chess_lib`, a static library with no I/O. Executables and tests link against it.

## Tooling

- `clang-format` - style enforced by `.clang-format`
- `clang-tidy` - static analysis, opt in with `-DCHESS_ENABLE_CLANG_TIDY=ON`
- Sanitisers - opt in with `-DCHESS_ENABLE_SANITIZERS=ON`
