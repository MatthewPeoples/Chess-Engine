cmake_minimum_required(VERSION 3.20)

project(chess
    VERSION 0.1.0
    DESCRIPTION "Chess engine"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

include(FetchContent)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.18.0 # pinned; latest as of 29-08-2026
)

FetchContent_MakeAvailable(googletest)

enable_testing()

# warnings
add_library(chess_warnings INTERFACE)
target_compile_options(chess_warnings
    INTERFACE
        -Wall
        -Wextra
        -Wpedantic
        -Werror # fail build on any warnings
)

# engine core, all chess logic, no I/O
add_library(chess_lib)
target_sources(chess_lib
    PRIVATE
        src/bitboard.cpp
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

# testing suite
add_executable(chess_tests)
target_sources(chess_tests
    PRIVATE
        tests/bitboard_test.cpp
)
target_link_libraries(chess_tests
    PRIVATE
        chess_lib
        chess_warnings
        GTest::gtest_main
)
add_test(NAME chess_tests COMMAND chess_tests)

# optional tidy checks at compile time
option(CHESS_ENABLE_CLANG_TIDY "Run clang-tidy during build" OFF)

if (CHESS_ENABLE_CLANG_TIDY)
    find_program(CLANG_TIDY_EXE NAMES clang-tidy REQUIRED)
    set_target_properties(chess_lib chess_uci chess_tests
        PROPERTIES CXX_CLANG_TIDY "${CLANG_TIDY_EXE}"
    )
endif()


# optional sanitisers at runtime
option(CHESS_ENABLE_SANITIZERS "Build with address and UB sanitizers" OFF)

if (CHESS_ENABLE_SANITISERS)
    target_compile_options(chess_warnings
        INTERFACE
            -fsanitize=address,undefined
            -fno-omit-frame-pointer
            -g
    )
    target_link_options(chess_warnings
        INTERFACE
            -fsanitize=address,undefined
    )
endif()
