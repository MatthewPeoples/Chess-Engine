cmake_minimum_required(VERSION 3.21)

project(chess
    VERSION 0.1.0
    DESCRIPTION "Chess engine"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)

include(FetchContent)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.18.0 # pinned; latest as of 29-08-2026
)

FetchContent_MakeAvailable(googletest)

enable_testing()

# Warnings and Sanitizers must precede target definitions:
#   both configure chess_warnings, which the targets link
# StaticAnalysis must follow them:
#   it sets properties on targets that must already exist
include(Warnings)
include(Sanitizers)

# engine core, all chess logic, no I/O
add_library(chess_lib)
target_sources(chess_lib
    PRIVATE
        src/position.cpp
        src/bitboard.cpp
        src/move.cpp
        src/movegen.cpp
        src/perft.cpp
)
target_include_directories(chess_lib
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_compile_features(chess_lib
    PUBLIC
        cxx_std_20
)
target_link_libraries(chess_lib
    PRIVATE
        chess_warnings
)

# universal chess interface
add_executable(chess_uci)
target_sources(chess_uci
    PRIVATE
        apps/uci/main.cpp
)
target_link_libraries(chess_uci
    PRIVATE
        chess_lib
        chess_warnings
)

# unit tests
add_executable(chess_tests)
target_sources(chess_tests
    PRIVATE
        tests/position_test.cpp
        tests/types_test.cpp
        tests/fen_test.cpp
        tests/bitboard_test.cpp
        tests/move_test.cpp
        tests/makemove_test.cpp
        tests/movegen_test.cpp
        tests/perft_test.cpp
)
target_link_libraries(chess_tests
    PRIVATE
        chess_lib
        chess_warnings
        GTest::gtest_main
)

# one ctest entry per TEST() rather than one for the whole binary
include(GoogleTest)
gtest_discover_tests(chess_tests)

include(StaticAnalysis)