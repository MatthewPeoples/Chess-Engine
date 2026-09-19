# Chess Engine

![CI](https://github.com/MatthewPeoples/Chess-Engine/actions/workflows/ci.yaml/badge.svg)

A UCI chess engine written from scratch in C++20, using bitboard board representation. Builds on Linux, macOS and Windows.

Work in progress. The board, the piece and square types, and FEN parsing and writing are in place; move generation is next.

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
cmake --preset debug
cmake --build build && ctest --test-dir build --output-on-failure
```

On Windows the Visual Studio generator is multi-config, so the configuration is chosen at build time rather than configure time:

```sh
cmake --build build --config Debug
ctest --test-dir build --build-config Debug --output-on-failure
```

## Running

`chess_uci` prints the opening position, then prints any FEN string pasted into it:

```sh
./build/bin/chess_uci
```

```
8  r n b q k b n r
7  p p p p p p p p
6  . . . . . . . .
5  . . . . . . . .
4  . . . . . . . .
3  . . . . . . . .
2  P P P P P P P P
1  R N B Q K B N R
   a b c d e f g h

side to move: white
castling:     KQkq
en passant:   -
halfmove:     0
fullmove:     1
```

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
