# Chess Engine

A UCI chess engine written from scratch in C++20, using bitboard board representation.

Work in progress. The build, test and tooling infrastructure is in place, but chess logic is not yet implemented.

## Requirements

- CMake 3.20+
- A C++20 compiler (tested with AppleClang and GCC)

GoogleTest is fetched automatically at configure time.

## Building

Configure presets are defined in `CMakePresets.json`:

```sh
cmake --preset debug      # -O0 -g
cmake --preset release    # -O3
cmake --preset asan       # -O2 -g, address and UB sanitisers
```

Then build and test:

```sh
cmake --build build && ctest --test-dir build --output-on-failure
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
