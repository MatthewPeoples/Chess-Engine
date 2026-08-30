# Chess Engine

[CI](https://github.com/MatthewPeoples/Chess-Engine/actions/workflows/ci.yml)

A UCI chess engine written from scratch in C++20, using bitboard board representation. Builds on Linux, macOS and Windows.

Work in progress. The build, test and tooling infrastructure is in place, but chess logic is not yet implemented.

## Requirements

- CMake 3.20+
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
